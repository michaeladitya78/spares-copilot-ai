# Synapse AI Bot - Complete Setup Guide

## Quick Setup for Development

### 1. Prerequisites
- Node.js 18+ installed
- Git installed
- Google Gemini API key (optional but recommended)

### 2. Installation Steps

```bash
# Clone the repository
git clone https://github.com/michaeladitya78/spares-copilot-ai.git
cd spares-copilot-ai

# Install dependencies
npm install

# Create environment file (optional for Gemini AI)
echo "PORT=8788" > .env
echo "NODE_ENV=development" >> .env
echo "GEMINI_API_KEY=your_api_key_here" >> .env
```

### 3. Get Gemini API Key (Recommended)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key
4. Add it to your `.env` file:
```
GEMINI_API_KEY=your_actual_api_key_here
```

### 4. Start the Application

**Terminal 1 - Backend Server:**
```bash
npm run server:simple
```
You should see:
```
🚀 Synapse AI Server running on http://localhost:8788
🔌 WebSocket server initialized on /ws
```

**Terminal 2 - Frontend Development:**
```bash
npm run dev
```
You should see:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.29.87:5173/
```

### 5. Access the Application

- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:8788/api/health
- **API Documentation**: http://localhost:8788/api/docs

## Features Overview

### ✅ What's Working Right Now

1. **Intelligent Chat Interface**
   - Natural language processing for spare parts queries
   - Gemini AI integration for smart responses
   - Fallback to local logic if AI unavailable
   - Real-time WebSocket communication

2. **Part Search & Management**
   - Multi-field search (name, part number, category)
   - Smart disambiguation for multiple results
   - Real-time inventory tracking
   - Automatic inventory decrement on part requests

3. **Advanced Features**
   - Camera capture for part identification
   - File upload processing
   - Professional UI with loading states
   - Responsive design for all devices

4. **Backend Infrastructure**
   - Express.js server with security headers
   - Rate limiting and CORS protection
   - WebSocket for real-time updates
   - Comprehensive error handling

### 🧪 Testing the System

1. **Test Basic Chat:**
   - Type: "hello" → Should get scope limitation response
   - Type: "bearing x-75" → Should find Bearing X-75 part
   - Type: "motor v200" → Should find Motor Drive V200

2. **Test Inventory Management:**
   - Search for a part
   - Click "Request Part" button
   - Check that quantity decreases in real-time

3. **Test Image Upload:**
   - Click camera/upload button
   - Upload any image
   - Should get intelligent part suggestion

4. **Test API Endpoints:**
   ```bash
   # Health check
   curl http://localhost:8788/api/health
   
   # Chat test
   curl -X POST http://localhost:8788/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"bearing x-75"}'
   
   # Parts list
   curl http://localhost:8788/api/parts
   ```

## AI Integration Details

### Gemini AI Features
- **Smart Query Understanding**: Handles complex natural language queries
- **Context-Aware Responses**: Uses Tata Industries parts database as context
- **Scope Limitation**: Automatically redirects non-spare-parts queries
- **Fallback Logic**: Falls back to local processing if AI unavailable

### How It Works
1. User sends message to chat interface
2. Frontend sends to backend `/api/chat` endpoint
3. Backend tries Gemini AI first with parts context
4. If AI succeeds, returns intelligent response
5. If AI fails, falls back to local keyword matching
6. Response includes source indicator (`gemini-ai` or `local`)

## Troubleshooting

### Common Issues

**Issue 1: Frontend not connecting to backend**
```bash
# Check if backend is running
curl http://localhost:8788/api/health

# If not running, start it:
npm run server:simple
```

**Issue 2: WebSocket connection failed**
- Check browser console for WebSocket errors
- Ensure backend server is running on port 8788
- Try refreshing the page

**Issue 3: Gemini AI not working**
```bash
# Check your API key
echo $GEMINI_API_KEY

# Test API key manually
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Issue 4: Build failures**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Try building
npm run build
```

### Port Configuration

The system uses these ports:
- **Frontend**: 5173 (Vite dev server)
- **Backend**: 8788 (Express + WebSocket)

If you need to change ports:
1. Update `package.json` scripts
2. Update WebSocket connection in `src/components/spares-chat.tsx`
3. Update API URL in frontend code

## Advanced Configuration

### Environment Variables

Create a `.env` file in the root directory:
```bash
# Required
PORT=8788
NODE_ENV=development

# Optional but recommended
GEMINI_API_KEY=your_gemini_api_key_here

# Optional for future database integration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=tata_parts
```

### Production Deployment

The system is configured for Vercel deployment:

1. **Connect to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Set Environment Variables in Vercel:**
   - Go to Vercel dashboard
   - Add `GEMINI_API_KEY` in environment variables
   - Redeploy

### Database Integration (Future)

Currently uses JSON file, but ready for PostgreSQL:

```javascript
// Future database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
```

## Support

### Getting Help

1. **Check the logs:**
   - Backend: Terminal running `npm run server:simple`
   - Frontend: Browser console (F12)

2. **Test API endpoints:**
   - Health: http://localhost:8788/api/health
   - Chat: Use curl or Postman to test `/api/chat`

3. **Verify parts data:**
   - Check `server/tata-industries-parts.json`
   - Ensure valid JSON format

### Development Tips

1. **Use browser dev tools:**
   - Network tab to see API calls
   - Console for WebSocket messages
   - Application tab for local storage

2. **Backend debugging:**
   - Check terminal output for errors
   - Use `console.log` for debugging
   - Test endpoints individually

3. **Frontend debugging:**
   - Use React Developer Tools
   - Check component state and props
   - Monitor WebSocket connection status

## Next Steps

### Ready for Production
- ✅ All core features working
- ✅ Error handling implemented
- ✅ Security headers configured
- ✅ Real-time communication
- ✅ AI integration complete

### Future Enhancements
- Database integration (PostgreSQL)
- User authentication (Azure AD)
- SharePoint integration
- Advanced computer vision
- Mobile application

The system is fully functional and ready for production use with Tata Industries!
