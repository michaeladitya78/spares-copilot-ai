import { randomUUID } from 'crypto';

class RAGService {
  constructor(database, aiProvider) {
    this.db = database;
    this.ai = aiProvider;
  }

  async processQuery(query, sessionId = null, options = {}) {
    try {
      // Generate session ID if not provided
      if (!sessionId) {
        sessionId = randomUUID();
      }

      // Store user message
      await this.db.insertChatMessage(sessionId, 'user', query);

      // Generate query embedding
      const queryEmbedding = await this.ai.generateEmbedding(query);

      // Retrieve relevant context using hybrid search
      const relevantUsers = await this.db.hybridUserSearch(query, queryEmbedding, options.contextLimit || 5);

      // Build context for the AI model
      const context = this.buildContext(relevantUsers, query);

      // Generate response using local AI
      const response = await this.ai.generateResponse(query, context, options);

      // Store assistant response
      await this.db.insertChatMessage(sessionId, 'assistant', response, {
        relevant_users: relevantUsers.map(u => ({ id: u.id, name: u.name, similarity: u.similarity || u.combined_score })),
        context_length: context.length
      });

      return {
        response,
        sessionId,
        relevantUsers: relevantUsers.slice(0, 3), // Return top 3 for UI display
        contextUsed: context.length > 0
      };

    } catch (error) {
      console.error('RAG query processing error:', error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }

  buildContext(relevantUsers, query) {
    if (!relevantUsers || relevantUsers.length === 0) {
      return [];
    }

    const context = [];

    for (const user of relevantUsers) {
      let userContext = `${user.name}`;
      
      if (user.role) userContext += ` - ${user.role}`;
      if (user.department) userContext += ` (${user.department})`;
      
      if (user.skills) userContext += `\nSkills: ${user.skills}`;
      if (user.bio) userContext += `\nBio: ${user.bio}`;
      if (user.location) userContext += `\nLocation: ${user.location}`;
      if (user.phone) userContext += `\nContact: ${user.phone}`;
      
      // Add similarity score for context
      if (user.similarity) {
        userContext += `\nRelevance: ${(user.similarity * 100).toFixed(1)}%`;
      } else if (user.combined_score) {
        userContext += `\nRelevance: ${(user.combined_score * 100).toFixed(1)}%`;
      }

      context.push(userContext);
    }

    return context;
  }

  async getChatHistory(sessionId, limit = 20) {
    try {
      const messages = await this.db.getChatHistory(sessionId, limit);
      return messages;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw new Error('Failed to fetch chat history');
    }
  }

  async searchUsers(query, options = {}) {
    try {
      const limit = options.limit || 10;
      const threshold = options.threshold || 0.5;

      // Generate embedding for the search query
      const queryEmbedding = await this.ai.generateEmbedding(query);

      // Perform hybrid search
      const results = await this.db.hybridUserSearch(query, queryEmbedding, limit);

      // Filter by threshold if using vector similarity
      const filteredResults = results.filter(user => 
        (user.similarity || 0) >= threshold || 
        (user.text_rank || 0) > 0
      );

      return {
        query,
        results: filteredResults,
        totalFound: filteredResults.length
      };

    } catch (error) {
      console.error('User search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async generateTrainingData(users, options = {}) {
    try {
      const trainingExamples = [];
      const format = options.format || 'conversational';

      for (const user of users) {
        // Basic user information queries
        trainingExamples.push({
          input: `Tell me about ${user.name}`,
          output: this.generateUserSummary(user),
          metadata: { user_id: user.id, type: 'profile' }
        });

        trainingExamples.push({
          input: `Who is ${user.name}?`,
          output: this.generateUserSummary(user),
          metadata: { user_id: user.id, type: 'profile' }
        });

        // Skills-based queries
        if (user.skills) {
          trainingExamples.push({
            input: `What are ${user.name}'s skills?`,
            output: `${user.name} has expertise in: ${user.skills}`,
            metadata: { user_id: user.id, type: 'skills' }
          });

          const skillList = user.skills.split(',').map(s => s.trim());
          for (const skill of skillList) {
            trainingExamples.push({
              input: `Who knows ${skill}?`,
              output: `${user.name} has experience with ${skill}. ${user.role ? `They work as a ${user.role}` : ''} ${user.department ? `in the ${user.department} department` : ''}.`,
              metadata: { user_id: user.id, type: 'skill_lookup', skill }
            });
          }
        }

        // Department-based queries
        if (user.department) {
          trainingExamples.push({
            input: `Who works in ${user.department}?`,
            output: `${user.name} works in the ${user.department} department as a ${user.role || 'team member'}.`,
            metadata: { user_id: user.id, type: 'department' }
          });
        }

        // Role-based queries
        if (user.role) {
          trainingExamples.push({
            input: `Who is the ${user.role}?`,
            output: `${user.name} is a ${user.role}${user.department ? ` in the ${user.department} department` : ''}.`,
            metadata: { user_id: user.id, type: 'role' }
          });
        }

        // Contact information queries
        if (user.phone) {
          trainingExamples.push({
            input: `How can I contact ${user.name}?`,
            output: `You can contact ${user.name} at ${user.phone}${user.email ? ` or ${user.email}` : ''}.`,
            metadata: { user_id: user.id, type: 'contact' }
          });
        }

        // Location-based queries
        if (user.location) {
          trainingExamples.push({
            input: `Where is ${user.name} located?`,
            output: `${user.name} is located in ${user.location}.`,
            metadata: { user_id: user.id, type: 'location' }
          });
        }
      }

      // Save training data to database
      for (const example of trainingExamples) {
        await this.db.insertTrainingData(example.input, example.output, example.metadata);
      }

      console.log(`📚 Generated ${trainingExamples.length} training examples from ${users.length} users`);
      return trainingExamples;

    } catch (error) {
      console.error('Training data generation error:', error);
      throw new Error(`Failed to generate training data: ${error.message}`);
    }
  }

  generateUserSummary(user) {
    let summary = `${user.name}`;
    
    if (user.role && user.department) {
      summary += ` is a ${user.role} in the ${user.department} department`;
    } else if (user.role) {
      summary += ` works as a ${user.role}`;
    } else if (user.department) {
      summary += ` works in the ${user.department} department`;
    }

    if (user.skills) {
      summary += `. Their skills include: ${user.skills}`;
    }

    if (user.bio) {
      summary += `. ${user.bio}`;
    }

    if (user.location) {
      summary += ` They are located in ${user.location}.`;
    }

    return summary;
  }

  async retrain(options = {}) {
    try {
      console.log('🔄 Starting model retraining process...');

      // Get all users
      const allUsersQuery = await this.db.query('SELECT * FROM users WHERE status = $1', ['active']);
      const users = allUsersQuery.rows;

      if (users.length === 0) {
        throw new Error('No users found for training');
      }

      // Generate training data
      const trainingData = await this.generateTrainingData(users, options);

      // Trigger local model training
      const trainingResult = await this.ai.trainModel(users, options.modelName || 'synapse-retrained');

      console.log('✅ Retraining completed successfully');
      return {
        success: true,
        usersProcessed: users.length,
        trainingExamples: trainingData.length,
        modelInfo: trainingResult
      };

    } catch (error) {
      console.error('Retraining error:', error);
      throw new Error(`Retraining failed: ${error.message}`);
    }
  }

  async getRecommendations(query, options = {}) {
    try {
      const queryEmbedding = await this.ai.generateEmbedding(query);
      const users = await this.db.searchUsersByVector(queryEmbedding, options.limit || 5, options.threshold || 0.6);

      const recommendations = users.map(user => ({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          department: user.department,
          skills: user.skills
        },
        similarity: user.similarity,
        reason: this.generateRecommendationReason(user, query)
      }));

      return recommendations;

    } catch (error) {
      console.error('Recommendations error:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  generateRecommendationReason(user, query) {
    const reasons = [];
    
    if (user.skills && query.toLowerCase().includes('skill')) {
      reasons.push(`Has relevant skills: ${user.skills}`);
    }
    
    if (user.role && query.toLowerCase().includes(user.role.toLowerCase())) {
      reasons.push(`Matches role: ${user.role}`);
    }
    
    if (user.department && query.toLowerCase().includes(user.department.toLowerCase())) {
      reasons.push(`Works in: ${user.department}`);
    }

    if (reasons.length === 0) {
      reasons.push('Content similarity match');
    }

    return reasons.join(', ');
  }
}

export default RAGService;
