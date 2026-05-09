import { useAssignments } from "@/hooks/useAssignments";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AssignmentCard } from "@/components/AssignmentCard";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen } from "lucide-react";

export default function Assignments() {
  const { assignments, loading } = useAssignments();

  return (
    <DashboardLayout 
      title="Assignments" 
      subtitle="Manage your tasks and deadlines"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 w-full bg-secondary/20 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-xl font-display font-bold text-foreground">No assignments yet</h3>
            <p className="text-muted-foreground mt-2 max-w-xs">
              Your teachers haven't posted any assignments for you yet. Check back later!
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
                  <AssignmentCard assignment={assignment} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
