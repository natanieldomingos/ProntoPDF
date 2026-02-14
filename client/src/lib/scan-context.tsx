import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { Point } from "@/lib/vision/documentPipeline";
import type { OcrLanguage, OcrPageResult } from "@/lib/ocr/types";
import { createProject, loadProjectSnapshot, saveProjectSnapshot, suggestProjectName, type ProjectRecord } from "@/lib/storage";

export type ScanMode = "default" | "whatsapp" | "email" | "print";

export const normalizeMode = (mode: string | null | undefined): ScanMode => {
  if (mode === "whatsapp" || mode === "email" || mode === "print") {
    return mode;
  }
  return "default";
};

export type ScannedPage = {
  id: string;
  rawUrl: string;
  processedUrl: string;
  detectedCorners: [Point, Point, Point, Point] | null;
  croppedUrl?: string;
  filter: "normal" | "grayscale" | "bw" | "enhance";
  rotation: number;
  /**
   * Indica que a página está sendo melhorada automaticamente.
   * Usado apenas para UI (ex.: mostrar “Melhorando…” na miniatura).
   */
  enhancing?: boolean;
  ocr?: OcrPageResult;
};

type NewPagePayload = {
  rawUrl: string;
  processedUrl?: string;
  detectedCorners?: [Point, Point, Point, Point] | null;
};

type ScanContextType = {
  pages: ScannedPage[];
  mode: ScanMode;
  ocrLanguage: OcrLanguage;
  activeProject: ProjectRecord | null;
  editHistories: Record<string, unknown>;
  setMode: (mode: string | null | undefined) => void;
  setOcrLanguage: (language: OcrLanguage) => void;
  addPage: (payload: NewPagePayload & { enhancing?: boolean; id?: string }) => string;
  updatePage: (id: string, updates: Partial<ScannedPage>) => void;
  removePage: (id: string) => void;
  reorderPages: (startIndex: number, endIndex: number) => void;
  clearPages: () => void;
  setProjectMeta: (input: { name?: string; tags?: string[] }) => void;
  startNewProject: () => Promise<ProjectRecord>;
  loadProject: (projectId: string) => Promise<boolean>;
  updateEditHistory: (pageId: string, payload: unknown) => void;
};

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [mode, setModeState] = useState<ScanMode>("default");
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("por+eng");
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [editHistories, setEditHistories] = useState<Record<string, unknown>>({});
  const hydrationDone = useRef(false);
  const creatingProjectRef = useRef<Promise<ProjectRecord> | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const dirtyRef = useRef(false);

  const setMode = (nextMode: string | null | undefined) => {
    setModeState(normalizeMode(nextMode));
  };

  const setProjectMeta = (input: { name?: string; tags?: string[] }) => {
    if (!activeProject) return;
    setActiveProject((prev) => (prev ? { ...prev, ...input } : prev));
  };

  const startNewProject = async () => {
    const project = await createProject();
    setActiveProject(project);
    setPages([]);
    setEditHistories({});
    return project;
  };

  const loadProject = async (projectId: string) => {
    const snapshot = await loadProjectSnapshot(projectId);
    if (!snapshot) return false;
    setActiveProject(snapshot.project);
    setPages(snapshot.pages);
    setEditHistories(snapshot.histories);
    hydrationDone.current = true;
    return true;
  };

  const ensureProject = async () => {
    if (activeProject) return activeProject;

    if (!creatingProjectRef.current) {
      creatingProjectRef.current = createProject({ name: defaultName })
        .then((project) => {
          setActiveProject(project);
          return project;
        })
        .finally(() => {
          creatingProjectRef.current = null;
        });
    }

    return creatingProjectRef.current;
  };

  const scheduleSave = (delay = 550) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (!dirtyRef.current) return;

      if (saveInFlightRef.current) {
        scheduleSave(250);
        return;
      }

      saveInFlightRef.current = true;
      dirtyRef.current = false;

      try {
        const project = await ensureProject();
        const name = activeProject?.name?.trim() || defaultName;
        const tags = activeProject?.tags || [];
        await saveProjectSnapshot(project.id, pages, editHistories, { name, tags });
        hydrationDone.current = true;
      } catch (error) {
        console.warn("Falha ao salvar documento. Vamos tentar de novo.", error);
        dirtyRef.current = true;
        scheduleSave(700);
      } finally {
        saveInFlightRef.current = false;
        if (dirtyRef.current) scheduleSave(300);
      }
    }, delay);
  };


  const addPage = ({ rawUrl, processedUrl, detectedCorners = null, enhancing, id }: NewPagePayload & { enhancing?: boolean; id?: string }) => {
    const pageId = id ?? Math.random().toString(36).substring(2, 9);
    const newPage: ScannedPage = {
      id: pageId,
      rawUrl,
      processedUrl: processedUrl ?? rawUrl,
      detectedCorners,
      filter: "normal",
      rotation: 0,
      enhancing,
    };
    setPages((prev) => [...prev, newPage]);
    return pageId;
  };

  const updatePage = (id: string, updates: Partial<ScannedPage>) => {
    setPages((prev) =>
      prev.map((page) => (page.id === id ? { ...page, ...updates } : page)),
    );
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((page) => page.id !== id));
    setEditHistories((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const reorderPages = (startIndex: number, endIndex: number) => {
    setPages((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const clearPages = () => {
    setPages([]);
    setEditHistories({});
  };

  const updateEditHistory = (pageId: string, payload: unknown) => {
    setEditHistories((prev) => ({ ...prev, [pageId]: payload }));
  };

  const defaultName = useMemo(() => suggestProjectName(pages), [pages]);

  useEffect(() => {
    if (!hydrationDone.current && !activeProject && pages.length === 0) return;

    dirtyRef.current = true;
    scheduleSave();

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [activeProject, defaultName, editHistories, pages]);

  return (
    <ScanContext.Provider
      value={{
        pages,
        mode,
        ocrLanguage,
        activeProject,
        editHistories,
        setMode,
        setOcrLanguage,
        addPage,
        updatePage,
        removePage,
        reorderPages,
        clearPages,
        setProjectMeta,
        startNewProject,
        loadProject,
        updateEditHistory,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error("useScan must be used within a ScanProvider");
  }
  return context;
}