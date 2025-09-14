# 🚀 Complete Deployment Guide - Synapse AI Bot

## Overview
This guide covers deploying the complete Synapse AI Bot with all APIs, WebSocket support, and enterprise features.

## 🏗️ Architecture
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **Database**: PostgreSQL + pgvector
- **AI**: Local Ollama + Transformers.js
- **Cache**: Redis
- **Real-time**: WebSocket + Server-Sent Events

## 📋 Pre-deployment Checklist

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration
```

### 2. Database Setup
```bash
# Run migrations
npm run server:migrate

# Pull AI models (optional, for local AI)
npm run models:pull
```

### 3. Test Locally
```bash
# Start development server
npm run dev

# Start API server (in another terminal)
npm run server:start

# Test all APIs
npm run test:local
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Frontend + API)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
npm run deploy:vercel
```

3. **Configure Environment Variables**
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add all variables from `.env`

4. **Access URLs**
- Frontend: `https://your-project.vercel.app`
- Bot Interface: `https://your-project.vercel.app/bot`
- API: `https://your-project.vercel.app/api/*`
- WebSocket: `wss://your-project.vercel.app/ws`

### Option 2: Railway (Full-stack with Database)

1. **Install Railway CLI**
```bash
npm i -g @railway/cli
```

2. **Deploy**
```bash
railway login
railway init
npm run deploy:railway
```

3. **Add Database**
```bash
railway add postgresql
railway add redis
```

4. **Configure Environment**
- Railway automatically provides `DATABASE_URL` and `REDIS_URL`
- Set other variables in Railway dashboard

### Option 3: Render (Enterprise Scale)

1. **Create Services**
- Web Service (API)
- Static Site (Frontend)
- PostgreSQL Database
- Redis Cache

2. **Deploy**
```bash
npm run deploy:render
```

3. **Configure**
- Set environment variables in Render dashboard
- Configure custom domains if needed

### Option 4: Docker Compose (Self-hosted)

1. **Build and Start**
```bash
docker-compose up -d
```

2. **Access**
- Frontend: `http://localhost:80`
- API: `http://localhost:8787`
- WebSocket: `ws://localhost:8787/ws`

## 🧪 Testing Deployment

### Automated Testing
```bash
# Test local deployment
npm run test:local

# Test remote deployment
TEST_URL=https://your-deployment-url npm run test:all
```

### Manual Testing Checklist

#### ✅ Core APIs
- [ ] Health check: `GET /api/health`
- [ ] Chat: `POST /api/chat`
- [ ] User search: `GET /api/users/search?q=test`
- [ ] Enterprise stats: `GET /api/enterprise/stats`
- [ ] Inventory status: `GET /api/inventory/status`

#### ✅ WebSocket
- [ ] Connection: `ws://your-url/ws`
- [ ] Chat messages
- [ ] Inventory updates
- [ ] Real-time notifications

#### ✅ File Operations
- [ ] Enterprise import: `POST /api/users/import/enterprise`
- [ ] Image upload: `POST /api/images/upload`
- [ ] Import status: `GET /api/users/import/:id/status`

#### ✅ Bot Interface
- [ ] Access: `https://your-url/bot`
- [ ] Chat functionality
- [ ] File upload
- [ ] Real-time updates
- [ ] WebSocket connection status

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
curl https://your-url/api/scaling/profiles

# Estimate for 1M records
curl -X POST https://your-url/api/scaling/estimate \
  -H "Content-Type: application/json" \
  -d '{"totalRows": 1000000, "fileSize": 500}'
```

## 📊 Monitoring

### Health Checks
- API Health: `GET /api/health`
- WebSocket Stats: `GET /api/websocket/stats`
- Enterprise Stats: `GET /api/enterprise/stats`

### Logs
- Vercel: Built-in logging
- Railway: `railway logs`
- Render: Dashboard logs
- Docker: `docker-compose logs -f`

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if WebSocket is supported by your hosting provider
   - Verify firewall settings
   - Test with `wscat` tool

2. **Database Connection Issues**
   - Verify `DATABASE_URL` format
   - Check database accessibility
   - Run migrations: `npm run server:migrate`

3. **AI Model Loading**
   - Ensure Ollama is running locally
   - Check model availability: `ollama list`
   - Verify `OLLAMA_HOST` setting

4. **File Upload Issues**
   - Check file size limits (100MB max)
   - Verify multer configuration
   - Check disk space

### Debug Commands
```bash
# Check service status
curl https://your-url/api/health

# Test WebSocket
wscat -c wss://your-url/ws

# Check database
psql $DATABASE_URL -c "SELECT version();"

# Test Redis
redis-cli -u $REDIS_URL ping
```

## 🔐 Security

### Production Security
- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] CORS configured
- [ ] Helmet security headers
- [ ] Input validation enabled

### API Security
- [ ] Authentication (if needed)
- [ ] API versioning
- [ ] Error handling
- [ ] Request logging
- [ ] Graceful shutdown

## 📈 Performance

### Optimization Checklist
- [ ] Redis caching enabled
- [ ] Database indexing (HNSW, GIN)
- [ ] Compression enabled
- [ ] Static file serving optimized
- [ ] WebSocket connection pooling

### Monitoring
- Response times < 1 second
- WebSocket latency < 100ms
- Database query performance
- Memory usage monitoring

## 🎯 Success Criteria

### ✅ Deployment Success
- [ ] All APIs responding correctly
- [ ] WebSocket connections working
- [ ] Bot interface accessible
- [ ] File uploads functional
- [ ] Real-time updates working
- [ ] Database operations successful
- [ ] AI responses generating
- [ ] No critical errors in logs

### ✅ Performance Targets
- [ ] API response time < 1 second
- [ ] WebSocket latency < 100ms
- [ ] File upload < 30 seconds (100MB)
- [ ] Database queries < 500ms
- [ ] Concurrent users: 100+

## 🚀 Go Live Checklist

1. **Final Testing**
   ```bash
   npm run test:all
   ```

2. **Deploy to Production**
   ```bash
   npm run deploy:vercel  # or your chosen platform
   ```

3. **Verify Deployment**
   - Test all endpoints
   - Check WebSocket functionality
   - Verify bot interface
   - Monitor logs for errors

4. **Share Access**
   - Frontend URL: `https://your-url`
   - Bot Interface: `https://your-url/bot`
   - API Documentation: `https://your-url/api/docs`
   - WebSocket: `wss://your-url/ws`

5. **Monitor & Maintain**
   - Set up monitoring alerts
   - Regular health checks
   - Performance monitoring
   - Security updates

## 📞 Support

### Quick Commands
```bash
# Start local development
npm run dev & npm run server:start

# Test everything
npm run test:local

# Deploy to Vercel
npm run deploy:vercel

# Check logs
vercel logs --follow
```

### Useful URLs
- Bot Interface: `/bot`
- API Docs: `/api/docs`
- Health Check: `/api/health`
- WebSocket: `/ws`
- Enterprise Stats: `/api/enterprise/stats`

---

🎉 **Your Synapse AI Bot is now ready for production!**
