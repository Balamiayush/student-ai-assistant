import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Clock, CheckCircle, Send, LogOut, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
}

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submitContent, setSubmitContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [aRes, sRes] = await Promise.all([
      supabase.from("assignments").select("*").order("due_date", { ascending: true }),
      supabase.from("submissions").select("*").eq("student_id", user!.id),
    ]);
    if (aRes.data) setAssignments(aRes.data);
    if (sRes.data) setSubmissions(sRes.data);
  };

  const handleSubmit = async (assignmentId: string) => {
    if (!submitContent.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      student_id: user!.id,
      content: submitContent,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Homework submitted!");
      setSubmitContent("");
      setSelectedAssignment(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const getSubmission = (assignmentId: string) => submissions.find((s) => s.assignment_id === assignmentId);
  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const priorityColor: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-primary/10 text-primary",
    high: "bg-warning/10 text-warning",
    urgent: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">Student Dashboard</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div><p className="text-2xl font-bold">{assignments.filter(a => !getSubmission(a.id) && !isOverdue(a.due_date)).length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-accent" />
            <div><p className="text-2xl font-bold">{submissions.length}</p><p className="text-xs text-muted-foreground">Submitted</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Star className="w-8 h-8 text-warning" />
            <div><p className="text-2xl font-bold">{submissions.filter(s => s.grade !== null).length}</p><p className="text-xs text-muted-foreground">Graded</p></div>
          </CardContent></Card>
        </div>

        {/* Assignments */}
        <div>
          <h2 className="font-display text-2xl font-bold mb-4">My Assignments</h2>
          {assignments.length === 0 && (
            <Card><CardContent className="p-12 text-center text-muted-foreground">No assignments yet.</CardContent></Card>
          )}
          <div className="space-y-3">
            {assignments.map((a) => {
              const sub = getSubmission(a.id);
              const overdue = isOverdue(a.due_date);
              return (
                <Card key={a.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{a.title}</h3>
                          <Badge variant="outline" className={priorityColor[a.priority]}>{a.priority}</Badge>
                          <Badge variant="outline">{a.subject}</Badge>
                          {sub ? (
                            <Badge className="bg-accent/10 text-accent border-accent/30">Submitted</Badge>
                          ) : overdue ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/30">Overdue</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{a.description}</p>
                        <p className="text-xs text-muted-foreground">Due: {format(new Date(a.due_date), "PPP")}</p>
                        {sub?.grade !== null && sub?.grade !== undefined && (
                          <div className="mt-2 p-2 bg-accent/5 rounded-lg">
                            <p className="text-sm font-medium">Grade: <span className="text-accent">{sub.grade}/100</span></p>
                            {sub.feedback && <p className="text-xs text-muted-foreground mt-1">Feedback: {sub.feedback}</p>}
                          </div>
                        )}
                      </div>
                      {!sub && (
                        <Dialog open={selectedAssignment === a.id} onOpenChange={(open) => { setSelectedAssignment(open ? a.id : null); setSubmitContent(""); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                              <Send className="w-4 h-4 mr-1" />Submit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Submit: {a.title}</DialogTitle></DialogHeader>
                            <Textarea placeholder="Write your answer here..." value={submitContent} onChange={(e) => setSubmitContent(e.target.value)} rows={6} />
                            <Button onClick={() => handleSubmit(a.id)} disabled={submitting} className="bg-gradient-primary text-primary-foreground">
                              {submitting ? "Submitting..." : "Submit Homework"}
                            </Button>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
