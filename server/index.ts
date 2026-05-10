import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { OpenRouter } from "@openrouter/sdk";

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

// ── OpenRouter AI client ──────────────────────────────────────────────────────
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
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
    let assignmentsData: any[] = [];

    if (userId) {
      // For authenticated students: fetch assignments assigned to them
      // 1. Assignments where assign_to_all = true
      const { data: allData } = await supabase
        .from("assignments")
        .select("*")
        .eq("assign_to_all", true);

      // 2. Assignments specifically assigned via junction table
      const { data: studentData } = await supabase
        .from("assignment_students")
        .select("assignment_id, assignments(*)")
        .eq("student_id", userId);

      // Merge & deduplicate
      const assignmentsMap = new Map<string, any>();
      (allData || []).forEach((a: any) => assignmentsMap.set(a.id, a));
      (studentData || []).forEach((row: any) => {
        const a = row.assignments;
        if (a && !assignmentsMap.has(a.id)) assignmentsMap.set(a.id, a);
      });
      assignmentsData = Array.from(assignmentsMap.values());

      // Also fetch submissions for this student to determine completion status
      const { data: subsData } = await supabase
        .from("submissions")
        .select("assignment_id")
        .eq("student_id", userId);
      const submittedIds = new Set((subsData || []).map((s: any) => s.assignment_id));

      // Tag each assignment with completion status
      assignmentsData = assignmentsData.map((a: any) => ({
        ...a,
        _status: submittedIds.has(a.id) ? "completed" : "pending",
      }));
    } else {
      // For guests / no auth: fetch all assignments
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .order("due_date", { ascending: true });

      if (error || !data?.length) {
        return { totalAssignments: 0, completed: 0, pending: 0, overdue: 0, assignmentsList: "NO_DATA", deadlinesList: "NO_DATA" };
      }
      assignmentsData = data.map((a: any) => ({ ...a, _status: "pending" }));
    }

    if (assignmentsData.length === 0) {
      return { totalAssignments: 0, completed: 0, pending: 0, overdue: 0, assignmentsList: "NO_DATA", deadlinesList: "NO_DATA" };
    }

    const now = new Date();
    const stats = {
      total: assignmentsData.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      assignmentsList: [] as string[],
      deadlinesList: [] as string[]
    };

    assignmentsData.forEach((a: any) => {
      const dueDate = new Date(a.due_date);
      const isCompleted = a._status === "completed";
      const isOverdue = dueDate < now && !isCompleted;

      if (isCompleted) stats.completed++;
      else {
        stats.pending++;
        if (isOverdue) stats.overdue++;
      }

      const statusLabel = isCompleted ? "completed" : isOverdue ? "overdue" : "pending";
      stats.assignmentsList.push(`- ${a.title} (${a.subject}) | Status: ${statusLabel} | Due: ${dueDate.toLocaleDateString()}`);
      
      if (isOverdue) {
        stats.deadlinesList.push(`${a.title} — OVERDUE`);
      } else if (!isCompleted) {
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
    console.error("fetchContext error:", err);
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

    const stream = await openrouter.chat.send({
      chatRequest: {
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: buildSystemPrompt({ ...dbContext, userEmail: user?.email }) },
          { role: "user", content: message.trim() },
        ],
        stream: true,
      },
    });

    let reply = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        reply += content;
      }
      if (chunk.usage) {
        console.log("📊 Reasoning tokens:", chunk.usage.reasoningTokens);
      }
    }

    console.log("✅ AI responded");
    res.json({ reply: reply || "No response from AI." });

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