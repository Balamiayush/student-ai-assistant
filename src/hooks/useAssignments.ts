import { useState, useEffect, useCallback } from "react";
import { Assignment, Priority, Status } from "@/types/assignment";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  seedDemoData,
} from "@/lib/assignments";

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const refresh = useCallback(() => {
    setAssignments(getAssignments());
  }, []);

  useEffect(() => {
    seedDemoData();
    refresh();
  }, [refresh]);

  const add = (data: {
    title: string;
    description: string;
    subject: string;
    dueDate: Date;
    priority: Priority;
  }) => {
    createAssignment(data);
    refresh();
  };

  const update = (id: string, updates: Partial<Assignment>) => {
    updateAssignment(id, updates);
    refresh();
  };

  const remove = (id: string) => {
    deleteAssignment(id);
    refresh();
  };

  const toggleComplete = (id: string) => {
    const a = assignments.find((x) => x.id === id);
    if (!a) return;
    update(id, { status: a.status === "completed" ? "todo" : "completed" });
  };

  return { assignments, add, update, remove, toggleComplete, refresh };
}
