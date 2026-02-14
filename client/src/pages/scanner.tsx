import React, { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useScan } from "@/lib/scan-context";
import CameraView from "@/components/camera-view";
import ImageEditor from "@/components/image-editor";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { runDocumentPipeline } from "@/lib/vision/documentPipeline";

export default function ScannerPage() {
  const [, scanParams] = useRoute("/scan/:subpath?");
  const [docMatch, docParams] = useRoute("/doc/:id/:subpath?");

  const docId = docParams?.id;
  const routeSubpath = docMatch ? docParams?.subpath : scanParams?.subpath;
  const [location, setLocation] = useLocation();
  const { pages, mode, setMode, addPage, updatePage, removePage, clearPages, activeProject, loadProject } = useScan();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const basePath = docMatch && docId ? `/doc/${docId}` : "";
  const reviewPath = docMatch && docId ? `${basePath}/review` : "/scan";
  const cameraPath = docMatch && docId ? `${basePath}/camera` : "/scan/camera";
  const editPath = docMatch && docId ? `${basePath}/edit` : "/edit";
  const exportPath = docMatch && docId ? `${basePath}/export` : "/export";

  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      if (!docMatch || !docId) return;
      if (activeProject?.id === docId) return;
      setIsHydrating(true);
      setLoadError(null);
      try {
        const ok = await loadProject(docId);
        if (!alive) return;
        if (!ok) setLoadError("Documento não encontrado. Talvez ele tenha sido excluído.");
      } catch (e) {
        console.error(e);
        if (alive) setLoadError("Não foi possível abrir este documento.");
      } finally {
        if (alive) setIsHydrating(false);
      }
    };
    hydrate();
    return () => {
      alive = false;
    };
  }, [docMatch, docId, activeProject?.id, loadProject]);

  useEffect(() => {
    const query = location.includes("?") ? location.split("?")[1] : "";
    const urlMode = new URLSearchParams(query).get("mode");
    setMode(urlMode);
  }, [location, setMode]);

  // Evita travar o celular: captura é instantânea; a melhoria roda em segundo plano.
  // Além disso, processamos as páginas em fila (uma por vez), reduzindo pico de CPU/memória.
  const enhanceQueue = useRef<Promise<void>>(Promise.resolve());

  const safeEnhance = async (pageId: string, imgSrc: string) => {
    // Dá tempo da UI respirar antes de iniciar algo pesado.
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 60));

    const timeoutMs = 12000;
    const timeout = new Promise<never>((_, reject) => {
      const handle = setTimeout(() => {
        clearTimeout(handle);
        reject(new Error("timeout"));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([runDocumentPipeline(imgSrc), timeout]);
      updatePage(pageId, {
        processedUrl: result.processedUrl,
        detectedCorners: result.detectedCorners,
        enhancing: false,
      });
    } catch (error) {
      console.warn("Melhoria automática falhou/expirou; mantendo a imagem original.", error);
      updatePage(pageId, { enhancing: false });
    }
  };

  const handleCapture = async (imgSrc: string) => {
    // 1) Salva a página imediatamente para não prender o usuário no loading da câmera.
    const pageId = addPage({ rawUrl: imgSrc, processedUrl: imgSrc, detectedCorners: null, enhancing: true });
    setLocation(`${reviewPath}?mode=${mode}`);

    // 2) Enfileira a melhoria em segundo plano.
    enhanceQueue.current = enhanceQueue.current
      .then(() => safeEnhance(pageId, imgSrc))
      .catch(() => safeEnhance(pageId, imgSrc));
  };

  const handleSaveEdit = (newUrl: string) => {
    if (editingId) {
      updatePage(editingId, { croppedUrl: newUrl });
      setEditingId(null);
    }
  };

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-sm text-muted-foreground">
        Abrindo documento…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-border bg-white p-4 text-sm">
          <p className="font-semibold">{loadError}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")}>Voltar ao Início</Button>
            <Button onClick={() => setLocation("/files")}>Ir para Arquivos</Button>
          </div>
        </div>
      </div>
    );
  }

  // Camera só abre automaticamente no fluxo /scan, ou quando a rota pedir explicitamente.
  if (!docMatch && (pages.length === 0 || routeSubpath === "camera")) {
    return <CameraView onCapture={handleCapture} closeHref="/" />;
  }

  if (docMatch && routeSubpath === "camera") {
    return <CameraView onCapture={handleCapture} closeHref={reviewPath} />;
  }

  if (docMatch && pages.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white border-b border-border p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setLocation("/")} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5 mr-1" /> Início
            </Button>
            <span className="font-bold font-display">Sem páginas</span>
            <div className="w-[72px]" />
          </div>
        </header>

        <main className="flex-1 p-6 max-w-md mx-auto w-full">
          <div className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
            Nenhuma página ainda. Toque em <strong>Adicionar página</strong> para começar.
          </div>
          <Button className="w-full h-12 mt-4" onClick={() => setLocation(`${cameraPath}?mode=${mode}`)}>
            <Plus className="w-5 h-5 mr-2" /> Adicionar página
          </Button>
        </main>
      </div>
    );
  }

  if (editingId) {
    const pageToEdit = pages.find((p) => p.id === editingId);
    if (!pageToEdit) {
      setEditingId(null);
      return null;
    }
    return (
      <ImageEditor
        imageSrc={pageToEdit.croppedUrl || pageToEdit.processedUrl || pageToEdit.rawUrl}
        onSave={handleSaveEdit}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border p-4 sticky top-0 z-10 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/")} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5 mr-1" /> Início
          </Button>
          <span className="font-bold font-display">{pages.length} {pages.length === 1 ? "página" : "páginas"}</span>
          <Button variant="ghost" onClick={clearPages} className="text-destructive hover:bg-destructive/10">
            Limpar
          </Button>
        </div>
        <div className="rounded-lg border p-1 flex gap-1 w-fit mx-auto">
          <Button size="sm" variant="default" onClick={() => setLocation(reviewPath)}>Revisar</Button>
          <Button size="sm" variant="ghost" onClick={() => setLocation(editPath)}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => setLocation(exportPath)}>Exportar</Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {pages.map((page, index) => (
            <Card key={page.id} className="relative aspect-[3/4] overflow-hidden group border-0 shadow-paper">
              <img src={page.croppedUrl || page.processedUrl || page.rawUrl} className="w-full h-full object-cover" alt={`Scan ${index + 1}`} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10" onClick={() => setEditingId(page.id)}>
                  <Edit2 className="w-5 h-5" />
                </Button>
                <Button size="icon" variant="destructive" className="rounded-full h-10 w-10" onClick={() => removePage(page.id)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                {index + 1}
              </div>
              <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full backdrop-blur-sm bg-black/60 text-white">
                {page.enhancing ? "Melhorando…" : page.detectedCorners ? "Ajuste automático" : "Ajuste manual"}
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            className="aspect-[3/4] border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 h-auto"
            onClick={() => setLocation(`${cameraPath}?mode=${mode}`)}
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Adicionar</span>
          </Button>
        </div>
      </main>

      <footer className="p-4 bg-white border-t border-border sticky bottom-0 space-y-2">
        {pages.some((page) => !page.detectedCorners) && (
          <p className="text-xs text-muted-foreground">
            Algumas páginas não tiveram bordas detectadas automaticamente. Use o botão de editar para ajuste manual.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="outline" className="h-14 text-base font-semibold" onClick={() => setLocation(editPath)}>
            Editar texto
          </Button>
          <Button size="lg" className="h-14 text-lg font-bold shadow-lg" onClick={() => setLocation(exportPath)}>
            Finalizar <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
