import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Load Tata Industries parts data
const tataPartsData = JSON.parse(fs.readFileSync('./server/tata-industries-parts.json', 'utf8'));

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use(limiter);

const PORT = process.env.PORT || 8787;

// API versioning
app.use((req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  next();
});

// Simple WebSocket service
class SimpleWebSocketService {
  constructor() {
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        id: clientId,
        connectedAt: new Date(),
        subscriptions: new Set()
      });

      console.log(`🔌 WebSocket client connected: ${clientId}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        message: 'Connected to Synapse WebSocket',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON message',
            timestamp: new Date().toISOString()
          }));
        }
      });

      ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    console.log('🔌 WebSocket server initialized on /ws');
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.channel);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.channel);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'chat':
        this.handleChatMessage(clientId, message);
        break;
      default:
        this.sendToClient(clientId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString()
        });
    }
  }

  handleSubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client && channel) {
      client.subscriptions.add(channel);
      this.sendToClient(clientId, {
        type: 'subscribed',
        channel,
        message: `Subscribed to ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleUnsubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client && channel) {
      client.subscriptions.delete(channel);
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        channel,
        message: `Unsubscribed from ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleChatMessage(clientId, message) {
    const content = message.content || 'Hello!';
    const contentLower = content.toLowerCase();
    let response = "";

    // Intelligent responses based on Tata Industries data
    if (contentLower.includes('bearing') || contentLower.includes('x-75')) {
      const bearing = tataPartsData.parts.find(p => p.id === 'BEAR-X75-001');
      response = `Found Bearing X-75! Part Number: ${bearing.partNumber}, Quantity: ${bearing.inventory.quantity} units at ${bearing.inventory.location}. Price: ₹${bearing.pricing.unitPrice}. This is a heavy-duty industrial bearing for Tata automation systems.`;
    } else if (contentLower.includes('motor') || contentLower.includes('v200')) {
      const motor = tataPartsData.parts.find(p => p.id === 'MOTOR-V200-002');
      response = `Found Motor Drive V200! Part Number: ${motor.partNumber}, Quantity: ${motor.inventory.quantity} units at ${motor.inventory.location}. Price: ₹${motor.pricing.unitPrice}. This is a 200kW variable frequency drive motor for Tata industrial automation.`;
    } else if (contentLower.includes('sensor') || contentLower.includes('p450')) {
      const sensor = tataPartsData.parts.find(p => p.id === 'SENSOR-P450-003');
      response = `Found Proximity Sensor P450! Part Number: ${sensor.partNumber}, Quantity: ${sensor.inventory.quantity} units at ${sensor.inventory.location}. Price: ₹${sensor.pricing.unitPrice}. This is an inductive proximity sensor for Tata automation quality control.`;
    } else if (contentLower.includes('inventory') || contentLower.includes('stock')) {
      const totalParts = tataPartsData.parts.length;
      const inStock = tataPartsData.parts.filter(p => p.inventory.quantity > 0).length;
      response = `Tata Industries Inventory Status: ${totalParts} total parts, ${inStock} in stock. Key parts include Bearings, Motors, Sensors, Hydraulic Actuators, and more. Would you like details on any specific part?`;
    } else if (contentLower.includes('help') || contentLower.includes('what can you do')) {
      response = `I can help you with: 1) Finding spare parts (try "Bearing X-75", "Motor V200", "Sensor P450"), 2) Checking inventory status, 3) Project information, 4) Technical specifications, 5) Pricing and availability. What would you like to know?`;
    } else {
      // Search through parts for any matches
      const matchingParts = tataPartsData.parts.filter(part => 
        part.name.toLowerCase().includes(contentLower) ||
        part.partNumber.toLowerCase().includes(contentLower) ||
        part.description.toLowerCase().includes(contentLower)
      );
      
      if (matchingParts.length > 0) {
        const part = matchingParts[0];
        response = `Found ${part.name}! Part Number: ${part.partNumber}, Quantity: ${part.inventory.quantity} units at ${part.inventory.location}. Price: ₹${part.pricing.unitPrice}. ${part.description}`;
      } else {
        response = `I couldn't find specific information about "${content}". Try asking about: Bearing X-75, Motor Drive V200, Proximity Sensor P450, inventory status, or Tata Industries projects. I'm here to help with spare parts and technical information!`;
      }
    }

    this.sendToClient(clientId, {
      type: 'chat_response',
      message: response,
      sessionId: message.sessionId || 'ws_session',
      timestamp: new Date().toISOString()
    });
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN = 1
      client.ws.send(JSON.stringify(data));
    }
  }

  broadcastToChannel(channel, data) {
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(clientId, {
          type: 'broadcast',
          channel,
          data,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscriptions)
    }));
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      clients: this.getConnectedClients()
    };
  }
}

// Initialize WebSocket service
const wsService = new SimpleWebSocketService();

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    mode: "simple",
    websocket: "enabled"
  });
});

// Chat endpoint with Tata Industries intelligence
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.json({
      response: "Hello! I'm Synapse AI Bot for Tata Industries. I can help you find spare parts, check inventory, and provide technical information. What would you like to know?",
      sessionId: 'simple_session',
      timestamp: new Date().toISOString()
    });
  }

  const messageLower = message.toLowerCase();
  let response = "";

  // Intelligent responses based on Tata Industries data
  if (messageLower.includes('bearing') || messageLower.includes('x-75')) {
    const bearing = tataPartsData.parts.find(p => p.id === 'BEAR-X75-001');
    response = `Found Bearing X-75! Part Number: ${bearing.partNumber}, Quantity: ${bearing.inventory.quantity} units at ${bearing.inventory.location}. Price: ₹${bearing.pricing.unitPrice}. This is a heavy-duty industrial bearing for Tata automation systems.`;
  } else if (messageLower.includes('motor') || messageLower.includes('v200')) {
    const motor = tataPartsData.parts.find(p => p.id === 'MOTOR-V200-002');
    response = `Found Motor Drive V200! Part Number: ${motor.partNumber}, Quantity: ${motor.inventory.quantity} units at ${motor.inventory.location}. Price: ₹${motor.pricing.unitPrice}. This is a 200kW variable frequency drive motor for Tata industrial automation.`;
  } else if (messageLower.includes('sensor') || messageLower.includes('p450')) {
    const sensor = tataPartsData.parts.find(p => p.id === 'SENSOR-P450-003');
    response = `Found Proximity Sensor P450! Part Number: ${sensor.partNumber}, Quantity: ${sensor.inventory.quantity} units at ${sensor.inventory.location}. Price: ₹${sensor.pricing.unitPrice}. This is an inductive proximity sensor for Tata automation quality control.`;
  } else if (messageLower.includes('inventory') || messageLower.includes('stock')) {
    const totalParts = tataPartsData.parts.length;
    const inStock = tataPartsData.parts.filter(p => p.inventory.quantity > 0).length;
    response = `Tata Industries Inventory Status: ${totalParts} total parts, ${inStock} in stock. Key parts include Bearings, Motors, Sensors, Hydraulic Actuators, and more. Would you like details on any specific part?`;
  } else if (messageLower.includes('project') || messageLower.includes('x-75')) {
    const project = tataPartsData.projects.find(p => p.id === 'PROJECT-X75');
    response = `Project X-75 is an active Tata Industries automation upgrade project with budget ₹${project.budget} and ${project.timeline} timeline. It involves Bearing X-75, Motor Drive V200, and Proximity Sensor P450.`;
  } else if (messageLower.includes('tata') || messageLower.includes('company')) {
    response = `Tata Industries is a leading automation and industrial equipment company. We have ${tataPartsData.parts.length} spare parts across ${tataPartsData.categories.length} categories including Bearings, Motors, Sensors, Hydraulics, Pneumatics, Electrical, Conveyors, and Robotics.`;
  } else if (messageLower.includes('help') || messageLower.includes('what can you do')) {
    response = `I can help you with: 1) Finding spare parts (try "Bearing X-75", "Motor V200", "Sensor P450"), 2) Checking inventory status, 3) Project information, 4) Technical specifications, 5) Pricing and availability. What would you like to know?`;
  } else {
    // Search through parts for any matches
    const matchingParts = tataPartsData.parts.filter(part => 
      part.name.toLowerCase().includes(messageLower) ||
      part.partNumber.toLowerCase().includes(messageLower) ||
      part.description.toLowerCase().includes(messageLower)
    );
    
    if (matchingParts.length > 0) {
      const part = matchingParts[0];
      response = `Found ${part.name}! Part Number: ${part.partNumber}, Quantity: ${part.inventory.quantity} units at ${part.inventory.location}. Price: ₹${part.pricing.unitPrice}. ${part.description}`;
    } else {
      response = `I couldn't find specific information about "${message}". Try asking about: Bearing X-75, Motor Drive V200, Proximity Sensor P450, inventory status, or Tata Industries projects. I'm here to help with spare parts and technical information!`;
    }
  }

  res.json({
    response,
    sessionId: 'simple_session',
    timestamp: new Date().toISOString()
  });
});

// Enterprise stats
app.get("/api/enterprise/stats", (_req, res) => {
  res.json({
    totalUsers: 1000,
    totalParts: 500,
    activeConnections: wsService.clients.size,
    wsClients: wsService.clients.size,
    lastUpdate: new Date().toISOString(),
    mode: "simple"
  });
});

// Inventory status with Tata Industries data
app.get("/api/inventory/status", (_req, res) => {
  const totalParts = tataPartsData.parts.length;
  const inStock = tataPartsData.parts.filter(p => p.inventory.quantity > 10).length;
  const lowStock = tataPartsData.parts.filter(p => p.inventory.quantity > 0 && p.inventory.quantity <= 10).length;
  const outOfStock = tataPartsData.parts.filter(p => p.inventory.quantity === 0).length;
  const featuredParts = tataPartsData.parts.filter(p => p.criticality === 'Critical' || p.criticality === 'High').length;
  
  res.json({
    totalParts,
    inStock,
    outOfStock,
    lowStock,
    featuredParts,
    lastUpdate: new Date().toISOString(),
    company: "Tata Industries",
    categories: tataPartsData.categories.length
  });
});

// Parts endpoint with Tata Industries data
app.get("/api/parts", (req, res) => {
  const { category, search, featured } = req.query;
  let parts = tataPartsData.parts;

  // Filter by category
  if (category) {
    parts = parts.filter(part => part.category === category);
  }

  // Filter by search term
  if (search) {
    const searchTerm = search.toLowerCase();
    parts = parts.filter(part => 
      part.name.toLowerCase().includes(searchTerm) ||
      part.partNumber.toLowerCase().includes(searchTerm) ||
      part.description.toLowerCase().includes(searchTerm)
    );
  }

  // Filter featured parts
  if (featured === 'true') {
    parts = parts.filter(part => part.criticality === 'Critical' || part.criticality === 'High');
  }

  res.json({
    parts: parts.map(part => ({
      id: part.id,
      name: part.name,
      partNumber: part.partNumber,
      category: part.category,
      description: part.description,
      quantity: part.inventory.quantity,
      location: part.inventory.location,
      price: part.pricing.unitPrice,
      currency: part.pricing.currency,
      criticality: part.criticality,
      featured: part.criticality === 'Critical' || part.criticality === 'High'
    })),
    total: parts.length,
    categories: tataPartsData.categories
  });
});

// User search
app.get("/api/users/search", (req, res) => {
  const { q } = req.query;
  res.json({
    users: [
      { name: "John Doe", email: "john@example.com", department: "Engineering" },
      { name: "Jane Smith", email: "jane@example.com", department: "Sales" }
    ],
    query: q || '',
    total: 2
  });
});

// WebSocket stats
app.get("/api/websocket/stats", (_req, res) => {
  res.json(wsService.getStats());
});

// Scaling profiles
app.get("/api/scaling/profiles", (_req, res) => {
  res.json({
    profiles: [
      { name: "small", maxRows: 1000, batchSize: 100 },
      { name: "medium", maxRows: 100000, batchSize: 1000 },
      { name: "large", maxRows: 10000000, batchSize: 10000 }
    ]
  });
});

// Image upload (mock)
app.post("/api/images/upload", (req, res) => {
  res.json({
    success: true,
    image: {
      filename: "uploaded-image.jpg",
      size: 1024000,
      mimetype: "image/jpeg",
      uploadedAt: new Date().toISOString(),
      ocrText: "Sample OCR text from uploaded image",
      hints: { sizeBytes: 1024000, available: true }
    }
  });
});

// Enterprise import (mock)
app.post("/api/users/import/enterprise", (req, res) => {
  res.json({
    jobId: "import-" + Date.now(),
    status: "processing",
    message: "Import started successfully"
  });
});

// Import status
app.get("/api/users/import/:id/status", (req, res) => {
  res.json({
    id: req.params.id,
    status: "completed",
    progress: 100,
    totalRows: 1000,
    processedRows: 1000,
    errors: []
  });
});

// SSE events
app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  res.write('data: {"type":"connected","message":"SSE connected"}\n\n');

  const interval = setInterval(() => {
    res.write(`data: {"type":"heartbeat","timestamp":"${new Date().toISOString()}"}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// API documentation
app.get("/api/docs", (_req, res) => {
  res.json({
    title: "Synapse AI API",
    version: "1.0.0",
    description: "Complete API with WebSocket support",
    endpoints: [
      "GET /api/health - Health check",
      "POST /api/chat - Chat with AI",
      "GET /api/enterprise/stats - System statistics",
      "GET /api/inventory/status - Inventory status",
      "GET /api/parts - Parts list",
      "GET /api/users/search - User search",
      "GET /api/websocket/stats - WebSocket statistics",
      "GET /api/scaling/profiles - Scaling profiles",
      "POST /api/images/upload - Image upload",
      "POST /api/users/import/enterprise - Enterprise import",
      "GET /api/events - Server-sent events",
      "WebSocket /ws - Real-time communication"
    ],
    websocket: {
      url: `ws://localhost:${PORT}/ws`,
      messageTypes: ["subscribe", "unsubscribe", "ping", "chat"],
      channels: ["inventory", "import", "chat"]
    }
  });
});

// Serve static files from dist
app.use(express.static(path.resolve(__dirname, '../dist')));

// Serve the React app for root and bot routes
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

app.get('/bot', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ 
    error: status === 500 ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🚀 Synapse AI Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Bot interface: http://localhost:${PORT}/bot`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

// Initialize WebSocket server
try {
  wsService.initialize(server);
  console.log('✅ WebSocket server initialized successfully');
} catch (error) {
  console.error('❌ WebSocket initialization failed:', error);
}

// Graceful shutdown
function shutdown() {
  console.log('🔻 Graceful shutdown initiated');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Force exit after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
