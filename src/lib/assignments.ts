import { Assignment, Status } from "@/types/assignment";

export function getStats(assignments: Assignment[]) {
  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === "completed").length;
  const overdue = assignments.filter((a) => a.status === "overdue").length;
  const pending = total - completed;
  
  const now = new Date();
  const upcoming = assignments
    .filter((a) => a.status !== "completed" && a.status !== "overdue")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const bySubject = assignments.reduce<Record<string, number>>((acc, a) => {
    acc[a.subject] = (acc[a.subject] || 0) + 1;
    return acc;
  }, {});

  const byPriority = assignments.reduce<Record<string, number>>((acc, a) => {
    acc[a.priority] = (acc[a.priority] || 0) + 1;
    return acc;
  }, {});

  return { total, completed, overdue, pending, upcoming, bySubject, byPriority };
}
