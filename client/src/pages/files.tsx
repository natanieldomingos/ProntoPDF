import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/app-shell";
import { listProjects, deleteProject, updateProjectMeta } from "@/lib/storage";
import type { ProjectRecord } from "@/lib/storage";
import { useScan } from "@/lib/scan-context";
import { FileText, MoreVertical, Search, CloudUpload, Trash2, Pencil, FileUp, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { createProjectBundle } from "@/lib/cloud/projectBundle";
import { cloudUploadBundle } from "@/lib/cloud/cloud";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function FilesPage() {
  const [, setLocation] = useLocation();
  const { loadProject } = useScan();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
    if (query.trim()) return "Nenhum documento encontrado.";
    return "Você ainda não tem documentos. Comece na aba Início digitalizando com a câmera.";
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
    try {
      await updateProjectMeta(project.id, { name: next });
      await refresh(query);
      setMenuOpenId(null);
    } catch (e: any) {
      toast({ title: "Erro ao renomear", description: e?.message ?? "Tente novamente." });
    }
  };

  const removeProject = async (project: ProjectRecord) => {
    const ok = window.confirm(`Excluir "${project.name}"?\n\nEssa ação não pode ser desfeita.`);
    if (!ok) return;
    try {
      await deleteProject(project.id);
      await refresh(query);
      setMenuOpenId(null);
      if (selectedId === project.id) setSelectedId(null);
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e?.message ?? "Tente novamente." });
    }
  };

  const saveToCloud = async (project: ProjectRecord) => {
    if (!user) {
      toast({ title: "Faça login primeiro", description: "Abra a aba Conta e entre com Google." });
      setLocation("/account");
      return;
    }
    const ok = window.confirm(
      "Salvar este documento como PROJETO editável na sua conta?\n\nIsso cria um pacote para você abrir e editar depois em qualquer aparelho."
    );
    if (!ok) return;

    setSyncingId(project.id);
    try {
      const blob = await createProjectBundle(project.id);
      await cloudUploadBundle({ userId: user.id, docId: project.id, blob });
      toast({ title: "Salvo na nuvem com sucesso", description: "Projeto disponível na aba Conta." });
      setMenuOpenId(null);
    } catch (e: any) {
      toast({ title: "Falha ao salvar", description: e?.message ?? "Tente novamente." });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <AppShell>
      <div className="w-full">
        {/* Header */}
        <div className={isMobile ? "px-6 pt-4 pb-4" : "px-6 pt-8 pb-6"}>
          <h1 className="text-headline-large font-bold text-on-surface">Arquivos</h1>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            Organize e compartilhe seus documentos com simplicidade.
          </p>
        </div>

        {/* Search Bar (Sticky) */}
        <div className={`sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-outline-variant ${isMobile ? "px-6 py-3" : "px-6 py-4"}`}>
          <div className="relative max-w-xl">
            <Search className="h-5 w-5 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              className="w-full rounded-full border-2 border-outline-variant bg-surface pl-12 pr-4 py-3 text-body-medium
              placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2
              transition-all duration-300 hover:shadow-elevation-1"
              placeholder="Buscar documentos…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar documentos"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className={isMobile ? "px-6 py-4" : "px-6 py-6"}>
          {projects.length === 0 ? (
            /* Empty State */
            <div className="rounded-xl border border-outline-variant bg-surface-variant/40 p-8 text-center max-w-lg mx-auto">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary/50" />
              </div>
              <p className="text-headline-small font-semibold text-on-surface mb-2">
                {query.trim() ? "Nenhum resultado" : "Sem documentos"}
              </p>
              <p className="text-body-medium text-on-surface-variant mb-6">
                {emptyLabel}
              </p>
              {!query.trim() && (
                <Button
                  onClick={() => setLocation("/")}
                  className="inline-flex items-center gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  Voltar ao Início
                </Button>
              )}
            </div>
          ) : isMobile ? (
            /* Mobile: List View */
            <div className="space-y-3 animate-slide-in">
              {projects.map((project, idx) => (
                <button
                  key={project.id}
                  onClick={() => openProject(project.id)}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className="w-full text-left rounded-2xl border-2 border-outline-variant bg-surface p-4 shadow-elevation-1
                  transition-all duration-300 hover:shadow-elevation-3 hover:border-primary/40 hover:-translate-y-1 active:scale-95"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-title-medium truncate text-on-surface">
                          {project.name}
                        </h3>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {project.pageCount} página{project.pageCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1 opacity-75">
                        {formatUpdatedAt(project.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-on-surface-variant/60 flex-shrink-0 mt-1 transition-all group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Desktop: Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => (
                <div
                  key={project.id}
                  style={{ animationDelay: `${idx * 75}ms` }}
                  className="group rounded-2xl border-2 border-outline-variant bg-surface p-6 shadow-elevation-1 animate-slide-in
                  transition-all duration-300 hover:shadow-elevation-5 hover:border-primary/40 hover:-translate-y-2"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpenId(menuOpenId === project.id ? null : project.id);
                      }}
                      className="p-2 rounded-full text-on-surface-variant hover:bg-primary/10 transition-all duration-200
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:scale-110"
                      aria-label="Opções"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Info */}
                  <h3 className="font-semibold text-title-medium mb-1 line-clamp-2 text-on-surface">
                    {project.name}
                  </h3>
                  <p className="text-label-medium text-on-surface-variant mb-4">
                    {project.pageCount} página{project.pageCount !== 1 ? "s" : ""} • {formatUpdatedAt(project.updatedAt)}
                  </p>

                  {/* Menu */}
                  {menuOpenId === project.id && (
                    <div className="border-t-2 border-outline-variant pt-4 space-y-2 mb-3 animate-scale-in">
                      <button
                        onClick={() => renameProject(project)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-label-medium text-on-surface hover:bg-primary/10
                        rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Pencil className="h-4 w-4" />
                        Renomear
                      </button>
                      <button
                        onClick={() => saveToCloud(project)}
                        disabled={syncingId === project.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-label-medium text-on-surface hover:bg-primary/10
                        rounded-lg transition-all duration-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <CloudUpload className="h-4 w-4" />
                        {syncingId === project.id ? "Enviando…" : "Salvar na nuvem"}
                      </button>
                      <button
                        onClick={() => removeProject(project)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-label-medium text-error hover:bg-error/10
                        rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-error"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  )}

                  {/* Footer Action */}
                  {menuOpenId !== project.id && (
                    <button
                      onClick={() => openProject(project.id)}
                      className="w-full py-3 px-4 rounded-full bg-gradient-to-br from-primary to-primary/90 text-on-primary font-semibold text-label-large
                      shadow-elevation-2 hover:shadow-elevation-4 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Abrir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
