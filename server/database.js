import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const { Pool } = pg;

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'synapse_ai',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async migrate() {
    try {
      console.log('🗄️ Running database migrations...');

      // Enable pgvector extension
      await this.query('CREATE EXTENSION IF NOT EXISTS vector;');

      // Create users table
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          role VARCHAR(100),
          department VARCHAR(100),
          skills TEXT,
          bio TEXT,
          phone VARCHAR(50),
          location VARCHAR(100),
          manager_id INTEGER REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'active',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create user_vectors table for embeddings
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_vectors (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          content_type VARCHAR(50) NOT NULL, -- 'profile', 'skills', 'bio', etc.
          content TEXT NOT NULL,
          embedding vector(384), -- MiniLM produces 384-dim vectors
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create training_data table
      await this.query(`
        CREATE TABLE IF NOT EXISTS training_data (
          id SERIAL PRIMARY KEY,
          input_text TEXT NOT NULL,
          output_text TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'pending', -- pending, processed, failed
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chat_sessions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_context JSONB DEFAULT '{}',
          model_used VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chat_messages table
      await this.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) REFERENCES chat_sessions(session_id),
          role VARCHAR(20) NOT NULL, -- user, assistant, system
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create embedding_queue table for background processing
      await this.query(`
        CREATE TABLE IF NOT EXISTS embedding_queue (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          user_data JSONB NOT NULL,
          import_id VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
          worker_id INTEGER,
          retry_count INTEGER DEFAULT 0,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        );
      `);

      // Create import_jobs table for tracking large imports
      await this.query(`
        CREATE TABLE IF NOT EXISTS import_jobs (
          id VARCHAR(255) PRIMARY KEY,
          filename VARCHAR(500),
          file_size BIGINT,
          total_rows INTEGER DEFAULT 0,
          processed_rows INTEGER DEFAULT 0,
          success_rows INTEGER DEFAULT 0,
          error_rows INTEGER DEFAULT 0,
          chunks_created INTEGER DEFAULT 0,
          chunks_processed INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          progress DECIMAL(5,2) DEFAULT 0,
          throughput DECIMAL(10,2) DEFAULT 0,
          estimated_completion TIMESTAMP WITH TIME ZONE,
          error_details JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        );
      `);

      // Create indexes for vector similarity search
      await this.query(`
        CREATE INDEX IF NOT EXISTS user_vectors_embedding_idx 
        ON user_vectors USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);

      // Create text search indexes for enterprise scale
      await this.query(`
        CREATE INDEX IF NOT EXISTS users_name_idx ON users USING GIN (to_tsvector('english', name));
        CREATE INDEX IF NOT EXISTS users_skills_idx ON users USING GIN (to_tsvector('english', skills));
        CREATE INDEX IF NOT EXISTS users_bio_idx ON users USING GIN (to_tsvector('english', bio));
        CREATE INDEX IF NOT EXISTS users_department_idx ON users (department);
        CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
        CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
        CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
        CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at);
      `);

      // Enterprise-scale indexes for background processing
      await this.query(`
        CREATE INDEX IF NOT EXISTS embedding_queue_status_idx ON embedding_queue (status, created_at);
        CREATE INDEX IF NOT EXISTS embedding_queue_import_idx ON embedding_queue (import_id, status);
        CREATE INDEX IF NOT EXISTS embedding_queue_worker_idx ON embedding_queue (worker_id, status);
        CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs (status, created_at);
        CREATE INDEX IF NOT EXISTS user_vectors_user_id_idx ON user_vectors (user_id);
        CREATE INDEX IF NOT EXISTS user_vectors_content_type_idx ON user_vectors (content_type);
      `);

      // Optimize vector index for 10M+ scale with better parameters
      await this.query(`
        DROP INDEX IF EXISTS user_vectors_embedding_idx;
        CREATE INDEX user_vectors_embedding_hnsw_idx 
        ON user_vectors USING hnsw (embedding vector_cosine_ops) 
        WITH (m = 16, ef_construction = 64);
      `);

      // Table partitioning for enterprise scale (optional, for 10M+ records)
      await this.query(`
        -- Create partitioned table for user_vectors if it gets too large
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_partitioned_table WHERE partrelid = 'user_vectors'::regclass
          ) THEN
            -- This would require recreating the table, so we'll skip for now
            -- In production, you'd set this up initially
            NULL;
          END IF;
        END $$;
      `);

      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async insertUser(userData) {
    const {
      name, email, role, department, skills, bio, phone, location, manager_id, metadata
    } = userData;

    const query = `
      INSERT INTO users (name, email, role, department, skills, bio, phone, location, manager_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [name, email, role, department, skills, bio, phone, location, manager_id, metadata || {}];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async insertUserVector(userId, contentType, content, embedding, metadata = {}) {
    const query = `
      INSERT INTO user_vectors (user_id, content_type, content, embedding, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [userId, contentType, content, JSON.stringify(embedding), metadata];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async searchUsersByVector(queryEmbedding, limit = 10, threshold = 0.7) {
    const query = `
      SELECT 
        u.*,
        uv.content,
        uv.content_type,
        1 - (uv.embedding <=> $1::vector) as similarity
      FROM user_vectors uv
      JOIN users u ON uv.user_id = u.id
      WHERE 1 - (uv.embedding <=> $1::vector) > $2
      ORDER BY uv.embedding <=> $1::vector
      LIMIT $3;
    `;

    const result = await this.query(query, [JSON.stringify(queryEmbedding), threshold, limit]);
    return result.rows;
  }

  async searchUsersByText(searchTerm, limit = 10) {
    const query = `
      SELECT *, 
        ts_rank_cd(to_tsvector('english', name || ' ' || COALESCE(skills, '') || ' ' || COALESCE(bio, '')), plainto_tsquery('english', $1)) as rank
      FROM users
      WHERE to_tsvector('english', name || ' ' || COALESCE(skills, '') || ' ' || COALESCE(bio, '')) @@ plainto_tsquery('english', $1)
         OR name ILIKE $2
         OR skills ILIKE $2
         OR bio ILIKE $2
         OR department ILIKE $2
         OR role ILIKE $2
      ORDER BY rank DESC, name
      LIMIT $3;
    `;

    const likePattern = `%${searchTerm}%`;
    const result = await this.query(query, [searchTerm, likePattern, limit]);
    return result.rows;
  }

  async hybridUserSearch(searchTerm, queryEmbedding, limit = 10) {
    // Combine text and vector search results
    const textResults = await this.searchUsersByText(searchTerm, limit);
    const vectorResults = await this.searchUsersByVector(queryEmbedding, limit, 0.5);

    // Merge and deduplicate results
    const combinedResults = new Map();
    
    textResults.forEach(user => {
      combinedResults.set(user.id, { ...user, text_rank: user.rank, similarity: 0 });
    });

    vectorResults.forEach(user => {
      if (combinedResults.has(user.id)) {
        combinedResults.get(user.id).similarity = user.similarity;
      } else {
        combinedResults.set(user.id, { ...user, text_rank: 0 });
      }
    });

    // Calculate combined score and sort
    const results = Array.from(combinedResults.values())
      .map(user => ({
        ...user,
        combined_score: (user.text_rank || 0) * 0.3 + (user.similarity || 0) * 0.7
      }))
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, limit);

    return results;
  }

  async insertTrainingData(inputText, outputText, metadata = {}) {
    const query = `
      INSERT INTO training_data (input_text, output_text, metadata)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await this.query(query, [inputText, outputText, metadata]);
    return result.rows[0];
  }

  async getTrainingData(status = null, limit = 1000) {
    let query = 'SELECT * FROM training_data';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  async insertChatSession(sessionId, userContext = {}, modelUsed = null) {
    const query = `
      INSERT INTO chat_sessions (session_id, user_context, model_used)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id) DO UPDATE SET
        user_context = $2,
        model_used = $3,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await this.query(query, [sessionId, userContext, modelUsed]);
    return result.rows[0];
  }

  async insertChatMessage(sessionId, role, content, metadata = {}) {
    const query = `
      INSERT INTO chat_messages (session_id, role, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await this.query(query, [sessionId, role, content, metadata]);
    return result.rows[0];
  }

  async getChatHistory(sessionId, limit = 50) {
    const query = `
      SELECT * FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const result = await this.query(query, [sessionId, limit]);
    return result.rows.reverse(); // Return in chronological order
  }

  async bulkInsertUsers(users) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const insertedUsers = [];
      for (const user of users) {
        const query = `
          INSERT INTO users (name, email, role, department, skills, bio, phone, location, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            skills = EXCLUDED.skills,
            bio = EXCLUDED.bio,
            phone = EXCLUDED.phone,
            location = EXCLUDED.location,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING *;
        `;

        const values = [
          user.name, user.email, user.role, user.department, 
          user.skills, user.bio, user.phone, user.location, user.metadata || {}
        ];

        const result = await client.query(query, values);
        insertedUsers.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return insertedUsers;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default Database;
