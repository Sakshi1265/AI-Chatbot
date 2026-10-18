require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT =
  "You are a helpful, friendly AI assistant. Reply in the same language the user writes in (Hindi, Hinglish or English).";

const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  const { history } = req.body;

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "History sahi format me nahi hai." });
  }

  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: "Server par GEMINI_API_KEY set nahi hai. .env file check karo." });
  }

  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: history,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
          "Sorry, mujhe koi response nahi mila.";
        return res.json({ reply });
      }

      // 503 (high demand) ya 429 (rate limit) par dobara try karo
      const retryable = response.status === 503;
      if (retryable && attempt < MAX_RETRIES) {
        await sleep(2000 * attempt);
        continue;
      }

      return res
        .status(response.status)
        .json({ error: data?.error?.message || "API request fail ho gayi." });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Chatbot chal raha hai: http://localhost:${PORT}`);
});