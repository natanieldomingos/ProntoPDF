import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/app-shell";
import { useScan } from "@/lib/scan-context";
import { listProjects } from "@/lib/storage";
import type { ProjectRecord } from "@/lib/storage";
import { Camera, FileText, Search } from "lucide-react";

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
    return projects.slice(0, 6);
  }, [projects, query]);

  const emptyLabel = useMemo(() => {
    if (isLoading) return "Carregando…";
    if (query.trim()) return "Nenhum resultado para essa busca.";
    return "Nenhum documento ainda. Toque em Digitalizar para começar.";
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
      <div className="max-w-md mx-auto p-6">
        <header className="pt-4 pb-5">
          <h1 className="text-3xl font-bold font-display tracking-tight">ProntoPDF</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Digitalize, ajuste e envie seus documentos em minutos.
          </p>
        </header>

        <div className="space-y-4">
          <Button className="w-full h-12 text-base" onClick={startScan}>
            <Camera className="h-5 w-5 mr-2" /> Digitalizar
          </Button>

          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-sm"
              placeholder="Buscar documentos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-base font-semibold">Últimos documentos</h2>
          <Link href="/files" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>

        <div className="mt-3 space-y-3">
          {visibleProjects.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            visibleProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => openDoc(project.id)}
                className="w-full text-left rounded-lg border border-border bg-white p-4 hover:bg-accent transition-colors"
              >
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
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
