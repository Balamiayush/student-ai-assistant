import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface AssignmentWithSubmission {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  assign_to_all: boolean;
  created_by: string;
  created_at: string;
  submission?: {
    id: string;
    content: string;
    file_url: string | null;
    grade: number | null;
    feedback: string | null;
    submitted_at: string;
  };
  status: "todo" | "completed" | "overdue";
}

export function useAssignments() {
  // Wait for the auth system to fully initialize (session + profile + role all resolved)
  const { user, initialized } = useAuth();

  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  // Start as false — only go to true once we know we have a user and start fetching
  const [loading, setLoading] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!user) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("[useAssignments] Fetching for user:", user.id);

    try {
      // Step 1: Fetch all assignments visible to this student.
      // The RLS policy allows any authenticated user to SELECT from assignments.
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("*")
        .order("due_date", { ascending: true });

      if (assignmentsError) {
        console.error("[useAssignments] assignments query failed:", assignmentsError);
        throw assignmentsError;
      }

      console.log("[useAssignments] Assignments fetched:", assignmentsData?.length ?? 0);

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return;
      }

      // Step 2: Fetch this student's submissions.
      // If this fails (empty table, RLS, etc.) we do NOT abort — we just show all as "todo".
      // The submissions table has: id, assignment_id, student_id, content, file_url, grade, feedback, submitted_at
      let submissionsData: any[] = [];
      const { data: subData, error: submissionsError } = await supabase
        .from("submissions")
        .select("id, assignment_id, content, file_url, grade, feedback, submitted_at")
        .eq("student_id", user.id);

      if (submissionsError) {
        // Log but don't throw — assignments can still render without submission data
        console.warn("[useAssignments] submissions query failed (non-fatal):", submissionsError.message);
      } else {
        submissionsData = subData ?? [];
        console.log("[useAssignments] Submissions fetched:", submissionsData.length);
      }

      // Step 3: Combine
      const now = new Date();
      const combined: AssignmentWithSubmission[] = assignmentsData.map((a) => {
        // submissions.assignment_id references assignments.id — confirmed in types.ts
        const submission = submissionsData.find((s) => s.assignment_id === a.id);

        let status: "todo" | "completed" | "overdue" = "todo";
        if (submission) {
          status = "completed";
        } else if (new Date(a.due_date) < now) {
          status = "overdue";
        }

        return { ...a, submission, status };
      });

      setAssignments(combined);
      console.log("[useAssignments] Combined result:", combined.length, "assignments");
    } catch (error: any) {
      console.error("[useAssignments] Fatal error:", error.message ?? error);
      toast.error("Failed to load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Only run once auth has fully initialized — prevents fetching with a stale/null session
    if (!initialized) return;
    fetchAssignments();
  }, [initialized, fetchAssignments]);

  const submitAssignment = async (assignmentId: string, content: string, fileUrl?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("submissions")
      .upsert({
        assignment_id: assignmentId,   // confirmed column name from types.ts
        student_id: user.id,
        content,
        file_url: fileUrl ?? null,
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[useAssignments] submitAssignment error:", error);
      toast.error(error.message);
      return { error };
    }

    toast.success("Assignment submitted successfully!");
    fetchAssignments();
    return { error: null };
  };

  return {
    assignments,
    loading,
    refresh: fetchAssignments,
    submitAssignment,
  };
}
