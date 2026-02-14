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

        // Se o provedor usou OAuth Code Flow (comum no Microsoft),
        // precisamos trocar o `code` por uma sessão.
        const url = new URL(window.location.href);

        const oauthError =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error") ||
          null;

        if (oauthError) {
          setMsg("Não foi possível finalizar o login.");
          console.error("OAuth error:", oauthError);
          return;
        }

        const code = url.searchParams.get("code");
        if (code) {
          setMsg("Confirmando acesso…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error(error);
            setMsg("Não foi possível finalizar o login. Tente novamente.");
            return;
          }
        }

        // Agora esperamos a sessão estar disponível.
        // Em alguns navegadores o storage/evento pode demorar alguns ms.
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession();
          if (!alive) return;

          if (data.session) {
            const returnTo =
              window.sessionStorage.getItem("prontopdf.auth.returnTo") || "/account";
            window.sessionStorage.removeItem("prontopdf.auth.returnTo");
            if (alive) setLocation(returnTo);
            return;
          }

          setMsg("Quase lá…");
          await new Promise((r) => setTimeout(r, 250));
        }

        setMsg("Não foi possível criar a sessão. Tente entrar novamente.");
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
