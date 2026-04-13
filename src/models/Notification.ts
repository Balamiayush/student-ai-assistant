import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "assignment" | "submission" | "grade" | "info";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

export const NotificationModel = {
  async findByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as Notification[];
  },

  async create(notification: Omit<Notification, "id" | "created_at" | "read">): Promise<Notification> {
    const { data, error } = await (supabase.from("notifications") as any)
      .insert({ ...notification, read: false })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await (supabase.from("notifications") as any)
      .update({ read: true })
      .eq("id", id);
    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await (supabase.from("notifications") as any)
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw error;
  }
};
