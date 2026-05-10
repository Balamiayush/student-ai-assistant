import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

export type AppRole = "student" | "teacher";

export interface Profile {
  id: string; // This is the user_id
  full_name: string;
  email: string;
  role?: AppRole;
  specialization?: string;
  level?: string;
  created_at: string;
  updated_at: string;
}


interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, specialization?: string, level?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    profile: null,
    loading: true,
    initialized: false,
  });

  const syncInProgress = useRef<string | null>(null);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      console.log("[Auth] Profile:", profileRes.data ? "found" : "not found", profileRes.error?.message ?? "");
      console.log("[Auth] Role:", roleRes.data?.role ?? "not found", roleRes.error?.message ?? "");

      if (profileRes.error) console.error("[Auth] Profile fetch error:", profileRes.error);
      if (roleRes.error) console.error("[Auth] Role fetch error:", roleRes.error);

      return {
        profile: profileRes.data as Profile | null,
        // prioritize user_roles table; fallback to profiles.role
        role: (roleRes.data?.role as AppRole) || (profileRes.data?.role as AppRole) || null,
      };
    } catch (err) {
      console.error("[Auth] Unexpected error in fetchProfileAndRole:", err);
      return { profile: null, role: null };
    }
  }, []);

  const syncSession = useCallback(async (session: Session | null, event?: AuthChangeEvent) => {
    const userId = session?.user?.id || null;
    
    // Prevent redundant syncs for the same user unless it's a specific auth event
    if (syncInProgress.current === userId && !event) return;
    syncInProgress.current = userId;

    try {
      if (!session) {
        setState({
          user: null,
          session: null,
          role: null,
          profile: null,
          loading: false,
          initialized: true,
        });
        return;
      }

      const { profile, role } = await fetchProfileAndRole(session.user.id);

      setState({
        user: session.user,
        session,
        role: role || (session.user.user_metadata?.role as AppRole) || null,
        profile,
        loading: false,
        initialized: true,
      });
    } catch (err) {
      console.error("Sync error:", err);
      setState(prev => ({ ...prev, loading: false, initialized: true }));
    } finally {
      syncInProgress.current = null;
    }
  }, [fetchProfileAndRole]);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth event: ${event}`);
      syncSession(session, event);
    });

    // 3. Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setState(prev => {
        if (prev.loading) {
          console.warn("Auth initialization timed out. Forcing loading to false.");
          return { ...prev, loading: false, initialized: true };
        }
        return prev;
      });
    }, 10000); // 10 seconds timeout

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [syncSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, specialization?: string, level?: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName,
            role: role,
            specialization,
            level
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will handle state update
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    return { error };
  };

  const value = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
