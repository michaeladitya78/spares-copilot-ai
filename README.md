# 🚀 Synapse AI Bot - Complete Enterprise Solution

A comprehensive AI-powered chatbot with enterprise-grade features including real-time processing, WebSocket support, image processing, and scalable data import capabilities.

## ✨ Features

### 🤖 Core AI Capabilities
- **RAG Chat**: Retrieval Augmented Generation with local AI (Ollama)
- **Vector Search**: PostgreSQL + pgvector for semantic search
- **Local AI**: No external API dependencies (Ollama + Transformers.js)
- **Enterprise Import**: Handle 10M+ records with adaptive scaling

### 🔌 Real-time Features
- **WebSocket Support**: Real-time bidirectional communication
- **Server-Sent Events**: Live updates for inventory and imports
- **Live Chat**: Instant messaging with AI responses
- **Real-time Inventory**: Live inventory tracking and updates

### 🖼️ Image Processing
- **OCR**: Text extraction from images (Tesseract.js)
- **Image Analysis**: Basic vision processing with Sharp
- **File Upload**: Support for images up to 100MB
- **Real-time Processing**: Sub-second image analysis

### 🏢 Enterprise Features
- **Adaptive Scaling**: Auto-adjusts for datasets 0-10M+ records
- **Redis Caching**: High-performance response caching
- **Database Pooling**: Optimized PostgreSQL connections
- **Background Processing**: Worker threads for heavy operations
- **API Documentation**: Live Swagger docs at `/api/docs`

### 🔧 Technical Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **Database**: PostgreSQL + pgvector + Redis
- **AI**: Ollama + Transformers.js + Langchain
- **Security**: Helmet + CORS + Rate limiting + Input validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- Ollama (for local AI)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/spares-copilot-ai.git
cd spares-copilot-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Start the development server**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server:start
```

5. **Access the bot**
- Frontend: http://localhost:5173
- Bot Interface: http://localhost:5173/bot
- API: http://localhost:8787/api/health
- WebSocket: ws://localhost:8787/ws

## 🧪 Testing

### Automated Testing
```bash
# Test all APIs
npm run test:all

# Test locally
npm run test:local

# Debug and validate
npm run debug
```

### Manual Testing
1. **Health Check**: `GET /api/health`
2. **Chat**: `POST /api/chat`
3. **WebSocket**: Connect to `ws://localhost:8787/ws`
4. **Image Upload**: `POST /api/images/upload`
5. **Data Import**: `POST /api/users/import/enterprise`

## 📡 API Endpoints

### Core APIs
- `GET /api/health` - Health check
- `POST /api/chat` - Chat with RAG AI
- `GET /api/enterprise/stats` - System statistics
- `GET /api/inventory/status` - Inventory status

### Data Management
- `POST /api/users/import/enterprise` - Import large datasets
- `GET /api/users/search` - Vector search users
- `GET /api/users/import/:id/status` - Import status
- `GET /api/parts` - Parts management

### Media Processing
- `POST /api/images/upload` - Image upload & OCR
- `GET /api/images/:id` - Retrieve images

### Real-time
- `WebSocket /ws` - Real-time communication
- `GET /api/events` - Server-sent events
- `GET /api/websocket/stats` - WebSocket statistics

### Documentation
- `GET /api/docs` - Swagger API documentation

## 🔌 WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8787/ws');

ws.onopen = () => {
  console.log('Connected to Synapse WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Message Types
- `subscribe` - Subscribe to channels
- `unsubscribe` - Unsubscribe from channels
- `chat` - Send chat messages
- `ping` - Health check
- `inventory_update` - Update inventory

### Channels
- `inventory` - Inventory updates
- `import` - Import progress
- `chat` - Chat messages

## 🏗️ Deployment

### Vercel (Recommended)
```bash
npm run deploy:vercel
```

### Railway
```bash
npm run deploy:railway
```

### Render
```bash
npm run deploy:render
```

### Docker Compose
```bash
docker-compose up -d
```

### Self-hosted
```bash
# Build
npm run build

# Start production server
NODE_ENV=production npm run server:start
```

## 🔧 Configuration

### Environment Variables
```env
# Server
PORT=8787
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# AI
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama2
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Cache
REDIS_URL=redis://localhost:6379

# Optional
GEMINI_API_KEY=your_key_here
```

### Scaling Configuration
```bash
# Get scaling profiles
curl /api/scaling/profiles

# Estimate for 1M records
curl -X POST /api/scaling/estimate \
  -H "Content-Type: application/json" \
  -d '{"totalRows": 1000000, "fileSize": 500}'
```

## 📊 Performance

### Benchmarks
- **API Response**: < 1 second
- **WebSocket Latency**: < 100ms
- **Image Processing**: < 30 seconds (100MB)
- **Database Queries**: < 500ms
- **Concurrent Users**: 100+

### Optimization Features
- Redis caching with TTL
- Database connection pooling
- HNSW vector indexing
- Background worker threads
- Response compression
- Static file serving

## 🛡️ Security

### Implemented Security
- Helmet security headers
- CORS configuration
- Rate limiting (1000 req/15min)
- Input validation
- SQL injection prevention
- XSS protection

### Best Practices
- Environment variable security
- API versioning
- Error handling
- Request logging
- Graceful shutdown

## 📈 Monitoring

### Health Checks
- `GET /api/health` - API health
- `GET /api/websocket/stats` - WebSocket status
- `GET /api/enterprise/stats` - System metrics

### Logging
- Morgan HTTP logging
- Error tracking
- Performance monitoring
- WebSocket connection tracking

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:all`
5. Submit a pull request

### Code Standards
- TypeScript for frontend
- ESLint for linting
- Prettier for formatting
- Conventional commits

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_COMPLETE.md)
- [Enterprise 10M+ Guide](ENTERPRISE_10M_GUIDE.md)
- [Customizable API Guide](CUSTOMIZABLE_ENTERPRISE_API.md)
- [API Documentation](http://localhost:8787/api/docs)

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   ```bash
   # Check if WebSocket is supported
   wscat -c ws://localhost:8787/ws
   ```

2. **Database Connection Issues**
   ```bash
   # Verify DATABASE_URL format
   psql $DATABASE_URL -c "SELECT version();"
   ```

3. **AI Model Loading**
   ```bash
   # Check Ollama status
   ollama list
   curl http://localhost:11434/api/tags
   ```

4. **File Upload Issues**
   - Check file size limits (100MB max)
   - Verify disk space
   - Check multer configuration

### Debug Commands
```bash
# Check service status
curl http://localhost:8787/api/health

# Test WebSocket
wscat -c ws://localhost:8787/ws

# Check database
psql $DATABASE_URL -c "SELECT version();"

# Test Redis
redis-cli -u $REDIS_URL ping
```

## 📞 Support

### Quick Commands
```bash
# Start development
npm run dev & npm run server:start

# Test everything
npm run test:local

# Debug issues
npm run debug

# Deploy to Vercel
npm run deploy:vercel
```

### Useful URLs
- Bot Interface: `/bot`
- API Docs: `/api/docs`
- Health Check: `/api/health`
- WebSocket: `/ws`
- Enterprise Stats: `/api/enterprise/stats`

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Ollama for local AI capabilities
- PostgreSQL team for pgvector
- React team for the frontend framework
- Express.js for the backend framework

---

🎉 **Ready to deploy your enterprise AI bot!**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/spares-copilot-ai)
[![Deploy with Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)
[![Deploy with Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)