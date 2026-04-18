import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Configuration
// Note: Use your Service Role key if the AI needs to bypass RLS to summarize data
const supabaseUrl = process.env.SUPABASE_URL || ""; 
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini Client Configuration (using OpenAI SDK)
const geminiClient = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API,
});

// Intent Detection Logic
function detectIntent(message: string) {
  const msg = message.toLowerCase();
  if (msg.includes("assignment") || msg.includes("task")) return "assignments";
  if (msg.includes("deadline") || msg.includes("due date") || msg.includes("when is")) return "deadlines";
  if (msg.includes("grade") || msg.includes("mark") || msg.includes("score") || msg.includes("result")) return "grades";
  if (msg.includes("submission") || msg.includes("submitted")) return "submissions";
  return "general";
}

app.post("/api/chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!authHeader) return res.status(401).json({ error: "Authorization required" });

    // 1. Verify user session
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token or session expired" });
    }

    // 2. Identify role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    const role = roleData?.role || "student";

    // 3. Detect Intent
    const intent = detectIntent(message);

    // 4. Handle Database Intents (Context Injection)
    let contextData = "";
    
    if (intent === "assignments") {
      const { data: assignments } = await supabase.from("assignments").select("*").order("due_date", { ascending: true });
      if (assignments?.length) {
        contextData = assignments.map((a, i) => `${i+1}. ${a.title} (Due: ${new Date(a.due_date).toLocaleDateString()})`).join("\n");
      }
    } 
    // ... (Keep your other intent logic for deadlines, grades, etc.)

    // 5. Call Gemini AI
    // We send the context data to the AI so it can "read" your database results
    const completion = await geminiClient.chat.completions.create({
      model: "gemini-1.5-flash", // CRITICAL: Must be a gemini model name
      messages: [
        { 
          role: "system", 
          content: `You are StudyPilot AI. The user is a ${role}. 
          Here is the relevant data from the database: 
          ${contextData || "No specific database records found for this query."}
          
          If there is database data above, summarize it naturally for the user. 
          If not, answer the student's question normally.` 
        },
        { role: "user", content: message }
      ],
      max_tokens: 800,
    });

    return res.json({ response: completion.choices[0].message.content });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ 
      error: "AI Service Error", 
      response: "I'm having trouble connecting to my AI core. I can check your tasks manually if you'd like!" 
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});