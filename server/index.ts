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
    const stats = {
      total: data.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      assignmentsList: [] as string[],
      deadlinesList: [] as string[]
    };

    data.forEach((a: any) => {
      const dueDate = new Date(a.due_date);
      const isCompleted = a.status === "completed";
      const isOverdue = dueDate < now && !isCompleted;

      if (isCompleted) stats.completed++;
      else {
        stats.pending++;
        if (isOverdue) stats.overdue++;
      }

      stats.assignmentsList.push(`- ${a.title} (${a.subject}) | Status: ${a.status} | Due: ${dueDate.toLocaleDateString()}`);
      
      if (isOverdue) {
        stats.deadlinesList.push(`${a.title} — OVERDUE`);
      } else {
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        stats.deadlinesList.push(`${a.title} — Due in ${diffDays} days`);
      }
    });

    return {
      totalAssignments: stats.total,
      completed: stats.completed,
      pending: stats.pending,
      overdue: stats.overdue,
      assignmentsList: stats.assignmentsList.join("\n"),
      deadlinesList: stats.deadlinesList.join("\n")
    };
  } catch (err) {
    return { totalAssignments: 0, completed: 0, pending: 0, overdue: 0, assignmentsList: "NO_DATA", deadlinesList: "NO_DATA" };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(context: any) {
  return `
You are StudyPilot AI — a real-time academic intelligence system.

You are NOT a generic chatbot.
You are directly connected to the user's academic database.

━━━━━━━━━━ CORE BEHAVIOR ━━━━━━━━━━
- Always answer using real database data provided in context.
- Never give generic replies.
- Never say "check your dashboard".
- Always analyze and summarize data.

━━━━━━━━━━ ASSIGNMENT INTELLIGENCE ━━━━━━━━━━
When the user asks:
"Show my assignments", "Do I have work?", "Any homework?", etc.

You MUST:
1. Count total assignments
2. Separate them into:
   - Completed
   - Pending
   - Overdue (VERY IMPORTANT)
3. Detect urgency based on due dates:
   - 🔴 HIGH URGENCY → due today or overdue
   - 🟡 MEDIUM → due within 2–3 days
   - 🟢 LOW → due later

━━━━━━━━━━ DATA CONTEXT ━━━━━━━━━━
Use this data strictly:

TOTAL: ${context.totalAssignments}
COMPLETED: ${context.completed}
PENDING: ${context.pending}
OVERDUE: ${context.overdue}

ASSIGNMENTS:
${context.assignmentsList}

DEADLINES:
${context.deadlinesList}

━━━━━━━━━━ RESPONSE FORMAT ━━━━━━━━━━

📊 Assignment Overview
• Total: X
• Completed: X
• Pending: X
• ⚠️ Overdue: X

🚨 Urgent Tasks
• 🔴 Math Homework — OVERDUE
• 🔴 Science Project — Due Today

📅 Upcoming Tasks
• 🟡 English Essay — Due in 2 days
• 🟢 History Notes — Due in 5 days

📌 Insight
• You should focus on overdue tasks immediately.
• Completing high urgency tasks will improve your performance.

━━━━━━━━━━ STRICT RULES ━━━━━━━━━━
- If no assignments exist:
  → Say: "You currently have no assignments in your system."
- Do NOT explain what assignments are.
- Do NOT ask unnecessary questions.
- Be direct, smart, and structured.

You are the brain of StudyPilot.
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