import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/auth/supabase";

// Provedores suportados no app.
// - google: Entrar com Google
// - azure: Entrar com Microsoft (Entra ID)
// Removido: twitter (X)
type Provider = "google" | "azure";

type AuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithProvider: (provider: Provider) => Promise<{ ok: boolean; error?: string }>; 
  /**
   * Login por e-mail via link (magic link). Funciona para qualquer pessoa, sem rede social.
   */
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    init();

    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = useCallback(async (provider: Provider) => {
    if (!supabase) return { ok: false, error: "Login não configurado." };
    try {
      // Guardamos para onde o usuário queria ir, assim depois do login ele volta.
      const last = window.location.pathname + window.location.search + window.location.hash;
      window.sessionStorage.setItem("prontopdf.auth.returnTo", last);

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // Para Microsoft (Azure), pedir e-mail ajuda a evitar contas sem e-mail retornado.
          ...(provider === "azure"
            ? {
                scopes: "openid profile email",
                queryParams: { prompt: "select_account" },
              }
            : {}),
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Falha ao iniciar login." };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) return { ok: false, error: "Login não configurado." };
    try {
      const last = window.location.pathname + window.location.search + window.location.hash;
      window.sessionStorage.setItem("prontopdf.auth.returnTo", last);

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Falha ao enviar link de login." };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user,
      signInWithProvider,
      signInWithEmail,
      signOut,
    }),
    [loading, session, user, signInWithProvider, signInWithEmail, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      configured: isSupabaseConfigured,
      loading: false,
      session: null,
      user: null,
      signInWithProvider: async () => ({ ok: false, error: "AuthProvider não encontrado." }),
      signInWithEmail: async () => ({ ok: false, error: "AuthProvider não encontrado." }),
      signOut: async () => {},
    } as AuthState;
  }
  return ctx;
}
