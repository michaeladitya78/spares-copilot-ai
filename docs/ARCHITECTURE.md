# Synapse AI Bot Architecture

## Overview

The Synapse AI Bot is a comprehensive spare parts management system designed for Tata Industries. It provides intelligent chatbot capabilities, real-time inventory management, and seamless integration with enterprise systems.

## Current Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           React Frontend                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Pages/                                                                │
│  ├── Index.tsx            - Main landing page                          │
│  ├── Admin.tsx            - Administrative interface                   │
│  ├── TeamsConfig.tsx      - Microsoft Teams configuration             │
│  └── NotFound.tsx         - 404 error page                            │
│                                                                        │
│  Components/                                                           │
│  ├── spares-chat.tsx      - Main chat interface                       │
│  ├── synapse-bot.tsx      - Bot management dashboard                  │
│  ├── synapse-result-card.tsx - Part display component                 │
│  ├── synapse-header.tsx   - Application header                        │
│  ├── synapse-welcome.tsx  - Welcome screen                           │
│  ├── synapse-loading.tsx  - Loading states                           │
│  └── ui/                  - Reusable UI components                    │
│                                                                        │
│  Features:                                                             │
│  ├── Real-time WebSocket communication                                │
│  ├── Image upload and camera capture                                  │
│  ├── Progressive part search                                          │
│  ├── Inventory status tracking                                        │
│  └── Responsive design                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Express.js Server                              │
├─────────────────────────────────────────────────────────────────────────┤
│  API Endpoints:                                                        │
│  ├── /api/chat           - Chat processing                            │
│  ├── /api/parts          - Parts catalog                              │
│  ├── /api/parts/:id/request - Part request with inventory decrement  │
│  ├── /api/inventory/status - Real-time inventory status              │
│  ├── /api/enterprise/stats - System statistics                       │
│  ├── /api/images/upload  - Image processing                           │
│  └── /ws                 - WebSocket endpoint                         │
│                                                                        │
│  Core Services:                                                        │
│  ├── WebSocket Service   - Real-time communication                    │
│  ├── Parts Manager       - Inventory management                       │
│  ├── Chat Processor      - Message handling                           │
│  └── Authentication      - Security layer                             │
│                                                                        │
│  Data Sources:                                                         │
│  ├── tata-industries-parts.json - Static parts database              │
│  ├── In-memory cache     - Performance optimization                   │
│  └── Future: PostgreSQL  - Persistent storage                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   User   │◄──►│   React     │◄──►│   Express    │◄──►│   Data      │
│Interface │    │  Frontend   │    │   Backend    │    │  Sources    │
└──────────┘    └─────────────┘    └──────────────┘    └─────────────┘
     │                │                      │                │
     │ 1. User Query  │                      │                │
     │───────────────►│                      │                │
     │                │ 2. API Request       │                │
     │                │─────────────────────►│                │
     │                │                      │ 3. Query Data  │
     │                │                      │───────────────►│
     │                │                      │ 4. Results     │
     │                │                      │◄───────────────│
     │                │ 5. Response          │                │
     │                │◄─────────────────────│                │
     │ 6. Display     │                      │                │
     │◄───────────────│                      │                │
```

## Core Components

### 1. Chat Engine

**Location**: `src/components/spares-chat.tsx`

**Responsibilities**:
- User message processing
- Intent recognition for spare parts queries
- Fallback handling for non-spare-parts queries
- Real-time communication via WebSocket
- Image upload and camera integration

**Key Features**:
```typescript
// Smart query filtering
const isSparePartsQuery = (message: string) => {
  const sparePartsKeywords = [
    'part', 'bearing', 'motor', 'sensor', 'actuator', 
    // ... more keywords
  ];
  return sparePartsKeywords.some(keyword => /* matching logic */);
};

// Intelligent response generation
const generateBotResponse = async (userMessage: string, isImageUpload = false) => {
  // Scope validation
  if (!isImageUpload && !isSparePartsQuery(userMessage)) {
    return scopeLimitationResponse();
  }
  
  // Part search and disambiguation
  const searchResults = await searchParts(userMessage);
  return processSearchResults(searchResults);
};
```

### 2. Parts Management System

**Location**: `server/index-simple.js`

**Responsibilities**:
- Parts catalog management
- Inventory tracking and updates
- Real-time stock notifications
- Part request processing

**Key Features**:
```javascript
// Dynamic inventory management
app.post("/api/parts/:id/request", (req, res) => {
  const part = findPartById(req.params.id);
  
  // Inventory validation
  if (part.inventory.quantity <= 0) {
    return res.status(400).json({ error: "Part is out of stock" });
  }
  
  // Atomic inventory update
  part.inventory.quantity -= 1;
  part.inventory.lastUpdated = new Date().toISOString();
  
  // Real-time notification
  wsService.broadcastToChannel('inventory', {
    type: 'inventory_update',
    partId: req.params.id,
    newQuantity: part.inventory.quantity
  });
});
```

### 3. Real-time Communication

**Location**: `server/index-simple.js` (WebSocket Service)

**Responsibilities**:
- Bidirectional real-time communication
- Channel-based subscriptions
- Inventory update broadcasts
- Connection management

**Architecture**:
```javascript
class SimpleWebSocketService {
  constructor() {
    this.clients = new Map();  // Client connection pool
  }

  handleMessage(clientId, message) {
    switch (message.type) {
      case 'subscribe':   // Channel subscription
      case 'chat':        // Chat message processing
      case 'ping':        // Health checks
      default:           // Error handling
    }
  }

  broadcastToChannel(channel, data) {
    // Targeted broadcasting to subscribed clients
  }
}
```

## Integration Points

### 1. Frontend-Backend Communication

```typescript
// HTTP API calls for standard operations
const response = await fetch('/api/parts', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});

// WebSocket for real-time updates
const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleRealTimeUpdate(message);
};
```

### 2. State Management

**Frontend State Flow**:
```typescript
// Component-level state management
const [messages, setMessages] = useState<Message[]>([]);
const [chatState, setChatState] = useState<ChatState>("welcome");
const [currentQuantity, setCurrentQuantity] = useState(partData.quantity);

// Real-time state synchronization
useEffect(() => {
  if (inventoryUpdate.partId === currentPart.id) {
    setCurrentQuantity(inventoryUpdate.newQuantity);
  }
}, [inventoryUpdate]);
```

## Deployment Architecture

### Current Deployment (Vercel)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Vercel Platform                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │   Static      │  │   Serverless    │  │       Edge Functions     │   │
│  │   Frontend    │  │    Functions    │  │                          │   │
│  │               │  │                 │  │                          │   │
│  │ - React App   │  │ - Express API   │  │ - Global Distribution    │   │
│  │ - Build dist/ │  │ - WebSocket     │  │ - CDN Optimization       │   │
│  │ - Assets      │  │ - JSON Database │  │ - Auto Scaling           │   │
│  └───────────────┘  └─────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Deployment Configuration

**File**: `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index-simple.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json", 
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/server/index-simple.js" },
    { "src": "/ws", "dest": "/server/index-simple.js" },
    { "src": "/(.*)", "dest": "/dist/$1" }
  ]
}
```

## Next Steps & Roadmap

### Phase 1: Enhanced Intelligence (Current)
- ✅ Smart query filtering
- ✅ Inventory management
- ✅ Real-time updates
- ✅ VS Code development environment

### Phase 2: Enterprise Integration (Next 3 months)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Enterprise Integration Layer                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Authentication & Authorization:                                       │
│  ├── Azure Active Directory                                            │
│  ├── Role-based access control                                         │
│  └── Single Sign-On (SSO)                                             │
│                                                                        │
│  External Systems:                                                     │
│  ├── ERP Integration (SAP/Oracle)                                     │
│  ├── SharePoint Document Management                                   │
│  ├── Power BI Analytics                                               │
│  └── Microsoft Teams Bot                                              │
│                                                                        │
│  Data Management:                                                      │
│  ├── PostgreSQL with pgvector                                         │
│  ├── Redis for caching                                                │
│  ├── Elasticsearch for search                                         │
│  └── Data warehouse integration                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: AI Enhancement (6 months)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI/ML Enhancement Layer                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Computer Vision:                                                      │
│  ├── Part identification from images                                  │
│  ├── Damage assessment                                                 │
│  └── Compatibility checking                                           │
│                                                                        │
│  Natural Language Processing:                                          │
│  ├── Advanced intent recognition                                      │
│  ├── Multi-language support                                           │
│  └── Context-aware responses                                          │
│                                                                        │
│  Predictive Analytics:                                                 │
│  ├── Demand forecasting                                               │
│  ├── Maintenance scheduling                                           │
│  └── Cost optimization                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: SharePoint Integration

**Architecture Design**:
```typescript
// SharePoint API Integration
interface SharePointService {
  // Document management
  uploadPartDocuments(partId: string, files: File[]): Promise<void>;
  getPartDocuments(partId: string): Promise<Document[]>;
  
  // List management
  syncPartsToSharePoint(parts: Part[]): Promise<void>;
  getSharePointParts(): Promise<Part[]>;
  
  // User permissions
  checkUserAccess(userId: string, resource: string): Promise<boolean>;
}

// Implementation example
class SharePointIntegration implements SharePointService {
  private client: SPHttpClient;
  
  async uploadPartDocuments(partId: string, files: File[]) {
    const library = await this.client.get('/sites/parts/documents');
    for (const file of files) {
      await library.upload(`/parts/${partId}/${file.name}`, file);
    }
  }
}
```

### Phase 5: Advanced Analytics

**Proposed Architecture**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Analytics & Reporting                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Data Collection:                                                      │
│  ├── User interaction tracking                                        │
│  ├── Inventory movement logs                                          │
│  ├── Search pattern analysis                                          │
│  └── Performance metrics                                              │
│                                                                        │
│  Processing Pipeline:                                                  │
│  ├── Real-time stream processing                                      │
│  ├── Batch analytics jobs                                             │
│  ├── Machine learning models                                          │
│  └── Anomaly detection                                                │
│                                                                        │
│  Visualization:                                                        │
│  ├── Power BI dashboards                                              │
│  ├── Real-time monitoring                                             │
│  ├── Custom reports                                                   │
│  └── Mobile analytics app                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Current Security Measures
- CORS protection
- Rate limiting
- Input validation
- Helmet.js security headers
- Environment variable protection

### Planned Security Enhancements
```typescript
// Authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Role-based access control
const rbacMiddleware = (requiredRole: Role) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasRole(req.user, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Performance Optimization

### Current Optimizations
- Component lazy loading
- Efficient state management
- WebSocket connection pooling
- Static asset optimization

### Planned Optimizations
```typescript
// Caching strategy
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// Database query optimization
const optimizedPartSearch = async (query: string) => {
  // Use indexes for fast search
  const results = await db.query(`
    SELECT * FROM parts 
    WHERE search_vector @@ plainto_tsquery($1)
    ORDER BY ts_rank(search_vector, plainto_tsquery($1)) DESC
    LIMIT 10
  `, [query]);
  
  return results;
};
```

## Testing Strategy

### Current Testing
- ESLint for code quality
- TypeScript for type safety
- Manual integration testing

### Planned Testing Framework
```typescript
// Unit tests
describe('PartsService', () => {
  test('should decrement inventory correctly', async () => {
    const result = await partsService.requestPart('BEAR-X75-001');
    expect(result.newQuantity).toBe(24);
  });
});

// Integration tests
describe('Chat API', () => {
  test('should handle spare parts queries', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'bearing x-75' });
    
    expect(response.body.response).toContain('Bearing X-75');
  });
});

// E2E tests
describe('User Journey', () => {
  test('complete part request flow', async () => {
    await page.type('[data-testid=chat-input]', 'bearing x-75');
    await page.click('[data-testid=send-button]');
    await page.waitForSelector('[data-testid=part-result]');
    await page.click('[data-testid=request-part]');
    
    expect(await page.textContent('[data-testid=success-message]'))
      .toContain('Part requested successfully');
  });
});
```

## Monitoring & Observability

### Planned Monitoring Stack
```typescript
// Application monitoring
const monitoring = {
  // Performance metrics
  trackAPILatency: (endpoint: string, duration: number) => void,
  trackUserInteraction: (action: string, metadata: object) => void,
  
  // Error tracking
  logError: (error: Error, context: object) => void,
  trackException: (exception: Exception) => void,
  
  // Business metrics
  trackPartRequest: (partId: string, userId: string) => void,
  trackInventoryChange: (partId: string, change: number) => void
};

// Health checks
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: checkDatabaseHealth(),
      websocket: checkWebSocketHealth(),
      cache: checkCacheHealth()
    }
  };
  
  res.json(health);
});
```

This architecture provides a solid foundation for the current system while planning for future enterprise-grade enhancements. The modular design allows for incremental improvements and seamless integration with existing Tata Industries infrastructure.
