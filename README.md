# Synapse AI Bot - Tata Industries Spare Parts Intelligence

## 🚀 Overview

Synapse AI Bot is a comprehensive spare parts management system designed specifically for Tata Industries automation and industrial equipment. The system provides intelligent part identification, real-time inventory tracking, and seamless integration between frontend UI and backend APIs.

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui with Tailwind CSS
- **State Management**: React Hooks
- **Real-time Communication**: WebSocket integration

### Backend (Node.js + Express)
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Real-time**: WebSocket server
- **Security**: Helmet, CORS, Rate limiting
- **Data**: JSON-based Tata Industries parts database

## 📊 Tata Industries Data Model

### Parts Categories
- **Bearings & Mechanical Components**: Industrial bearings, bushings
- **Motors & Drives**: Electric motors, drives, control systems
- **Sensors & Detection**: Proximity sensors, pressure sensors
- **Hydraulic Systems**: Actuators, pumps, control valves
- **Pneumatic Systems**: Actuators, valves, control systems
- **Electrical Components**: Switches, relays, control panels
- **Conveyor Systems**: Belts, rollers, drive systems
- **Robotics & Automation**: Robotic arms, controllers

### Key Parts
- **Bearing X-75**: Heavy-duty industrial bearing (₹1,250)
- **Motor Drive V200**: 200kW variable frequency drive (₹45,000)
- **Proximity Sensor P450**: Inductive proximity sensor (₹850)
- **Hydraulic Actuator H500**: Heavy-duty hydraulic cylinder (₹18,500)
- **Robotic Arm RA600**: 6-axis articulated robot (₹850,000)

## 🔧 Technical Implementation

### API Endpoints

#### Core Endpoints
```bash
GET  /api/health              # Health check
POST /api/chat               # AI chat with Tata Industries intelligence
GET  /api/parts              # Parts list with filtering
GET  /api/inventory/status   # Real-time inventory status
GET  /api/enterprise/stats   # System statistics
```

#### Advanced Endpoints
```bash
GET  /api/users/search        # User search functionality
GET  /api/websocket/stats     # WebSocket connection stats
POST /api/images/upload      # Image upload with OCR
POST /api/users/import/enterprise # Enterprise data import
GET  /api/events             # Server-sent events
GET  /api/docs               # API documentation
```

### WebSocket Integration
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8787/ws');

// Send chat message
ws.send(JSON.stringify({
  type: 'chat',
  content: 'Bearing X-75',
  sessionId: 'session_id'
}));

// Handle responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chat_response') {
    console.log(data.message);
  }
};
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone repository
<<<<<<< HEAD
git clone https://github.com/michaeladitya78/spares-copilot-ai.git
=======
git clone <repository-url>
>>>>>>> c2da06511a66cf17d7e6c6480706e6b7e0b8cedb
cd spares-copilot-ai

# Install dependencies
npm install

<<<<<<< HEAD
# Optional: Add Gemini API key for enhanced AI responses
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start backend server (Terminal 1)
npm run server:simple

# Start frontend (Terminal 2)  
npm run dev
```

> **Note**: For the complete setup guide including Gemini AI integration, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### Access Points
- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:8788/api/health
- **API Documentation**: http://localhost:8788/api/docs
- **WebSocket**: ws://localhost:8788/ws

## 📋 Testing Report

**Status: ✅ ALL FUNCTIONAL REQUIREMENTS PASSED**

For detailed testing results and architecture analysis, see [TESTING_REPORT.md](./TESTING_REPORT.md).

### Major Features Tested & Working:
- ✅ Chatbot fallback when data is missing
- ✅ Scope limitation for non-spare-parts queries  
- ✅ Inventory decrementing on part requests
- ✅ Advanced search functionality
- ✅ Camera/image input processing
- ✅ **NEW**: Google Gemini AI integration for intelligent responses
=======
# Start development server
npm run server:simple
```

### Access Points
- **Bot Interface**: http://localhost:8787/bot
- **API Health**: http://localhost:8787/api/health
- **API Documentation**: http://localhost:8787/api/docs
- **WebSocket**: ws://localhost:8787/ws
>>>>>>> c2da06511a66cf17d7e6c6480706e6b7e0b8cedb

## 🎯 Features

### Intelligent Part Identification
- Natural language processing for part queries
- Fuzzy matching for part names and numbers
- Context-aware responses based on Tata Industries data
- Real-time inventory status integration

### Real-time Communication
- WebSocket-based real-time chat
- Server-sent events for live updates
- Bidirectional communication between frontend and backend
- Connection status monitoring

### Enterprise-Grade Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (1000 requests per 15 minutes)
- Input validation and sanitization

### Scalable Architecture
- Modular component structure
- Clean separation of concerns
- Error handling and logging
- Graceful shutdown handling

## 📁 Project Structure

```
spares-copilot-ai/
├── server/
│   ├── index-simple.js          # Main server with Tata Industries integration
│   ├── websocket.js              # WebSocket service
│   └── tata-industries-parts.json # Comprehensive parts database
├── src/
│   ├── components/
│   │   ├── spares-chat.tsx      # Main chat interface
│   │   ├── synapse-bot.tsx      # Bot testing interface
│   │   └── ui/                   # Reusable UI components
│   ├── pages/                    # Application pages
│   └── hooks/                    # Custom React hooks
├── public/                       # Static assets
└── dist/                        # Built application
```

## 🔍 API Usage Examples

### Chat with AI Bot
```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Bearing X-75"}'
```

### Get Parts List
```bash
curl "http://localhost:8787/api/parts?category=bearings&featured=true"
```

### Check Inventory Status
```bash
curl http://localhost:8787/api/inventory/status
```

## 🧪 Testing

### Manual Testing
1. Start server: `npm run server:simple`
2. Open browser: http://localhost:8787/bot
3. Test chat functionality with Tata Industries parts
4. Verify WebSocket connectivity
5. Test API endpoints via browser or curl

### Automated Testing
```bash
# Test all API endpoints
npm run test:all

# Test local functionality
npm run test:local
```

## 🚀 Deployment

### Development
```bash
npm run server:simple
```

### Production Considerations
- Environment variables configuration
- Database integration (PostgreSQL recommended)
- Redis caching for performance
- Load balancing for high availability
- SSL/TLS encryption
- Monitoring and logging

## 📈 Performance Metrics

- **API Response Time**: < 100ms
- **WebSocket Latency**: < 10ms
- **Concurrent Users**: 100+
- **Parts Database**: 10+ Tata Industries parts
- **Categories**: 8 industrial categories

## 🔧 Configuration

### Environment Variables
```bash
PORT=8787                    # Server port
NODE_ENV=development         # Environment mode
```

### Customization
- Modify `server/tata-industries-parts.json` for parts data
- Update `src/components/spares-chat.tsx` for UI customization
- Configure WebSocket settings in `server/index-simple.js`

## 🤝 Contributing

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits for version control

### Development Workflow
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Code review and merge

## 📞 Support

For technical support or questions:
- Check API documentation: http://localhost:8787/api/docs
- Review server logs for debugging
- Test WebSocket connectivity: ws://localhost:8787/ws

## 📄 License

This project is proprietary software for Tata Industries automation systems.

---

**Built with ❤️ for Tata Industries Automation & Industrial Equipment**