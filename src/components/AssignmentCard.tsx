import { useState } from "react";
import { Assignment, Priority } from "@/types/assignment";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { AssignmentDetailsModal } from "./AssignmentDetailsModal";

interface AssignmentCardProps {
  assignment: Assignment;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-primary/10 text-primary" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive" },
};

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isCompleted = assignment.status === "completed";
  const isOverdue = assignment.status === "overdue";
  const dueDate = new Date(assignment.due_date);
  
  const dueLabel = isPast(dueDate)
    ? `${formatDistanceToNow(dueDate)} ago`
    : `in ${formatDistanceToNow(dueDate)}`;

  const prio = priorityConfig[assignment.priority as Priority] || priorityConfig.medium;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "bg-card rounded-xl p-4 shadow-card border border-border flex items-start gap-4 group transition-all duration-200 hover:shadow-elevated cursor-pointer hover:border-primary/30",
          isCompleted && "bg-accent/5 border-accent/20"
        )}
      >
        {/* Status Icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isCompleted ? (
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
            </div>
          ) : isOverdue ? (
            <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={cn("font-semibold text-foreground text-sm", isCompleted && "text-muted-foreground")}>
              {assignment.title}
            </h4>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", prio.className)}>
              {prio.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{assignment.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {assignment.subject}
            </span>
            <span
              className={cn(
                "text-[10px] flex items-center gap-1 font-medium",
                isOverdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {format(dueDate, "MMM d")} · {dueLabel}
            </span>
          </div>
        </div>

        {/* Action hint */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
           <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </div>
      </motion.div>

      <AssignmentDetailsModal 
        assignment={assignment} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
}
