import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "student" | "teacher";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  const fetchRole = useCallback(async (userId: string): Promise<AppRole | null> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.role as AppRole) ?? null;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Try to get role from metadata first for immediate response
          let role = session.user.user_metadata?.role as AppRole | null;
          if (!role) {
            role = await fetchRole(session.user.id);
          }
          setState({ user: session.user, session, role, loading: false });
        } else {
          setState({ user: null, session: null, role: null, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        let role = session.user.user_metadata?.role as AppRole | null;
        if (!role) {
          role = await fetchRole(session.user.id);
        }
        setState({ user: session.user, session, role, loading: false });
      } else {
        setState({ user: null, session: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);


  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signUp, signIn, signOut };
}
