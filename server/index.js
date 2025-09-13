import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Set it in a .env file.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ask", async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const userText = messages.map(m => `${m.role || "user"}: ${m.content}`).join("\n");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(userText);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});


