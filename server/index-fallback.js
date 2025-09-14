import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    mode: "fallback"
  });
});

// Basic chat endpoint (mock)
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  res.json({
    response: `Echo: ${message || 'Hello! This is a fallback response.'}`,
    sessionId: 'fallback_session',
    timestamp: new Date().toISOString()
  });
});

// Basic stats endpoint
app.get("/api/enterprise/stats", (_req, res) => {
  res.json({
    totalUsers: 0,
    totalParts: 0,
    activeConnections: 0,
    wsClients: 0,
    lastUpdate: new Date().toISOString(),
    mode: "fallback"
  });
});

// Basic inventory status
app.get("/api/inventory/status", (_req, res) => {
  res.json({
    totalParts: 0,
    inStock: 0,
    outOfStock: 0,
    lowStock: 0,
    featuredParts: 0,
    lastUpdate: new Date().toISOString()
  });
});

// Basic parts endpoint
app.get("/api/parts", (_req, res) => {
  res.json([]);
});

// Basic user search
app.get("/api/users/search", (req, res) => {
  const { q } = req.query;
  res.json({
    users: [],
    query: q || '',
    total: 0
  });
});

// Basic WebSocket stats
app.get("/api/websocket/stats", (_req, res) => {
  res.json({
    totalClients: 0,
    clients: [],
    mode: "fallback"
  });
});

// Basic scaling profiles
app.get("/api/scaling/profiles", (_req, res) => {
  res.json({
    profiles: [
      { name: "small", maxRows: 1000, batchSize: 100 },
      { name: "medium", maxRows: 100000, batchSize: 1000 },
      { name: "large", maxRows: 10000000, batchSize: 10000 }
    ]
  });
});

// Basic image upload (mock)
app.post("/api/images/upload", (req, res) => {
  res.json({
    success: true,
    image: {
      filename: "mock-image.jpg",
      size: 1024,
      mimetype: "image/jpeg",
      uploadedAt: new Date().toISOString(),
      ocrText: "Mock OCR text",
      hints: { sizeBytes: 1024 }
    }
  });
});

// Basic import endpoint (mock)
app.post("/api/users/import/enterprise", (req, res) => {
  res.json({
    jobId: "mock-job-" + Date.now(),
    status: "processing",
    message: "Mock import started"
  });
});

// Basic import status
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

// Basic SSE events
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

// Basic Swagger docs
app.get("/api/docs", (_req, res) => {
  res.json({
    title: "Synapse AI API",
    version: "1.0.0",
    description: "Fallback API documentation",
    endpoints: [
      "GET /api/health",
      "POST /api/chat",
      "GET /api/enterprise/stats",
      "GET /api/inventory/status",
      "GET /api/parts",
      "GET /api/users/search",
      "GET /api/websocket/stats",
      "GET /api/scaling/profiles",
      "POST /api/images/upload",
      "POST /api/users/import/enterprise",
      "GET /api/events"
    ]
  });
});

// Serve static files
app.use(express.static('dist'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: "Synapse AI API is running in fallback mode",
    endpoints: [
      "GET /api/health",
      "POST /api/chat", 
      "GET /api/enterprise/stats",
      "GET /api/inventory/status",
      "GET /api/parts",
      "GET /api/users/search",
      "GET /api/websocket/stats",
      "GET /api/scaling/profiles",
      "POST /api/images/upload",
      "POST /api/users/import/enterprise",
      "GET /api/events",
      "GET /api/docs"
    ],
    timestamp: new Date().toISOString()
  });
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
const server = app.listen(PORT, () => {
  console.log(`🚀 Synapse AI Fallback Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Bot interface: http://localhost:${PORT}/bot`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
});

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
