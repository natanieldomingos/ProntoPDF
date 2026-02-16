import React, { useMemo, useState, useEffect } from "react";
import { useScan } from "@/lib/scan-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download, FileText, ImageIcon, Printer } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import jsPDF from "jspdf";
import { OcrScheduler } from "@/lib/ocr/ocrScheduler";
import type { OcrLanguage } from "@/lib/ocr/types";
import { exportTxt } from "@/lib/export/exportTxt";
import { exportHtml } from "@/lib/export/exportHtml";
import { exportDocx } from "@/lib/export/exportDocx";
import { useAuth } from "@/lib/auth/auth-context";
import { cloudUploadPdf, cloudUploadBundle } from "@/lib/cloud/cloud";
import { createProjectBundle } from "@/lib/cloud/projectBundle";
import { useToast } from "@/hooks/use-toast";

const modeConfig = {
  default: {
    defaultQuality: "medium" as const,
    primaryAction: "download" as const,
    primaryText: "Baixar PDF",
    helpText: "Configuração equilibrada para uso geral.",
  },
  whatsapp: {
    defaultQuality: "low" as const,
    primaryAction: "share" as const,
    primaryText: "Compartilhar no WhatsApp",
    helpText: "Otimizado para envio rápido no WhatsApp com arquivo menor.",
  },
  email: {
    defaultQuality: "medium" as const,
    primaryAction: "share" as const,
    primaryText: "Compartilhar por Email",
    helpText: "Boa relação entre qualidade e tamanho para anexos de email.",
  },
  print: {
    defaultQuality: "high" as const,
    primaryAction: "download" as const,
    primaryText: "Baixar para Impressão",
    helpText: "Qualidade máxima para impressão mais nítida.",
  },
};

type ExportFormat = "pdf" | "docx" | "txt" | "html" | "jpg" | "png";
type PdfExportMode = "image" | "searchable-fast" | "searchable-hq";
type QualityPreset = "low" | "medium" | "high";

const qualityPresets: Record<
  QualityPreset,
  {
    label: string;
    maxImageLongEdgePx: number;
    jpegQuality: number;
    renderScale: number;
    approxMbPerPage: number;
    addImageSpeed: "FAST" | "MEDIUM" | "SLOW";
    description: string;
  }
> = {
  low: {
    label: "Pequeno",
    maxImageLongEdgePx: 1400,
    jpegQuality: 0.6,
    renderScale: 0.92,
    approxMbPerPage: 0.28,
    addImageSpeed: "FAST",
    description: "Melhor para WhatsApp",
  },
  medium: {
    label: "Médio",
    maxImageLongEdgePx: 2100,
    jpegQuality: 0.76,
    renderScale: 1,
    approxMbPerPage: 0.55,
    addImageSpeed: "MEDIUM",
    description: "Melhor para Email",
  },
  high: {
    label: "Grande",
    maxImageLongEdgePx: 3200,
    jpegQuality: 0.9,
    renderScale: 1.08,
    approxMbPerPage: 1.1,
    addImageSpeed: "SLOW",
    description: "Melhor para Impressão",
  },
};

export default function ExportPage() {
  const [docMatch, docParams] = useRoute("/doc/:id/export");
  const docId = docParams?.id;

  const { pages, mode, ocrLanguage, setOcrLanguage, updatePage, activeProject, loadProject } = useScan();
  const { user, configured } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const basePath = docMatch && docId ? `/doc/${docId}` : "";
  const reviewPath = docMatch && docId ? `${basePath}/review` : "/scan";
  const editPath = docMatch && docId ? `${basePath}/edit` : "/edit";
  const exportPath = docMatch && docId ? `${basePath}/export` : "/export";

  const [isHydrating, setIsHydrating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingBundle, setIsUploadingBundle] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({
    running: false,
    pageIndex: 0,
    totalPages: 0,
    overall: 0,
  });

  const activeModeConfig = useMemo(() => modeConfig[mode] ?? modeConfig.default, [mode]);
  const [quality, setQuality] = useState<QualityPreset>(activeModeConfig.defaultQuality);
  const [saveAsFormat, setSaveAsFormat] = useState<ExportFormat>("pdf");
  const [pdfExportMode, setPdfExportMode] = useState<PdfExportMode>("searchable-hq");

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
    setQuality(activeModeConfig.defaultQuality);
  }, [activeModeConfig.defaultQuality]);

  const ensureOcrProcessed = async () => {
    if (pages.length === 0) return;

    const pending = pages.filter((page) => !page.ocr);
    if (pending.length === 0) return;

    const scheduler = new OcrScheduler({
      language: ocrLanguage,
      pageCount: pending.length,
      onProgress: (progress) => {
        setOcrProgress({
          running: true,
          pageIndex: progress.pageIndex >= 0 ? progress.pageIndex + 1 : progress.completedPages + 1,
          totalPages: progress.totalPages,
          overall: progress.overallProgress,
        });
      },
    });

    await scheduler.init();

    try {
      for (let index = 0; index < pending.length; index += 1) {
        const page = pending[index];
        if (!page) continue;
        try {
          const result = await scheduler.enqueue(index, page.croppedUrl || page.processedUrl || page.rawUrl);
          updatePage(page.id, { ocr: result });
        } catch (error) {
          console.warn("Falha ao reconhecer texto nesta página.", error);
        }
      }
    } finally {
      await scheduler.terminate();
      setOcrProgress((prev) => ({ ...prev, running: false, overall: 1 }));
    }
  };

  const shouldUseOcr = pdfExportMode !== "image";
  const activePreset = qualityPresets[quality];

  const estimatedFileSizeLabel = useMemo(() => {
    const ocrFactor = shouldUseOcr ? 1.05 : 1;
    const estimatedMb = pages.length * activePreset.approxMbPerPage * ocrFactor;

    if (estimatedMb < 1) {
      return `~${Math.max(1, Math.round(estimatedMb * 1024))} KB`;
    }

    return `~${estimatedMb.toFixed(1)} MB`;
  }, [activePreset.approxMbPerPage, pages.length, shouldUseOcr]);

  const loadImage = async (src: string) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  };

  const compressDataUrl = async (src: string) => {
    const image = await loadImage(src);
    const canvas = document.createElement("canvas");

    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const baseResizeScale =
      longestEdge > activePreset.maxImageLongEdgePx ? activePreset.maxImageLongEdgePx / longestEdge : 1;
    const resizedScale = Math.min(baseResizeScale * activePreset.renderScale, 1);

    canvas.width = Math.max(1, Math.round(image.naturalWidth * resizedScale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * resizedScale));

    const context = canvas.getContext("2d");
    if (!context) return src;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", activePreset.jpegQuality);
  };

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      if (shouldUseOcr) {
        await ensureOcrProcessed();
      }

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const createdAt = new Date();
      pdf.setDocumentProperties({
        title: "documento-pronto",
        author: "ProntoPDF",
        creator: "ProntoPDF",
        subject: `Exportado em ${createdAt.toISOString()}`,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) pdf.addPage();

        const sourceData = page.croppedUrl || page.processedUrl || page.rawUrl;
        const imgData = await compressDataUrl(sourceData);
        const image = await loadImage(imgData);

        const imageScale = Math.min(pdfWidth / image.naturalWidth, pdfHeight / image.naturalHeight);
        const renderedWidth = image.naturalWidth * imageScale;
        const renderedHeight = image.naturalHeight * imageScale;
        const xOffset = (pdfWidth - renderedWidth) / 2;
        const yOffset = (pdfHeight - renderedHeight) / 2;

        pdf.addImage(imgData, "JPEG", xOffset, yOffset, renderedWidth, renderedHeight, undefined, activePreset.addImageSpeed);

        if (!shouldUseOcr || !page.ocr) {
          continue;
        }

        const ocrEntries =
          pdfExportMode === "searchable-fast"
            ? page.ocr.lines.map((line) => ({ text: line.text, x0: line.x0, y0: line.y0, x1: line.x1, y1: line.y1 }))
            : page.ocr.words;

        for (const entry of ocrEntries) {
          const text = entry.text?.trim();
          if (!text) continue;

          const widthPx = Math.max(entry.x1 - entry.x0, 1);
          const heightPx = Math.max(entry.y1 - entry.y0, 1);
          const x = xOffset + (entry.x0 / image.naturalWidth) * renderedWidth;
          const y = yOffset + (entry.y1 / image.naturalHeight) * renderedHeight;
          const fontSize = Math.max((heightPx / image.naturalHeight) * renderedHeight * 2.8, 6);
          const maxWidth = (widthPx / image.naturalWidth) * renderedWidth;

          pdf.setFontSize(fontSize);
          pdf.text(text, x, y, {
            baseline: "bottom",
            maxWidth,
          });
        }
      }

      return pdf;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`documento-pronto-${stamp}.pdf`);
    }
  };

  const handleShare = async () => {
    const pdf = await generatePDF();
    if (pdf && navigator.share) {
      const stamp = new Date().toISOString().slice(0, 10);
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], `documento-pronto-${stamp}.pdf`, { type: "application/pdf" });
      try {
        await navigator.share({
          title: "Documento Escaneado",
          text: "Aqui está o documento que escaneei com ProntoPDF.",
          files: [file],
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      alert("Compartilhamento não suportado neste dispositivo. Use o Download.");
    }
  };

  const handleSaveAs = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const downloadBlob = (blob: Blob, filename: string) => {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    if (saveAsFormat === "pdf") {
      await handleDownloadPDF();
      return;
    }

    if (saveAsFormat === "txt") {
      await ensureOcrProcessed();
      const content = exportTxt(pages);
      downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), `documento-pronto-${stamp}.txt`);
      return;
    }

    if (saveAsFormat === "html") {
      await ensureOcrProcessed();
      const content = exportHtml(pages);
      downloadBlob(new Blob([content], { type: "text/html;charset=utf-8" }), `documento-pronto-${stamp}.html`);
      return;
    }

    if (saveAsFormat === "docx") {
      await ensureOcrProcessed();
      const content = await exportDocx(pages);
      downloadBlob(content, `documento-pronto-${stamp}.docx`);
      return;
    }

    if (saveAsFormat === "jpg" || saveAsFormat === "png") {
      alert(`Exportação em ${saveAsFormat.toUpperCase()} estará disponível em breve.`);
      return;
    }

  };

  const ensureLogged = () => {
    if (user) return true;
    toast({ title: "Faça login para salvar na nuvem", description: "Abra a aba Conta e entre com Google ou X." });
    setLocation("/account");
    return false;
  };

  const handleSavePdfToCloud = async () => {
    if (!ensureLogged()) return;
    const projectId = activeProject?.id || docId;
    if (!projectId) return;

    setIsUploadingPdf(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) throw new Error("Não foi possível gerar o PDF.");
      const blob = pdf.output("blob") as Blob;
      await cloudUploadPdf({ userId: user!.id, docId: projectId, blob });
      toast({ title: "Salvo na nuvem", description: "PDF disponível na aba Conta (PDFs salvos)." });
    } catch (e: any) {
      toast({ title: "Falha ao salvar PDF", description: e?.message ?? "Tente novamente." });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleSaveBundleToCloud = async () => {
    if (!ensureLogged()) return;
    const projectId = activeProject?.id || docId;
    if (!projectId) return;

    setIsUploadingBundle(true);
    try {
      const bundle = await createProjectBundle(projectId);
      await cloudUploadBundle({ userId: user!.id, docId: projectId, blob: bundle });
      toast({ title: "Salvo na nuvem", description: "Projeto disponível na aba Conta (Projetos)." });
    } catch (e: any) {
      toast({ title: "Falha ao salvar projeto", description: e?.message ?? "Tente novamente." });
    } finally {
      setIsUploadingBundle(false);
    }
  };

  const handlePrimaryAction = activeModeConfig.primaryAction === "share" ? handleShare : handleDownloadPDF;

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border p-4 sticky top-0 z-10 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation(reviewPath)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-display font-bold">Exportar</h1>
          <div className="w-10" />
        </div>

        <div className="rounded-lg border p-1 flex gap-1 w-fit mx-auto">
          <Button size="sm" variant="ghost" onClick={() => setLocation(reviewPath)}>Revisar</Button>
          <Button size="sm" variant="ghost" onClick={() => setLocation(editPath)}>Editar</Button>
          <Button size="sm" variant="default" onClick={() => setLocation(exportPath)}>Exportar</Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-paper border border-border">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Configurações
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Idioma do texto</label>
              <select
                className="w-full rounded border border-border bg-white p-2 text-sm"
                value={ocrLanguage}
                onChange={(event) => setOcrLanguage(event.target.value as OcrLanguage)}
                disabled={isExporting}
              >
                <option value="por+eng">Português + Inglês</option>
                <option value="por">Português</option>
                <option value="eng">Inglês</option>
                <option value="spa">Espanhol</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">Isso ajuda a reconhecer nomes e palavras com mais precisão.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Tamanho do Arquivo</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`flex-1 py-2 px-4 rounded border text-sm font-medium transition-colors ${
                      quality === q ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {qualityPresets[q].label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {qualityPresets[quality].description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Estimativa para {pages.length} {pages.length === 1 ? "página" : "páginas"}: {estimatedFileSizeLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{activeModeConfig.helpText}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Tipo de PDF</label>
              <select
                className="w-full rounded border border-border bg-white p-2 text-sm"
                value={pdfExportMode}
                onChange={(event) => setPdfExportMode(event.target.value as PdfExportMode)}
                disabled={isExporting}
              >
                <option value="image">PDF como foto (mais simples)</option>
                <option value="searchable-fast">PDF com texto pesquisável (rápido)</option>
                <option value="searchable-hq">PDF com texto pesquisável (melhor)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                {pdfExportMode === "image" && "Só a imagem (como uma foto)."}
                {pdfExportMode === "searchable-fast" && "Dá para buscar e copiar texto. Mais rápido."}
                {pdfExportMode === "searchable-hq" && "Dá para buscar e copiar texto com mais precisão."}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Salvar como</label>
              <select
                className="w-full rounded border border-border bg-white p-2 text-sm"
                value={saveAsFormat}
                onChange={(event) => setSaveAsFormat(event.target.value as ExportFormat)}
                disabled={isExporting}
              >
                <option value="pdf">PDF</option>
                <option value="docx">Word (DOCX)</option>
                <option value="txt">Texto (TXT)</option>
                <option value="html">Página (HTML)</option>
                <option value="jpg">Imagem (JPG)</option>
                <option value="png">Imagem (PNG)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">Escolha o tipo de arquivo para salvar o documento.</p>
              <p className="text-xs text-muted-foreground mt-2">Layout complexo (colunas, tabelas e formulários) pode variar nos formatos TXT/HTML/DOCX.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {(isExporting || ocrProgress.running) && (
            <div className="rounded border border-border bg-white px-4 py-3 text-sm">
              <p className="font-medium">
                Processando página {Math.min(ocrProgress.pageIndex, Math.max(ocrProgress.totalPages, 1))}/{Math.max(ocrProgress.totalPages, 1)}
              </p>
              <p className="text-muted-foreground">Reconhecendo texto: {Math.round(ocrProgress.overall * 100)}%</p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-16 text-lg font-bold shadow-md bg-whatsapp hover:bg-whatsapp/90 text-white"
            style={{ backgroundColor: "#25D366", color: "white" }}
            onClick={handlePrimaryAction}
            disabled={isExporting}
          >
            {activeModeConfig.primaryAction === "share" ? (
              <Share2 className="w-6 h-6 mr-3" />
            ) : mode === "print" ? (
              <Printer className="w-6 h-6 mr-3" />
            ) : (
              <Download className="w-6 h-6 mr-3" />
            )}
            {isExporting ? "Gerando..." : activeModeConfig.primaryText}
          </Button>

          {activeModeConfig.primaryAction === "share" && (
            <Button size="lg" variant="outline" className="w-full h-16 text-lg font-bold border-2" onClick={handleDownloadPDF} disabled={isExporting}>
              <Download className="w-6 h-6 mr-3" />
              {isExporting ? "Gerando..." : "Baixar PDF"}
            </Button>
          )}

          {configured && (
            <div className="rounded-lg border border-border bg-white p-4 text-sm">
              <p className="font-semibold">Salvar na minha conta</p>
              <p className="text-xs text-muted-foreground mt-1">
                Para pegar no PC e no celular. Você escolhe o que enviar.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={handleSavePdfToCloud}
                  disabled={isExporting || isUploadingPdf || !user}
                >
                  {isUploadingPdf ? "Enviando…" : "Salvar PDF"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveBundleToCloud}
                  disabled={isExporting || isUploadingBundle || !user}
                >
                  {isUploadingBundle ? "Enviando…" : "Salvar Projeto"}
                </Button>
              </div>
              {!user && (
                <p className="text-xs text-muted-foreground mt-2">
                  Você precisa estar logado para usar isso.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button variant="secondary" className="h-12" onClick={handleSaveAs} disabled={isExporting}>
              <ImageIcon className="w-4 h-4 mr-2" /> Salvar como {saveAsFormat.toUpperCase()}
            </Button>
            <Button variant="secondary" className="h-12" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
