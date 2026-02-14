import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useScan } from "@/lib/scan-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ScanLine, Undo2, Redo2 } from "lucide-react";
import { OcrScheduler } from "@/lib/ocr/ocrScheduler";
import type { OcrLanguage } from "@/lib/ocr/types";

type WordNode = { id: string; text: string; x0: number; y0: number; x1: number; y1: number };
type LineNode = { id: string; text: string; blockId: string; words: WordNode[]; x0: number; y0: number; x1: number; y1: number };
type BlockNode = { id: string; text: string; lines: LineNode[]; x0: number; y0: number; x1: number; y1: number };
type ColumnNode = { id: string; blocks: BlockNode[] };
type PageNode = { id: string; columns: ColumnNode[] };

type HistoryState = { past: PageNode[]; present: PageNode; future: PageNode[] };

const uid = () => Math.random().toString(36).slice(2, 10);

const blockToText = (block: BlockNode) => block.lines.map((line) => line.text).join("\n");

const clonePage = (page: PageNode): PageNode => JSON.parse(JSON.stringify(page)) as PageNode;

const toEditablePage = (source: ReturnType<typeof useScan>["pages"][number]): PageNode => {
  if (source.ocr?.blocks?.length) {
    const linesByBlock = new Map<string, LineNode[]>();
    const wordsByLine = new Map<string, WordNode[]>();

    source.ocr.words.forEach((word) => {
      const list = wordsByLine.get(word.lineId) ?? [];
      list.push({ id: uid(), text: word.text, x0: word.x0, y0: word.y0, x1: word.x1, y1: word.y1 });
      wordsByLine.set(word.lineId, list);
    });

    source.ocr.lines.forEach((line) => {
      const lineNode: LineNode = {
        id: line.id,
        text: line.text,
        blockId: line.blockId,
        words: wordsByLine.get(line.id) ?? [],
        x0: line.x0,
        y0: line.y0,
        x1: line.x1,
        y1: line.y1,
      };
      const list = linesByBlock.get(line.blockId) ?? [];
      list.push(lineNode);
      linesByBlock.set(line.blockId, list);
    });

    const blocks: BlockNode[] = source.ocr.blocks.map((block) => ({
      id: block.id,
      text: block.text,
      lines: linesByBlock.get(block.id) ?? [],
      x0: block.x0,
      y0: block.y0,
      x1: block.x1,
      y1: block.y1,
    }));

    return { id: source.id, columns: [{ id: `${source.id}-col-1`, blocks }] };
  }

  const fallbackLine: LineNode = { id: uid(), text: "Nenhum texto reconhecido nesta página.", blockId: "fallback", words: [], x0: 10, y0: 10, x1: 90, y1: 20 };
  return {
    id: source.id,
    columns: [{ id: `${source.id}-col-1`, blocks: [{ id: "fallback", text: fallbackLine.text, lines: [fallbackLine], x0: 10, y0: 10, x1: 90, y1: 20 }] }],
  };
};

const updateHistory = (history: HistoryState, updater: (page: PageNode) => PageNode): HistoryState => {
  const next = updater(clonePage(history.present));
  return { past: [...history.past, clonePage(history.present)], present: next, future: [] };
};

export default function EditPage() {
  const [docMatch, docParams] = useRoute("/doc/:id/edit");
  const docId = docParams?.id;

  const { pages, editHistories, updateEditHistory, updatePage, ocrLanguage, setOcrLanguage, activeProject, loadProject } = useScan();
  const [, setLocation] = useLocation();

  const basePath = docMatch && docId ? `/doc/${docId}` : "";
  const reviewPath = docMatch && docId ? `${basePath}/review` : "/scan";
  const editPath = docMatch && docId ? `${basePath}/edit` : "/edit";
  const exportPath = docMatch && docId ? `${basePath}/export` : "/export";

  const [isHydrating, setIsHydrating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id ?? null);
  const [editorMode, setEditorMode] = useState<"text" | "overlay">("text");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizeProgress, setRecognizeProgress] = useState(0);

  const [historyByPage, setHistoryByPage] = useState<Record<string, HistoryState>>(() => {
    const initial: Record<string, HistoryState> = {};
    pages.forEach((page) => {
      const persisted = editHistories[page.id] as HistoryState | undefined;
      initial[page.id] = persisted ?? { past: [], present: toEditablePage(page), future: [] };
    });
    return initial;
  });

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
    // Quando páginas chegam (especialmente ao abrir um documento antigo), inicializa estados internos.
    if (!selectedPageId && pages[0]?.id) {
      setSelectedPageId(pages[0].id);
    }

    setHistoryByPage((prev) => {
      const next = { ...prev };
      pages.forEach((page) => {
        if (next[page.id]) return;
        const persisted = editHistories[page.id] as HistoryState | undefined;
        next[page.id] = persisted ?? { past: [], present: toEditablePage(page), future: [] };
      });
      return next;
    });
  }, [pages, editHistories, selectedPageId]);

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

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];
  const history = selectedPage ? historyByPage[selectedPage.id] : null;
  const blocks = useMemo(() => history?.present.columns[0]?.blocks ?? [], [history]);

  const setHistoryForPage = (pageId: string, updater: (old: HistoryState) => HistoryState) => {
    setHistoryByPage((prev) => {
      const current = prev[pageId] ?? { past: [], present: toEditablePage(pages.find((p) => p.id === pageId) ?? pages[0]), future: [] };
      const nextHistory = updater(current);
      updateEditHistory(pageId, nextHistory);
      return { ...prev, [pageId]: nextHistory };
    });
  };

  if (!selectedPage || !history) {
    return (
      <div className="min-h-screen p-6">
        <p className="mb-4">Nenhuma página para editar.</p>
        <Button onClick={() => setLocation(reviewPath)}>Voltar para revisar</Button>
      </div>
    );
  }

  const apply = (updater: (page: PageNode) => PageNode) => setHistoryForPage(selectedPage.id, (old) => updateHistory(old, updater));

  const updateBlockText = (blockId: string, text: string) => {
    apply((page) => {
      const block = page.columns[0].blocks.find((item) => item.id === blockId);
      if (!block) return page;
      block.text = text;
      block.lines = text.split("\n").filter(Boolean).map((lineText, index) => ({
        id: `${block.id}-line-${index}`,
        text: lineText,
        blockId: block.id,
        words: lineText.split(/\s+/).filter(Boolean).map((word) => ({ id: uid(), text: word, x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1 })),
        x0: block.x0,
        y0: block.y0 + index * 12,
        x1: block.x1,
        y1: block.y0 + index * 12 + 10,
      }));
      return page;
    });
  };

  const mergeWithNext = () => {
    if (!selectedBlockId) return;
    apply((page) => {
      const list = page.columns[0].blocks;
      const index = list.findIndex((item) => item.id === selectedBlockId);
      if (index < 0 || index >= list.length - 1) return page;
      const merged = {
        ...list[index],
        id: uid(),
        text: `${blockToText(list[index])}\n${blockToText(list[index + 1])}`,
        lines: [...list[index].lines, ...list[index + 1].lines],
        x0: Math.min(list[index].x0, list[index + 1].x0),
        y0: Math.min(list[index].y0, list[index + 1].y0),
        x1: Math.max(list[index].x1, list[index + 1].x1),
        y1: Math.max(list[index].y1, list[index + 1].y1),
      };
      list.splice(index, 2, merged);
      return page;
    });
  };

  const splitBlock = () => {
    if (!selectedBlockId) return;
    apply((page) => {
      const list = page.columns[0].blocks;
      const index = list.findIndex((item) => item.id === selectedBlockId);
      if (index < 0) return page;
      const block = list[index];
      const chunks = blockToText(block).split("\n\n").map((part) => part.trim()).filter(Boolean);
      if (chunks.length < 2) return page;
      const nextBlocks: BlockNode[] = chunks.map((chunk, partIndex) => ({
        id: `${block.id}-part-${partIndex}-${uid()}`,
        text: chunk,
        lines: chunk.split("\n").filter(Boolean).map((lineText, lineIndex) => ({ id: uid(), text: lineText, blockId: block.id, words: [], x0: block.x0, y0: block.y0, x1: block.x1, y1: block.y1 })),
        x0: block.x0,
        y0: block.y0 + partIndex * 14,
        x1: block.x1,
        y1: block.y1 + partIndex * 14,
      }));
      list.splice(index, 1, ...nextBlocks);
      return page;
    });
  };

  const replaceAll = () => {
    if (!findText) return;
    apply((page) => {
      page.columns[0].blocks.forEach((block) => {
        block.text = blockToText(block).split(findText).join(replaceText);
        block.lines = block.text.split("\n").filter(Boolean).map((lineText, idx) => ({ ...block.lines[idx], id: block.lines[idx]?.id ?? uid(), text: lineText, words: [] }));
      });
      return page;
    });
  };

  const undo = () => {
    setHistoryForPage(selectedPage.id, (old) => {
      const previous = old.past[old.past.length - 1];
      if (!previous) return old;
      return { past: old.past.slice(0, -1), present: previous, future: [clonePage(old.present), ...old.future] };
    });
  };

  const redo = () => {
    setHistoryForPage(selectedPage.id, (old) => {
      const next = old.future[0];
      if (!next) return old;
      return { past: [...old.past, clonePage(old.present)], present: next, future: old.future.slice(1) };
    });
  };

  const recognizeText = async () => {
    if (!selectedPage) return;
    setIsRecognizing(true);
    setRecognizeProgress(0);

    const scheduler = new OcrScheduler({
      language: ocrLanguage,
      pageCount: 1,
      onProgress: (progress) => {
        setRecognizeProgress(progress.overallProgress);
      },
    });

    try {
      await scheduler.init();
      const result = await scheduler.enqueue(0, selectedPage.croppedUrl || selectedPage.processedUrl || selectedPage.rawUrl);

      // Salva no projeto + carrega no editor imediatamente.
      updatePage(selectedPage.id, { ocr: result });
      setHistoryForPage(selectedPage.id, () => ({ past: [], present: toEditablePage({ ...selectedPage, ocr: result }), future: [] }));
    } catch (e) {
      console.error(e);
      alert("Não foi possível reconhecer o texto desta página. Tente novamente ou gere o PDF como foto.");
    } finally {
      await scheduler.terminate();
      setIsRecognizing(false);
      setRecognizeProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setLocation(reviewPath)}>
            <ArrowLeft className="w-5 h-5 mr-1" /> Revisar
          </Button>
          <div className="rounded-lg border p-1 flex gap-1">
            <Button variant="ghost" className="text-sm" onClick={() => setLocation(reviewPath)}>Revisar</Button>
            <Button variant="default" className="text-sm" onClick={() => setLocation(editPath)}>Editar</Button>
            <Button variant="ghost" className="text-sm" onClick={() => setLocation(exportPath)}>Exportar</Button>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="outline" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="rounded border border-border bg-white px-2 py-1 text-sm"
            value={ocrLanguage}
            onChange={(event) => setOcrLanguage(event.target.value as OcrLanguage)}
            disabled={isRecognizing}
            aria-label="Idioma do texto"
          >
            <option value="por+eng">Português + Inglês</option>
            <option value="por">Português</option>
            <option value="eng">Inglês</option>
            <option value="spa">Espanhol</option>
          </select>

          <Button variant="outline" onClick={recognizeText} disabled={isRecognizing}>
            <ScanLine className="w-4 h-4 mr-1" /> {isRecognizing ? `Reconhecendo… ${Math.round(recognizeProgress * 100)}%` : "Reconhecer texto"}
          </Button>

          <span className="text-xs text-muted-foreground">
            Isso permite copiar/pesquisar texto e editar o conteúdo aqui.
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 grid md:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-white border rounded-lg p-3 space-y-3 h-fit">
          <p className="font-semibold">Páginas</p>
          {pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => setSelectedPageId(page.id)}
              className={`w-full text-left px-3 py-2 rounded border text-sm ${page.id === selectedPage.id ? "bg-primary text-white" : "bg-background"}`}
            >
              Página {index + 1}
            </button>
          ))}
          <div className="pt-2 border-t space-y-2">
            <label className="text-xs font-medium">Localizar</label>
            <input className="w-full border rounded px-2 py-1 text-sm" value={findText} onChange={(event) => setFindText(event.target.value)} placeholder="texto" />
            <label className="text-xs font-medium">Substituir por</label>
            <input className="w-full border rounded px-2 py-1 text-sm" value={replaceText} onChange={(event) => setReplaceText(event.target.value)} placeholder="novo texto" />
            <Button size="sm" className="w-full" onClick={replaceAll}>Substituir em blocos</Button>
          </div>
          <div className="pt-2 border-t grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={mergeWithNext}>Mesclar</Button>
            <Button size="sm" variant="outline" onClick={splitBlock}>Dividir</Button>
          </div>
          <div className="pt-2 border-t">
            <div className="rounded border p-1 flex gap-1 w-full">
              <Button size="sm" className="flex-1" variant={editorMode === "text" ? "default" : "ghost"} onClick={() => setEditorMode("text")}>Texto</Button>
              <Button size="sm" className="flex-1" variant={editorMode === "overlay" ? "default" : "ghost"} onClick={() => setEditorMode("overlay")}>Layout</Button>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {editorMode === "text" ? (
            <div className="bg-white border rounded-lg p-4 space-y-3">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`border rounded-md p-2 ${selectedBlockId === block.id ? "border-primary" : "border-border"}`}
                  draggable
                  onDragStart={() => setDraggedBlockId(block.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedBlockId || draggedBlockId === block.id) return;
                    apply((page) => {
                      const list = page.columns[0].blocks;
                      const fromIndex = list.findIndex((item) => item.id === draggedBlockId);
                      const toIndex = list.findIndex((item) => item.id === block.id);
                      if (fromIndex < 0 || toIndex < 0) return page;
                      const [item] = list.splice(fromIndex, 1);
                      list.splice(toIndex, 0, item);
                      return page;
                    });
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button className="text-sm font-medium" onClick={() => setSelectedBlockId(block.id)}>Bloco {index + 1}</button>
                    <span className="text-xs text-muted-foreground">arraste para reordenar</span>
                  </div>
                  <textarea
                    className="w-full min-h-[90px] border rounded p-2 text-sm"
                    value={blockToText(block)}
                    onFocus={() => setSelectedBlockId(block.id)}
                    onChange={(event) => updateBlockText(block.id, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-4">
              <div className="relative border rounded overflow-hidden">
                <img src={selectedPage.croppedUrl || selectedPage.processedUrl || selectedPage.rawUrl} alt="Página" className="w-full max-h-[70vh] object-contain" />
                {blocks.map((block) => (
                  <button
                    key={block.id}
                    className={`absolute border-2 ${selectedBlockId === block.id ? "border-primary bg-primary/15" : "border-yellow-500/80 bg-yellow-200/20"}`}
                    style={{ left: `${block.x0}px`, top: `${block.y0}px`, width: `${Math.max(block.x1 - block.x0, 12)}px`, height: `${Math.max(block.y1 - block.y0, 12)}px` }}
                    onClick={() => setSelectedBlockId(block.id)}
                    title={blockToText(block)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
