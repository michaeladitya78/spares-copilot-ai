import { parentPort } from 'worker_threads';
import { pipeline, env } from '@xenova/transformers';

// Configure transformers for worker environment
env.allowLocalModels = true;
env.allowRemoteModels = true;

class EmbeddingWorker {
  constructor() {
    this.embeddingModel = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      console.log(`🔧 Worker ${process.pid} initializing embedding model...`);
      
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'sentence-transformers/all-MiniLM-L6-v2',
        { 
          device: 'cpu',
          dtype: 'fp32'
        }
      );

      this.isInitialized = true;
      console.log(`✅ Worker ${process.pid} embedding model ready`);
      
    } catch (error) {
      console.error(`❌ Worker ${process.pid} initialization failed:`, error);
      throw error;
    }
  }

  async generateEmbedding(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const output = await this.embeddingModel(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error(`Worker ${process.pid} embedding error:`, error);
      throw error;
    }
  }

  async processEmbeddingBatch(jobs) {
    const results = [];

    for (const job of jobs) {
      try {
        const userData = job.userData;
        const embeddings = [];

        // Generate embeddings for different content types
        const contentTypes = [
          {
            type: 'profile',
            content: `${userData.name} works as ${userData.role || 'unknown role'} in ${userData.department || 'unknown department'}`
          },
          {
            type: 'skills',
            content: userData.skills || ''
          },
          {
            type: 'bio',
            content: userData.bio || ''
          },
          {
            type: 'full_profile',
            content: `${userData.name} ${userData.role || ''} ${userData.department || ''} ${userData.skills || ''} ${userData.bio || ''}`.trim()
          }
        ];

        for (const { type, content } of contentTypes) {
          if (content.trim()) {
            const vector = await this.generateEmbedding(content);
            embeddings.push({
              userId: job.userId,
              contentType: type,
              content: content,
              vector: vector,
              metadata: {
                jobId: job.id,
                importId: job.importId || null,
                generatedAt: new Date().toISOString()
              }
            });
          }
        }

        results.push(...embeddings);

      } catch (error) {
        console.error(`Worker ${process.pid} job error for user ${job.userId}:`, error);
        // Continue with other jobs even if one fails
      }
    }

    return results;
  }
}

// Initialize worker
const worker = new EmbeddingWorker();

// Handle messages from main thread
parentPort.on('message', async (message) => {
  try {
    const { type, jobs } = message;

    if (type === 'generateEmbeddings') {
      const embeddings = await worker.processEmbeddingBatch(jobs);
      
      parentPort.postMessage({
        success: true,
        embeddings: embeddings,
        processedJobs: jobs.length
      });
    } else {
      parentPort.postMessage({
        success: false,
        error: `Unknown message type: ${type}`
      });
    }

  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Handle worker shutdown
process.on('SIGTERM', () => {
  console.log(`🔄 Worker ${process.pid} shutting down...`);
  process.exit(0);
});

console.log(`🚀 Embedding worker ${process.pid} started`);
