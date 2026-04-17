import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { sendNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, CheckCircle, Send, Star, BookOpen, AlertTriangle,
  FileText, Link as LinkIcon, Award, TrendingUp, CalendarDays, UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  created_by: string;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  content: string;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [submitContent, setSubmitContent] = useState("");
  const [submitFileUrl, setSubmitFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [aRes, sRes, pRes] = await Promise.all([
      supabase.from("assignments").select("*").order("due_date", { ascending: true }),
      supabase.from("submissions").select("*").eq("student_id", user!.id),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);
    if (aRes.data) setAssignments(aRes.data);
    if (sRes.data) setSubmissions(sRes.data);
    if (pRes.data) setProfiles(pRes.data);
    setIsLoading(false);
  };

  const getTeacherName = (teacherId: string) => {
    const p = profiles.find((pr) => pr.user_id === teacherId);
    return p?.full_name || p?.email || "Unknown Teacher";
  };

  const handleSubmit = async (assignmentId: string) => {
    if (!submitContent.trim() && !submitFileUrl.trim()) {
      toast.error("Please provide text content or a file link.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      student_id: user!.id,
      content: submitContent,
      file_url: submitFileUrl || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Homework submitted successfully!");
      setSubmitContent("");
      setSubmitFileUrl("");
      setSelectedAssignment(null);
      fetchData();

      // Notify the teacher who created this assignment
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (assignment) {
        const studentProfile = profiles.find((p) => p.user_id === user!.id);
        const studentName = studentProfile?.full_name || user!.email || "A student";
        sendNotification(
          assignment.created_by,
          `${studentName} submitted homework for "${assignment.title}"`,
          "submission",
          assignmentId
        );
      }
    }
    setSubmitting(false);
  };

  const getSubmission = (assignmentId: string) =>
    submissions.find((s) => s.assignment_id === assignmentId);
  const isOverdue = (dueDate: string) => isPast(new Date(dueDate));

  // Stats
  const pendingCount = assignments.filter(
    (a) => !getSubmission(a.id) && !isOverdue(a.due_date)
  ).length;
  const submittedCount = submissions.length;
  const gradedSubmissions = submissions.filter((s) => s.grade !== null);
  const avgGrade =
    gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.grade ?? 0), 0) / gradedSubmissions.length)
      : null;
  const overdueCount = assignments.filter(
    (a) => !getSubmission(a.id) && isOverdue(a.due_date)
  ).length;

  const priorityConfig: Record<string, { color: string; bg: string }> = {
    low: { color: "text-muted-foreground", bg: "bg-muted" },
    medium: { color: "text-primary", bg: "bg-primary/10" },
    high: { color: "text-warning", bg: "bg-warning/10" },
    urgent: { color: "text-destructive", bg: "bg-destructive/10" },
  };

  const statCards = [
    { label: "Pending", value: pendingCount, icon: Clock, gradient: "bg-gradient-primary" },
    { label: "Submitted", value: submittedCount, icon: CheckCircle, gradient: "bg-gradient-accent" },
    { label: "Graded", value: gradedSubmissions.length, icon: Star, gradient: "bg-gradient-warm" },
    { label: "Avg. Grade", value: avgGrade !== null ? `${avgGrade}%` : "—", icon: TrendingUp, gradient: "bg-gradient-primary" },
  ];

  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle={`You have ${pendingCount} pending assignment${pendingCount !== 1 ? "s" : ""} and ${overdueCount} overdue`}
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-5 flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          : statCards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${s.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <s.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="assignments" className="gap-2">
            <BookOpen className="w-4 h-4" /> Assignments
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-2">
            <Award className="w-4 h-4" /> Grades & Feedback
          </TabsTrigger>
        </TabsList>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : assignments.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="bg-card/40 backdrop-blur-sm border-dashed">
                  <CardContent className="p-16 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-foreground font-medium">No assignments yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Your teacher hasn't created any assignments.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              assignments.map((a, i) => {
              const sub = getSubmission(a.id);
              const overdue = isOverdue(a.due_date);
              const prio = priorityConfig[a.priority] ?? priorityConfig.medium;
              const dueDate = new Date(a.due_date);
              const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className={`border-border transition-all duration-200 hover:shadow-elevated ${
                    sub ? "border-l-4 border-l-accent" : overdue ? "border-l-4 border-l-destructive" : ""
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Title Row */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                            <Badge variant="outline" className={`${prio.bg} ${prio.color} border-0 text-xs`}>
                              {a.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{a.subject}</Badge>
                            {sub ? (
                              <Badge className="bg-accent/10 text-accent border-accent/30 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" /> Submitted
                              </Badge>
                            ) : overdue ? (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                              </Badge>
                            ) : null}
                          </div>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground mb-2">{a.description}</p>

                          {/* Teacher name */}
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <UserCircle className="w-3.5 h-3.5" />
                            Assigned by: <span className="font-medium text-foreground">{getTeacherName(a.created_by)}</span>
                          </p>

                          {/* Due date + progress */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              Due: {format(dueDate, "PPP 'at' p")}
                            </span>
                            {!sub && !overdue && (
                              <span className={`font-medium ${daysLeft <= 1 ? "text-destructive" : daysLeft <= 3 ? "text-warning" : "text-muted-foreground"}`}>
                                {daysLeft <= 0 ? "Due today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                              </span>
                            )}
                          </div>

                          {/* Deadline Progress Bar */}
                          {!sub && !overdue && (
                            <div className="mt-3">
                              <Progress
                                value={Math.max(0, Math.min(100, 100 - (daysLeft / 14) * 100))}
                                className="h-1.5"
                              />
                            </div>
                          )}

                          {/* Grade display */}
                          {sub?.grade !== null && sub?.grade !== undefined && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-3 p-3 bg-accent/5 rounded-xl border border-accent/10"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                                  <Award className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">
                                    Grade: <span className="text-accent">{sub.grade}/100</span>
                                  </p>
                                  {sub.feedback && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{sub.feedback}</p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Submit Button */}
                        {!sub && (
                          <Dialog
                            open={selectedAssignment === a.id}
                            onOpenChange={(open) => {
                              setSelectedAssignment(open ? a.id : null);
                              if (!open) { setSubmitContent(""); setSubmitFileUrl(""); }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity flex-shrink-0"
                              >
                                <Send className="w-4 h-4 mr-1.5" /> Submit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="font-display">Submit: {a.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-2">
                                <div>
                                  <Label htmlFor="submit-content">
                                    <FileText className="w-4 h-4 inline mr-1.5" />
                                    Your Answer
                                  </Label>
                                  <Textarea
                                    id="submit-content"
                                    placeholder="Write your answer here..."
                                    value={submitContent}
                                    onChange={(e) => setSubmitContent(e.target.value)}
                                    rows={6}
                                    className="mt-1.5"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="submit-file">
                                    <LinkIcon className="w-4 h-4 inline mr-1.5" />
                                    File Link (optional)
                                  </Label>
                                  <Input
                                    id="submit-file"
                                    placeholder="https://drive.google.com/..."
                                    value={submitFileUrl}
                                    onChange={(e) => setSubmitFileUrl(e.target.value)}
                                    className="mt-1.5"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Paste a Google Drive, Dropbox, or any file sharing link
                                  </p>
                                </div>
                                <Button
                                  onClick={() => handleSubmit(a.id)}
                                  disabled={submitting}
                                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                                >
                                  {submitting ? "Submitting..." : "Submit Homework"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          {gradedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="p-16 text-center">
                <Award className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No grades yet.</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Your submissions haven't been graded yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grade Summary */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gradient-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-primary-foreground/70 text-sm font-medium">Overall Average</p>
                        <p className="text-5xl font-display font-bold mt-1">{avgGrade}%</p>
                        <p className="text-primary-foreground/60 text-sm mt-1">
                          Based on {gradedSubmissions.length} graded assignment{gradedSubmissions.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                        <TrendingUp className="w-10 h-10 text-primary-foreground/80" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Individual Grades */}
              <AnimatePresence mode="popLayout">
                {gradedSubmissions.map((s, i) => {
                  const assignment = assignments.find((a) => a.id === s.assignment_id);
                  const grade = s.grade ?? 0;
                  const gradeColor =
                    grade >= 80 ? "text-accent" : grade >= 60 ? "text-warning" : "text-destructive";

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-border hover:shadow-elevated transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display font-semibold text-foreground">
                                {assignment?.title ?? "Unknown Assignment"}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {assignment?.subject} · Submitted {format(new Date(s.submitted_at), "PPP")}
                              </p>
                              {s.feedback && (
                                <div className="mt-2 p-2.5 bg-secondary/60 rounded-lg">
                                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Teacher Feedback:</p>
                                  <p className="text-sm text-foreground">{s.feedback}</p>
                                </div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-3xl font-display font-bold ${gradeColor}`}>{grade}</p>
                              <p className="text-xs text-muted-foreground">/100</p>
                            </div>
                          </div>
                          <Progress value={grade} className="h-1.5 mt-3" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
