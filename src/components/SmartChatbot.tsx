import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Send, X, Bot, User, Sparkles, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { format, formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Intent detection ────────────────────────────────────────
type Intent = "assignments" | "deadlines" | "grades" | "submissions" | "greeting" | "help" | "unknown";

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().trim();

  if (/\b(hi|hello|hey|good morning|good evening|good afternoon|namaste|sup)\b/.test(lower)) return "greeting";
  if (/\b(help|what can you|how do i|guide|options|features|capabilities)\b/.test(lower)) return "help";
  if (/\b(grade|score|mark|result|feedback|graded|how did i do|my marks)\b/.test(lower)) return "grades";
  if (/\b(deadline|due|when|overdue|due date|urgent|time left|remaining time)\b/.test(lower)) return "deadlines";
  if (/\b(submit|submission|submitted|turned in|did i send|hand in)\b/.test(lower)) return "submissions";
  if (/\b(assignment|homework|task|work|pending|todo|do list|current work)\b/.test(lower)) return "assignments";

  return "unknown";
}


// ─── Data fetchers ───────────────────────────────────────────
async function fetchAssignmentsData(userId: string, role: string) {
  if (role === "teacher") {
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("created_by", userId)
      .order("due_date", { ascending: true });
    return data ?? [];
  } else {
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .order("due_date", { ascending: true });
    return data ?? [];
  }
}

async function fetchSubmissionsData(userId: string, role: string) {
  if (role === "student") {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("student_id", userId);
    return data ?? [];
  } else {
    const { data } = await supabase.from("submissions").select("*");
    return data ?? [];
  }
}

async function fetchProfiles() {
  const { data } = await supabase.from("profiles").select("user_id, full_name, email");
  return data ?? [];
}

// ─── Response generators ─────────────────────────────────────
function formatAssignmentsResponse(
  assignments: any[],
  submissions: any[],
  profiles: any[],
  role: string
): string {
  if (assignments.length === 0) {
    return role === "teacher"
      ? "You haven't created any assignments yet. Go to the dashboard to create one!"
      : "You have no assignments right now. 🎉";
  }

  const submittedIds = new Set(submissions.map((s: any) => s.assignment_id));

  const lines = assignments.map((a: any, i: number) => {
    const due = new Date(a.due_date);
    const overdue = due < new Date();
    const submitted = submittedIds.has(a.id);
    const teacher = profiles.find((p) => p.user_id === a.created_by);
    const teacherName = teacher?.full_name || teacher?.email || "Unknown Teacher";
    
    const status = submitted ? "✅ Submitted" : overdue ? "🔴 Overdue" : "🟡 Pending";
    return `${i + 1}. **${a.title}**\n   - Subject: ${a.subject || "General"}\n   - Assigned by: ${teacherName}\n   - Due: ${format(due, "MMM d, yyyy")}\n   - Status: ${status}`;
  });

  return `Here are your assignments:\n\n${lines.join("\n\n")}`;
}

function formatDeadlinesResponse(assignments: any[], submissions: any[]): string {
  const submittedIds = new Set(submissions.map((s: any) => s.assignment_id));
  const upcoming = assignments
    .filter((a: any) => !submittedIds.has(a.id))
    .filter((a: any) => new Date(a.due_date) >= new Date())
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (upcoming.length === 0) {
    return "You have no upcoming deadlines! All caught up. 🎉";
  }

  const lines = upcoming.map((a: any) => {
    const due = new Date(a.due_date);
    const distance = formatDistanceToNow(due, { addSuffix: true });
    return `- **${a.title}**\n  Due: ${format(due, "MMM d, yyyy")} (${distance})`;
  });

  return `📅 **Upcoming Deadlines:**\n\n${lines.join("\n")}`;
}

function formatGradesResponse(submissions: any[], assignments: any[], profiles: any[]): string {
  const graded = submissions.filter((s: any) => s.grade !== null);

  if (graded.length === 0) {
    return "No grades yet. Your submissions are still being reviewed.";
  }

  const lines = graded.map((s: any) => {
    const a = assignments.find((x: any) => x.id === s.assignment_id);
    const teacher = profiles.find((p) => p.user_id === a?.created_by);
    const teacherName = teacher?.full_name || teacher?.email || "Teacher";
    
    const gradeEmoji = (s.grade ?? 0) >= 80 ? "🟢" : (s.grade ?? 0) >= 60 ? "🟡" : "🔴";
    return `- ${gradeEmoji} **${a?.title ?? "Unknown"}** — ${s.grade}/100\n  _Graded by: ${teacherName}_${s.feedback ? `\n  _Feedback: "${s.feedback}"_` : ""}`;
  });

  const avg = Math.round(graded.reduce((sum: number, s: any) => sum + (s.grade ?? 0), 0) / graded.length);

  return `📊 **Your Grades** (Avg: ${avg}%):\n\n${lines.join("\n\n")}`;
}

function formatSubmissionsResponse(
  submissions: any[],
  assignments: any[],
  profiles: any[],
  role: string
): string {
  if (submissions.length === 0) {
    return role === "teacher"
      ? "No students have submitted anything yet."
      : "You haven't submitted any assignments yet.";
  }

  if (role === "teacher") {
    const lines = submissions.map((s: any) => {
      const a = assignments.find((x: any) => x.id === s.assignment_id);
      const p = profiles.find((x: any) => x.user_id === s.student_id);
      const gradeStatus = s.grade !== null ? `✅ Graded: ${s.grade}/100` : "⏳ Pending grading";
      return `- **${a?.title ?? "Unknown"}** by ${p?.full_name || p?.email || "Unknown Student"}\n  Status: ${gradeStatus}`;
    });
    return `📋 **Submission Status for Your Assignments:**\n\n${lines.join("\n")}`;
  } else {
    const lines = submissions.map((s: any) => {
      const a = assignments.find((x: any) => x.id === s.assignment_id);
      const status = s.grade !== null ? `✅ Graded: ${s.grade}/100` : "⏳ Pending review";
      return `- **${a?.title ?? "Unknown"}** — ${status}`;
    });
    return `📋 **Your Submissions:**\n\n${lines.join("\n")}`;
  }
}


// ─── AI Fallback ─────────────────────────────────────────────
async function getAIFallback(message: string): Promise<string> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.response) return data.response;
    }
  } catch (err) {
    console.error("DeepSeek proxy error:", err);
  }

  // Local fallback responses
  const fallbacks = [
    "I'm your StudyPilot assistant! Ask me about:\n\n- 📝 **\"What are my assignments?\"**\n- 📅 **\"When are my deadlines?\"**\n- 📊 **\"Show my grades\"**",
    "I'm currently unable to reach my main AI brain. But I can still fetch your database records! Try asking \"my assignments\".",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ─── Component ───────────────────────────────────────────────
export function SmartChatbot() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! 👋 I'm your **StudyPilot AI assistant**. I can help you with:\n\n" +
        "- 📝 Assignments → _\"Show my assignments\"_\n" +
        "- 📅 Deadlines → _\"When are my deadlines?\"_\n" +
        "- 📊 Grades → _\"What are my grades?\"_\n" +
        "- 📋 Submissions → _\"Show my submissions\"_\n\n" +
        "What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const query = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const intent = detectIntent(query);
      let response: string;

      if (intent === "greeting") {
        response = `Hello! 👋 I'm ready to help. Ask me about your assignments, deadlines, grades, or submissions!`;
      } else if (intent === "help") {
        response =
          "Here's what I can do:\n\n" +
          "- 📝 **Assignments** — _\"Show my assignments\"_ or _\"What homework do I have?\"_\n" +
          "- 📅 **Deadlines** — _\"When are my deadlines?\"_ or _\"Any overdue?\"_\n" +
          "- 📊 **Grades** — _\"What are my grades?\"_ or _\"Show my scores\"_\n" +
          "- 📋 **Submissions** — _\"Show my submissions\"_ or _\"What did I submit?\"_";
      } else if (intent === "assignments" || intent === "deadlines" || intent === "grades" || intent === "submissions") {
        // Fetch real data
        const [assignments, submissions, profiles] = await Promise.all([
          fetchAssignmentsData(user.id, role ?? "student"),
          fetchSubmissionsData(user.id, role ?? "student"),
          fetchProfiles(),
        ]);

        switch (intent) {
          case "assignments":
            response = formatAssignmentsResponse(assignments, submissions, profiles, role ?? "student");
            break;
          case "deadlines":
            response = formatDeadlinesResponse(assignments, submissions);
            break;
          case "grades":
            response = formatGradesResponse(submissions, assignments, profiles);
            break;
          case "submissions":
            response = formatSubmissionsResponse(submissions, assignments, profiles, role ?? "student");
            break;
        }

      } else {
        response = await getAIFallback(query);
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
          open
            ? "bg-secondary text-foreground shadow-card"
            : "bg-gradient-primary text-primary-foreground shadow-glow"
        )}
        aria-label={open ? "Close chat" : "Open AI assistant"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent animate-pulse-soft" />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-elevated flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 p-4 border-b border-border bg-card">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-foreground">StudyPilot AI</h3>
                <p className="text-[11px] text-muted-foreground">Ask about assignments, grades & more</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      msg.role === "assistant" ? "bg-gradient-primary" : "bg-secondary"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <User className="w-4 h-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 max-w-[80%] text-sm",
                      msg.role === "assistant"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:text-secondary-foreground [&_strong]:text-foreground [&_li]:text-secondary-foreground [&_em]:text-muted-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary rounded-xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about assignments, grades..."
                  className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
