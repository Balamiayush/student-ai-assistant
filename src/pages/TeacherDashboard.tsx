import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, LogOut, Users, ClipboardCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
}

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionRow | null>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");

  // Create assignment form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [aRes, sRes, pRes] = await Promise.all([
      supabase.from("assignments").select("*").eq("created_by", user!.id).order("created_at", { ascending: false }),
      supabase.from("submissions").select("*"),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);
    if (aRes.data) setAssignments(aRes.data);
    if (sRes.data) setSubmissions(sRes.data);
    if (pRes.data) setProfiles(pRes.data);
  };

  const handleCreate = async () => {
    if (!title || !dueDate) return;
    setCreating(true);
    const { error } = await supabase.from("assignments").insert({
      title,
      description,
      subject,
      due_date: new Date(dueDate).toISOString(),
      priority,
      created_by: user!.id,
      assign_to_all: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Assignment created!");
      setTitle(""); setDescription(""); setSubject(""); setDueDate(""); setPriority("medium");
      setCreateOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  const handleGrade = async () => {
    if (!gradingSubmission || !gradeValue) return;
    const { error } = await supabase.from("submissions").update({
      grade: parseFloat(gradeValue),
      feedback: feedbackValue || null,
      graded_at: new Date().toISOString(),
    }).eq("id", gradingSubmission.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Grade saved!");
      setGradingSubmission(null);
      setGradeValue("");
      setFeedbackValue("");
      fetchData();
    }
  };

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);
  const getAssignmentSubmissions = (assignmentId: string) => submissions.filter((s) => s.assignment_id === assignmentId);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">Teacher Dashboard</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Create Assignment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create New Assignment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" /></div>
                <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions..." rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Math" /></div>
                  <div><Label>Priority</Label>
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
                <div><Label>Due Date</Label><Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <Button onClick={handleCreate} disabled={creating} className="w-full bg-gradient-primary text-primary-foreground">
                  {creating ? "Creating..." : "Create Assignment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div><p className="text-2xl font-bold">{assignments.length}</p><p className="text-xs text-muted-foreground">Assignments</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-accent" />
            <div><p className="text-2xl font-bold">{submissions.length}</p><p className="text-xs text-muted-foreground">Submissions</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-warning" />
            <div><p className="text-2xl font-bold">{submissions.filter(s => s.grade === null).length}</p><p className="text-xs text-muted-foreground">Needs Grading</p></div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-3 mt-4">
            {assignments.length === 0 && (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No assignments yet. Create one!</CardContent></Card>
            )}
            {assignments.map((a) => {
              const subs = getAssignmentSubmissions(a.id);
              return (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{a.title}</h3>
                          <Badge variant="outline">{a.subject}</Badge>
                          <Badge variant="outline">{a.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{a.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date(a.due_date), "PPP")} · {subs.length} submissions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-3 mt-4">
            {submissions.length === 0 && (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No submissions yet.</CardContent></Card>
            )}
            {submissions.map((s) => {
              const assignment = assignments.find((a) => a.id === s.assignment_id);
              const profile = getProfile(s.student_id);
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{assignment?.title ?? "Unknown"}</h3>
                          {s.grade !== null ? (
                            <Badge className="bg-accent/10 text-accent border-accent/30">Graded: {s.grade}/100</Badge>
                          ) : (
                            <Badge className="bg-warning/10 text-warning border-warning/30">Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">By: {profile?.full_name || profile?.email || s.student_id}</p>
                        <p className="text-sm mt-2 bg-secondary/50 p-2 rounded">{s.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">Submitted: {format(new Date(s.submitted_at), "PPP p")}</p>
                      </div>
                      {s.grade === null && (
                        <Dialog open={gradingSubmission?.id === s.id} onOpenChange={(open) => { if (!open) setGradingSubmission(null); else { setGradingSubmission(s); setGradeValue(""); setFeedbackValue(""); } }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">Grade</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-secondary/50 p-3 rounded text-sm">{s.content}</div>
                              <div><Label>Grade (0-100)</Label><Input type="number" min="0" max="100" value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} /></div>
                              <div><Label>Feedback (optional)</Label><Textarea value={feedbackValue} onChange={(e) => setFeedbackValue(e.target.value)} rows={3} /></div>
                              <Button onClick={handleGrade} className="w-full bg-gradient-primary text-primary-foreground">Save Grade</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
