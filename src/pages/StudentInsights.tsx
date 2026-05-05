import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, UserCheck, BarChart3, PieChart, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentInsights() {
  const stats = [
    { label: "Total Students", value: "1,284", icon: Users, color: "bg-blue-500" },
    { label: "Male Students", value: "612", icon: User, color: "bg-indigo-500" },
    { label: "Female Students", value: "672", icon: UserCheck, color: "bg-pink-500" },
  ];

  const distribution = [
    { label: "Engineering", count: 450, percentage: 35 },
    { label: "Medicine", count: 320, percentage: 25 },
    { label: "Business", count: 280, percentage: 22 },
    { label: "Arts & Humanities", count: 234, percentage: 18 },
  ];

  return (
    <DashboardLayout 
      title="Student Insights" 
      subtitle="Overview of student demographics and distribution"
    >
      <div className="space-y-8">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border hover:shadow-lg transition-all">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-white shadow-lg`}>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Class Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Class Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {distribution.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">{item.count} students</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-primary"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Gender Ratio */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Gender Ratio
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-pink-500"
                      strokeWidth="4"
                      strokeDasharray="100 100"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-indigo-500"
                      strokeWidth="4"
                      strokeDasharray="48 100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">48%</span>
                    <span className="text-xs text-muted-foreground">Male</span>
                  </div>
                </div>
                <div className="flex gap-6 mt-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-sm font-medium">Male (48%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-sm font-medium">Female (52%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Graduation Progress Mock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-xl font-bold text-foreground">Academic Excellence Program</h4>
                <p className="text-muted-foreground mt-1">
                  Our current student body maintains a 3.4 GPA average, with 85% of students on track for timely graduation.
                </p>
              </div>
              <div className="shrink-0">
                <div className="text-4xl font-black text-primary">85%</div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Success Rate</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
