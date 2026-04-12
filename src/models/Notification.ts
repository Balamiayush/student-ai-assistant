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
  /**
   * Fetch all notifications for a specific user
   */
  async findByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Notification[];
  },

  /**
   * Create a new notification
   */
  async create(notification: Omit<Notification, "id" | "created_at" | "read">): Promise<Notification> {
    const { data, error } = await supabase
      .from("notifications")
      .insert({ ...notification, read: false })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  /**
   * Mark a specific notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
      
    if (error) throw error;
  },

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
      
    if (error) throw error;
  }
};
