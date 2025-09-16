# Deployment Guide

## Overview

This guide covers deploying the Synapse AI Bot to Vercel and troubleshooting common deployment issues.

## Prerequisites

1. **Node.js 18+** installed locally
2. **Vercel account** with CLI installed
3. **Git repository** connected to Vercel

## Local Development Setup

```bash
# Clone the repository
git clone https://github.com/michaeladitya78/spares-copilot-ai.git
cd spares-copilot-ai

# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (in another terminal)
npm run server:dev
```

## Vercel Deployment

### 1. Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 2. GitHub Integration

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Push to main branch triggers automatic deployment

### 3. Required Environment Variables

Add these in your Vercel dashboard:

```
NODE_ENV=production
PORT=8788
```

## Build Configuration

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "server/index-simple.js",
      "use": "@vercel/node",
      "config": { "includeFiles": ["server/**"] }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/server/index-simple.js" },
    { "src": "/(.*)", "dest": "/dist/index.html" }
  ]
}
```

### Build Scripts

```json
{
  "scripts": {
    "build": "vite build",
    "build:clean": "rm -rf dist && npm run build",
    "vercel-build": "npm run build:clean"
  }
}
```

## Troubleshooting Common Issues

### Issue 1: Build Fails with "Module not found"

**Problem**: Missing dependencies during build

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for missing dependencies
npm run build
```

### Issue 2: Server Functions Timeout

**Problem**: Serverless functions exceed 30-second limit

**Solution** - Update `vercel.json`:
```json
{
  "functions": {
    "server/index-simple.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

### Issue 3: Static Assets Not Loading

**Problem**: Assets returning 404 errors

**Solution** - Check routes in `vercel.json`:
```json
{
  "routes": [
    {
      "src": "/(.*\\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))",
      "dest": "/dist/$1"
    }
  ]
}
```

### Issue 4: WebSocket Connection Fails

**Problem**: WebSocket connections not working in production

**Solution**: WebSockets have limitations on Vercel. Consider:
- Using Server-Sent Events (SSE) as fallback
- Implementing polling for real-time updates
- Using Vercel's Edge Functions for better WebSocket support

### Issue 5: Large Bundle Size

**Problem**: Build bundle is too large

**Solution**:
```javascript
// vite.config.ts - Enable chunking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-button']
        }
      }
    }
  }
});
```

## GitHub Actions CI/CD

### Workflow Configuration (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

- `VERCEL_TOKEN`: Your Vercel API token
- `ORG_ID`: Your Vercel organization ID
- `PROJECT_ID`: Your Vercel project ID

## Performance Optimization

### 1. Enable Compression

Already configured in `server/index-simple.js`:
```javascript
import compression from 'compression';
app.use(compression());
```

### 2. Static Asset Optimization

```javascript
// Serve static files with caching headers
app.use('/static', express.static('dist', {
  maxAge: '1y',
  etag: false
}));
```

### 3. Database Query Optimization

```javascript
// Use in-memory caching for frequently accessed data
const cache = new Map();

app.get('/api/parts', (req, res) => {
  const cacheKey = `parts-${JSON.stringify(req.query)}`;
  
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }
  
  const results = queryParts(req.query);
  cache.set(cacheKey, results);
  
  res.json(results);
});
```

## Monitoring and Logging

### 1. Vercel Analytics

Enable in your React app:
```typescript
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

### 2. Error Tracking

```javascript
// server/index-simple.js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});
```

### 3. Health Checks

```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
});
```

## Security Best Practices

### 1. Environment Variables

Never commit sensitive data. Use Vercel environment variables:

```javascript
// server/index-simple.js
const config = {
  port: process.env.PORT || 8788,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Add other secure config here
};
```

### 2. Rate Limiting

Already configured:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});

app.use(limiter);
```

### 3. CORS Configuration

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.vercel.app']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
```

## Rollback Strategy

### Quick Rollback

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Git-based Rollback

```bash
# Revert to previous commit
git revert HEAD

# Push to trigger new deployment
git push origin main
```

## Support and Debugging

### 1. View Deployment Logs

```bash
# Vercel CLI
vercel logs

# Or check Vercel dashboard
https://vercel.com/dashboard
```

### 2. Test Local Build

```bash
# Test production build locally
npm run build
npm run preview
```

### 3. Debug Mode

Add debug environment variable:
```
DEBUG=synapse:*
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Router Deployment](https://reactrouter.com/en/main/guides/deploying)

## Contact

For deployment issues, contact:
- Development Team: [team@example.com]
- DevOps Support: [devops@example.com]
