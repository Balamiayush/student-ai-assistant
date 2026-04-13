import { AppRole } from "@/hooks/useAuth";

/**
 * Validates whether a user's role is authorized to view a protected route.
 * Encapsulates role-checking logic for the frontend.
 */
export function requireRole(userRole: AppRole | null, allowedRole?: AppRole): boolean {
  if (!allowedRole) return true; // No specific role required
  if (userRole === null) return false; // If role hasn't loaded or isn't set, deny access
  return userRole === allowedRole;
}

