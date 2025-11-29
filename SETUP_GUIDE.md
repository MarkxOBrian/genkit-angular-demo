# Genkit + Angular Form Validation Demo - Complete Setup Guide

This guide will walk you through building a form validation application using Google Genkit (with Gemini AI) and Angular. The application validates email and phone number fields in real-time using AI-powered validation.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Getting Your Genkit API Key](#getting-your-genkit-api-key)
3. [Project Setup](#project-setup)
4. [Backend Setup (Express + Genkit)](#backend-setup-express--genkit)
5. [Frontend Setup (Angular)](#frontend-setup-angular)
6. [Running the Application](#running-the-application)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Angular CLI** - Install globally: `npm install -g @angular/cli`
- **A Google Cloud account** (for Genkit API key)

Verify installations:
```bash
node --version
npm --version
ng version
```

---

## Getting Your Genkit API Key

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "genkit-demo")
5. Click "Create"

### Step 2: Enable Gemini API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Generative Language API" or "Gemini API"
3. Click on it and click **Enable**

### Step 3: Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy your API key (you'll need this later)
4. (Optional) Click "Restrict Key" to limit usage to specific APIs

**⚠️ Security Warning:** Never share your API key publicly or commit it to version control. If you accidentally expose it, immediately revoke it in Google Cloud Console and create a new one.

### Step 4: Set Environment Variable

**For macOS/Linux:**
```bash
export GEMINI_API_KEY="your-api-key-here"
```

**For Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your-api-key-here
```

**For Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your-api-key-here"
```

**Note:** Add this to your shell profile (`.bashrc`, `.zshrc`, etc.) to make it permanent.

---

## Project Setup

### Step 1: Create Angular Project

```bash
ng new genkit-angular-demo
cd genkit-angular-demo
```

When prompted:
- **Would you like to add Angular routing?** → Yes
- **Which stylesheet format would you like to use?** → CSS

### Step 2: Install Backend Dependencies

Create a `server` folder and initialize it:

```bash
mkdir server
cd server
npm init -y
```

Install required packages:

```bash
npm install express genkit @genkit-ai/google-genai @genkit-ai/express
```

### Step 3: Install Frontend Dependencies

Go back to the project root and ensure Angular dependencies are installed:

```bash
cd ..
npm install
```

---

## Backend Setup (Express + Genkit)

### Step 1: Create the Genkit Flow (`server/flow.js`)

Create `server/flow.js` with the following code:

```javascript
import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

// Initialize Genkit with Google AI plugin
export const ai = genkit({ plugins: [googleAI()] });

// Define the validation flow
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
    console.log("\n=== GENKIT FLOW - INPUT DATA ===");
    console.log("Field Name:", input.fieldName);
    console.log("User Input:", input.userInput ?? "(empty)");

    // Detect if this is a phone number field
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

    console.log("\n=== PROMPT SENT TO GEMINI ===");
    console.log(prompt);

    // Generate response using Gemini
    const { text } = await ai.generate({
      model: googleAI.model("gemini-2.5-flash"),
      prompt,
    });

    console.log("\n=== RAW RESPONSE FROM GEMINI ===");
    console.log("Full Response:", text);

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
    
    // Ensure we always have both tooltip and example
    const result = { 
      tooltip: tooltip || "Check your input.", 
      example: example || (isKenyanPhone ? "0712345678" : "user@example.com")
    };

    console.log("\n=== PARSED RESULT ===");
    console.log("Tooltip:", result.tooltip);
    console.log("Example:", result.example);
    
    return result;
  }
);
```

**What this file does:**
- Initializes Genkit with Google AI (Gemini) plugin
- Defines a flow that takes field name and user input
- Creates prompts for email and phone validation
- Uses Gemini AI to generate validation feedback
- Parses the AI response to extract tooltip and example

### Step 2: Create Express Server (`server/index.js`)

Create `server/index.js` with the following code:

```javascript
import express from "express";
import { ai, fieldValidationFlow } from "./flow.js";

const app = express();
app.use(express.json());

// Add CORS headers to allow Angular app to communicate
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Validation endpoint
app.post("/api/validation", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }

    // Invoke the validation flow
    const result = await fieldValidationFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
```

**What this file does:**
- Sets up Express server
- Handles CORS for Angular frontend
- Creates `/api/validation` endpoint
- Invokes the Genkit flow and returns results

### Step 3: Update `server/package.json`

Add `"type": "module"` to enable ES6 modules:

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

---

## Frontend Setup (Angular)

### Step 1: Update `src/main.ts`

Replace the content with:

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

**What this does:**
- Configures Angular to use HttpClient for API calls
- Bootstraps the application

### Step 2: Create Component (`src/app/app.component.ts`)

Replace the content with:

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

  // State for email validation
  emailTooltip = '';
  emailExample = '';
  emailValue = '';
  emailSubmitted = false;

  // State for phone validation
  phoneTooltip = '';
  phoneExample = '';
  phoneValue = '';
  phoneSubmitted = false;

  loading = false;

  async onSubmit(event: Event) {
    event.preventDefault();

    this.loading = true;
    this.emailSubmitted = false;
    this.phoneSubmitted = false;

    // Always validate both fields, even if empty
    const requests: Promise<any>[] = [
      // Email validation
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

      // Phone validation
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

**What this does:**
- Manages form state (email, phone, validation results)
- Handles form submission
- Sends validation requests to backend
- Updates UI with validation results

### Step 3: Create Template (`src/app/app.component.html`)

Replace the content with:

```html
<div style="max-width: 600px; margin: 2rem auto; padding: 2rem; font-family: system-ui, -apple-system, sans-serif;">
  <h1 style="color: #333; margin-bottom: 0.5rem;">Genkit Angular Demo</h1>
  <p style="color: #666; margin-bottom: 2rem;">AI-Powered Form Validation</p>

  <form (ngSubmit)="onSubmit($event)" style="display: flex; flex-direction: column; gap: 1.5rem;">
    <!-- Email Field -->
    <div class="field-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
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
      <div *ngIf="emailSubmitted && !loading" class="validation-results" 
           style="margin-top: 0.5rem; padding: 0.75rem; border-radius: 0.5rem; background: #f0f7ff; border: 1px solid #b3d9ff;">
        <h3 style="margin: 0 0 0.5rem 0; color: #0066cc; font-size: 0.875rem; font-weight: 600;">Email Validation:</h3>
        <p style="margin: 0.5rem 0; font-size: 0.875rem;"><strong>Tooltip:</strong> {{ emailTooltip || 'No validation available' }}</p>
        <p style="margin: 0.5rem 0; font-size: 0.875rem;"><strong>Example:</strong> {{ emailExample || 'user@example.com' }}</p>
      </div>
    </div>

    <!-- Phone Field -->
    <div class="field-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
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
      <div *ngIf="phoneSubmitted && !loading" class="validation-results"
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

**What this does:**
- Creates the form UI with email and phone fields
- Displays validation results below each field
- Shows loading state during validation

### Step 4: Create Proxy Configuration

Create `proxy.conf.json` in the project root:

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

**What this does:**
- Proxies API requests from Angular (port 4200) to Express (port 3000)
- Avoids CORS issues during development

### Step 5: Update `angular.json`

Find the `serve` section and add `proxyConfig`:

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

## Running the Application

### Step 1: Start the Backend Server

Open a terminal in the `server` directory:

```bash
cd server
node index.js
```

You should see: `Server running on http://localhost:3000`

**Important:** Make sure your `GEMINI_API_KEY` environment variable is set!

### Step 2: Start the Angular Frontend

Open a **new terminal** in the project root:

```bash
ng serve
```

Or:

```bash
npm start
```

The app will be available at: `http://localhost:4200`

### Step 3: Test the Application

1. Open `http://localhost:4200` in your browser
2. Enter an email address (or leave it empty)
3. Enter a phone number (or leave it empty)
4. Click "Validate Fields"
5. See validation results appear below each field!

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:** Make sure you've installed all dependencies:
```bash
# In project root
npm install

# In server directory
cd server
npm install
```

### Issue: API key not working

**Solution:** 
1. Verify your API key is set: `echo $GEMINI_API_KEY`
2. Make sure you've enabled the Gemini API in Google Cloud Console
3. Check that your API key has the correct permissions

### Issue: CORS errors

**Solution:** 
1. Make sure the proxy is configured in `angular.json`
2. Restart the Angular dev server after adding proxy config
3. Check that the backend CORS headers are set correctly

### Issue: "Cannot POST /api/validation" 404 error

**Solution:**
1. Make sure the backend server is running on port 3000
2. Check that the proxy configuration is correct
3. Verify the endpoint path matches in both frontend and backend

### Issue: Validation results not showing

**Solution:**
1. Check browser console for errors
2. Check backend console for API errors
3. Verify the API key is set correctly
4. Check network tab to see if requests are being sent

---

## Project Structure

```
genkit-angular-demo/
├── server/
│   ├── flow.js          # Genkit flow definition
│   ├── index.js         # Express server
│   └── package.json     # Backend dependencies
├── src/
│   ├── app/
│   │   ├── app.component.ts      # Angular component logic
│   │   ├── app.component.html    # Angular template
│   │   └── app.config.ts         # Angular configuration
│   └── main.ts                    # Application entry point
├── proxy.conf.json                # Proxy configuration
├── angular.json                   # Angular configuration
└── package.json                   # Frontend dependencies
```

---

## Next Steps

- Customize the validation prompts for different field types
- Add more form fields (address, name, etc.)
- Style the UI to match your brand
- Add error handling and loading states
- Deploy to production (Vercel, Netlify, etc.)

---

## Resources

- [Genkit Documentation](https://genkit.dev/)
- [Angular Documentation](https://angular.dev/)
- [Google AI Studio](https://aistudio.google.com/)
- [Express.js Documentation](https://expressjs.com/)

---

**Happy Coding! 🚀**

