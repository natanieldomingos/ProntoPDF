import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cloudDownload, cloudList, type CloudItem } from "@/lib/cloud/cloud";
import { useAuth } from "@/lib/auth/auth-context";
import { importProjectBundle } from "@/lib/cloud/projectBundle";
import { useToast } from "@/hooks/use-toast";
import { Download, LogIn, LogOut, UserCircle2, Cloud, FileDown } from "lucide-react";

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
  const [items, setItems] = useState<CloudItem[]>([]);
  const [listing, setListing] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Estado do formulário de login por e-mail.
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
      toast({ title: "Não foi possível carregar seus arquivos", description: e?.message ?? "Tente novamente." });
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
    } catch (e: any) {
      toast({ title: "Falha ao baixar", description: e?.message ?? "Tente novamente." });
    } finally {
      setActionBusy(null);
    }
  };

  const handleImport = async (item: CloudItem) => {
    setActionBusy(item.path);
    try {
      const blob = await cloudDownload(item.path);
      const newId = await importProjectBundle(blob);
      toast({ title: "Importado", description: "Documento adicionado em Arquivos." });
      console.log("Imported project", newId);
    } catch (e: any) {
      toast({ title: "Falha ao importar", description: e?.message ?? "Tente novamente." });
    } finally {
      setActionBusy(null);
    }
  };

  const handleManualImport = async (file: File) => {
    setActionBusy("manual-import");
    try {
      if (file.size > 60 * 1024 * 1024) throw new Error("O pacote é grande demais (limite: 60MB).");
      await importProjectBundle(file);
      toast({ title: "Importado", description: "Documento adicionado em Arquivos." });
    } catch (e: any) {
      toast({ title: "Falha ao importar", description: e?.message ?? "Tente novamente." });
    } finally {
      setActionBusy(null);
    }
  };

  const handleEmailLogin = async () => {
    setEmailSent(false);
    const email = emailInput.trim();
    if (!email) {
      toast({ title: "Informe um e-mail válido." });
      return;
    }
    const { ok, error } = await signInWithEmail(email);
    if (ok) {
      setEmailSent(true);
      setEmailInput("");
    } else {
      toast({ title: "Falha ao enviar o link", description: error ?? "Tente novamente." });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md p-4 space-y-4">
        <div className="flex items-center gap-3">
          <UserCircle2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-display font-bold">Conta</h1>
            <p className="text-sm text-muted-foreground">Use sua conta para acessar seus arquivos no PC e no celular.</p>
          </div>
        </div>

        {!configured ? (
          <Card className="p-4 text-sm space-y-2">
            <p className="font-semibold">Login ainda não está ligado neste site.</p>
            <p className="text-muted-foreground">
              Para ativar, crie um projeto no Supabase e configure as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no Netlify.
            </p>
            <p className="text-muted-foreground">
              Depois disso, habilite os provedores Google e Microsoft no painel do Supabase ou use login por e-mail.
            </p>
          </Card>
        ) : loading ? (
          <Card className="p-4 text-sm text-muted-foreground">Carregando…</Card>
        ) : !user ? (
          <Card className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Entre para salvar seus arquivos na nuvem. Você continua usando normalmente mesmo sem conta.
            </p>

            <div className="grid gap-2">
              {/* Login via e-mail (magic link) */}
              <div className="grid gap-1">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Seu e-mail"
                  className="border border-border rounded-md px-3 py-2 text-sm"
                />
                <Button onClick={handleEmailLogin}>
                  <LogIn className="h-4 w-4 mr-2" /> Entrar com e-mail
                </Button>
                {emailSent && (
                  <p className="text-xs text-muted-foreground">
                    Link enviado! Verifique sua caixa de entrada e siga o link para entrar.
                  </p>
                )}
              </div>
              <Button onClick={() => signInWithProvider("google")}> 
                <LogIn className="h-4 w-4 mr-2" /> Entrar com Google
              </Button>
              <Button variant="outline" onClick={() => signInWithProvider("azure")}> 
                <LogIn className="h-4 w-4 mr-2" /> Entrar com Microsoft
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Você pode deslogar quando quiser. Nada é enviado automaticamente: você escolhe o que salvar na nuvem.
            </p>
          </Card>
        ) : (
          <>
            <Card className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Você está logado</p>
                  <p className="text-xs text-muted-foreground">{user.email ?? user.id}</p>
                </div>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Dica: Para pegar no PC, salve o PDF na nuvem e depois baixe aqui mesmo.
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Minha nuvem</p>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} disabled={listing}>
                  Atualizar
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">PDFs salvos</p>
                {grouped.pdfs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum PDF salvo ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {grouped.pdfs.map((it) => (
                      <div
                        key={it.path}
                        className="flex items-center justify-between gap-2 rounded border border-border bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{it.name}</p>
                          <p className="text-xs text-muted-foreground">{formatKind(it)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(it)}
                          disabled={actionBusy === it.path}
                        >
                          <Download className="h-4 w-4 mr-2" /> Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Projetos (editáveis)</p>
                {grouped.bundles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum projeto salvo ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {grouped.bundles.map((it) => (
                      <div
                        key={it.path}
                        className="flex items-center justify-between gap-2 rounded border border-border bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{it.name}</p>
                          <p className="text-xs text-muted-foreground">{formatKind(it)}</p>
                        </div>
                        <Button size="sm" onClick={() => handleImport(it)} disabled={actionBusy === it.path}>
                          <FileDown className="h-4 w-4 mr-2" /> Importar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="text-xs text-muted-foreground">Importar pacote manual (.zip)</label>
                <input
                  type="file"
                  accept=".zip"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleManualImport(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={actionBusy === "manual-import"}
                />
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}