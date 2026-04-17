import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("Failed to fetch notifications:", error.message);
    return [];
  }
  return (data ?? []) as unknown as Notification[];
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(notificationId: string) {
  await (supabase.from("notifications") as any).update({ read: true }).eq("id", notificationId);
}

export async function markAllAsRead(userId: string) {
  await (supabase.from("notifications") as any).update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function sendNotification(
  userId: string,
  message: string,
  type: "assignment" | "submission" | "grade" | "info" = "info",
  relatedId?: string
) {
  const { error } = await (supabase.from("notifications") as any).insert({
    user_id: userId,
    message,
    type,
    related_id: relatedId ?? null,
  });
  if (error) console.error("Failed to send notification:", error.message);
}

export async function sendNotificationBulk(
  userIds: string[],
  message: string,
  type: "assignment" | "submission" | "grade" | "info" = "info",
  relatedId?: string
) {
  if (userIds.length === 0) return;
  const rows = userIds.map((userId) => ({
    user_id: userId,
    message,
    type,
    related_id: relatedId ?? null,
  }));
  const { error } = await (supabase.from("notifications") as any).insert(rows);
  if (error) console.error("Failed to send bulk notifications:", error.message);
}
