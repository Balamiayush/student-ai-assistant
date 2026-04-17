import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, GraduationCap, Users } from "lucide-react";
import { motion } from "framer-motion";
import { NotificationBell } from "@/components/NotificationBell";
import { SmartChatbot } from "@/components/SmartChatbot";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const RoleIcon = role === "teacher" ? Users : GraduationCap;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (Desktop) */}
      <AppSidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4 md:hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="font-display text-lg font-bold text-foreground">StudyPilot</h1>
            </div>
            
            <div className="hidden md:flex flex-1" />

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60">
                <RoleIcon className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground capitalize">{role}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</span>
              </div>
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Header */}
        <div className="bg-card/40 border-b border-border/50">
          <div className="px-8 py-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            >
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground tracking-tight">{title}</h2>
                {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </motion.div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 px-8 py-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Smart Chatbot */}
      <SmartChatbot />
    </div>
  );
}
