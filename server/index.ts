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
async function fetchContext(intent: Intent, userId?: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("assignments")
      .select("id, title, description, due_date, teacher_name, subject, status, grade, max_grade")
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Supabase error:", error.message);
      return "Could not load assignments from database.";
    }
    if (!data?.length) return "No assignments found in the database.";

    const now = new Date();

    if (intent === "grades") {
      const graded = data.filter((a: any) => a.grade != null);
      if (!graded.length) return "No graded assignments yet.";
      return graded
        .map((a: any) => `• ${a.title} — ${a.grade}/${a.max_grade ?? "?"}${a.teacher_name ? ` (${a.teacher_name})` : ""}`)
        .join("\n");
    }

    if (intent === "deadlines") {
      const upcoming = data.filter((a: any) => new Date(a.due_date) >= now);
      const overdue = data.filter((a: any) => new Date(a.due_date) < now && a.status !== "completed");
      let ctx = "";
      if (overdue.length) {
        ctx += `OVERDUE (${overdue.length}):\n`;
        ctx += overdue.map((a: any) => `• ${a.title} — was due ${new Date(a.due_date).toLocaleDateString()}`).join("\n");
        ctx += "\n\n";
      }
      if (upcoming.length) {
        ctx += `UPCOMING (${upcoming.length}):\n`;
        ctx += upcoming.map((a: any) => `• ${a.title} — due ${new Date(a.due_date).toLocaleDateString()}${a.teacher_name ? ` [${a.teacher_name}]` : ""}`).join("\n");
      }
      return ctx || "No upcoming deadlines.";
    }

    if (intent === "teachers") {
      const byTeacher: Record<string, string[]> = {};
      for (const a of data as any[]) {
        const teacher = a.teacher_name || "Unknown";
        if (!byTeacher[teacher]) byTeacher[teacher] = [];
        byTeacher[teacher].push(a.title);
      }
      return Object.entries(byTeacher)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([teacher, titles]) => `${teacher} (${titles.length} assignments):\n  ${titles.join(", ")}`)
        .join("\n\n");
    }

    // Default: all assignments
    return (data as any[])
      .map((a, i) => {
        const due = new Date(a.due_date);
        const overdue = due < now && a.status !== "completed";
        return (
          `${i + 1}. ${a.title}` +
          (a.teacher_name ? ` — by ${a.teacher_name}` : "") +
          (a.subject ? ` [${a.subject}]` : "") +
          ` | Due: ${due.toLocaleDateString()}` +
          (overdue ? " ⚠️ OVERDUE" : "") +
          (a.status ? ` | Status: ${a.status}` : "")
        );
      })
      .join("\n");
  } catch (err: any) {
    console.error("fetchContext error:", err.message);
    return "Could not load context.";
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(contextData: string, userEmail?: string): string {
  return `You are StudyPilot AI — a friendly academic assistant embedded in the StudyPilot web app.

StudyPilot is a student dashboard where students can view assignments, track deadlines, see which teacher assigned each task, and monitor grades.

Current user: ${userEmail || "guest"}

━━━ LIVE DATA FROM DATABASE ━━━
${contextData}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Guidelines:
- Be concise, warm and helpful
- When listing assignments use clean bullet points
- Highlight overdue items clearly
- If asked about a concept, explain it step-by-step
- Always answer in the same language the user writes in`;
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

    const contextData = await fetchContext(intent, user?.id);

    const completion = await aiClient.chat.completions.create({
      model: "deepseek/deepseek-chat",
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt(contextData, user?.email) },
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