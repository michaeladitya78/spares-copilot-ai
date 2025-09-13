# Synapse – AI Spare Parts Intelligence

Industrial-grade assistant to identify spare parts (text or image), surface live inventory and warranty, and integrate into Microsoft Teams.

Links:
- Local preview: http://localhost:8081 (auto-binds to another port if busy)
- API health: http://localhost:8787/api/health
- Teams config route: http://localhost:8081/teams-config

## Tech Stack

Frontend
- React 18 + TypeScript
- Vite (dev/build), React Router, TanStack Query
- Tailwind CSS + shadcn/ui + Radix primitives
- Lucide icons, Vercel Analytics

Backend (API)
- Node + Express (CORS, JSON)
- @google/generative-ai (Gemini 1.5 Pro text+vision)
- dotenv for secrets

Dev/Tooling
- ESLint flat config
- Vite path alias `@ -> ./src`
- Nodemon for API dev

## Architecture Overview

High level
```
User (Web/Teams) ──> React App (Vite) ──proxy /api──> Express API (8787) ──> Gemini 1.5 Pro
                                  │
                                  └── Camera/File → base64 → /api/ask (vision)
```

Key flows
- Text query: UI sends message → `/api/ask` → Gemini → returns answer. UI shows multi-step loading and result.
- Image query: Camera/File → base64 → `/api/ask` with image → Gemini vision → answer + UI result card.
- Disambiguation: If low confidence or unknown, UI offers multiple likely parts to select.
- Teams Tab: Same web app hosted and embedded as a Teams tab; optional config page at `/teams-config`.

Security
- Never expose `GEMINI_API_KEY` in the frontend. The key is read by the Express server from `.env`.
- `.gitignore` excludes `.env`.

## Project Structure

```
src/
  components/
    spares-chat.tsx           # Chat surface + send, file, camera capture
    synapse-*.tsx             # Header, welcome, loading, result card
    ui/camera-capture.tsx     # getUserMedia capture modal (preview/retake/use)
    ui/*                      # shadcn components
  pages/
    Index.tsx                 # Landing + demo chat
    TeamsConfig.tsx           # Teams tab configuration page
  main.tsx, App.tsx           # App shell + routing + Analytics
server/
  index.js                    # Express API (/api/health, /api/ask)
teams/
  manifest.json               # Teams app manifest (tab)
  teams-config.html           # HTML config (optional alternative)
```

API
- `POST /api/ask`
  - Body: `{ messages: [{ role, content }], image?: <dataURL base64> }`
  - Behavior: text or text+image routed to Gemini; returns `{ text }`.
- `GET /api/health` → `{ status: "ok" }`

Environment variables (.env)
- `GEMINI_API_KEY=...`
- `PORT=8787` (optional)

## Local Development

Prereqs: Node 18+

Install and run:
```sh
npm install

# start API (reads .env)
npm run server:start  # http://localhost:8787

# start web
npm run dev           # http://localhost:8081 (or next free port)
```

Vite dev server proxies `/api/*` → `http://localhost:8787` (see `vite.config.ts`).

## Deployment

Frontend (Vercel/Azure Static Web Apps/Netlify)
- Build: `npm run build` → `dist/`
- Serve static files; ensure HTTPS domain matches `teams/manifest.json`.

Backend (Railway/Render/Azure App Service/VM)
- Run `node server/index.js`
- Set `GEMINI_API_KEY` secret.
- Allow CORS for your frontend domain.

Teams (Tab App)
- Update `teams/manifest.json` `validDomains`, `contentUrl`, `configurationUrl` with your public domain.
- Add `icon-color.png` (192x192) and `icon-outline.png` (32x32) in `teams/`.
- Zip and upload via Teams Admin Center or Developer Portal.

## UX Highlights
- “Five-Minute Fix” principle, optimized for technicians (high contrast, big touch targets).
- Intelligent loading steps (“Analyzing photo…”, “Checking inventory…”) to build trust.
- Result card: part number prominence, copy button, inventory lozenge (LOW STOCK/IN STOCK), warranty.
- Disambiguation when confidence is low.
- Camera “living input”: thumbnail + progress.

## Roadmap
- Teams Bot (Bot Framework) for DM-style queries and proactive notifications.
- RAG pipeline with vector DB for vendor manuals and BOMs.
- Image embedding store for visual nearest-neighbor matching.

## Analytics
- `@vercel/analytics` added in `App.tsx` for basic usage metrics.

---

See `docs/Synapse-Architecture.md` for a deeper dive (diagrams, API shapes, flows).
