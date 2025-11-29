# Quick Reference Card - Genkit + Angular Demo

## Quick Setup Checklist

### 1. Prerequisites
- [ ] Node.js installed (`node --version`)
- [ ] Angular CLI installed (`npm install -g @angular/cli`)
- [ ] Google Cloud account created

### 2. API Key Setup
```bash
# Get API key from: https://console.cloud.google.com/
# Enable "Generative Language API" or "Gemini API"

# Set environment variable:
export GEMINI_API_KEY="your-key-here"
```

### 3. Project Creation
```bash
ng new genkit-angular-demo
cd genkit-angular-demo
mkdir server && cd server
npm init -y
npm install express genkit @genkit-ai/google-genai @genkit-ai/express
cd ..
```

### 4. Key Files to Create

**Backend:**
- `server/flow.js` - Genkit flow definition
- `server/index.js` - Express server
- `server/package.json` - Add `"type": "module"`

**Frontend:**
- `src/app/app.component.ts` - Component logic
- `src/app/app.component.html` - Template
- `src/main.ts` - Bootstrap with HttpClient
- `proxy.conf.json` - Proxy config
- `angular.json` - Add proxyConfig to serve section

### 5. Run Commands

**Terminal 1 (Backend):**
```bash
cd server
node index.js
```

**Terminal 2 (Frontend):**
```bash
ng serve
```

### 6. Test
- Open: http://localhost:4200
- Enter email/phone
- Click "Validate Fields"
- See results!

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| API key not found | `export GEMINI_API_KEY="key"` |
| CORS error | Check proxy.conf.json and angular.json |
| 404 on /api/validation | Backend not running on port 3000 |
| Module not found | Run `npm install` in both root and server |

---

## File Locations Quick Reference

```
server/
  ├── flow.js          ← Genkit flow (AI logic)
  └── index.js         ← Express server (API endpoint)

src/app/
  ├── app.component.ts ← Component state & logic
  └── app.component.html ← UI template

proxy.conf.json        ← Proxy config
angular.json           ← Angular config (add proxy)
```

---

## API Endpoint

**POST** `/api/validation`

**Request Body:**
```json
{
  "fieldName": "Email",
  "userInput": "user@example.com"
}
```

**Response:**
```json
{
  "tooltip": "Valid email format",
  "example": "user@example.com"
}
```

---

## Environment Variable

**macOS/Linux:**
```bash
export GEMINI_API_KEY="your-key"
```

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your-key"
```

---

**Need help?** Check `SETUP_GUIDE.md` for detailed instructions!

