import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { recordLogin, heartbeatSession, endSession } from "@/lib/sessions.functions";

type Role = "admin" | "viewer" | null;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = "lt_session_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (event === "SIGNED_IN" && sess?.user) {
        // Record login + fetch role (deferred to avoid deadlocks)
        setTimeout(async () => {
          try {
            const sid = await recordLogin();
            if (sid) localStorage.setItem(SESSION_KEY, sid);
          } catch (e) { console.warn("recordLogin failed", e); }
          try {
            const { data } = await supabase.from("user_roles").select("role").eq("user_id", sess.user.id).maybeSingle();
            setRole((data?.role as Role) ?? "viewer");
          } catch { setRole("viewer"); }
        }, 0);
      }
      if (event === "SIGNED_OUT") {
        setRole(null);
        localStorage.removeItem(SESSION_KEY);
      }

    });

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", sess.user.id).maybeSingle();
        setRole((data?.role as Role) ?? "viewer");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Heartbeat every 60s while user is active
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      const sid = localStorage.getItem(SESSION_KEY);
      if (sid) heartbeatSession({ data: { sessionId: sid } }).catch(() => {});
    };
    const interval = setInterval(tick, 60_000);
    const onBeforeUnload = () => { tick(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [user]);

  const value: AuthContextValue = {
    user, session, role, loading,
    isAdmin: role === "admin",
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    signOut: async () => { await supabase.auth.signOut(); },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return error ? { error: error.message } : {};
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
