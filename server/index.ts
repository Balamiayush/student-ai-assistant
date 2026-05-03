import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

dotenv.config();

const app = express();

// ── CORS — allow all common local dev ports ───────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

// ── DeepSeek AI client ────────────────────────────────────────────────────────
const aiClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? process.env.DEEPSEEK_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:8080",
    "X-Title": "StudyPilot",
  },
});

// ── Intent detection ──────────────────────────────────────────────────────────
type Intent = "assignments" | "deadlines" | "grades" | "teachers" | "general";

function detectIntent(message: string): Intent {
  const msg = message.toLowerCase();
  if (msg.includes("grade") || msg.includes("score") || msg.includes("mark")) return "grades";
  if (msg.includes("deadline") || msg.includes("due") || msg.includes("overdue") || msg.includes("late")) return "deadlines";
  if (msg.includes("teacher") || msg.includes("professor") || msg.includes("instructor") || msg.includes("assigned by") || msg.includes("who gave")) return "teachers";
  if (msg.includes("assignment") || msg.includes("homework") || msg.includes("task") || msg.includes("project") || msg.includes("show my")) return "assignments";
  return "general";
}

// ── Fetch context from Supabase ───────────────────────────────────────────────
async function fetchContext(userId?: string) {
  try {
    let query = supabase.from("assignments").select("*");
    
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query.order("due_date", { ascending: true });

    if (error || !data?.length) return { assignments: "NO_DATA", deadlines: "NO_DATA", grades: "NO_DATA", teachers: "NO_DATA" };

    const now = new Date();

    // Use reduce to build context in one pass for better performance
    const context = data.reduce((acc: any, a: any) => {
      const dueDate = new Date(a.due_date);
      const isOverdue = dueDate < now && a.status !== "completed";

      // 1. Build Assignments List
      acc.assignments.push(`- ${a.title} (${a.subject}) | Status: ${a.status}`);

      // 2. Build Deadlines
      if (isOverdue) acc.deadlines.push(`⚠️ OVERDUE: ${a.title} (was due ${dueDate.toLocaleDateString()})`);
      else if (dueDate >= now) acc.deadlines.push(`- ${a.title} due ${dueDate.toLocaleDateString()}`);

      // 3. Build Grades
      if (a.grade !== null) acc.grades.push(`- ${a.title}: ${a.grade}/${a.max_grade ?? 100}`);

      return acc;
    }, { assignments: [], deadlines: [], grades: [] });

    return {
      assignments: context.assignments.join("\n"),
      deadlines: context.deadlines.join("\n"),
      grades: context.grades.join("\n"),
      // Add teacher logic similarly...
    };
  } catch (err) {
    return {};
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(context: {
  assignments?: string;
  deadlines?: string;
  grades?: string;
  teachers?: string;
  userEmail?: string;
}) {
  return `
You are **StudyPilot AI** — a smart, confident, and fully integrated assistant inside the StudyPilot web application.

You have COMPLETE access to the user's academic data and MUST behave like a real system assistant.

━━━━━━━━━━ YOUR CAPABILITIES ━━━━━━━━━━

You can:
- 📋 View and analyze assignments
- ⏰ Track deadlines (upcoming & overdue)
- 👨🏫 Identify teachers and workload
- 📊 Analyze grades and performance
- 🧠 Explain academic concepts step-by-step
- 💡 Give study advice and productivity tips

━━━━━━━━━━ STRICT RULES ━━━━━━━━━━

1. You MUST ALWAYS use the provided data when available
2. NEVER say:
   - "I couldn't access data"
   - "check your dashboard"
   - "data not available"
3. NEVER act like an external AI — you ARE the system
4. Be confident, direct, and helpful
5. If data exists → analyze it (not just repeat it)
6. If user asks:
   - "who gave most assignments" → compute answer
   - "what's due soon" → filter upcoming
   - "am I doing well" → analyze grades
7. Format responses cleanly:
   - bullet points
   - short sections
   - highlight important things (⚠️ overdue, etc.)

━━━━━━━━━━ USER ━━━━━━━━━━
${context.userEmail || "guest"}

━━━━━━━━━━ SYSTEM DATA ━━━━━━━━━━

ASSIGNMENTS:
${context.assignments || "NO_DATA"}

DEADLINES:
${context.deadlines || "NO_DATA"}

GRADES:
${context.grades || "NO_DATA"}

TEACHERS:
${context.teachers || "NO_DATA"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━ RESPONSE LOGIC ━━━━━━━━━━

- If relevant data exists → USE IT and ANALYZE IT
- If multiple datasets exist → combine insights
- If NO_DATA → then answer generally (concept/help)

━━━━━━━━━━ TONE ━━━━━━━━━━

- Friendly but smart
- Clear and structured
- Like a personal academic assistant

━━━━━━━━━━ EXAMPLES ━━━━━━━━━━

User: "Who gave the most assignments?"

Good Answer:
"📊 **Mr. John gave the most assignments (6)**

Other teachers:
• Sarah — 4  
• Alex — 2"

Bad Answer:
"I can't access your data..."

(NEVER DO THAT)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ── Chat endpoint ─────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  console.log("📨 /api/chat hit");

  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ reply: "Message is required." });
    }

    // Auth (optional)
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const { data } = await supabase.auth.getUser(token);
      user = data?.user ?? null;
    }

    const intent = detectIntent(message);
    console.log(`🔍 Intent: ${intent} | User: ${user?.email ?? "guest"}`);

    const dbContext = await fetchContext(user?.id);

    const completion = await aiClient.chat.completions.create({
      model: "deepseek/deepseek-chat",
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt({ ...dbContext, userEmail: user?.email }) },
        { role: "user", content: message.trim() },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "No response from AI.";
    console.log("✅ AI responded");
    res.json({ reply });

  } catch (err: any) {
    console.error("🔥 /api/chat error:", err.message);
    // Return the actual error message so you can debug from the chat
    res.status(500).json({
      reply: `⚠️ Server error: ${err.message}`,
    });
  }
});

// ── Health check — open http://localhost:3001/health to verify env vars ───────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    openrouter_key_loaded: !!(process.env.OPENROUTER_API_KEY ?? process.env.DEEPSEEK_API_KEY),
    supabase_url_loaded: !!process.env.VITE_SUPABASE_URL,
    supabase_key_loaded: !!process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
});

app.get("/", (_req, res) => res.send("StudyPilot backend ✅"));

app.listen(3001, () => console.log("🚀 Backend running → http://localhost:3001"));