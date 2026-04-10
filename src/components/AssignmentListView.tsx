import { useState } from "react";
import { Assignment, Priority } from "@/types/assignment";
import { AssignmentCard } from "./AssignmentCard";
import { AddAssignmentDialog } from "./AddAssignmentDialog";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { AnimatePresence } from "framer-motion";

interface AssignmentListViewProps {
  assignments: Assignment[];
  onAdd: (data: { title: string; description: string; subject: string; dueDate: Date; priority: Priority }) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

type FilterType = "all" | "todo" | "in-progress" | "completed" | "overdue";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "overdue", label: "Overdue" },
];

export function AssignmentListView({ assignments, onAdd, onToggleComplete, onDelete }: AssignmentListViewProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = filter === "all" ? assignments : assignments.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Assignments</h2>
          <p className="text-muted-foreground mt-1">{assignments.length} total · {assignments.filter(a => a.status === "completed").length} completed</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((a) => (
            <AssignmentCard key={a.id} assignment={a} onToggleComplete={onToggleComplete} onDelete={onDelete} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="bg-card rounded-xl p-12 text-center shadow-card border border-border">
            <p className="text-muted-foreground">No assignments match this filter.</p>
          </div>
        )}
      </div>

      <AddAssignmentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={onAdd} />
    </div>
  );
}
