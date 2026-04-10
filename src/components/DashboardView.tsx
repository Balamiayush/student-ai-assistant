import { Assignment } from "@/types/assignment";
import { getStats } from "@/lib/assignments";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Clock, BookOpen } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { AssignmentCard } from "./AssignmentCard";

interface DashboardViewProps {
  assignments: Assignment[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  low: "hsl(220, 9%, 46%)",
  medium: "hsl(234, 89%, 63%)",
  high: "hsl(38, 92%, 50%)",
  urgent: "hsl(0, 84%, 60%)",
};

export function DashboardView({ assignments, onToggleComplete, onDelete }: DashboardViewProps) {
  const stats = getStats(assignments);

  const statCards = [
    { label: "Total", value: stats.total, icon: BookOpen, color: "bg-gradient-primary" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "bg-gradient-accent" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "bg-gradient-warm" },
    { label: "In Progress", value: stats.total - stats.completed - stats.overdue, icon: Clock, color: "bg-gradient-primary" },
  ];

  const subjectData = Object.entries(stats.bySubject).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.byPriority).map(([name, value]) => ({ name, value }));
  const pieColors = ["hsl(234,89%,63%)", "hsl(167,76%,48%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(280,60%,55%)"];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Your academic overview at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-xl p-5 shadow-card border border-border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-display font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center`}>
                <s.icon className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h3 className="font-display font-semibold text-foreground mb-4">By Subject</h3>
          {subjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                  {subjectData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No data yet</p>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h3 className="font-display font-semibold text-foreground mb-4">By Priority</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {priorityData.map((d, i) => (
                    <Cell key={i} fill={priorityColors[d.name] || pieColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-4">Upcoming Deadlines</h3>
        {stats.upcoming.length > 0 ? (
          <div className="space-y-3">
            {stats.upcoming.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onToggleComplete={onToggleComplete} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl p-8 text-center shadow-card border border-border">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-3" />
            <p className="text-muted-foreground">All caught up! No upcoming deadlines.</p>
          </div>
        )}
      </div>
    </div>
  );
}
