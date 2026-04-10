import { useState } from "react";
import { useAssignments } from "@/hooks/useAssignments";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardView } from "@/components/DashboardView";
import { AssignmentListView } from "@/components/AssignmentListView";
import { CalendarView } from "@/components/CalendarView";
import { AIChatPanel } from "@/components/AIChatPanel";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const { assignments, add, toggleComplete, remove } = useAssignments();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onChatToggle={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
      />

      <main className={`ml-64 flex-1 p-8 transition-all duration-300 ${chatOpen ? "mr-96" : ""}`}>
        <div className="max-w-5xl mx-auto">
          {activeView === "dashboard" && (
            <DashboardView assignments={assignments} onToggleComplete={toggleComplete} onDelete={remove} />
          )}
          {activeView === "assignments" && (
            <AssignmentListView assignments={assignments} onAdd={add} onToggleComplete={toggleComplete} onDelete={remove} />
          )}
          {activeView === "calendar" && <CalendarView assignments={assignments} />}
        </div>
      </main>

      <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default Index;
