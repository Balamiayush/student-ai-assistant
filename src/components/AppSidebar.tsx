import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, LayoutDashboard, CheckSquare, Settings, LogOut, FileText, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

export function AppSidebar() {
  const { role, signOut } = useAuth();
  const location = useLocation();

  const studentLinks = [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Assignments", href: "/student/assignments", icon: FileText },
    { name: "Schedule", href: "/student/schedule", icon: CalendarDays },
  ];

  const teacherLinks = [
    { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { name: "Manage Tasks", href: "/teacher/tasks", icon: CheckSquare },
    { name: "Settings", href: "/teacher/settings", icon: Settings },
  ];

  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <aside className="w-64 h-screen max-h-screen sticky top-0 left-0 bg-card/60 backdrop-blur-xl border-r border-border hidden md:flex flex-col z-40">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground tracking-tight leading-none text-lg">StudyPilot</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Main Menu</p>
        {links.map((link) => {
          const isActive = location.pathname === link.href || (link.name === "Dashboard" && location.pathname.includes("dashboard"));
          return (
            <Link key={link.name} to={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
                <link.icon className={cn("w-5 h-5 relative z-10 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                <span className="relative z-10">{link.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
