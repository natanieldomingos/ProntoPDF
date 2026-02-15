import React, { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useScan } from "@/lib/scan-context";
import CameraView from "@/components/camera-view";
import ImageEditor from "@/components/image-editor";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Plus, ArrowRight, ArrowLeft, Camera, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { runDocumentPipeline } from "@/lib/vision/documentPipeline";

type PermissionState = "idle" | "requesting" | "granted" | "denied";

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
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fila de processamento para evitar travar
  const enhanceQueue = useRef<Promise<void>>(Promise.resolve());

  const safeEnhance = async (pageId: string, imgSrc: string) => {
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
      console.warn("Melhoria automática falhou/expirou; mantendo original.", error);
      updatePage(pageId, { enhancing: false });
    }
  };

  const handleCapture = async (imgSrc: string) => {
    const pageId = addPage({ rawUrl: imgSrc, processedUrl: imgSrc, detectedCorners: null, enhancing: true });
    setLocation(`${reviewPath}?mode=${mode}`);
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

  const requestCameraPermission = async () => {
    setPermissionState("requesting");
    try {
      // Tenta acessar a câmera para pedir permissão
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      // Se conseguiu, para o stream e marca como granted
      stream.getTracks().forEach(track => track.stop());
      setPermissionState("granted");
    } catch (error: any) {
      console.warn("Permissão de câmera negada:", error);
      setPermissionState("denied");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        await handleCapture(event.target.result as string);
      }
      e.target.value = "";
    };
    reader.readAsDataURL(file);
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

  // Fluxo: se está na rota /camera, mostrar permissão primeiro, depois câmera
  if (((!docMatch && routeSubpath === "camera") || (docMatch && routeSubpath === "camera"))) {
    // Se já concedeu, mostrar câmera
    if (permissionState === "granted") {
      return <CameraView onCapture={handleCapture} closeHref={docMatch ? reviewPath : "/"} />;
    }

    // Se negou, mostrar fallback com importar
    if (permissionState === "denied") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="rounded-xl border border-outline-variant bg-surface p-6 space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-error" />
              </div>
              <h2 className="text-headline-small font-semibold">Câmera não disponível</h2>
              <p className="text-body-medium text-on-surface-variant">
                A câmera não foi permitida ou não está disponível neste dispositivo. Use a importação em vez disso.
              </p>
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Importar imagem/PDF
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                />
                <Button
                  onClick={() => setLocation(docMatch ? reviewPath : "/")}
                  variant="outline"
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Pedindo permissão ou estado idle: mostrar tela de pedido
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-xl border border-outline-variant bg-surface p-6 space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Camera className="w-10 h-10 text-primary" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-headline-small font-semibold">Usar câmera para escanear</h2>
              <p className="text-body-medium text-on-surface-variant">
                Para digitalizar documentos, permitimos acesso à câmera do dispositivo.
              </p>
            </div>

            <div className="bg-surface-variant/50 rounded-lg p-4 space-y-2">
              <h3 className="text-label-medium font-semibold">O que vamos fazer:</h3>
              <ul className="text-body-small text-on-surface-variant space-y-1">
                <li>✓ Capturar fotos dos documentos</li>
                <li>✓ Detectar bordas automaticamente</li>
                <li>✓ Reconhecer texto (OCR)</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={requestCameraPermission}
                disabled={permissionState === "requesting"}
                className="w-full h-12"
              >
                {permissionState === "requesting" ? "Aguardando permissão…" : "Permitir câmera"}
              </Button>
              <Button
                onClick={() => setLocation(docMatch ? reviewPath : "/")}
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (docMatch && pages.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-surface border-b border-outline-variant p-4 sticky top-0 z-10 shadow-elevation-1">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => setLocation("/")} className="text-on-surface-variant">
              <ArrowLeft className="w-5 h-5 mr-1" /> Voltar
            </Button>
            <span className="font-semibold text-title-medium">Nenhuma página</span>
            <div className="w-[72px]" />
          </div>
        </header>

        <main className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col items-center justify-center">
          <div className="rounded-xl border border-outline-variant bg-surface-variant/40 p-8 text-center mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="text-body-medium text-on-surface-variant">
              Nenhuma página ainda. Toque em <strong>Adicionar página</strong> para começar.
            </p>
          </div>
          <Button className="w-full h-12" onClick={() => setLocation(`${cameraPath}?mode=${mode}`)}>
            <Camera className="w-5 h-5 mr-2" /> Adicionar página
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
      <header className="bg-surface border-b border-outline-variant p-4 sticky top-0 z-10 shadow-elevation-1 space-y-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <Button variant="ghost" onClick={() => setLocation("/")} className="text-on-surface-variant">
            <ArrowLeft className="w-5 h-5 mr-1" /> Voltar
          </Button>
          <span className="font-semibold text-title-medium">{pages.length} {pages.length === 1 ? "página" : "páginas"}</span>
          <Button variant="ghost" onClick={clearPages} className="text-error hover:bg-error/10 hover:text-error">
            Limpar
          </Button>
        </div>
        <div className="rounded-lg border border-outline-variant p-0.5 flex gap-0.5 w-fit mx-auto">
          <Button size="sm" variant="default" onClick={() => setLocation(reviewPath)}>Revisar</Button>
          <Button size="sm" variant="ghost" onClick={() => setLocation(editPath)}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => setLocation(exportPath)}>Exportar</Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page, index) => (
            <Card key={page.id} className="relative aspect-[3/4] overflow-hidden group border border-outline-variant shadow-elevation-1 hover:shadow-elevation-3 transition-all">
              <img src={page.croppedUrl || page.processedUrl || page.rawUrl} className="w-full h-full object-cover" alt={`Página ${index + 1}`} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" className="rounded-lg h-9 w-9" onClick={() => setEditingId(page.id)} title="Editar página">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" className="rounded-lg h-9 w-9" onClick={() => removePage(page.id)} title="Excluir página">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {index + 1}
              </div>
              <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white">
                {page.enhancing ? "⏳ Melhorando…" : page.detectedCorners ? "✓ Detectado" : "◐ Manual"}
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            className="aspect-[3/4] border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 h-auto"
            onClick={() => setLocation(`${cameraPath}?mode=${mode}`)}
          >
            <Plus className="w-8 h-8 text-on-surface-variant" />
            <span className="text-on-surface-variant font-medium text-sm">Adicionar</span>
          </Button>
        </div>
      </main>

      <footer className="p-4 bg-surface border-t border-outline-variant sticky bottom-0 shadow-elevation-3 space-y-3">
        {pages.some((page) => !page.detectedCorners) && (
          <p className="text-label-small text-on-surface-variant text-center bg-surface-variant/50 p-2 rounded-lg">
            💡 Algumas páginas precisam de ajuste manual. Use "Editar" para melhorar.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 max-w-4xl mx-auto">
          <Button size="lg" variant="outline" className="h-12" onClick={() => setLocation(editPath)}>
            Editar texto
          </Button>
          <Button size="lg" className="h-12 font-semibold" onClick={() => setLocation(exportPath)}>
            Finalizar <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
