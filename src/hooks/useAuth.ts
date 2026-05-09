import { useAuthContext } from "@/contexts/AuthContext";
export type { AppRole, Profile } from "@/contexts/AuthContext";

/**
 * Hook to access authentication state and methods.
 * Now wraps the centralized AuthContext to ensure state synchronization across the entire app.
 */
export function useAuth() {
  return useAuthContext();
}
