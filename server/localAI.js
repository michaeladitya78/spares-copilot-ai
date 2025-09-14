import { pipeline, env } from '@xenova/transformers';
import { Ollama } from 'ollama';
import fs from 'fs';
import path from 'path';

// Configure transformers to use local models
env.allowLocalModels = true;
env.allowRemoteModels = true;

class LocalAIProvider {
  constructor() {
    this.ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });
    this.embeddingModel = null;
    this.chatModel = process.env.LOCAL_CHAT_MODEL || 'llama3.2:3b';
    this.embeddingModelName = process.env.LOCAL_EMBEDDING_MODEL || 'all-MiniLM-L6-v2';
    this.isInitialized = false;
    this.trainingDataPath = path.join(process.cwd(), 'training_data');
    
    // Ensure training data directory exists
    if (!fs.existsSync(this.trainingDataPath)) {
      fs.mkdirSync(this.trainingDataPath, { recursive: true });
    }
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Local AI Provider...');
      
      // Initialize embedding model
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'sentence-transformers/all-MiniLM-L6-v2',
        { 
          device: 'cpu',
          dtype: 'fp32'
        }
      );

      // Check if Ollama is available and chat model exists
      try {
        const models = await this.ollama.list();
        const hasModel = models.models.some(m => m.name.includes(this.chatModel.split(':')[0]));
        
        if (!hasModel) {
          console.log(`📥 Pulling ${this.chatModel} model...`);
          await this.ollama.pull({ model: this.chatModel });
        }
      } catch (ollamaError) {
        console.warn('⚠️ Ollama not available, will use embedding-only mode:', ollamaError.message);
      }

      this.isInitialized = true;
      console.log('✅ Local AI Provider initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Local AI Provider:', error);
      throw error;
    }
  }

  async generateEmbedding(text) {
    if (!this.embeddingModel) {
      await this.initialize();
    }

    try {
      const output = await this.embeddingModel(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async generateBatchEmbeddings(texts, batchSize = 10) {
    const embeddings = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchEmbeddings = await Promise.all(batchPromises);
      embeddings.push(...batchEmbeddings);
      
      // Progress logging
      console.log(`📊 Generated embeddings for ${Math.min(i + batchSize, texts.length)}/${texts.length} texts`);
    }
    
    return embeddings;
  }

  async chat(messages, options = {}) {
    try {
      const response = await this.ollama.chat({
        model: this.chatModel,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || 1000,
          ...options
        }
      });

      return response.message.content;
    } catch (error) {
      console.error('Chat generation error:', error);
      throw new Error('Failed to generate chat response');
    }
  }

  async prepareTrainingData(rawData, format = 'conversational') {
    const trainingExamples = [];

    for (const item of rawData) {
      if (format === 'conversational') {
        // Convert user data to Q&A format for fine-tuning
        const userInfo = `Name: ${item.name || 'Unknown'}, Role: ${item.role || 'User'}, Department: ${item.department || 'General'}`;
        const context = item.context || item.description || item.bio || '';
        
        trainingExamples.push({
          input: `Tell me about ${item.name}`,
          output: `${userInfo}. ${context}`,
          metadata: {
            user_id: item.id,
            department: item.department,
            role: item.role
          }
        });

        // Add variations for better training
        if (item.skills) {
          trainingExamples.push({
            input: `What are ${item.name}'s skills?`,
            output: `${item.name} has the following skills: ${item.skills}`,
            metadata: { user_id: item.id, type: 'skills' }
          });
        }

        if (item.department) {
          trainingExamples.push({
            input: `Who works in ${item.department}?`,
            output: `${item.name} works in ${item.department} as a ${item.role || 'team member'}`,
            metadata: { user_id: item.id, type: 'department' }
          });
        }
      }
    }

    return trainingExamples;
  }

  async saveTrainingData(trainingExamples, filename = 'training_data.jsonl') {
    const filepath = path.join(this.trainingDataPath, filename);
    const jsonlData = trainingExamples.map(example => JSON.stringify(example)).join('\n');
    
    fs.writeFileSync(filepath, jsonlData, 'utf8');
    console.log(`💾 Saved ${trainingExamples.length} training examples to ${filepath}`);
    
    return filepath;
  }

  async createModelfile(baseModel, trainingDataPath, customModelName) {
    const modelfile = `
FROM ${baseModel}

# Custom system prompt for your domain
SYSTEM """You are Synapse AI, an intelligent assistant for spare parts management and user information. You help with:
- Finding and identifying spare parts
- Managing inventory and warranty information  
- Providing user directory information
- Answering technical questions about assembly machines

Always be helpful, accurate, and concise in your responses."""

# Training data integration
ADAPTER ${trainingDataPath}

# Model parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096
`;

    const modelfilePath = path.join(this.trainingDataPath, `${customModelName}.modelfile`);
    fs.writeFileSync(modelfilePath, modelfile.trim(), 'utf8');
    
    console.log(`📝 Created Modelfile at ${modelfilePath}`);
    return modelfilePath;
  }

  async trainModel(trainingData, customModelName = 'synapse-custom') {
    try {
      console.log('🚀 Starting local model training process...');
      
      // Prepare training data
      const trainingExamples = await this.prepareTrainingData(trainingData);
      const trainingDataPath = await this.saveTrainingData(trainingExamples, `${customModelName}-data.jsonl`);
      
      // For local training, we'll use a simplified approach with Ollama
      // In production, you'd integrate with tools like Axolotl, LLaMA-Factory, or custom LoRA training
      
      console.log('📚 Training data prepared. For advanced fine-tuning:');
      console.log(`1. Use training data at: ${trainingDataPath}`);
      console.log('2. Consider tools like Axolotl, LLaMA-Factory, or Unsloth for LoRA fine-tuning');
      console.log('3. For immediate use, the data will be used for RAG-enhanced responses');
      
      // Create embeddings for all training examples for RAG
      const texts = trainingExamples.map(ex => `${ex.input} ${ex.output}`);
      const embeddings = await this.generateBatchEmbeddings(texts);
      
      return {
        success: true,
        trainingDataPath,
        embeddingsGenerated: embeddings.length,
        customModelName,
        message: 'Training data prepared and embeddings generated for RAG-enhanced responses'
      };
      
    } catch (error) {
      console.error('Training error:', error);
      throw new Error(`Training failed: ${error.message}`);
    }
  }

  async listAvailableModels() {
    try {
      const ollamaModels = await this.ollama.list();
      return {
        chat_models: ollamaModels.models,
        embedding_model: this.embeddingModelName,
        custom_models: this.getCustomModels()
      };
    } catch (error) {
      console.error('Error listing models:', error);
      return {
        chat_models: [],
        embedding_model: this.embeddingModelName,
        custom_models: []
      };
    }
  }

  getCustomModels() {
    try {
      const files = fs.readdirSync(this.trainingDataPath);
      return files.filter(f => f.endsWith('.jsonl') || f.endsWith('.modelfile'));
    } catch (error) {
      return [];
    }
  }

  async switchModel(modelName) {
    try {
      // Verify model exists
      const models = await this.ollama.list();
      const modelExists = models.models.some(m => m.name.includes(modelName));
      
      if (!modelExists) {
        // Try to pull the model
        console.log(`📥 Pulling ${modelName} model...`);
        await this.ollama.pull({ model: modelName });
      }
      
      this.chatModel = modelName;
      console.log(`🔄 Switched to model: ${modelName}`);
      return { success: true, currentModel: modelName };
      
    } catch (error) {
      console.error('Model switch error:', error);
      throw new Error(`Failed to switch to model: ${modelName}`);
    }
  }

  async generateResponse(prompt, context = [], options = {}) {
    // Enhanced RAG response using local models
    const messages = [
      {
        role: 'system',
        content: 'You are Synapse AI, an intelligent assistant for spare parts management and user information. Use the provided context to give accurate, helpful responses.'
      }
    ];

    if (context.length > 0) {
      messages.push({
        role: 'system', 
        content: `Context information:\n${context.map(c => `- ${c}`).join('\n')}`
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    return await this.chat(messages, options);
  }
}

export default LocalAIProvider;
