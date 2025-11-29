# Angular + Genkit Codelab

## Overview

You'll build a basic Angular app that calls a Genkit flow to provide smart validation tooltips. No advanced SSR setup, just a simple Angular frontend and a Node.js backend with Genkit.

---

## Step 0: Prerequisites

- **Node.js v20+**
- **Angular CLI** (`npm install -g @angular/cli`)
- **Basic Angular knowledge** (components, services)
- **Google AI Studio API key** (Gemini)

---

## Step 1: Create Angular Project

```bash
ng new genkit-angular-demo
cd genkit-angular-demo
```

Choose **standalone components** when prompted.

---

## Step 2: Create Backend with Genkit

Inside the project root, create a folder `server/`:

```bash
mkdir server
cd server
```

Install dependencies:

```bash
npm init -y
npm install genkit @genkit-ai/express @genkit-ai/google-genai express
```

Add `"type": "module"` to `server/package.json`:

```json
{
  "name": "genkit-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "genkit": "^1.24.0",
    "@genkit-ai/google-genai": "^1.24.0",
    "@genkit-ai/express": "^1.24.0"
  }
}
```

### Create `server/flow.js`:

```javascript
import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export const ai = genkit({ plugins: [googleAI()] });

export const fieldValidationFlow = ai.defineFlow(
  {
    name: "fieldValidationFlow",
    inputSchema: z.object({
      fieldName: z.string(),
      userInput: z.string().optional(),
    }),
    outputSchema: z.object({
      tooltip: z.string(),
      example: z.string().optional(),
    }),
  },
  async (input) => {
    const isKenyanPhone = input.fieldName.toLowerCase().includes('kenyan') || 
                          input.fieldName.toLowerCase().includes('phone');
    
    const isEmpty = !input.userInput || input.userInput.trim() === '';
    
    let prompt = '';
    
    if (isKenyanPhone) {
      prompt = `
You are validating a Kenyan phone number field. 

Field Name: ${input.fieldName}
User's Current Input: ${isEmpty ? "(empty - field is not filled)" : input.userInput}

Kenyan phone numbers can be in these formats:
- 0712345678 (10 digits starting with 0)
- 712345678 (9 digits without leading 0)
- +254712345678 (international format with country code)

VALIDATE the user's input:
${isEmpty 
  ? '- The field is currently empty. Provide validation feedback on what format to use and why it\'s needed.'
  : '- If the input is valid, provide a confirmation tooltip\n- If the input is invalid or incomplete, explain what\'s wrong and how to fix it\n- Check if it\'s a valid Kenyan mobile number format (Safaricom, Airtel, or Telkom)'}

IMPORTANT: Always provide BOTH a TOOLTIP and an EXAMPLE in the exact format below.

Provide validation feedback in the following format:
TOOLTIP: [a brief, helpful tooltip - validate the input, explain the correct format, or indicate if empty]
EXAMPLE: [a valid Kenyan phone number example in the format: 0712345678]

Keep the tooltip concise but informative. Always include an example.
`;
    } else {
      prompt = `
You are validating an email field. 

Field Name: ${input.fieldName}
User's Current Input: ${isEmpty ? "(empty - field is not filled)" : input.userInput}

VALIDATE the user's input:
${isEmpty 
  ? '- The field is currently empty. Provide validation feedback on what format to use and why it\'s needed.'
  : '- If the input is valid, provide a confirmation tooltip\n- If the input is invalid or incomplete, explain what\'s wrong and how to fix it\n- Check if it follows proper email format (user@domain.com)'}

IMPORTANT: Always provide BOTH a TOOLTIP and an EXAMPLE in the exact format below.

Provide validation feedback in the following format:
TOOLTIP: [a brief, helpful tooltip - validate the input, explain the correct format, or indicate if empty]
EXAMPLE: [a valid email example like: user@example.com]

Keep the tooltip concise but informative. Always include an example.
`;
    }

    const { text } = await ai.generate({
      model: googleAI.model("gemini-2.5-flash"),
      prompt,
    });

    // Parse the response to extract tooltip and example
    let tooltip = "";
    let example = "";
    
    const tooltipMatch = text.match(/TOOLTIP:\s*(.+?)(?:\n|EXAMPLE:|$)/is);
    const exampleMatch = text.match(/EXAMPLE:\s*(.+?)(?:\n|$)/is);
    
    if (tooltipMatch) {
      tooltip = tooltipMatch[1].trim();
    } else {
      const parts = text.split(/EXAMPLE:/i);
      tooltip = parts[0]?.replace(/TOOLTIP:/i, "").trim() || text.trim();
    }
    
    if (exampleMatch) {
      example = exampleMatch[1].trim();
    } else if (text.includes("EXAMPLE:")) {
      const parts = text.split(/EXAMPLE:/i);
      example = parts[1]?.trim() || "";
    }
    
    // Clean up markdown formatting
    tooltip = tooltip.replace(/\*\*/g, "").replace(/`/g, "").trim();
    example = example.replace(/\*\*/g, "").replace(/`/g, "").trim();
    
    return { 
      tooltip: tooltip || "Check your input.", 
      example: example || (isKenyanPhone ? "0712345678" : "user@example.com")
    };
  }
);
```

### Create `server/index.js`:

```javascript
import express from "express";
import { ai, fieldValidationFlow } from "./flow.js";

const app = express();
app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.post("/api/validation", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }

    const result = await fieldValidationFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
```

**Run backend:**

```bash
node server/index.js
```

---

## Step 3: Connect Angular Frontend

### Update `src/main.ts`:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...appConfig.providers, provideHttpClient()],
})
  .catch((err) => console.error(err));
```

### Update `src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'genkit-angular-demo';
  constructor(private http: HttpClient) {}

  emailTooltip = '';
  emailExample = '';
  phoneTooltip = '';
  phoneExample = '';
  
  emailValue = '';
  phoneValue = '';
  
  loading = false;
  emailSubmitted = false;
  phoneSubmitted = false;

  async onSubmit(event: Event) {
    event.preventDefault();

    this.loading = true;
    this.emailSubmitted = false;
    this.phoneSubmitted = false;

    const requests: Promise<any>[] = [
      firstValueFrom(
        this.http.post('/api/validation', {
          fieldName: 'Email',
          userInput: this.emailValue.trim() || undefined
        })
      ).then((res: any) => {
        this.emailTooltip = res.tooltip || '';
        this.emailExample = res.example || '';
        this.emailSubmitted = true;
      }).catch((error) => {
        console.error('Error fetching email validation:', error);
        this.emailTooltip = 'Error: Could not fetch validation. Please try again.';
        this.emailExample = '';
        this.emailSubmitted = true;
      }),

      firstValueFrom(
        this.http.post('/api/validation', {
          fieldName: 'Phone Number (Kenyan)',
          userInput: this.phoneValue.trim() || undefined
        })
      ).then((res: any) => {
        this.phoneTooltip = res.tooltip || '';
        this.phoneExample = res.example || '';
        this.phoneSubmitted = true;
      }).catch((error) => {
        console.error('Error fetching phone validation:', error);
        this.phoneTooltip = 'Error: Could not fetch validation. Please try again.';
        this.phoneExample = '';
        this.phoneSubmitted = true;
      })
    ];

    try {
      await Promise.all(requests);
    } finally {
      this.loading = false;
    }
  }
}
```

### Update `src/app/app.component.html`:

```html
<div style="max-width: 600px; margin: 2rem auto; padding: 2rem; font-family: system-ui, -apple-system, sans-serif;">
  <h1 style="color: #333; margin-bottom: 0.5rem;">Genkit Angular Demo</h1>
  <p style="color: #666; margin-bottom: 2rem;">AI-Powered Form Validation</p>

  <form (ngSubmit)="onSubmit($event)" style="display: flex; flex-direction: column; gap: 1.5rem;">
    <!-- Email Field -->
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <label for="email" style="font-weight: 500; color: #333;">Email:</label>
      <input 
        id="email"
        type="email" 
        [(ngModel)]="emailValue" 
        name="email"
        placeholder="Enter your email address"
        [disabled]="loading"
        style="padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.5rem; font-size: 1rem;"
      />
      <div *ngIf="emailSubmitted && !loading" 
           style="margin-top: 0.5rem; padding: 0.75rem; border-radius: 0.5rem; background: #f0f7ff; border: 1px solid #b3d9ff;">
        <h3 style="margin: 0 0 0.5rem 0; color: #0066cc; font-size: 0.875rem; font-weight: 600;">Email Validation:</h3>
        <p style="margin: 0.5rem 0; font-size: 0.875rem;"><strong>Tooltip:</strong> {{ emailTooltip || 'No validation available' }}</p>
        <p style="margin: 0.5rem 0; font-size: 0.875rem;"><strong>Example:</strong> {{ emailExample || 'user@example.com' }}</p>
      </div>
    </div>

    <!-- Phone Field -->
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <label for="phone" style="font-weight: 500; color: #333;">Phone Number (Kenyan):</label>
      <input 
        id="phone"
        type="tel" 
        [(ngModel)]="phoneValue" 
        name="phone"
        placeholder="e.g., 0712345678 or +254712345678"
        [disabled]="loading"
        style="padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.5rem; font-size: 1rem;"
      />
      <div *ngIf="phoneSubmitted && !loading"
           style="margin-top: 0.5rem; padding: 0.75rem; border-radius: 0.5rem; background: #f0f7ff; border: 1px solid #b3d9ff;">
        <h3 style="margin: 0 0 0.5rem 0; color: #0066cc; font-size: 0.875rem; font-weight: 600;">Phone Number Validation:</h3>
        <p style="margin: 0.5rem 0; font-size: 0.875rem;"><strong>Tooltip:</strong> {{ phoneTooltip || 'No validation available' }}</p>
        <p style="margin: 0.5rem 0; font-size: 0.875rem;"><strong>Example:</strong> {{ phoneExample || '0712345678' }}</p>
      </div>
    </div>

    <!-- Submit Button -->
    <button 
      type="submit" 
      [disabled]="loading"
      style="padding: 0.75rem 1.5rem; background: #0066cc; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 500; cursor: pointer; align-self: flex-start;"
      [style.opacity]="loading ? '0.6' : '1'"
      [style.cursor]="loading ? 'not-allowed' : 'pointer'">
      {{ loading ? 'Validating...' : 'Validate Fields' }}
    </button>
  </form>
</div>

<router-outlet />
```

### Create `proxy.conf.json` in project root:

```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### Update `angular.json` - Add proxy config to serve section:

Find the `serve` configuration and add `proxyConfig`:

```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "configurations": {
    "development": {
      "buildTarget": "genkit-angular-demo:build:development",
      "proxyConfig": "proxy.conf.json"
    }
  },
  "defaultConfiguration": "development"
}
```

---

## Step 4: Configure API Key for Genkit

To call Genkit's AI models, you need to provide an API key from Google AI Studio (Gemini model).

### How to get your API key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create or select a project.
3. Enable the Gemini API or relevant AI model API.
4. Generate an API key in the credentials section.

### Where to configure the API key

In your backend, set the API key as an environment variable named `GEMINI_API_KEY` before running the server.

**For example, on macOS/Linux:**

```bash
export GEMINI_API_KEY="your_api_key_here"
node server/index.js
```

**On Windows (PowerShell):**

```powershell
$env:GEMINI_API_KEY="your_api_key_here"
node server/index.js
```

### How Genkit uses the API key

The Genkit Google AI plugin (`googleAI()`) automatically reads the `GEMINI_API_KEY` environment variable to authenticate requests.

Without this key, your backend won't be able to call the AI model, so no tooltips or examples will be generated.

**⚠️ Make sure to keep your API key secure and do not commit it to version control.**

---

## Step 5: Run the App

**Terminal 1 - Start backend:**

```bash
cd server
export GEMINI_API_KEY="your_api_key_here"  # macOS/Linux
# OR
$env:GEMINI_API_KEY="your_api_key_here"     # Windows PowerShell

node index.js
```

You should see: `Server running on http://localhost:3000`

**Terminal 2 - Start Angular:**

```bash
ng serve
```

Visit **http://localhost:4200**. Type into the email and phone number fields, then click "Validate Fields" — Genkit will return a tooltip and example for each field.

---

## What You Learned

- ✅ How to set up Genkit in a Node.js backend
- ✅ How to define a flow with input/output schemas
- ✅ How to call the flow from Angular using HttpClient
- ✅ How to display AI‑powered tooltips in a form
- ✅ How to configure API keys for Genkit
- ✅ How to set up a proxy for development

---

## Troubleshooting

**API key not working?**
- Verify: `echo $GEMINI_API_KEY` (macOS/Linux) or `echo $env:GEMINI_API_KEY` (Windows)
- Make sure Gemini API is enabled in Google Cloud Console

**CORS errors?**
- Check that `proxy.conf.json` exists and `angular.json` has `proxyConfig` set
- Restart Angular dev server after adding proxy config

**404 on /api/validation?**
- Make sure backend is running on port 3000
- Check that proxy configuration is correct

**Module not found?**
- Run `npm install` in both project root and `server/` directory

---

## Next Steps

- Customize validation prompts for different field types
- Add more form fields (address, name, etc.)
- Style the UI to match your brand
- Add error handling and loading states
- Deploy to production

---

**Happy Coding! 🚀**

