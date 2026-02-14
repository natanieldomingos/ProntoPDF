import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/app-shell";
import { listProjects, deleteProject, updateProjectMeta } from "@/lib/storage";
import type { ProjectRecord } from "@/lib/storage";
import { useScan } from "@/lib/scan-context";
import { FileText, Pencil, Trash2, CloudUpload } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { createProjectBundle } from "@/lib/cloud/projectBundle";
import { cloudUploadBundle } from "@/lib/cloud/cloud";
import { useToast } from "@/hooks/use-toast";

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function FilesPage() {
  const [, setLocation] = useLocation();
  const { loadProject } = useScan();
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const refresh = async (q?: string) => {
    setIsLoading(true);
    try {
      const results = await listProjects(q);
      setProjects(results);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => refresh(query), 220);
    return () => clearTimeout(handle);
  }, [query]);

  const emptyLabel = useMemo(() => {
    if (isLoading) return "Carregando seus documentos…";
    if (query.trim()) return "Nenhum resultado para essa busca.";
    return "Você ainda não tem documentos. Toque em Digitalizar na aba Início para começar.";
  }, [isLoading, query]);

  const openProject = async (projectId: string) => {
    try {
      await loadProject(projectId);
    } finally {
      setLocation(`/doc/${projectId}/review`);
    }
  };

  const renameProject = async (project: ProjectRecord) => {
    const next = window.prompt("Novo nome do documento:", project.name);
    if (!next) return;
    await updateProjectMeta(project.id, { name: next });
    await refresh(query);
  };

  const removeProject = async (project: ProjectRecord) => {
    const ok = window.confirm(`Excluir "${project.name}"?\n\nEssa ação não pode ser desfeita.`);
    if (!ok) return;
    await deleteProject(project.id);
    await refresh(query);
  };

  const saveToCloud = async (project: ProjectRecord) => {
    if (!user) {
      toast({ title: "Faça login para salvar na nuvem", description: "Abra a aba Conta e entre com Google ou X." });
      setLocation("/account");
      return;
    }
    const ok = window.confirm(
      "Salvar este documento como PROJETO editável na sua conta?\n\nIsso cria um pacote (.zip) para você abrir e editar depois em qualquer aparelho."
    );
    if (!ok) return;

    setSyncingId(project.id);
    try {
      const blob = await createProjectBundle(project.id);
      await cloudUploadBundle({ userId: user.id, docId: project.id, blob });
      toast({ title: "Salvo na nuvem", description: "Projeto disponível na aba Conta (Projetos)." });
    } catch (e: any) {
      toast({ title: "Falha ao salvar", description: e?.message ?? "Tente novamente." });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-md mx-auto p-6">
        <header className="pt-4 pb-4">
          <h1 className="text-2xl font-bold font-display">Arquivos</h1>
          <p className="text-sm text-muted-foreground">Encontre, renomeie e exporte seus documentos.</p>
        </header>

        <div className="mb-4">
          <input
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            placeholder="Buscar por nome (e pelo texto do documento, quando disponível)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="font-semibold truncate">{project.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.pageCount} {project.pageCount === 1 ? "página" : "páginas"} • Atualizado em {formatUpdatedAt(project.updatedAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openProject(project.id)}>
                      Abrir
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => renameProject(project)}>
                    <Pencil className="h-4 w-4 mr-1" /> Renomear
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => saveToCloud(project)} disabled={syncingId === project.id}>
                    <CloudUpload className="h-4 w-4 mr-1" /> {syncingId === project.id ? "Enviando…" : "Salvar na nuvem"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeProject(project)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
