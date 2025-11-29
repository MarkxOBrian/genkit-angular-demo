import express from "express";
import { ai, fieldValidationFlow } from "./flow.js";

const app = express();
app.use(express.json());

// Add CORS headers if needed
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

    // Invoke the flow directly (flows are callable functions)
    const result = await fieldValidationFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));