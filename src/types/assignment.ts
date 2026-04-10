export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "in-progress" | "completed" | "overdue";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: Date;
  priority: Priority;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
