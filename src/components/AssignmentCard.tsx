import { Assignment, Priority } from "@/types/assignment";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { CheckCircle2, Circle, Trash2, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface AssignmentCardProps {
  assignment: Assignment;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-primary/10 text-primary" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive" },
};

export function AssignmentCard({ assignment, onToggleComplete, onDelete }: AssignmentCardProps) {
  const isCompleted = assignment.status === "completed";
  const isOverdue = assignment.status === "overdue";
  const dueLabel = isPast(assignment.dueDate)
    ? `${formatDistanceToNow(assignment.dueDate)} ago`
    : `in ${formatDistanceToNow(assignment.dueDate)}`;

  const prio = priorityConfig[assignment.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "bg-card rounded-xl p-4 shadow-card border border-border flex items-start gap-4 group transition-all duration-200 hover:shadow-elevated",
        isCompleted && "opacity-60"
      )}
    >
      {/* Check */}
      <button
        onClick={() => onToggleComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0 transition-colors"
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-accent" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              "font-medium text-foreground text-sm",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {assignment.title}
          </h4>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", prio.className)}>
            {prio.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">{assignment.description}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs font-medium text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md">
            {assignment.subject}
          </span>
          <span
            className={cn(
              "text-xs flex items-center gap-1",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {format(assignment.dueDate, "MMM d")} · {dueLabel}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(assignment.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
