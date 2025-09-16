# Microsoft Teams Integration for Synapse

This directory contains the Microsoft Teams app manifest and configuration files to integrate Synapse into Teams as a tab application.

## Quick Setup

### 1. Deploy Your App
First, deploy your Synapse app to a public URL (e.g., Vercel):
```bash
npm run build
# Deploy to Vercel, Azure, or any hosting platform
```

### 2. Update Manifest
Edit `teams/manifest.json` and replace:
- `"your-app-domain.vercel.app"` with your actual domain
- App ID in `webApplicationInfo.id` (get from Azure App Registration)

### 3. Create App Package
1. Add app icons to `teams/` folder:
   - `icon-color.png` (192x192px)
   - `icon-outline.png` (32x32px, white transparent)

2. Create ZIP package:
   ```bash
   cd teams/
   zip synapse-teams-app.zip manifest.json icon-color.png icon-outline.png
   ```

### 4. Install in Teams
1. Go to Teams Admin Center or use Teams App Studio
2. Upload the ZIP package
3. Install in your organization or specific teams

## Integration Types

### ✅ Tab Application (Current)
- Embeds your web app as a Teams tab
- Works in channels and personal scope
- Uses existing UI with Teams context

### 🔄 Bot (Future Enhancement)
For conversational interactions:
```
User: "Find bearing X-75"
Bot: [Shows part details with inventory status]
```

### 🔄 Message Extension (Advanced)
For inline part searches in conversations.

## Features in Teams

When installed, users can:
- 📷 **Camera Capture** - Take photos of parts directly in Teams
- 🔍 **AI Recognition** - Instant part identification with Gemini Vision
- 📊 **Real-time Data** - Live inventory and warranty status
- 🔗 **SharePoint Integration** - Connect to existing BOM lists
- 💬 **Team Collaboration** - Share findings in channels

## Configuration URL

The Teams config page is available at:
`https://your-domain.com/teams-config`

This page handles the Teams-specific setup and tab configuration.

## Permissions Required

- `identity` - Access user profile for personalization
- `messageTeamMembers` - Send notifications about inventory updates

## Security Notes

- All API calls go through your secure backend
- Gemini API key is never exposed to Teams/frontend
- Follows Microsoft Teams security best practices
