import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import PartsDatabase from "./partsDatabase.js";
import Database from "./database.js";
import LocalAIProvider from "./localAI.js";
import ImportService from "./importService.js";
import EnterpriseImportService from "./enterpriseImport.js";
import RAGService from "./ragService.js";
import TeamsBot from "./teamsBot.js";
import { events, createSSEStream, sendSSE } from "./realtime.js";
import { initCache, cachedGet, cachedSet } from "./cache.js";
import { imageUpload } from "./imageUpload.js";
import { preprocessImage, extractTextWithOCR, basicVisionHints } from "./imageProcessor.js";
import { WebSocketService } from "./websocket.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (basic)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use(limiter);

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Set it in a .env file.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const partsDB = new PartsDatabase();

// Initialize new services
const db = new Database();
const localAI = new LocalAIProvider();
const importService = new ImportService(db, localAI);
const enterpriseImport = new EnterpriseImportService(db, localAI);
const ragService = new RAGService(db, localAI);
const teamsBot = new TeamsBot(ragService, localAI);
const wsService = new WebSocketService();

// Initialize all services
async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');
    
    // Initialize database
    await db.migrate();
    console.log('✅ Database initialized');
    
    // Initialize AI
    await localAI.initialize();
    console.log('✅ AI initialized');
    
    // Initialize cache
    await initCache();
    console.log('✅ Cache initialized');
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    // Don't exit, continue with basic functionality
  }
}

initializeServices();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Swagger docs (/api/docs)
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Synapse API',
      version: '1.0.0',
      description: 'Live API documentation'
    }
  },
  apis: [] // Add JSDoc paths later if needed
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Real-time events (SSE)
app.get("/api/events", (req, res) => {
  const stream = createSSEStream(req, res);

  const onInventory = (payload) => sendSSE(stream, "inventory", payload);
  const onImport = (payload) => sendSSE(stream, "import", payload);
  const onModel = (payload) => sendSSE(stream, "model", payload);

  events.on("inventory:update", onInventory);
  events.on("import:update", onImport);
  events.on("model:update", onModel);

  req.on("close", () => {
    events.off("inventory:update", onInventory);
    events.off("import:update", onImport);
    events.off("model:update", onModel);
  });
});

// Image upload endpoint (max 100MB)
app.post("/api/images/upload", imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Echo minimal metadata for now; can be connected to OCR/vision later
    const meta = {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      uploadedAt: new Date().toISOString()
    };

    // Optional: quick OCR & basic hints (non-blocking if it fails)
    try {
      const proc = await preprocessImage(meta.path);
      const text = await extractTextWithOCR(proc);
      const hints = await basicVisionHints(proc);
      meta.ocrText = text;
      meta.hints = hints;
    } catch (e) {
      // ignore OCR errors for speed
    }

    // Notify listeners (e.g., UI) that a new image is available
    events.emit('image:uploaded', { filename: meta.filename, size: meta.size });

    res.json({ success: true, image: meta });
  } catch (error) {
    if (error.message && error.message.includes('File too large')) {
      return res.status(413).json({ error: 'Image exceeds 100MB limit' });
    }
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
    }

    const { messages, image } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    let prompt;
    
    if (image) {
      // Handle image + text with Gemini Vision
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      };
      
      const userText = messages.map(m => m.content).join(" ");
      const visionPrompt = userText || "Identify this spare part. Provide the part number, name, machine compatibility, and current inventory status if available.";
      
      prompt = [visionPrompt, imagePart];
    } else {
      // Handle text-only
      const userText = messages.map(m => `${m.role || "user"}: ${m.content}`).join("\n");
      prompt = userText;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

// Parts management endpoints
app.get("/api/parts", (_req, res) => {
  try {
    const parts = partsDB.getAllParts();
    res.json({ parts });
  } catch (err) {
    console.error("Get parts error:", err);
    res.status(500).json({ error: "Failed to fetch parts" });
  }
});

app.get("/api/parts/:id", (req, res) => {
  try {
    const part = partsDB.getPartById(req.params.id);
    if (!part) {
      return res.status(404).json({ error: "Part not found" });
    }
    res.json({ part });
  } catch (err) {
    console.error("Get part error:", err);
    res.status(500).json({ error: "Failed to fetch part" });
  }
});

app.post("/api/parts/:id/request", (req, res) => {
  try {
    const { id } = req.params;
    const success = partsDB.incrementRequestCount(id);
    if (!success) {
      return res.status(404).json({ error: "Part not found" });
    }
    
    const part = partsDB.getPartById(id);
    res.json({ 
      success: true, 
      message: `Request submitted for ${part.name}`,
      part,
      requestId: `REQ-${Date.now()}`
    });
  } catch (err) {
    console.error("Request part error:", err);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

app.post("/api/parts/:id/feature", (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured, feature } = req.body;
    if (typeof isFeatured !== 'undefined' && typeof isFeatured !== 'boolean') {
      return res.status(400).json({ error: 'isFeatured must be boolean' });
    }
    if (feature && typeof feature !== 'string') {
      return res.status(400).json({ error: 'feature must be string' });
    }
    
    let success = false;
    
    if (typeof isFeatured === 'boolean') {
      success = partsDB.markPartAsFeatured(id, isFeatured);
    }
    
    if (feature) {
      success = partsDB.addPartFeature(id, feature) || success;
    }
    
    if (!success) {
      return res.status(404).json({ error: "Part not found" });
    }
    
    const part = partsDB.getPartById(id);
    res.json({ 
      success: true, 
      message: "Part feature updated successfully",
      part 
    });
  } catch (err) {
    console.error("Update feature error:", err);
    res.status(500).json({ error: "Failed to update part features" });
  }
});

app.put("/api/parts/:id/inventory", (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }
    
    const success = partsDB.updatePartQuantity(id, quantity);
    if (!success) {
      return res.status(404).json({ error: "Part not found" });
    }
    
    const part = partsDB.getPartById(id);
    res.json({ 
      success: true, 
      message: "Inventory updated successfully",
      part 
    });
  } catch (err) {
    console.error("Update inventory error:", err);
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

app.get("/api/parts/search/:query", (req, res) => {
  try {
    const { query } = req.params;
    const parts = partsDB.searchParts(query);
    res.json({ parts, query });
  } catch (err) {
    console.error("Search parts error:", err);
    res.status(500).json({ error: "Failed to search parts" });
  }
});

app.get("/api/inventory/status", (_req, res) => {
  try {
    (async () => {
      const cacheKey = 'inventory:status:v1';
      const cached = await cachedGet(cacheKey);
      if (cached) return res.json(cached);

      const allParts = partsDB.getAllParts();
      const totalParts = allParts.length;
      const inStock = allParts.filter(p => p.inStock).length;
      const outOfStock = totalParts - inStock;
      const lowStock = partsDB.getLowStockParts().length;
      const featured = partsDB.getFeaturedParts().length;
      
      const payload = {
        totalParts,
        inStock,
        outOfStock,
        lowStock,
        featured,
        lastUpdated: new Date().toISOString()
      };

      await cachedSet(cacheKey, payload, 5); // 5s TTL
      res.json(payload);
    })();
  } catch (err) {
    console.error("Inventory status error:", err);
    res.status(500).json({ error: "Failed to get inventory status" });
  }
});

// Enterprise-scale user import endpoints (10M+ records) with customizable options
app.post("/api/users/import/enterprise", importService.upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileSize = req.file.size;
    const isLargeDataset = fileSize > 50 * 1024 * 1024; // 50MB+

    console.log(`📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB - Using ${isLargeDataset ? 'enterprise' : 'standard'} import`);

    // Parse configuration options
    const options = {
      // Basic options
      headers: req.body.headers ? JSON.parse(req.body.headers) : null,
      
      // Scaling configuration
      scalingMode: req.body.scalingMode || 'auto', // 'auto', 'manual', 'profile'
      scalingProfile: req.body.scalingProfile, // 'micro', 'small', 'medium', 'large', 'enterprise', 'mega'
      expectedRecords: parseInt(req.body.expectedRecords) || 0,
      performancePriority: req.body.performancePriority || 'balanced', // 'speed', 'memory', 'balanced'
      
      // Manual custom configuration (when scalingMode = 'manual')
      customConfig: req.body.customConfig ? JSON.parse(req.body.customConfig) : null,
      
      // Legacy parameters (still supported)
      batchSize: parseInt(req.body.batchSize) || null,
      maxWorkers: parseInt(req.body.maxWorkers) || null,
      chunkSize: parseInt(req.body.chunkSize) || null
    };

    // Use enterprise import for large datasets
    const result = isLargeDataset 
      ? await enterpriseImport.importLargeDataset(req.file.path, options)
      : await importService.importFromFile(req.file.path, options);

    // Store import job details
    await db.query(`
      INSERT INTO import_jobs (id, filename, file_size, total_rows, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        total_rows = EXCLUDED.total_rows,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata
    `, [
      result.id,
      req.file.originalname,
      fileSize,
      result.totalRows || 0,
      result.status,
      JSON.stringify({ options, isLargeDataset })
    ]);

    res.json({
      ...result,
      isEnterpriseImport: isLargeDataset,
      estimatedTime: isLargeDataset ? `${Math.round(result.totalRows / 1000)} minutes` : '< 5 minutes'
    });

  } catch (error) {
    console.error("Enterprise import error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Standard import (fallback for smaller datasets)
app.post("/api/users/import", importService.upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const options = {
      batchSize: parseInt(req.body.batchSize) || 100,
      headers: req.body.headers ? JSON.parse(req.body.headers) : null
    };

    const result = await importService.importFromFile(req.file.path, options);
    res.json(result);
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced import status with enterprise features
app.get("/api/users/import/:id/status", async (req, res) => {
  try {
    const importId = req.params.id;
    
    // Try enterprise import first
    let status = enterpriseImport.getImportStatus(importId);
    
    // Fallback to standard import
    if (!status) {
      status = importService.getImportStatus(importId);
    }
    
    // Get database status
    const dbStatus = await db.query(`
      SELECT * FROM import_jobs WHERE id = $1
    `, [importId]);
    
    // Get embedding queue status
    const embeddingStatus = await db.query(`
      SELECT 
        COUNT(*) as total_embeddings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_embeddings,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_embeddings,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_embeddings
      FROM embedding_queue 
      WHERE import_id = $1
    `, [importId]);

    if (!status && dbStatus.rows.length === 0) {
      return res.status(404).json({ error: "Import not found" });
    }

    const response = {
      ...status,
      database: dbStatus.rows[0] || null,
      embeddings: embeddingStatus.rows[0] || null,
      isEnterprise: !!enterpriseImport.getImportStatus(importId)
    };

    res.json(response);
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Enterprise dashboard and monitoring
app.get("/api/enterprise/stats", async (req, res) => {
  try {
    const stats = await enterpriseImport.getEnterpriseStats();
    
    // Additional system stats
    const recentImports = await db.query(`
      SELECT id, filename, file_size, total_rows, status, created_at, completed_at
      FROM import_jobs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    const systemHealth = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      activeImports: enterpriseImport.activeImports.size,
      workerPoolSize: enterpriseImport.maxWorkers
    };

    res.json({
      ...stats,
      recentImports: recentImports.rows,
      system: systemHealth
    });
  } catch (error) {
    console.error("Enterprise stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/enterprise/imports", async (req, res) => {
  try {
    const { limit = 50, status, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM import_jobs';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    res.json({ 
      imports: result.rows,
      total: result.rowCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error("Enterprise imports error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/sample", async (req, res) => {
  try {
    const samplePath = await importService.createSampleCSV();
    res.download(samplePath, 'sample_users.csv');
  } catch (error) {
    res.status(500).json({ error: "Failed to create sample file" });
  }
});

// Create enterprise sample with 10M structure
app.get("/api/users/sample/enterprise", async (req, res) => {
  try {
    const { size = 1000 } = req.query;
    const sampleSize = Math.min(parseInt(size), 10000); // Max 10k for download
    
    const enterpriseSample = [];
    const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT', 'Legal', 'R&D', 'Customer Success'];
    const roles = ['Manager', 'Senior Engineer', 'Engineer', 'Analyst', 'Director', 'VP', 'Specialist', 'Coordinator', 'Lead', 'Associate'];
    const skills = ['Python', 'JavaScript', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Kubernetes', 'Machine Learning', 'Data Analysis'];
    const locations = ['New York', 'San Francisco', 'London', 'Tokyo', 'Sydney', 'Toronto', 'Berlin', 'Singapore', 'Austin', 'Seattle'];

    for (let i = 0; i < sampleSize; i++) {
      const firstName = `User${i}`;
      const lastName = `Test${Math.floor(i / 100)}`;
      const department = departments[i % departments.length];
      const role = roles[i % roles.length];
      const location = locations[i % locations.length];
      const userSkills = skills.slice(0, Math.floor(Math.random() * 5) + 1).join(', ');
      
      enterpriseSample.push({
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
        role: role,
        department: department,
        skills: userSkills,
        bio: `Experienced ${role.toLowerCase()} in ${department.toLowerCase()} with expertise in ${userSkills.split(', ')[0]}`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        location: location,
        employee_id: `EMP${String(i).padStart(6, '0')}`,
        hire_date: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        salary_band: `Band${Math.floor(Math.random() * 10) + 1}`,
        manager_email: i > 0 ? `user${Math.floor(i / 10)}.test${Math.floor(i / 1000)}@company.com` : ''
      });
    }

    // Convert to CSV
    const csvHeader = Object.keys(enterpriseSample[0]).join(',');
    const csvRows = enterpriseSample.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="enterprise_sample_${sampleSize}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error("Enterprise sample error:", error);
    res.status(500).json({ error: "Failed to create enterprise sample" });
  }
});

// Scaling configuration endpoints
app.get("/api/scaling/profiles", (req, res) => {
  try {
    const profiles = enterpriseImport.getAvailableProfiles();
    res.json({ 
      profiles,
      defaultProfile: 'auto',
      description: 'Available scaling profiles for different dataset sizes'
    });
  } catch (error) {
    console.error("Get profiles error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/scaling/validate", (req, res) => {
  try {
    const { customConfig, expectedRecords = 0 } = req.body;
    
    if (!customConfig) {
      return res.status(400).json({ error: "customConfig is required" });
    }

    const validation = enterpriseImport.validateCustomConfig(customConfig, expectedRecords);
    res.json(validation);
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/scaling/estimate", (req, res) => {
  try {
    const { 
      expectedRecords, 
      scalingMode = 'auto', 
      scalingProfile,
      customConfig,
      performancePriority = 'balanced'
    } = req.body;

    if (!expectedRecords || expectedRecords < 1) {
      return res.status(400).json({ error: "expectedRecords must be a positive number" });
    }

    // Create a temporary scaling service for estimation
    const tempScaling = enterpriseImport.adaptiveScaling;
    let estimatedProfile;

    if (scalingMode === 'manual' && customConfig) {
      estimatedProfile = tempScaling.createCustomProfile({
        expectedRecords,
        performancePriority,
        customSettings: customConfig
      });
    } else if (scalingMode === 'profile' && scalingProfile) {
      const profiles = tempScaling.getAllProfiles();
      estimatedProfile = profiles.find(p => p.name === scalingProfile);
      if (!estimatedProfile) {
        return res.status(400).json({ error: "Invalid scaling profile" });
      }
    } else {
      estimatedProfile = tempScaling.detectOptimalProfile(expectedRecords, expectedRecords * 1024); // Rough file size estimate
    }

    const summary = tempScaling.generateProfileSummary(estimatedProfile, expectedRecords);
    
    res.json({
      estimatedProfile,
      summary,
      inputParams: {
        expectedRecords,
        scalingMode,
        scalingProfile,
        performancePriority
      }
    });
  } catch (error) {
    console.error("Estimation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// User search and management
app.get("/api/users/search", async (req, res) => {
  try {
    const { q, limit = 10, threshold = 0.5 } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await ragService.searchUsers(q, { limit: parseInt(limit), threshold: parseFloat(threshold) });
    res.json(results);
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const { limit = 50, offset = 0, department, role } = req.query;
    
    let query = 'SELECT * FROM users WHERE status = $1';
    const params = ['active'];
    
    if (department) {
      query += ' AND department = $' + (params.length + 1);
      params.push(department);
    }
    
    if (role) {
      query += ' AND role = $' + (params.length + 1);
      params.push(role);
    }
    
    query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    res.json({ users: result.rows, total: result.rowCount });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: error.message });
  }
});

// RAG Chat endpoints
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId, options = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await ragService.processQuery(message, sessionId, options);
    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/chat/:sessionId/history", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;
    
    const history = await ragService.getChatHistory(sessionId, parseInt(limit));
    res.json({ sessionId, messages: history });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/recommendations", async (req, res) => {
  try {
    const { q, limit = 5, threshold = 0.6 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const recommendations = await ragService.getRecommendations(q, { 
      limit: parseInt(limit), 
      threshold: parseFloat(threshold) 
    });
    
    res.json({ query: q, recommendations });
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Model management endpoints
app.get("/api/models", async (req, res) => {
  try {
    const models = await localAI.listAvailableModels();
    res.json(models);
  } catch (error) {
    console.error("List models error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/models/switch", async (req, res) => {
  try {
    const { modelName } = req.body;
    
    if (!modelName) {
      return res.status(400).json({ error: "Model name is required" });
    }

    const result = await localAI.switchModel(modelName);
    res.json(result);
  } catch (error) {
    console.error("Switch model error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Training endpoints
app.post("/api/train", async (req, res) => {
  try {
    const { modelName = 'synapse-custom', options = {} } = req.body;
    
    const result = await ragService.retrain({ ...options, modelName });
    res.json(result);
  } catch (error) {
    console.error("Training error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/training/data", async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    const data = await db.getTrainingData(status, parseInt(limit));
    res.json({ data, total: data.length });
  } catch (error) {
    console.error("Get training data error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Teams Bot endpoint
app.post("/bot/messages", teamsBot.getMiddleware());

// Database migration endpoint (admin only)
app.post("/api/admin/migrate", async (req, res) => {
  try {
    await db.migrate();
    res.json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Simple version header middleware
app.use((req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  next();
});

// Centralized error handler (keep last)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal Server Error' : err.message });
});

const server = app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

// Initialize WebSocket server
wsService.initialize(server);

// WebSocket event handlers
wsService.on('chat', async ({ clientId, message, sessionId }) => {
  try {
    const response = await ragService.processQuery(message, sessionId);
    wsService.sendToClient(clientId, {
      type: 'chat_response',
      message: response.response,
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    wsService.sendToClient(clientId, {
      type: 'error',
      message: 'Chat processing failed',
      timestamp: new Date().toISOString()
    });
  }
});

wsService.on('inventory_update', async ({ clientId, partId, quantity, action }) => {
  try {
    const success = partsDB.updatePartQuantity(partId, quantity);
    if (success) {
      // Broadcast inventory update to all subscribed clients
      wsService.broadcastToChannel('inventory', {
        type: 'inventory_updated',
        partId,
        quantity,
        action,
        timestamp: new Date().toISOString()
      });
      
      wsService.sendToClient(clientId, {
        type: 'success',
        message: 'Inventory updated successfully',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    wsService.sendToClient(clientId, {
      type: 'error',
      message: 'Inventory update failed',
      timestamp: new Date().toISOString()
    });
  }
});

// WebSocket API endpoints
app.get('/api/websocket/stats', (req, res) => {
  res.json(wsService.getStats());
});

app.get('/api/websocket/clients', (req, res) => {
  res.json(wsService.getConnectedClients());
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


