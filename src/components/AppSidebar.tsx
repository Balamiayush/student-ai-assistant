import { cn } from "@/lib/utils";
import { BookOpen, LayoutDashboard, ListTodo, MessageCircle, Calendar } from "lucide-react";

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onChatToggle: () => void;
  chatOpen: boolean;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assignments", label: "Assignments", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export function AppSidebar({ activeView, onViewChange, onChatToggle, chatOpen }: AppSidebarProps) {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-sidebar-foreground">StudyPilot</h1>
          <p className="text-xs text-sidebar-foreground/50">AI Assistant</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              activeView === item.id
                ? "bg-sidebar-accent text-sidebar-primary-foreground"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* AI Chat Toggle */}
      <div className="p-3 mt-auto">
        <button
          onClick={onChatToggle}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
            chatOpen
              ? "bg-gradient-primary text-primary-foreground shadow-glow"
              : "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80"
          )}
        >
          <MessageCircle className="w-5 h-5" />
          AI Assistant
          {!chatOpen && (
            <span className="ml-auto w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
          )}
        </button>
      </div>
    </aside>
  );
}
