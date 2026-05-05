import { useAssignments } from "@/hooks/useAssignments";
import { getStats } from "@/lib/assignments";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, CheckCircle, AlertTriangle, TrendingUp, 
  BookOpen, CalendarDays, ArrowRight 
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function StudentDashboard() {
  const { assignments } = useAssignments();
  const stats = getStats(assignments);

  const statCards = [
    { label: "Pending", value: stats.total - stats.completed, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Total", value: stats.total, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <DashboardLayout 
      title="Dashboard Overview" 
      subtitle="Welcome back! Here's your study progress for today."
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border hover:shadow-md transition-all">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Assignments */}
          <Card className="lg:col-span-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Upcoming Deadlines
              </CardTitle>
              <Link to="/student/assignments">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.upcoming.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground italic">No upcoming assignments. Time to relax!</p>
                ) : (
                  stats.upcoming.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{a.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.subject} · Due {format(a.dueDate, "PPP")}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.priority === "urgent" ? "bg-red-500/10 text-red-500" :
                        a.priority === "high" ? "bg-orange-500/10 text-orange-500" :
                        "bg-blue-500/10 text-blue-500"
                      }`}>
                        {a.priority}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Productivity Advice */}
          <Card className="border-border bg-gradient-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                AI Study Tip
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                <p className="text-sm italic leading-relaxed">
                  "Try the Pomodoro technique today: Work for 25 minutes, then take a 5-minute break. This keeps your mind fresh for your {stats.upcoming[0]?.subject || 'studies'}!"
                </p>
              </div>
              <div className="pt-2">
                <p className="text-xs opacity-70">
                  You've completed {stats.completed} assignments this week. Keep up the great momentum!
                </p>
              </div>
              <Link to="/student/assignments" className="block">
                <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90">
                  Manage Assignments
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
