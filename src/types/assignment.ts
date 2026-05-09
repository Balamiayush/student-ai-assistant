export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "completed" | "overdue";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  assign_to_all: boolean;
  created_by: string;
  created_at: string;
  status: Status;
  submission?: {
    id: string;
    content: string;
    file_url: string | null;
    grade: number | null;
    feedback: string | null;
    submitted_at: string;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
