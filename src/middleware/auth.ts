import { User, Session } from "@supabase/supabase-js";
import { AppRole } from "@/hooks/useAuth";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
}

/**
 * Validates whether the current auth state allows access to protected routes.
 * Used by ProtectedRoute to encapsulate auth validation logic.
 */
export function requireAuth(authState: AuthContextType): boolean {
  if (authState.loading) return true; // Wait for loading to finish
  return authState.user !== null;
}

/**
 * Provides the default redirect path for a logged-in user based on their role.
 */
export function getDefaultRedirectPath(role: AppRole | null): string {
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/auth"; // Redirect to auth if no role found
}

