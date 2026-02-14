import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/auth/supabase";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [msg, setMsg] = useState("Finalizando login…");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!supabase) {
          setMsg("Login não está configurado neste site.");
          return;
        }

        // Em SPA, detectSessionInUrl já tenta capturar a sessão.
        // Aqui só esperamos a sessão aparecer e então voltamos.
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        if (!data.session) {
          setMsg("Quase lá…");
          // Dá um tempinho para o redirect terminar de gravar os tokens.
          await new Promise((r) => setTimeout(r, 300));
        }

        const returnTo = window.sessionStorage.getItem("prontopdf.auth.returnTo") || "/account";
        window.sessionStorage.removeItem("prontopdf.auth.returnTo");
        if (alive) setLocation(returnTo);
      } catch (e) {
        console.error(e);
        if (alive) setMsg("Não foi possível finalizar o login. Tente novamente.");
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-border bg-white p-4 text-sm">
        <p className="font-semibold">{msg}</p>
        <p className="mt-2 text-muted-foreground">
          Se ficar preso aqui por muito tempo, volte e tente entrar novamente.
        </p>
      </div>
    </div>
  );
}
