import { useAssignments } from "@/hooks/useAssignments";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AssignmentCard } from "@/components/AssignmentCard";
import { AddAssignmentDialog } from "@/components/AddAssignmentDialog";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Assignments() {
  const { assignments, add, toggleComplete, remove } = useAssignments();

  return (
    <DashboardLayout 
      title="Assignments" 
      subtitle="Manage your tasks and deadlines"
      actions={
        <AddAssignmentDialog onAdd={add}>
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Assignment
          </Button>
        </AddAssignmentDialog>
      }
    >
      <div className="space-y-6">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-xl font-display font-bold text-foreground">No assignments yet</h3>
            <p className="text-muted-foreground mt-2 max-w-xs">
              Click the button above to add your first assignment and start tracking your progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {assignments.map((assignment, i) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <AssignmentCard 
                    assignment={assignment} 
                    onToggleComplete={() => toggleComplete(assignment.id)}
                    onDelete={() => remove(assignment.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
