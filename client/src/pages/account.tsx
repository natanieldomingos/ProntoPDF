import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cloudDownload, cloudList, type CloudItem } from "@/lib/cloud/cloud";
import { useAuth } from "@/lib/auth/auth-context";
import { importProjectBundle } from "@/lib/cloud/projectBundle";
import { useToast } from "@/hooks/use-toast";
import { Download, LogIn, LogOut, UserCircle2, Cloud, FileDown, Lock, Mail, Smartphone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

function formatKind(item: CloudItem) {
  if (item.kind === "pdf") return "PDF";
  return "Projeto (editável)";
}

export default function Account() {
  const {
    configured,
    loading,
    user,
    signInWithProvider,
    signInWithEmail,
    signOut,
  } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<CloudItem[]>([]);
  const [listing, setListing] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const userId = user?.id;

  const refresh = async () => {
    if (!userId) return;
    setListing(true);
    try {
      const data = await cloudList(userId);
      setItems(data);
    } catch (e: any) {
      toast({ title: "Erro ao carregar arquivos", description: e?.message ?? "Tente novamente." });
    } finally {
      setListing(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const grouped = useMemo(() => {
    const pdfs = items.filter((i) => i.kind === "pdf");
    const bundles = items.filter((i) => i.kind === "bundle");
    return { pdfs, bundles };
  }, [items]);

  const handleDownload = async (item: CloudItem) => {
    setActionBusy(item.path);
    try {
      const blob = await cloudDownload(item.path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download iniciado", description: item.name });
    } catch (e: any) {
      toast({ title: "Erro ao baixar", description: e?.message ?? "Tente novamente." });
    } finally {
      setActionBusy(null);
    }
  };

  const handleImport = async (item: CloudItem) => {
    setActionBusy(item.path);
    try {
      const blob = await cloudDownload(item.path);
      const newId = await importProjectBundle(blob);
      toast({ title: "Importado com sucesso", description: "Documento adicionado à sua biblioteca." });
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e?.message ?? "Tente novamente." });
    } finally {
      setActionBusy(null);
    }
  };

  const handleManualImport = async (file: File) => {
    setActionBusy("manual-import");
    try {
      if (file.size > 60 * 1024 * 1024) throw new Error("Arquivo muito grande (máx: 60MB)");
      await importProjectBundle(file);
      toast({ title: "Importado com sucesso", description: "Documento adicionado à sua biblioteca." });
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e?.message ?? "Tente novamente." });
    } finally {
      setActionBusy(null);
    }
  };

  const handleEmailLogin = async () => {
    setEmailSent(false);
    const email = emailInput.trim();
    if (!email) {
      toast({ title: "Informe um e-mail válido" });
      return;
    }
    const { ok, error } = await signInWithEmail(email);
    if (ok) {
      setEmailSent(true);
      setEmailInput("");
      toast({ title: "Link enviado", description: "Verifique sua caixa de entrada." });
    } else {
      toast({ title: "Erro ao enviar link", description: error ?? "Tente novamente." });
    }
  };

  return (
    <AppShell>
      <div className="w-full">
        {/* Header */}
        <div className={isMobile ? "px-6 pt-4 pb-6" : "px-6 pt-8 pb-8"}>
          <h1 className="text-headline-large font-bold">Conta</h1>
          <p className="mt-2 text-body-medium text-on-surface-variant">
            Gerencie sua conta, sincronize e acesse seus arquivos em qualquer lugar.
          </p>
        </div>

        {!configured ? (
          /* Setup Required */
          <div className={isMobile ? "px-6 pb-6" : "px-6 pb-8 max-w-2xl"}>
            <div className="rounded-xl border border-surface-variant bg-surface-variant/40 p-6">
              <h2 className="font-semibold text-headline-small mb-3">Configuração necessária</h2>
              <p className="text-body-medium text-on-surface-variant mb-4">
                O login está desabilitado. Para ativar, configure as variáveis de ambiente do Supabase.
              </p>
              <ul className="space-y-2 text-body-small text-on-surface-variant">
                <li>• Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY</li>
                <li>• Habilite provedores (Google, Microsoft) no Supabase</li>
                <li>• Ou use login por e-mail (magic link)</li>
              </ul>
            </div>
          </div>
        ) : loading ? (
          /* Loading */
          <div className={isMobile ? "px-6" : "px-6 max-w-2xl"}>
            <div className="rounded-xl border border-outline-variant bg-surface p-6 text-center">
              <div className="inline-flex gap-2 items-center">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <p className="text-body-medium text-on-surface-variant">Carregando…</p>
              </div>
            </div>
          </div>
        ) : !user ? (
          /* Login Section */
          <div className={isMobile ? "px-6 pb-6 space-y-4" : "px-6 pb-8 max-w-2xl space-y-6"}>
            {/* Auth Info Card */}
            <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-elevation-1">
              <p className="text-body-medium text-on-surface-variant mb-6">
                Entre com sua conta para sincronizar documentos entre dispositivos.
              </p>

              {/* Email Login */}
              <div className="space-y-4">
                <div>
                  <label className="block text-label-medium mb-2 text-on-surface-variant">Por e-mail (magic link)</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleEmailLogin()}
                      placeholder="seu@email.com"
                      className="flex-1 rounded-lg border border-outline-variant bg-surface px-4 py-3
                      placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30
                      transition-all duration-200"
                    />
                    <Button onClick={handleEmailLogin} className="px-6">
                      <Mail className="h-4 w-4 mr-1" /> Enviar
                    </Button>
                  </div>
                  {emailSent && (
                    <p className="text-label-small text-primary mt-2 flex items-center gap-1">
                      ✓ Link enviado! Verifique seu e-mail.
                    </p>
                  )}
                </div>

                {/* OAuth Providers */}
                <div className="space-y-2">
                  <p className="text-label-medium text-on-surface-variant">Ou conecte com:</p>
                  <div className="grid gap-2">
                    <Button
                      onClick={() => signInWithProvider("google")}
                      variant="outline"
                      className="w-full justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </Button>
                    <Button
                      onClick={() => signInWithProvider("azure")}
                      variant="outline"
                      className="w-full justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="currentColor"/>
                      </svg>
                      Microsoft
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-label-small text-on-surface-variant mt-6 pt-6 border-t border-outline-variant">
                Seus dados permanecem privados. Você escolhe o que compartilhar.
              </p>
            </div>
          </div>
        ) : (
          /* Logged In Section */
          <div className={isMobile ? "px-6 pb-6 space-y-4" : "px-6 pb-8 max-w-2xl space-y-6"}>
            {/* Profile Card */}
            <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-elevation-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <UserCircle2 className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-headline-small font-semibold">Conectado</h2>
                  <p className="text-body-medium text-on-surface-variant truncate">{user.email || user.id}</p>
                </div>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>

            {/* Cloud Storage Card */}
            <div className="rounded-xl border border-outline-variant bg-surface shadow-elevation-1 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tertiary/10 rounded-lg">
                    <Cloud className="h-5 w-5 text-tertiary" />
                  </div>
                  <h2 className="text-headline-small font-semibold">Meus arquivos na nuvem</h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refresh}
                  disabled={listing}
                >
                  {listing ? "Atualizando…" : "Atualizar"}
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* PDFs Section */}
                <div>
                  <h3 className="text-title-medium font-semibold mb-3 flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-primary" />
                    PDFs salvos
                  </h3>
                  {grouped.pdfs.length === 0 ? (
                    <p className="text-body-medium text-on-surface-variant py-4 text-center bg-surface-variant/30 rounded-lg">
                      Nenhum PDF salvo ainda
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {grouped.pdfs.map((it) => (
                        <div
                          key={it.path}
                          className="flex items-center justify-between gap-3 p-4 rounded-lg bg-surface-variant/50
                          border border-outline-variant hover:bg-surface-variant transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-body-medium font-medium truncate">{it.name}</p>
                            <p className="text-label-small text-on-surface-variant">{formatKind(it)}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(it)}
                            disabled={actionBusy === it.path}
                            className="flex-shrink-0"
                          >
                            <Download className="h-4 w-4 mr-1" /> Baixar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects Section */}
                <div className="border-t border-outline-variant pt-6">
                  <h3 className="text-title-medium font-semibold mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-secondary" />
                    Projetos editáveis
                  </h3>
                  {grouped.bundles.length === 0 ? (
                    <p className="text-body-medium text-on-surface-variant py-4 text-center bg-surface-variant/30 rounded-lg">
                      Nenhum projeto salvo ainda
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {grouped.bundles.map((it) => (
                        <div
                          key={it.path}
                          className="flex items-center justify-between gap-3 p-4 rounded-lg bg-surface-variant/50
                          border border-outline-variant hover:bg-surface-variant transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-body-medium font-medium truncate">{it.name}</p>
                            <p className="text-label-small text-on-surface-variant">{formatKind(it)}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleImport(it)}
                            disabled={actionBusy === it.path}
                            className="flex-shrink-0"
                          >
                            <FileDown className="h-4 w-4 mr-1" /> Importar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Import */}
                <div className="border-t border-outline-variant pt-6">
                  <h3 className="text-title-medium font-semibold mb-3">Importar pacote local</h3>
                  <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-outline-variant
                  rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                    <Lock className="h-5 w-5 text-on-surface-variant group-hover:text-primary" />
                    <span className="text-body-medium text-on-surface-variant group-hover:text-primary">
                      Selecione um arquivo .zip
                    </span>
                    <input
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleManualImport(f);
                        e.currentTarget.value = "";
                      }}
                      disabled={actionBusy === "manual-import"}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}