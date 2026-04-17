import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { sendNotification, sendNotificationBulk } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Users, ClipboardCheck, FileText, Award, Search,
  CalendarDays, ExternalLink, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  assign_to_all: boolean;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
}

interface StudentOption {
  user_id: string;
  full_name: string;
  email: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionRow | null>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create assignment form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [aRes, sRes, pRes, studentRolesRes] = await Promise.all([
      supabase.from("assignments").select("*").eq("created_by", user!.id).order("created_at", { ascending: false }),
      supabase.from("submissions").select("*"),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
    ]);
    if (aRes.data) setAssignments(aRes.data);
    if (sRes.data) setSubmissions(sRes.data);
    if (pRes.data) setProfiles(pRes.data);

    // Build student list by joining user_roles with profiles
    if (studentRolesRes.data && pRes.data) {
      const studentIds = new Set(studentRolesRes.data.map((r) => r.user_id));
      const studentList = pRes.data
        .filter((p) => studentIds.has(p.user_id))
        .map((p) => ({ user_id: p.user_id, full_name: p.full_name, email: p.email }));
      setStudents(studentList);
    }
    setIsLoading(false);
  };

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setSubject("");
    setDueDate("");
    setPriority("medium");
    setAssignToAll(true);
    setSelectedStudents([]);
  };

  const handleCreate = async () => {
    if (!title || !dueDate) {
      toast.error("Title and due date are required.");
      return;
    }
    if (!assignToAll && selectedStudents.length === 0) {
      toast.error("Please select at least one student.");
      return;
    }
    setCreating(true);

    // Insert assignment
    const { data: assignment, error } = await supabase
      .from("assignments")
      .insert({
        title,
        description,
        subject,
        due_date: new Date(dueDate).toISOString(),
        priority,
        created_by: user!.id,
        assign_to_all: assignToAll,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    // If assigning to specific students, insert into junction table
    if (!assignToAll && assignment) {
      const rows = selectedStudents.map((studentId) => ({
        assignment_id: assignment.id,
        student_id: studentId,
      }));
      const { error: junctionError } = await supabase.from("assignment_students").insert(rows);
      if (junctionError) {
        toast.error("Assignment created but failed to assign students: " + junctionError.message);
      } else {
        await sendNotificationBulk(selectedStudents, `New assignment: "${title}"`, "assignment", assignment.id);
      }
    } else if (assignToAll && assignment) {
      const allStudentIds = students.map(s => s.user_id);
      await sendNotificationBulk(allStudentIds, `New assignment: "${title}"`, "assignment", assignment.id);
    }

    toast.success("Assignment created!");
    resetCreateForm();
    setCreateOpen(false);
    fetchData();
    setCreating(false);
  };

  const handleGrade = async () => {
    if (!gradingSubmission || !gradeValue) return;
    const grade = parseFloat(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast.error("Grade must be between 0 and 100.");
      return;
    }
    const { error } = await supabase
      .from("submissions")
      .update({
        grade,
        feedback: feedbackValue || null,
        graded_at: new Date().toISOString(),
      })
      .eq("id", gradingSubmission.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Grade saved!");
      await sendNotification(
        gradingSubmission.student_id,
        `Your submission has been graded: ${grade}/100`,
        "grade",
        gradingSubmission.assignment_id
      );
      setGradingSubmission(null);
      setGradeValue("");
      setFeedbackValue("");
      fetchData();
    }
  };

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);
  const getAssignmentSubmissions = (assignmentId: string) =>
    submissions.filter((s) => s.assignment_id === assignmentId);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Filtered submissions for search
  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery) return true;
    const assignment = assignments.find((a) => a.id === s.assignment_id);
    const profile = getProfile(s.student_id);
    const q = searchQuery.toLowerCase();
    return (
      assignment?.title.toLowerCase().includes(q) ||
      profile?.full_name.toLowerCase().includes(q) ||
      profile?.email.toLowerCase().includes(q)
    );
  });

  // Stats
  const needsGrading = submissions.filter((s) => s.grade === null).length;
  const gradedCount = submissions.filter((s) => s.grade !== null).length;

  const statCards = [
    { label: "Assignments", value: assignments.length, icon: FileText, gradient: "bg-gradient-primary" },
    { label: "Submissions", value: submissions.length, icon: ClipboardCheck, gradient: "bg-gradient-accent" },
    { label: "Needs Grading", value: needsGrading, icon: Clock, gradient: "bg-gradient-warm" },
    { label: "Graded", value: gradedCount, icon: CheckCircle2, gradient: "bg-gradient-primary" },
  ];

  return (
    <DashboardLayout
      title="Teacher Dashboard"
      subtitle={`${assignments.length} assignment${assignments.length !== 1 ? "s" : ""} · ${needsGrading} pending grading`}
      actions={
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" /> Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Create New Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions for students..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Math" />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              {/* Assign To */}
              <div className="space-y-3">
                <Label>Assign To</Label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => { setAssignToAll(true); setSelectedStudents([]); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                      assignToAll
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Users className="w-4 h-4" /> All Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignToAll(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                      !assignToAll
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Select Students
                  </button>
                </div>

                {!assignToAll && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ScrollArea className="h-[160px] border border-border rounded-xl p-3">
                      {students.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No students registered yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {students.map((s) => (
                            <label
                              key={s.user_id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={selectedStudents.includes(s.user_id)}
                                onCheckedChange={() => toggleStudentSelection(s.user_id)}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {s.full_name || "Unnamed"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {selectedStudents.length > 0 && (
                      <p className="text-xs text-primary font-medium mt-2">
                        {selectedStudents.length} student{selectedStudents.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {creating ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-secondary/60">
            <TabsTrigger value="assignments" className="gap-2">
              <FileText className="w-4 h-4" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <ClipboardCheck className="w-4 h-4" /> Submissions
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

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
                    <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-foreground font-medium">No assignments yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Click "Create Assignment" to get started.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              assignments.map((a, i) => {
              const subs = getAssignmentSubmissions(a.id);
              const gradedSubs = subs.filter((s) => s.grade !== null);
              const completionPercent = students.length > 0 ? Math.round((subs.length / students.length) * 100) : 0;

              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="border-border hover:shadow-elevated transition-all duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                            <Badge variant="outline" className="text-xs">{a.subject}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{a.priority}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${a.assign_to_all ? "bg-primary/10 text-primary border-primary/20" : "bg-accent/10 text-accent border-accent/20"}`}
                            >
                              <Users className="w-3 h-3 mr-1" />
                              {a.assign_to_all ? "All Students" : "Selected"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              Due: {format(new Date(a.due_date), "PPP 'at' p")}
                            </span>
                            <span>{subs.length} submission{subs.length !== 1 ? "s" : ""}</span>
                            <span>{gradedSubs.length} graded</span>
                          </div>

                          {/* Submission progress */}
                          {students.length > 0 && (
                            <div className="mt-3 flex items-center gap-3">
                              <Progress value={completionPercent} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground font-medium">{completionPercent}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredSubmissions.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardContent className="p-16 text-center">
                    <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                      {searchQuery ? "No submissions match your search." : "No submissions yet."}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {filteredSubmissions.map((s, i) => {
              const assignment = assignments.find((a) => a.id === s.assignment_id);
              const profile = getProfile(s.student_id);
              const isGraded = s.grade !== null;

              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`border-border hover:shadow-elevated transition-all duration-200 ${
                    isGraded ? "border-l-4 border-l-accent" : "border-l-4 border-l-warning"
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-display font-semibold text-foreground">
                              {assignment?.title ?? "Unknown"}
                            </h3>
                            {isGraded ? (
                              <Badge className="bg-accent/10 text-accent border-accent/30 text-xs">
                                <Award className="w-3 h-3 mr-1" /> Graded: {s.grade}/100
                              </Badge>
                            ) : (
                              <Badge className="bg-warning/10 text-warning border-warning/30 text-xs">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            By: <span className="font-medium text-foreground">{profile?.full_name || profile?.email || "Unknown"}</span>
                          </p>

                          {/* Submission content preview */}
                          <div className="p-3 bg-secondary/40 rounded-lg text-sm text-foreground mb-2 line-clamp-3">
                            {s.content || <span className="text-muted-foreground italic">No text content</span>}
                          </div>

                          {/* File link */}
                          {s.file_url && (
                            <a
                              href={s.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View attached file
                            </a>
                          )}

                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted: {format(new Date(s.submitted_at), "PPP 'at' p")}
                          </p>

                          {/* Show existing feedback */}
                          {isGraded && s.feedback && (
                            <div className="mt-2 p-2.5 bg-accent/5 rounded-lg border border-accent/10">
                              <p className="text-xs text-muted-foreground font-medium mb-0.5">Your Feedback:</p>
                              <p className="text-sm text-foreground">{s.feedback}</p>
                            </div>
                          )}
                        </div>

                        {/* Grade button */}
                        {!isGraded && (
                          <Dialog
                            open={gradingSubmission?.id === s.id}
                            onOpenChange={(open) => {
                              if (!open) setGradingSubmission(null);
                              else {
                                setGradingSubmission(s);
                                setGradeValue("");
                                setFeedbackValue("");
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 flex-shrink-0"
                              >
                                <Award className="w-4 h-4 mr-1.5" /> Grade
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="font-display">Grade Submission</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-2">
                                <div className="p-3 bg-secondary/40 rounded-lg">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Student's Answer:</p>
                                  <p className="text-sm text-foreground">{s.content}</p>
                                  {s.file_url && (
                                    <a
                                      href={s.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium mt-2"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" /> View attached file
                                    </a>
                                  )}
                                </div>
                                <div>
                                  <Label>Grade (0–100) *</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={gradeValue}
                                    onChange={(e) => setGradeValue(e.target.value)}
                                    placeholder="Enter grade"
                                  />
                                </div>
                                <div>
                                  <Label>Feedback (optional)</Label>
                                  <Textarea
                                    value={feedbackValue}
                                    onChange={(e) => setFeedbackValue(e.target.value)}
                                    placeholder="Write feedback for the student..."
                                    rows={3}
                                  />
                                </div>
                                <Button
                                  onClick={handleGrade}
                                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                                >
                                  Save Grade
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
            })}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
