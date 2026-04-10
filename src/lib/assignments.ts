import { Assignment, Priority, Status } from "@/types/assignment";

const STORAGE_KEY = "student-assignments";

function generateId(): string {
  return crypto.randomUUID();
}

function loadAssignments(): Assignment[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.map((a: any) => ({
      ...a,
      dueDate: new Date(a.dueDate),
      createdAt: new Date(a.createdAt),
      updatedAt: new Date(a.updatedAt),
    }));
  } catch {
    return [];
  }
}

function saveAssignments(assignments: Assignment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

export function getAssignments(): Assignment[] {
  const assignments = loadAssignments();
  // Auto-mark overdue
  const now = new Date();
  return assignments.map((a) => {
    if (a.status !== "completed" && a.dueDate < now) {
      return { ...a, status: "overdue" as Status };
    }
    return a;
  });
}

export function createAssignment(data: {
  title: string;
  description: string;
  subject: string;
  dueDate: Date;
  priority: Priority;
}): Assignment {
  const now = new Date();
  const assignment: Assignment = {
    id: generateId(),
    ...data,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };
  const all = loadAssignments();
  all.push(assignment);
  saveAssignments(all);
  return assignment;
}

export function updateAssignment(id: string, updates: Partial<Assignment>): Assignment | null {
  const all = loadAssignments();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date() };
  saveAssignments(all);
  return all[idx];
}

export function deleteAssignment(id: string): boolean {
  const all = loadAssignments();
  const filtered = all.filter((a) => a.id !== id);
  if (filtered.length === all.length) return false;
  saveAssignments(filtered);
  return true;
}

export function getStats(assignments: Assignment[]) {
  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === "completed").length;
  const overdue = assignments.filter((a) => a.status === "overdue").length;
  const upcoming = assignments
    .filter((a) => a.status !== "completed" && a.status !== "overdue")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);
  const bySubject = assignments.reduce<Record<string, number>>((acc, a) => {
    acc[a.subject] = (acc[a.subject] || 0) + 1;
    return acc;
  }, {});
  const byPriority = assignments.reduce<Record<string, number>>((acc, a) => {
    acc[a.priority] = (acc[a.priority] || 0) + 1;
    return acc;
  }, {});
  return { total, completed, overdue, upcoming, bySubject, byPriority };
}

// Seed demo data if empty
export function seedDemoData(): void {
  if (loadAssignments().length > 0) return;
  const subjects = ["Mathematics", "Computer Science", "Physics", "English", "History"];
  const priorities: Priority[] = ["low", "medium", "high", "urgent"];
  const demos = [
    { title: "Linear Algebra Problem Set 5", description: "Complete exercises 1-20 on eigenvalues and eigenvectors", subject: "Mathematics", daysFromNow: 3, priority: "high" as Priority },
    { title: "Build REST API Project", description: "Implement CRUD endpoints with authentication for the course project", subject: "Computer Science", daysFromNow: 7, priority: "urgent" as Priority },
    { title: "Lab Report: Wave Interference", description: "Write up results from last week's double-slit experiment", subject: "Physics", daysFromNow: 2, priority: "high" as Priority },
    { title: "Essay: Modern Literature Analysis", description: "2000-word critical analysis of 'The Road' by Cormac McCarthy", subject: "English", daysFromNow: 10, priority: "medium" as Priority },
    { title: "Chapter 12 Reading Notes", description: "Summarize key events of the Industrial Revolution", subject: "History", daysFromNow: 5, priority: "low" as Priority },
    { title: "Calculus Integration Quiz Prep", description: "Review integration techniques and practice problems", subject: "Mathematics", daysFromNow: 1, priority: "urgent" as Priority },
    { title: "Database Design Document", description: "Create ER diagram and normalization for library system", subject: "Computer Science", daysFromNow: -1, priority: "medium" as Priority },
  ];
  demos.forEach((d) => {
    const due = new Date();
    due.setDate(due.getDate() + d.daysFromNow);
    createAssignment({ title: d.title, description: d.description, subject: d.subject, dueDate: due, priority: d.priority });
  });
}
