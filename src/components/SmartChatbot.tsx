import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Send, X, Bot, Sparkles, RotateCcw, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKEND_URL = "http://localhost:3001/api/chat";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey there 👋 I'm **StudyPilot AI** — your academic assistant.\n\nAsk me about:\n- 📋 Your assignments & deadlines\n- 👨‍🏫 Who assigned what\n- 📊 Your grades & progress\n- 💡 Any concept you want explained",
  timestamp: new Date(),
};

// ─── Quick Prompt Chips ───────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Show my assignments",
  "What's due soon?",
  "Who gave the most assignments?",
  "Explain a concept",
];

// ─── Bubble ──────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-violet-600 text-white rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          msg.content
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5 prose-ul:my-1 prose-li:my-0">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center h-9">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block animate-bounce"
            style={{ animationDelay: `${delay}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SmartChatbot() {
  const { user, session } = useAuth() as { user: any; session: any };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnread(0);
    }
  }, [open]);

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch(BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ message: text.trim() }),
        });

        const data = await res.json();

        const botMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? "⚠️ Something went wrong. Please try again.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMsg]);

        if (!open) setUnread((n) => n + 1);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "⚠️ **Can't reach the server.** Make sure the backend is running on `localhost:3001`.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, session, open]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setUnread(0);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Trigger ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all duration-200"
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <Sparkles className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[380px] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            style={{ height: "min(600px, 80vh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-600/30">
                  <Sparkles className="w-[18px] h-[18px] text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">StudyPilot AI</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {user?.email
                      ? `Signed in as ${user.email.split("@")[0]}`
                      : "Academic assistant"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts — only show when only welcome message */}
            {messages.length === 1 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border shrink-0 bg-card">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-violet-500/40 transition-shadow"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your studies…"
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-violet-700 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <p className="text-center text-[10px] text-muted-foreground/50 mt-2 tracking-widest uppercase font-medium">
                Powered by DeepSeek · StudyPilot
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}