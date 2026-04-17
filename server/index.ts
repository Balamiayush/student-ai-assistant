import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const deepseekClient = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY, // Fallback if user set it in Vite env
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "You are StudyPilot AI, an intelligent academic system assistant for this SaaS platform. If the user asks about system-internal data that is not provided, gently inform them that you can't view their DB unless the specific intent matching falls through." 
        },
        { 
          role: "user", 
          content: message 
        }
      ],
      max_tokens: 500,
    });

    return res.json({ response: completion.choices[0].message.content });
  } catch (error: any) {
    console.error("DeepSeek Proxy Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch response from DeepSeek API" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`DeepSeek Proxy Server running on port ${PORT}`);
});
