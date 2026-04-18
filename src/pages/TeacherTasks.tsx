import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, Search, FileText, CalendarDays, Clock, 
  CheckCircle2, AlertCircle, Filter, MoreVertical,
  ClipboardList, Users, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { AddAssignmentDialog } from "@/components/AddAssignmentDialog";

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  created_at: string;
}

export default function TeacherTasks() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (user) fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("created_by", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load assignments");
    } else {
      setAssignments(data || []);
    }
    setIsLoading(false);
  };

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-destructive/10 text-destructive border-destructive/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-primary/10 text-primary border-primary/20";
      default: return "bg-secondary text-secondary-foreground border-secondary";
    }
  };

  return (
    <DashboardLayout 
      title="Manage Tasks" 
      subtitle="Create and monitor student assignments"
      actions={
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> New Assignment
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Tasks</p>
                <p className="text-2xl font-display font-bold">{assignments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Upcoming</p>
                <p className="text-2xl font-display font-bold">
                  {assignments.filter(a => new Date(a.due_date) > new Date()).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40 backdrop-blur-sm border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Completed</p>
                <p className="text-2xl font-display font-bold">
                  {assignments.filter(a => new Date(a.due_date) <= new Date()).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/40 backdrop-blur-sm p-4 rounded-2xl border border-border">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks or subjects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
              <Filter className="w-4 h-4" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredAssignments.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No tasks found</h3>
                <p className="text-muted-foreground">Try adjusting your search or create a new assignment.</p>
              </motion.div>
            ) : (
              filteredAssignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300 overflow-hidden bg-card/60 backdrop-blur-sm">
                    <CardHeader className="p-5 pb-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={getPriorityColor(assignment.priority)}>
                              {assignment.priority}
                            </Badge>
                            <Badge variant="secondary" className="bg-secondary/80">
                              {assignment.subject}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl font-display font-bold group-hover:text-primary transition-colors">
                            {assignment.title}
                          </CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <CardDescription className="text-sm line-clamp-2 min-h-[40px]">
                        {assignment.description}
                      </CardDescription>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            {format(new Date(assignment.due_date), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-orange-500" />
                            {format(new Date(assignment.due_date), "p")}
                          </span>
                        </div>
                        <div className="flex -space-x-2">
                          {/* Avatars placeholder for assigned students */}
                          <div className="w-7 h-7 rounded-full border-2 border-card bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            JD
                          </div>
                          <div className="w-7 h-7 rounded-full border-2 border-card bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                            AS
                          </div>
                          <div className="w-7 h-7 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            +12
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <AddAssignmentDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSubmit={handleAddAssignment}
      />
    </DashboardLayout>
  );
}
