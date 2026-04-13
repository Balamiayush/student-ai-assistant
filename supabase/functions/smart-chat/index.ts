import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Intent = "assignments" | "deadlines" | "grades" | "submissions" | "greeting" | "help" | "unknown";

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().trim();
  if (/\b(hi|hello|hey|good morning|good evening|good afternoon|namaste|sup)\b/.test(lower)) return "greeting";
  if (/\b(help|what can you|how do i|guide|options|features|capabilities)\b/.test(lower)) return "help";
  if (/\b(grade|score|mark|result|feedback|graded|how did i do|my marks)\b/.test(lower)) return "grades";
  if (/\b(deadline|due|when|overdue|due date|urgent|time left|remaining)\b/.test(lower)) return "deadlines";
  if (/\b(submit|submission|submitted|turned in|did i send|hand in)\b/.test(lower)) return "submissions";
  if (/\b(assignment|homework|task|work|pending|todo|current work|who gave|who assigned|teacher)\b/.test(lower)) return "assignments";
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, conversationHistory } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get user role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const role = roleData?.role ?? "student";

    const intent = detectIntent(message);

    // Handle greetings and help locally
    if (intent === "greeting") {
      return jsonResponse({ response: `Hello! 👋 I'm your StudyPilot AI assistant. Ask me about your assignments, deadlines, grades, or submissions!`, intent });
    }
    if (intent === "help") {
      return jsonResponse({
        response: "Here's what I can do:\n\n- 📝 **Assignments** — _\"Show my assignments\"_\n- 📅 **Deadlines** — _\"When are my deadlines?\"_\n- 📊 **Grades** — _\"What are my grades?\"_\n- 📋 **Submissions** — _\"Show my submissions\"_\n\nOr ask me anything else and I'll try to help!",
        intent,
      });
    }

    // For data intents, fetch from DB
    if (["assignments", "deadlines", "grades", "submissions"].includes(intent)) {
      const dbResponse = await handleDataIntent(adminClient, user.id, role, intent);
      return jsonResponse({ response: dbResponse, intent, source: "database" });
    }

    // Fallback: Use Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({
        response: "I can help you with assignments, deadlines, grades, and submissions. Try asking about those!",
        intent: "unknown",
        source: "fallback",
      });
    }

    // Build context for AI
    const contextData = await buildUserContext(adminClient, user.id, role);
    
    const systemPrompt = `You are StudyPilot AI, a helpful academic assistant for a ${role}. You help with assignments, deadlines, grades, and submissions.

Here is the user's current academic data for context:
${contextData}

Be concise, friendly, and helpful. Use emojis sparingly. Format with markdown. If the user asks something unrelated to academics, politely redirect or give a brief helpful answer.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory ?? []).slice(-6),
      { role: "user", content: message },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return jsonResponse({
        response: "I can help you with assignments, deadlines, grades, and submissions. Try asking about those!",
        intent: "unknown",
        source: "fallback",
      });
    }

    // Stream the AI response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("smart-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function buildUserContext(client: any, userId: string, role: string): Promise<string> {
  const lines: string[] = [];
  
  if (role === "teacher") {
    const { data: assignments } = await client.from("assignments").select("id, title, subject, due_date, priority").eq("created_by", userId).order("due_date", { ascending: true }).limit(20);
    const { data: submissions } = await client.from("submissions").select("id, assignment_id, student_id, grade, submitted_at");
    const { data: profiles } = await client.from("profiles").select("user_id, full_name, email");
    
    lines.push(`Teacher has ${assignments?.length ?? 0} assignments.`);
    if (assignments?.length) {
      lines.push("Assignments: " + assignments.map((a: any) => `"${a.title}" (${a.subject}, due ${a.due_date}, ${a.priority})`).join("; "));
    }
    const needsGrading = submissions?.filter((s: any) => s.grade === null).length ?? 0;
    lines.push(`${needsGrading} submissions need grading.`);
  } else {
    const { data: assignments } = await client.from("assignments").select("id, title, subject, due_date, priority, created_by").order("due_date", { ascending: true }).limit(20);
    const { data: submissions } = await client.from("submissions").select("id, assignment_id, grade, feedback, submitted_at").eq("student_id", userId);
    const { data: profiles } = await client.from("profiles").select("user_id, full_name, email");
    
    const submittedIds = new Set(submissions?.map((s: any) => s.assignment_id) ?? []);
    const pending = assignments?.filter((a: any) => !submittedIds.has(a.id)) ?? [];
    const overdue = pending.filter((a: any) => new Date(a.due_date) < new Date());
    const graded = submissions?.filter((s: any) => s.grade !== null) ?? [];
    
    lines.push(`Student has ${assignments?.length ?? 0} total assignments, ${pending.length} pending, ${overdue.length} overdue.`);
    if (assignments?.length) {
      lines.push("Assignments: " + assignments.map((a: any) => {
        const teacher = profiles?.find((p: any) => p.user_id === a.created_by);
        const teacherName = teacher?.full_name || teacher?.email || "Unknown";
        const status = submittedIds.has(a.id) ? "submitted" : new Date(a.due_date) < new Date() ? "OVERDUE" : "pending";
        return `"${a.title}" by ${teacherName} (${a.subject}, due ${a.due_date}, ${status})`;
      }).join("; "));
    }
    if (graded.length) {
      const avg = Math.round(graded.reduce((s: number, g: any) => s + (g.grade ?? 0), 0) / graded.length);
      lines.push(`Graded submissions: ${graded.length}, avg grade: ${avg}%`);
    }
  }
  
  return lines.join("\n");
}

async function handleDataIntent(client: any, userId: string, role: string, intent: string): Promise<string> {
  const { data: profiles } = await client.from("profiles").select("user_id, full_name, email");
  
  if (role === "teacher") {
    const { data: assignments } = await client.from("assignments").select("*").eq("created_by", userId).order("due_date", { ascending: true });
    const { data: submissions } = await client.from("submissions").select("*");
    return formatTeacherResponse(intent, assignments ?? [], submissions ?? [], profiles ?? []);
  } else {
    const { data: assignments } = await client.from("assignments").select("*").order("due_date", { ascending: true });
    const { data: submissions } = await client.from("submissions").select("*").eq("student_id", userId);
    return formatStudentResponse(intent, assignments ?? [], submissions ?? [], profiles ?? []);
  }
}

function formatStudentResponse(intent: string, assignments: any[], submissions: any[], profiles: any[]): string {
  const submittedIds = new Set(submissions.map((s) => s.assignment_id));
  const now = new Date();

  if (intent === "assignments") {
    if (!assignments.length) return "You have no assignments right now. 🎉";
    return "📝 **Your Assignments:**\n\n" + assignments.map((a, i) => {
      const teacher = profiles.find((p: any) => p.user_id === a.created_by);
      const teacherName = teacher?.full_name || teacher?.email || "Unknown Teacher";
      const submitted = submittedIds.has(a.id);
      const overdue = new Date(a.due_date) < now;
      const status = submitted ? "✅ Submitted" : overdue ? "🔴 Overdue" : "🟡 Pending";
      return `${i + 1}. **${a.title}** — ${a.subject || "General"}\n   Assigned by: ${teacherName} | Due: ${a.due_date.split("T")[0]} | ${status}`;
    }).join("\n\n");
  }

  if (intent === "deadlines") {
    const upcoming = assignments.filter((a) => !submittedIds.has(a.id) && new Date(a.due_date) >= now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    if (!upcoming.length) return "You have no upcoming deadlines! All caught up. 🎉";
    return "📅 **Upcoming Deadlines:**\n\n" + upcoming.map((a) => {
      const days = Math.ceil((new Date(a.due_date).getTime() - now.getTime()) / 86400000);
      return `- **${a.title}** — Due: ${a.due_date.split("T")[0]} (${days <= 0 ? "Today!" : `${days} day${days !== 1 ? "s" : ""} left`})`;
    }).join("\n");
  }

  if (intent === "grades") {
    const graded = submissions.filter((s) => s.grade !== null);
    if (!graded.length) return "No grades yet. Your submissions are still being reviewed. ⏳";
    const avg = Math.round(graded.reduce((s, g) => s + (g.grade ?? 0), 0) / graded.length);
    return `📊 **Your Grades** (Avg: ${avg}%):\n\n` + graded.map((s) => {
      const a = assignments.find((x: any) => x.id === s.assignment_id);
      const emoji = (s.grade ?? 0) >= 80 ? "🟢" : (s.grade ?? 0) >= 60 ? "🟡" : "🔴";
      return `- ${emoji} **${a?.title ?? "Unknown"}** — ${s.grade}/100${s.feedback ? `\n  _"${s.feedback}"_` : ""}`;
    }).join("\n\n");
  }

  if (intent === "submissions") {
    if (!submissions.length) return "You haven't submitted any assignments yet.";
    return "📋 **Your Submissions:**\n\n" + submissions.map((s) => {
      const a = assignments.find((x: any) => x.id === s.assignment_id);
      const status = s.grade !== null ? `✅ Graded: ${s.grade}/100` : "⏳ Pending review";
      return `- **${a?.title ?? "Unknown"}** — ${status}`;
    }).join("\n");
  }

  return "I can help with your assignments, deadlines, grades, and submissions!";
}

function formatTeacherResponse(intent: string, assignments: any[], submissions: any[], profiles: any[]): string {
  if (intent === "assignments") {
    if (!assignments.length) return "You haven't created any assignments yet.";
    return "📝 **Your Assignments:**\n\n" + assignments.map((a, i) => {
      const subs = submissions.filter((s: any) => s.assignment_id === a.id);
      const graded = subs.filter((s: any) => s.grade !== null);
      return `${i + 1}. **${a.title}** — ${a.subject || "General"}\n   Due: ${a.due_date.split("T")[0]} | ${subs.length} submissions (${graded.length} graded)`;
    }).join("\n\n");
  }

  if (intent === "deadlines") {
    const upcoming = assignments.filter((a) => new Date(a.due_date) >= new Date())
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    if (!upcoming.length) return "No upcoming assignment deadlines.";
    return "📅 **Upcoming Deadlines:**\n\n" + upcoming.map((a) => `- **${a.title}** — Due: ${a.due_date.split("T")[0]}`).join("\n");
  }

  if (intent === "submissions" || intent === "grades") {
    const needsGrading = submissions.filter((s: any) => s.grade === null);
    const graded = submissions.filter((s: any) => s.grade !== null);
    let text = `📋 **Submission Overview:**\n\n- Total: ${submissions.length}\n- Needs grading: ${needsGrading.length}\n- Graded: ${graded.length}`;
    if (needsGrading.length) {
      text += "\n\n**Pending:**\n" + needsGrading.slice(0, 10).map((s: any) => {
        const a = assignments.find((x: any) => x.id === s.assignment_id);
        const p = profiles.find((x: any) => x.user_id === s.student_id);
        return `- ${p?.full_name || p?.email || "Unknown"} → "${a?.title ?? "Unknown"}"`;
      }).join("\n");
    }
    return text;
  }

  return "I can help with your assignments, submissions, and grading!";
}
