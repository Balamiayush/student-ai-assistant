import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Assignment } from "@/types/assignment";
import { format } from "date-fns";
import { FileText, Download, ExternalLink, Send, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssignmentDetailsModalProps {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentDetailsModal({ assignment, open, onOpenChange }: AssignmentDetailsModalProps) {
  const { submitAssignment } = useAssignments();
  const [content, setContent] = useState(assignment.submission?.content || "");
  const [fileUrl, setFileUrl] = useState(assignment.submission?.file_url || "");
  const [submitting, setSubmitting] = useState(false);

  const isCompleted = assignment.status === "completed";
  const isOverdue = assignment.status === "overdue";

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please provide some content for your submission.");
      return;
    }
    setSubmitting(true);
    const { error } = await submitAssignment(assignment.id, content, fileUrl);
    setSubmitting(false);
    if (!error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{assignment.subject}</Badge>
            <Badge className={cn(
              "text-[10px] uppercase tracking-wider",
              assignment.priority === "urgent" ? "bg-red-500/10 text-red-500" :
              assignment.priority === "high" ? "bg-orange-500/10 text-orange-500" :
              "bg-blue-500/10 text-blue-500"
            )}>
              {assignment.priority}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-display font-bold">{assignment.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Due: {format(new Date(assignment.due_date), "PPP")}
            </span>
            <span className="flex items-center gap-1.5">
              {isCompleted ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Submitted
                </Badge>
              ) : isOverdue ? (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-xl border border-border/50">
              {assignment.description || "No description provided."}
            </p>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Your Submission
            </h4>

            {isCompleted && assignment.submission?.grade !== null && (
              <div className="bg-accent/10 border border-accent/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-accent">Grade: {assignment.submission?.grade}/100</span>
                  <Badge className="bg-accent text-accent-foreground">Graded</Badge>
                </div>
                {assignment.submission?.feedback && (
                  <p className="text-sm text-foreground italic">"{assignment.submission.feedback}"</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Submission Content / Notes</Label>
                <Textarea 
                  id="content" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Explain your work or paste your answer here..."
                  rows={4}
                  disabled={isCompleted && assignment.submission?.grade !== null}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Attachment Link (Drive/Dropbox/etc.)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="file" 
                    value={fileUrl} 
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://link-to-your-work.com"
                    disabled={isCompleted && assignment.submission?.grade !== null}
                  />
                  {fileUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Students must provide a working link to their documents.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={handleSubmit}
            disabled={submitting || (isCompleted && assignment.submission?.grade !== null)}
          >
            {submitting ? "Submitting..." : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isCompleted ? "Update Submission" : "Submit Work"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

