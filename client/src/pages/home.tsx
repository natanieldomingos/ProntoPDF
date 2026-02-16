import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/app-shell";
import { useScan } from "@/lib/scan-context";
import { listProjects } from "@/lib/storage";
import type { ProjectRecord } from "@/lib/storage";
import { Camera, FileText, Search, Plus, ChevronRight, Zap, FolderOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { startNewProject, loadProject } = useScan();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

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

  const visibleProjects = useMemo(() => {
    if (query.trim()) return projects;
    return projects.slice(0, isMobile ? 4 : 6);
  }, [projects, query, isMobile]);

  const emptyLabel = useMemo(() => {
    if (isLoading) return "Carregando documentos…";
    if (query.trim()) return "Nenhum documento encontrado com essa busca.";
    return "Nenhum documento ainda. Comece digitalizando com a câmera.";
  }, [isLoading, query]);

  const startScan = async () => {
    const project = await startNewProject();
    setLocation(`/doc/${project.id}/camera`);
  };

  const openDoc = async (projectId: string) => {
    try {
      await loadProject(projectId);
    } finally {
      setLocation(`/doc/${projectId}/review`);
    }
  };

  return (
    <AppShell>
      <div className="w-full">
        {/* Header */}
        <header className={isMobile ? "px-6 pt-4 pb-6" : "px-6 pt-8 pb-8"}>
          <h1 className="text-headline-large font-bold">Bem-vindo ao ProntoPDF</h1>
          <p className="mt-2 text-body-medium text-on-surface-variant">
            Digitalize documentos com a câmera, organize e exporte em qualquer formato.
          </p>
        </header>

        {/* Action Cards Grid */}
        <section className={isMobile ? "px-6 pb-6 space-y-3" : "px-6 pb-8 grid grid-cols-2 gap-5 max-w-2xl"}>
          {/* Primary Action: Scan - Google Blue */}
          <button
            onClick={startScan}
            className={`
              group relative overflow-hidden bg-gradient-to-br from-primary to-primary/90
              text-on-primary rounded-2xl
              shadow-elevation-3 transition-all duration-300
              hover:shadow-elevation-5 hover:-translate-y-1.5 hover:scale-105
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
              active:shadow-elevation-1 active:scale-95
              ${isMobile ? "w-full py-7" : "py-10"}
            `}
            aria-label="Iniciar nova digitalização com câmera"
          >
            {/* Ripple effect background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-15 group-active:opacity-25 bg-white transition-opacity duration-300" />
            
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div className="p-4 bg-white/25 rounded-full backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/35">
                <Camera className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Digitalizar</h3>
                <p className="text-sm opacity-95 font-medium">Câmera</p>
              </div>
            </div>
          </button>

          {/* Secondary Action: Browse Files */}
          <button
            onClick={() => setLocation("/files")}
            className={`
              group relative overflow-hidden rounded-2xl
              bg-surface-variant border-2 border-outline-variant
              text-on-surface shadow-elevation-2 transition-all duration-300
              hover:shadow-elevation-4 hover:-translate-y-1.5 
              hover:bg-surface-variant/80 hover:border-primary/40
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
              active:shadow-elevation-1 active:scale-95
              ${isMobile ? "w-full py-7" : "py-10"}
            `}
            aria-label="Importar arquivo da biblioteca"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-8 bg-primary transition-opacity duration-300" />
            
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div className="p-4 bg-primary/15 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/25">
                <FolderOpen className="h-7 w-7 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Meus Arquivos</h3>
                <p className="text-sm text-on-surface-variant font-medium">Biblioteca</p>
              </div>
            </div>
          </button>
        </section>

        {/* Search Bar */}
        <section className={isMobile ? "px-6 pb-6" : "px-6 pb-8"}>
          <div className="relative max-w-2xl">
            <Search className="h-5 w-5 text-on-surface-variant absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300" />
            <input
              type="search"
              className="w-full rounded-full border-2 border-outline-variant bg-surface pl-14 pr-5 py-3.5 text-base font-medium
              placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30
              transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2"
              placeholder="Buscar documentos…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar documentos por nome ou conteúdo"
            />
          </div>
        </section>

        {/* Recent Documents Section */}
        <section className={isMobile ? "px-6" : "px-6 max-w-4xl"}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-small font-semibold">Último documentos</h2>
            {projects.length > visibleProjects.length && (
              <Link
                href="/files"
                className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
              >
                Ver todos
              </Link>
            )}
          </div>

          {/* Empty State */}
          {visibleProjects.length === 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-variant/40 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary/50" />
              </div>
              <p className="text-body-large font-medium text-on-surface mb-2">
                {query.trim() ? "Nenhum resultado" : "Comece digitalizando"}
              </p>
              <p className="text-body-medium text-on-surface-variant mb-6">
                {emptyLabel}
              </p>
              {!query.trim() && (
                <Button
                  onClick={startScan}
                  className="inline-flex items-center gap-2"
                  variant="default"
                >
                  <Camera className="h-4 w-4" />
                  Digitalizar primeiro documento
                </Button>
              )}
            </div>
          )}

          {/* Recent Documents Grid */}
          {visibleProjects.length > 0 && (
            <div className={isMobile ? "space-y-3 animate-slide-in" : "grid grid-cols-2 gap-4 animate-slide-in"}>
              {visibleProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => openDoc(project.id)}
                  className={`
                    group text-left rounded-2xl border-2 border-outline-variant bg-surface p-5
                    shadow-elevation-2 transition-all duration-300
                    hover:shadow-elevation-4 hover:border-primary/30 hover:-translate-y-1.5
                    hover:bg-surface active:shadow-elevation-1 active:scale-95
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="p-2 bg-primary/15 rounded-lg flex-shrink-0 transition-all duration-300 group-hover:bg-primary/25">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-bold text-title-medium truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                      </div>
                      <p className="text-xs font-medium text-on-surface-variant">
                        {project.pageCount} {project.pageCount === 1 ? "página" : "páginas"}
                      </p>
                      <p className="text-xs text-on-surface-variant/70 mt-1.5">
                        {formatUpdatedAt(project.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-on-surface-variant group-hover:text-primary transition-all duration-300 group-hover:translate-x-0.5 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Tips Section (Desktop only) */}
        {!isMobile && (
          <section className="mt-12 px-6 max-w-4xl pb-8">
            <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-tertiary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-headline-small mb-2">Dica rápida</h3>
                  <p className="text-body-medium text-on-surface-variant">
                    Use OCR (reconhecimento de texto) ao exportar para criar PDFs pesquisáveis. Ideal para documentos escaneados.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
