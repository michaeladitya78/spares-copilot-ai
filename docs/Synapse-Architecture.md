# Synapse – Architecture & Technical Overview

## 1. Purpose & Vision
Synapse helps technicians identify spare parts (via text or images), verify stock and warranty, and act quickly. It emphasizes speed, clarity, and trust – the “Five‑Minute Fix”.

## 2. Tech Stack
- Frontend: React 18 + TypeScript, Vite, React Router, TanStack Query
- UI: Tailwind CSS, shadcn/ui, Radix, Lucide icons
- Analytics: @vercel/analytics
- Backend: Node, Express, dotenv
- AI: Google Gemini 1.5 Pro (text+vision) via @google/generative-ai
- Dev: ESLint, Nodemon

## 3. System Architecture
```
User (Web/Teams)
   │
   ├── React App (Vite Dev Server)
   │    ├── Chat UI (text + file + camera)
   │    ├── Multi-step loading + result cards
   │    └── Vite proxy → /api/*
   │
   └── Express API (8787)
        ├── GET /api/health
        └── POST /api/ask (text | image base64)
                 └── Gemini 1.5 Pro (text+vision)
```

### 3.1 Frontend Modules
- `src/components/spares-chat.tsx`: Chat surface, file upload, camera capture, disambiguation flow
- `src/components/ui/camera-capture.tsx`: getUserMedia flow with preview/retake/confirm
- `src/components/synapse-loading.tsx`: Trust-building stepwise loading messages
- `src/components/synapse-result-card.tsx`: Part/Inventory/Warranty cards + copy button
- `src/pages/Index.tsx`: Landing + demo
- `src/pages/TeamsConfig.tsx`: Teams tab configuration page

### 3.2 Backend Modules
- `server/index.js`
  - `GET /api/health` → uptime check
  - `POST /api/ask` →
    - Body: `{ messages: [{ role, content }], image?: <dataURL> }`
    - If `image` provided: strips dataURL prefix and creates an inlineData part for Gemini
    - Otherwise: sends concatenated text prompt
    - Returns: `{ text }`

### 3.3 Configuration
- Environment (`.env`):
  - `GEMINI_API_KEY=...`
  - `PORT=8787` (optional)
- Vite dev proxy → `vite.config.ts` passes `/api/*` to `http://localhost:8787`
- `.gitignore` excludes `.env`, build directories

## 4. Data & Security
- Secrets only on server; never exposed to browser/Teams client
- CORS enabled on API; restrict in production to your domain
- Logs: avoid storing full images/text unless needed

## 5. UX & Accessibility
- High-contrast deep slate + cyan palette; IBM Plex Sans
- Large actionable buttons (camera, upload, send)
- WCAG AA contrasts and focus-visible outlines
- “Low stock” amber lozenge when quantity < 5

## 6. Microsoft Teams Integration
- Tab App: `teams/manifest.json`, `teams/teams-config.html`, route `/teams-config`
- Update domains and icons; zip manifest + icons for upload in Teams Admin Center
- Future Bot: Azure Bot Service + Bot Framework SDK (DM, proactive messages)

## 7. Local Development
```
npm install

# API
npm run server:start   # http://localhost:8787

# Web
npm run dev            # http://localhost:8081 (or next free port)
```

## 8. Deployment
- Frontend: Vercel/Netlify/Azure Static; serve `dist/`
- Backend: Node host (Render/Railway/Azure App Service), set `GEMINI_API_KEY`
- Teams: update manifest URLs, package and upload via Admin Center

## 9. Roadmap
- RAG + vector DB for vendor manuals/BOMs (pgvector/Pinecone)
- Vision embeddings for visual NN matching
- Teams bot & message extensions

## 10. Appendix: API Contract
- `POST /api/ask`
```
Request
{
  "messages": [
    { "role": "user", "content": "Identify bearing X-75" }
  ],
  "image": "data:image/jpeg;base64,/9j/4AAQSk..."   // optional
}

Response
{
  "text": "Part: BRG-X75-001 ..."
}
```
