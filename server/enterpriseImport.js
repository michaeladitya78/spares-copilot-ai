import { Worker } from 'worker_threads';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import csv from 'fast-csv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import multer from 'multer';
import AdaptiveScalingService from './adaptiveScaling.js';

class EnterpriseImportService {
  constructor(database, aiProvider) {
    this.db = database;
    this.ai = aiProvider;
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.tempDir = path.join(process.cwd(), 'temp');
    this.workerPool = [];
    this.maxWorkers = process.env.MAX_WORKERS || 8;
    this.chunkSize = process.env.CHUNK_SIZE || 10000; // 10k records per chunk
    this.activeImports = new Map();
    this.adaptiveScaling = new AdaptiveScalingService();
    
    // Ensure directories exist
    [this.uploadDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Configure multer for file uploads
    this.upload = multer({
      dest: this.uploadDir,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB limit for enterprise
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/json'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only CSV, Excel, and JSON files are allowed.'));
        }
      }
    });

    this.initializeWorkerPool();
  }

  initializeWorkerPool() {
    console.log(`🏭 Initializing worker pool with ${this.maxWorkers} workers...`);
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(path.join(process.cwd(), 'server/workers/embeddingWorker.js'));
      worker.isAvailable = true;
      worker.id = i;
      
      worker.on('message', (result) => {
        this.handleWorkerMessage(worker, result);
      });
      
      worker.on('error', (error) => {
        console.error(`Worker ${worker.id} error:`, error);
        worker.isAvailable = true;
      });
      
      this.workerPool.push(worker);
    }
  }

  async importLargeDataset(filePath, options = {}) {
    const importId = randomUUID();
    const startTime = Date.now();
    
    // Auto-detect or use custom scaling configuration
    const scalingConfig = await this.determineScalingConfig(filePath, options);
    console.log(`🎯 Using scaling profile: ${scalingConfig.profile.name} - ${scalingConfig.profile.description}`);
    
    const importStatus = {
      id: importId,
      status: 'initializing',
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      chunksCreated: 0,
      chunksProcessed: 0,
      errors: [],
      startTime: new Date(),
      endTime: null,
      estimatedCompletion: null,
      throughput: 0,
      memoryUsage: 0
    };

    this.activeImports.set(importId, importStatus);

    try {
      console.log(`🚀 Starting enterprise import for ${importId}`);
      
      // Phase 1: Stream and chunk the large file
      const chunks = await this.createDataChunks(filePath, importId, importStatus, options);
      
      // Phase 2: Process chunks in parallel with workers
      await this.processChunksInParallel(chunks, importId, importStatus, options);
      
      // Phase 3: Generate embeddings in background
      await this.generateEmbeddingsBackground(importId, importStatus);
      
      importStatus.status = 'completed';
      importStatus.endTime = new Date();
      importStatus.throughput = importStatus.successRows / ((Date.now() - startTime) / 1000);
      
      console.log(`✅ Enterprise import completed: ${importStatus.successRows}/${importStatus.totalRows} records`);
      console.log(`📊 Throughput: ${Math.round(importStatus.throughput)} records/second`);
      
      return importStatus;

    } catch (error) {
      console.error('Enterprise import error:', error);
      importStatus.status = 'failed';
      importStatus.endTime = new Date();
      importStatus.errors.push({ phase: 'general', error: error.message });
      throw error;
    }
  }

  async createDataChunks(filePath, importId, importStatus, options) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let currentChunk = [];
      let chunkIndex = 0;
      let totalRows = 0;

      importStatus.status = 'chunking';

      const self = this;
      const chunkTransform = new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
          try {
            const normalizedRow = self.normalizeUserData(row, options.headers);
            if (normalizedRow) {
              currentChunk.push(normalizedRow);
              totalRows++;

              if (currentChunk.length >= self.chunkSize) {
                const chunkPath = self.saveChunk(currentChunk, importId, chunkIndex);
                chunks.push({
                  path: chunkPath,
                  index: chunkIndex,
                  size: currentChunk.length
                });
                
                importStatus.chunksCreated++;
                importStatus.totalRows = totalRows;
                
                currentChunk = [];
                chunkIndex++;
              }
            }
            callback();
          } catch (error) {
            callback(error);
          }
        },

        flush(callback) {
          // Handle remaining data in the last chunk
          if (currentChunk.length > 0) {
            const chunkPath = self.saveChunk(currentChunk, importId, chunkIndex);
            chunks.push({
              path: chunkPath,
              index: chunkIndex,
              size: currentChunk.length
            });
            importStatus.chunksCreated++;
          }
          
          importStatus.totalRows = totalRows;
          console.log(`📦 Created ${chunks.length} chunks for ${totalRows} total rows`);
          callback();
        }
      });

      createReadStream(filePath)
        .pipe(csv.parse({ headers: true, ignoreEmpty: true, trim: true }))
        .pipe(chunkTransform)
        .on('finish', () => resolve(chunks))
        .on('error', reject);
    });
  }

  saveChunk(chunkData, importId, chunkIndex) {
    const chunkPath = path.join(this.tempDir, `${importId}_chunk_${chunkIndex}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(chunkData));
    return chunkPath;
  }

  async processChunksInParallel(chunks, importId, importStatus, options) {
    importStatus.status = 'processing';
    
    const concurrency = Math.min(this.maxWorkers, chunks.length);
    const chunkQueue = [...chunks];
    const activePromises = [];

    console.log(`⚡ Processing ${chunks.length} chunks with ${concurrency} parallel workers`);

    for (let i = 0; i < concurrency; i++) {
      const promise = this.processChunkWorker(chunkQueue, importId, importStatus, options);
      activePromises.push(promise);
    }

    await Promise.all(activePromises);
  }

  async processChunkWorker(chunkQueue, importId, importStatus, options) {
    while (chunkQueue.length > 0) {
      const chunk = chunkQueue.shift();
      if (!chunk) break;

      try {
        await this.processSingleChunk(chunk, importId, importStatus, options);
      } catch (error) {
        console.error(`Error processing chunk ${chunk.index}:`, error);
        importStatus.errorRows += chunk.size;
        importStatus.errors.push({
          chunk: chunk.index,
          error: error.message,
          size: chunk.size
        });
      }

      // Update progress
      importStatus.chunksProcessed++;
      const progress = (importStatus.chunksProcessed / importStatus.chunksCreated) * 100;
      
      if (importStatus.chunksProcessed % 10 === 0) {
        console.log(`📈 Progress: ${Math.round(progress)}% (${importStatus.chunksProcessed}/${importStatus.chunksCreated} chunks)`);
      }

      // Memory management
      if (global.gc && importStatus.chunksProcessed % 50 === 0) {
        global.gc();
        importStatus.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      }
    }
  }

  async processSingleChunk(chunk, importId, importStatus, options) {
    // Read chunk data
    const chunkData = JSON.parse(fs.readFileSync(chunk.path, 'utf8'));
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 1000;
    const batches = this.createBatches(chunkData, batchSize);

    for (const batch of batches) {
      try {
        // Insert users using optimized bulk insert
        const insertedUsers = await this.bulkInsertOptimized(batch);
        importStatus.successRows += insertedUsers.length;
        importStatus.processedRows += batch.length;

        // Queue embedding generation for background processing
        await this.queueEmbeddingGeneration(insertedUsers, importId);

      } catch (batchError) {
        console.error(`Batch error in chunk ${chunk.index}:`, batchError);
        importStatus.errorRows += batch.length;
        importStatus.errors.push({
          chunk: chunk.index,
          batchError: batchError.message,
          batchSize: batch.length
        });
      }
    }

    // Cleanup chunk file
    fs.unlinkSync(chunk.path);
  }

  async bulkInsertOptimized(users) {
    const client = await this.db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Use optimized batch insert for maximum performance
      const batchInsertQuery = `
        INSERT INTO users (name, email, role, department, skills, bio, phone, location, metadata, created_at)
        SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::text[]), unnest($4::text[]),
               unnest($5::text[]), unnest($6::text[]), unnest($7::text[]), unnest($8::text[]),
               unnest($9::jsonb[]), unnest($10::timestamptz[])
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

      const names = users.map(u => u.name);
      const emails = users.map(u => u.email);
      const roles = users.map(u => u.role || '');
      const departments = users.map(u => u.department || '');
      const skills = users.map(u => u.skills || '');
      const bios = users.map(u => u.bio || '');
      const phones = users.map(u => u.phone || '');
      const locations = users.map(u => u.location || '');
      const metadata = users.map(u => JSON.stringify(u.metadata || {}));
      const timestamps = users.map(() => new Date().toISOString());

      const result = await client.query(batchInsertQuery, [
        names, emails, roles, departments, skills, bios, phones, locations, metadata, timestamps
      ]);
      
      await client.query('COMMIT');
      return result.rows; // Return inserted users
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Fallback to individual inserts if COPY fails
      console.warn('COPY failed, falling back to individual inserts:', error.message);
      return await this.fallbackBulkInsert(client, users);
      
    } finally {
      client.release();
    }
  }

  async fallbackBulkInsert(client, users) {
    const insertedUsers = [];
    
    for (const user of users) {
      try {
        const query = `
          INSERT INTO users (name, email, role, department, skills, bio, phone, location, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = NOW()
          RETURNING *;
        `;

        const values = [
          user.name, user.email, user.role, user.department,
          user.skills, user.bio, user.phone, user.location, user.metadata || {}
        ];

        const result = await client.query(query, values);
        insertedUsers.push(result.rows[0]);
        
      } catch (userError) {
        console.warn(`Failed to insert user ${user.email}:`, userError.message);
      }
    }
    
    return insertedUsers;
  }

  async queueEmbeddingGeneration(users, importId) {
    // Add to embedding queue for background processing
    const embeddingJobs = users.map(user => ({
      userId: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      skills: user.skills,
      bio: user.bio,
      importId: importId
    }));

    // Store in temporary table for background processing
    await this.db.query(`
      INSERT INTO embedding_queue (user_id, user_data, import_id, status, created_at)
      SELECT unnest($1::int[]), unnest($2::jsonb[]), $3, 'pending', NOW()
    `, [
      embeddingJobs.map(job => job.userId),
      embeddingJobs.map(job => JSON.stringify(job)),
      importId
    ]);
  }

  async generateEmbeddingsBackground(importId, importStatus) {
    importStatus.status = 'generating_embeddings';
    
    // Get pending embedding jobs
    const pendingJobs = await this.db.query(`
      SELECT * FROM embedding_queue 
      WHERE import_id = $1 AND status = 'pending'
      ORDER BY created_at
    `, [importId]);

    console.log(`🧠 Generating embeddings for ${pendingJobs.rows.length} users in background...`);

    // Process embeddings with worker pool
    const embeddingPromises = [];
    const jobChunks = this.createBatches(pendingJobs.rows, 100); // 100 embeddings per batch

    for (const chunk of jobChunks) {
      const promise = this.processEmbeddingChunk(chunk);
      embeddingPromises.push(promise);
    }

    await Promise.all(embeddingPromises);
    
    console.log(`✅ Completed embedding generation for import ${importId}`);
  }

  async processEmbeddingChunk(jobs) {
    const availableWorker = await this.getAvailableWorker();
    
    try {
      availableWorker.isAvailable = false;
      
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker timeout'));
        }, 60000); // 1 minute timeout

        availableWorker.once('message', (result) => {
          clearTimeout(timeout);
          resolve(result);
        });

        availableWorker.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        availableWorker.postMessage({
          type: 'generateEmbeddings',
          jobs: jobs.map(job => ({
            id: job.id,
            userId: job.user_id,
            userData: job.user_data
          }))
        });
      });

      // Save embeddings to database
      await this.saveEmbeddingResults(result.embeddings);
      
      // Mark jobs as completed
      const jobIds = jobs.map(job => job.id);
      await this.db.query(`
        UPDATE embedding_queue 
        SET status = 'completed', completed_at = NOW()
        WHERE id = ANY($1)
      `, [jobIds]);

    } finally {
      availableWorker.isAvailable = true;
    }
  }

  async getAvailableWorker() {
    return new Promise((resolve) => {
      const checkWorker = () => {
        const worker = this.workerPool.find(w => w.isAvailable);
        if (worker) {
          resolve(worker);
        } else {
          setTimeout(checkWorker, 100); // Check every 100ms
        }
      };
      checkWorker();
    });
  }

  async saveEmbeddingResults(embeddings) {
    const client = await this.db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const embedding of embeddings) {
        await client.query(`
          INSERT INTO user_vectors (user_id, content_type, content, embedding, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          embedding.userId,
          embedding.contentType,
          embedding.content,
          JSON.stringify(embedding.vector),
          embedding.metadata || {}
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  normalizeUserData(rawData, headers) {
    // Same normalization logic as before but optimized
    const user = {};
    
    const fieldMappings = {
      name: ['name', 'full_name', 'fullname', 'user_name', 'username', 'display_name'],
      email: ['email', 'email_address', 'mail', 'e_mail'],
      role: ['role', 'position', 'job_title', 'title', 'designation'],
      department: ['department', 'dept', 'division', 'team', 'group'],
      skills: ['skills', 'expertise', 'competencies', 'technologies'],
      bio: ['bio', 'biography', 'description', 'about', 'summary'],
      phone: ['phone', 'phone_number', 'mobile', 'contact'],
      location: ['location', 'office', 'site', 'city', 'address']
    };

    for (const [standardField, variations] of Object.entries(fieldMappings)) {
      for (const variation of variations) {
        const value = rawData[variation] || rawData[variation.toLowerCase()] || rawData[variation.toUpperCase()];
        if (value && value.toString().trim()) {
          user[standardField] = value.toString().trim();
          break;
        }
      }
    }

    if (!user.name) {
      throw new Error('Name field is required');
    }

    user.metadata = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (!Object.values(fieldMappings).flat().includes(key.toLowerCase()) && value) {
        user.metadata[key] = value.toString().trim();
      }
    }

    return user;
  }

  escapeCsvField(field) {
    if (!field) return '';
    const str = field.toString();
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  getImportStatus(importId) {
    return this.activeImports.get(importId) || null;
  }

  async getEnterpriseStats() {
    const stats = await this.db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as users_last_24h,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(DISTINCT department) as departments,
        COUNT(DISTINCT role) as roles
      FROM users
    `);

    const vectorStats = await this.db.query(`
      SELECT 
        COUNT(*) as total_vectors,
        COUNT(DISTINCT user_id) as users_with_vectors,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as vectors_last_hour
      FROM user_vectors
    `);

    return {
      users: stats.rows[0],
      vectors: vectorStats.rows[0],
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  async determineScalingConfig(filePath, options) {
    // Estimate records from file size (rough approximation)
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    const estimatedRecords = Math.round(fileSizeMB * 1000); // Rough estimate: 1000 records per MB
    
    let scalingConfig;
    
    if (options.scalingMode === 'manual' && options.customConfig) {
      // Manual configuration provided by user
      scalingConfig = this.adaptiveScaling.createCustomProfile({
        expectedRecords: options.expectedRecords || estimatedRecords,
        performancePriority: options.performancePriority || 'balanced',
        customSettings: options.customConfig
      });
      console.log('👤 Using manual configuration provided by user');
    } else if (options.scalingProfile) {
      // User selected a predefined profile
      const profiles = this.adaptiveScaling.getAllProfiles();
      const selectedProfile = profiles.find(p => p.name === options.scalingProfile);
      if (selectedProfile) {
        scalingConfig = selectedProfile;
        console.log(`📋 Using predefined profile: ${options.scalingProfile}`);
      } else {
        scalingConfig = this.adaptiveScaling.detectOptimalProfile(estimatedRecords, fileStats.size, options);
        console.log('🤖 Auto-detected configuration (invalid profile specified)');
      }
    } else {
      // Auto-detect optimal configuration
      scalingConfig = this.adaptiveScaling.detectOptimalProfile(estimatedRecords, fileStats.size, options);
      console.log('🤖 Auto-detected optimal configuration');
    }
    
    // Generate summary with recommendations
    const summary = this.adaptiveScaling.generateProfileSummary(scalingConfig, estimatedRecords);
    
    // Validate configuration
    if (!summary.validation.isValid) {
      throw new Error(`Invalid scaling configuration: ${summary.validation.errors.join(', ')}`);
    }
    
    // Apply warnings
    if (summary.validation.warnings.length > 0) {
      console.warn('⚠️ Configuration warnings:', summary.validation.warnings);
    }
    
    // Update instance settings
    this.maxWorkers = scalingConfig.maxWorkers;
    this.chunkSize = scalingConfig.chunkSize;
    
    return {
      profile: scalingConfig,
      summary,
      estimatedRecords,
      fileSize: fileStats.size
    };
  }

  getAvailableProfiles() {
    return this.adaptiveScaling.getAllProfiles();
  }

  validateCustomConfig(customConfig, expectedRecords = 0) {
    const profile = this.adaptiveScaling.createCustomProfile({
      expectedRecords,
      customSettings: customConfig
    });
    
    return this.adaptiveScaling.validateProfile(profile);
  }

  handleWorkerMessage(worker, result) {
    // Handle worker completion messages
    worker.isAvailable = true;
  }

  async cleanup() {
    // Cleanup worker pool
    for (const worker of this.workerPool) {
      await worker.terminate();
    }
    
    // Cleanup temp files
    const tempFiles = fs.readdirSync(this.tempDir);
    for (const file of tempFiles) {
      if (file.includes('_chunk_')) {
        fs.unlinkSync(path.join(this.tempDir, file));
      }
    }
  }
}

export default EnterpriseImportService;
