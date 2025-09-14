# Synapse AI - Complete Deployment Guide

## 🚀 Features Implemented

### ✅ Local AI Stack (No External APIs Required)
- **Ollama Integration**: Local LLM hosting (llama3.2, gemma2)
- **Local Embeddings**: Transformers.js with sentence-transformers
- **Offline Training**: Fine-tuning on your manual datasets
- **Model Management**: Switch between models, pull new ones

### ✅ Database & Vector Search
- **PostgreSQL + pgvector**: Production-ready vector database
- **Hybrid Search**: Combines semantic similarity with text search
- **Real-time Updates**: Live inventory and user management

### ✅ Data Import Pipeline
- **CSV/XLSX/JSON Import**: Stream processing for 50k+ user datasets
- **Auto-embedding Generation**: Background processing
- **Progress Tracking**: Real-time import status

### ✅ RAG Chat System
- **Context-Aware Responses**: Uses imported user data
- **Session Management**: Persistent chat history
- **Recommendations**: AI-powered user suggestions

### ✅ Microsoft Teams Integration
- **Teams Bot**: Full Bot Framework implementation
- **Adaptive Cards**: Rich user profiles and interactions
- **Tab App**: Web interface embedded in Teams

### ✅ Docker & On-Premise Ready
- **Multi-container Setup**: API, DB, AI models
- **Production Security**: Non-root users, health checks
- **Volume Management**: Persistent data storage

---

## 📋 Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo>
cd spares-copilot-ai
cp env.example .env
# Edit .env with your configurations
```

### 2. Development Setup
```bash
# Install dependencies
npm install

# Start local development
npm run server:migrate  # Initialize database
npm run server:start    # API server (port 8787)
npm run dev            # Frontend (port 5173)
```

### 3. Docker Deployment (Recommended)
```bash
# Start all services
docker-compose up -d

# Initialize models (one-time)
docker-compose --profile init up model-init

# View logs
docker-compose logs -f api
```

---

## 🗄️ Database Configuration

### PostgreSQL with pgvector
```bash
# Manual setup (if not using docker)
createdb synapse_ai
psql synapse_ai -c "CREATE EXTENSION vector;"

# Run migrations
npm run server:migrate
```

### Tables Created:
- `users` - User directory (50k+ users)
- `user_vectors` - Embeddings for semantic search
- `training_data` - AI training examples
- `chat_sessions` - Conversation history
- `chat_messages` - Message storage

---

## 🤖 Local AI Setup

### Option 1: Ollama (Recommended)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3.2:3b
ollama pull gemma2:2b
```

### Option 2: Docker Ollama
```bash
# Already included in docker-compose.yml
docker-compose up ollama
```

### Model Configuration:
- **Chat Model**: `llama3.2:3b` (default)
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2`
- **Switch Models**: Use `/api/models/switch` endpoint

---

## 📊 Data Import Process

### 1. Prepare Your Dataset (50k Users)
```csv
name,email,role,department,skills,bio,phone,location
John Doe,john@company.com,Engineer,IT,"Python,React,AWS",Full-stack developer,+1-555-0123,NYC
Jane Smith,jane@company.com,Manager,Sales,"Leadership,CRM,Strategy",Sales team lead,+1-555-0124,SF
```

### 2. Import via API
```bash
# Upload CSV/XLSX file
curl -X POST -F "file=@users.csv" \
  -F "batchSize=100" \
  http://localhost:8787/api/users/import

# Check import status
curl http://localhost:8787/api/users/import/{importId}/status
```

### 3. Import via Web Interface
1. Visit `/admin` page
2. Upload your file
3. Monitor progress in real-time

---

## 🧠 Training Your AI Model

### Automatic Training (Recommended)
```bash
# Trigger retraining with imported data
curl -X POST http://localhost:8787/api/train \
  -H "Content-Type: application/json" \
  -d '{"modelName": "synapse-custom"}'
```

### Manual Training Data
```javascript
// Generate training examples from user data
const trainingData = [
  {
    input: "Who works in engineering?",
    output: "John Doe works in engineering as a Senior Engineer...",
    metadata: { type: "department_search" }
  }
];

// Send to training endpoint
fetch('/api/training/data', {
  method: 'POST',
  body: JSON.stringify(trainingData)
});
```

### Training Workflow:
1. **Data Preparation**: Convert user records to Q&A pairs
2. **Embedding Generation**: Create vectors for semantic search
3. **Model Enhancement**: Use RAG (Retrieval-Augmented Generation)
4. **Fine-tuning**: Optional LoRA/QLoRA for specialized responses

---

## 🎯 RAG Chat System

### Chat API Usage
```javascript
// Send message to AI
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Find someone with Python skills",
    sessionId: "user-session-123",
    options: { contextLimit: 5 }
  })
});

const result = await response.json();
// Returns: response, relevant users, session info
```

### Search Capabilities:
- **Skills Search**: "Find Python developers"
- **Department Search**: "Who works in marketing?"
- **Role Search**: "Show me all managers"
- **Contextual**: "Tell me about John Doe"

---

## 🤝 Microsoft Teams Integration

### 1. Teams Bot Setup
```bash
# Set environment variables
MICROSOFT_APP_ID=your_app_id
MICROSOFT_APP_PASSWORD=your_app_password
MICROSOFT_APP_TENANT_ID=your_tenant_id
```

### 2. Bot Registration (Azure)
1. Create Azure Bot Resource
2. Get App ID and Password
3. Set messaging endpoint: `https://your-domain.com/bot/messages`

### 3. Teams App Manifest
```json
{
  "contentUrl": "https://your-domain.com/",
  "configurationUrl": "https://your-domain.com/teams-config",
  "validDomains": ["your-domain.com"]
}
```

### 4. Deploy and Install
1. Update `teams/manifest.json` with your domain
2. Add app icons to `teams/` folder
3. Zip and upload to Teams Admin Center

---

## 🐳 Production Deployment

### Docker Production Stack
```bash
# Production deployment
docker-compose --profile production up -d

# With SSL/HTTPS
# Edit nginx.conf with your SSL certificates
# Mount SSL certificates in docker-compose.yml
```

### Environment Configuration
```bash
# Production .env
NODE_ENV=production
DB_PASSWORD=secure_random_password
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# External URLs
API_URL=https://api.yourcompany.com
WEB_URL=https://synapse.yourcompany.com
```

### Security Checklist:
- [ ] Change default passwords
- [ ] Enable SSL/TLS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Implement rate limiting

---

## 🔧 API Endpoints

### User Management
```bash
# Import users
POST /api/users/import (multipart file)

# Search users
GET /api/users/search?q=python&limit=10

# Get all users
GET /api/users?department=IT&role=Engineer

# Download sample CSV
GET /api/users/sample
```

### Chat & RAG
```bash
# Chat with AI
POST /api/chat
Body: { message, sessionId, options }

# Chat history
GET /api/chat/{sessionId}/history

# Get recommendations
GET /api/recommendations?q=python+expert
```

### Model Management
```bash
# List available models
GET /api/models

# Switch model
POST /api/models/switch
Body: { modelName: "llama3.2:3b" }

# Trigger training
POST /api/train
Body: { modelName: "custom", options: {} }
```

### Teams Bot
```bash
# Bot messages endpoint
POST /bot/messages
```

---

## 📈 Performance & Scaling

### Database Optimization
- **Indexes**: Automated GIN and vector indexes
- **Connection Pooling**: 20 concurrent connections
- **Query Optimization**: Hybrid search with thresholds

### AI Performance
- **Model Caching**: Keep models in memory
- **Batch Processing**: Embedding generation in batches
- **GPU Support**: Ollama with NVIDIA GPU acceleration

### Monitoring
```bash
# Health checks
GET /api/health
GET /api/inventory/status

# Logs
docker-compose logs -f api
docker-compose logs -f postgres
```

---

## 🚀 SaaS Business Model

### B2B Deployment Options:

#### 1. **On-Premise License**
- Customer hosts on their infrastructure
- One-time license + annual support
- Full data control and privacy
- Price: $50k-200k depending on scale

#### 2. **Private Cloud**
- Managed deployment in customer's cloud account
- Monthly subscription: $5k-20k/month
- We manage, they own the infrastructure
- Includes updates and support

#### 3. **Hybrid SaaS**
- Core platform hosted by us
- Customer data stays on-premise
- API integration model
- Monthly per-user pricing: $10-50/user

### Sales Targeting:
- **Manufacturing Companies** (spare parts focus)
- **Large Enterprises** (employee directory search)
- **Professional Services** (expertise location)
- **Government Agencies** (secure, offline requirements)

### Competitive Advantages:
✅ **Offline First**: No external API dependencies  
✅ **Data Privacy**: Everything runs locally  
✅ **Customizable**: Train on customer's specific data  
✅ **Teams Native**: Built for Microsoft ecosystem  
✅ **Vector Search**: Modern AI-powered search  
✅ **Easy Deployment**: Docker-based, one-click setup  

---

## 📞 Support & Documentation

### Getting Help:
1. **Documentation**: This guide + inline code comments
2. **API Docs**: Available at `/api/docs` (Swagger)
3. **Docker Logs**: `docker-compose logs -f`
4. **Health Endpoints**: `/api/health`, `/api/models`

### Common Issues:
- **Models not loading**: Check Ollama service status
- **Import failures**: Verify CSV format and file size
- **Teams bot not responding**: Check app registration
- **Database connection**: Verify PostgreSQL and pgvector

### Next Steps:
1. Test with sample data
2. Import your 50k user dataset
3. Train custom model
4. Deploy to Teams
5. Set up production monitoring

**You now have a complete, offline-capable AI chatbot system that can be trained on your manual datasets and deployed as a B2B SaaS solution!** 🎉
