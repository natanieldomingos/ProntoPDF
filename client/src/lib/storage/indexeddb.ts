import type { ScannedPage } from "@/lib/scan-context";
import type { ProjectRecord, ProjectSnapshot, StoredEditHistory, StoredPage } from "./types";

const DB_NAME = "prontopdf-offline";
const DB_VERSION = 1;
const PROJECTS = "projects";
const PAGES = "pages";
const HISTORIES = "histories";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2));

let dbPromise: Promise<IDBDatabase> | null = null;

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });


const getAllKeysSafe = async (index: IDBIndex, range: IDBKeyRange) => {
  try {
    const anyIndex = index as any;
    if (typeof anyIndex.getAllKeys === "function") {
      return (await requestToPromise(anyIndex.getAllKeys(range))) as IDBValidKey[];
    }
  } catch {
    // fallback abaixo
  }

  const records = (await requestToPromise(index.getAll(range))) as any[];
  return records.map((record) => record.id as IDBValidKey);
};

const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        const projects = db.createObjectStore(PROJECTS, { keyPath: "id" });
        projects.createIndex("updatedAt", "updatedAt");

        const pages = db.createObjectStore(PAGES, { keyPath: "id" });
        pages.createIndex("projectId", "projectId");

        const histories = db.createObjectStore(HISTORIES, { keyPath: "id" });
        histories.createIndex("projectId", "projectId");
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
};

const getTextFromPage = (page: ScannedPage) => {
  if (!page.ocr) return "";
  const fromWords = page.ocr.words?.map((word) => word.text).join(" ") ?? "";
  if (fromWords.trim()) return fromWords;
  return page.ocr.lines?.map((line) => line.text).join(" ") ?? "";
};

const buildSearchableText = (name: string, tags: string[], pages: ScannedPage[]) => {
  const pageText = pages.map(getTextFromPage).join(" ");
  return [name, tags.join(" "), pageText].join(" ").toLowerCase();
};

export const suggestProjectName = (pages: ScannedPage[]) => {
  const now = new Date();
  const datePart = now.toLocaleDateString("pt-BR");
  const text = pages.map(getTextFromPage).join(" ").replace(/\s+/g, " ").trim();
  const snippet = text ? text.split(" ").slice(0, 5).join(" ") : "Projeto";
  return `${snippet} • ${datePart}`;
};

export const createProject = async (input?: Partial<Pick<ProjectRecord, "name" | "tags">>) => {
  const db = await openDb();
  const timestamp = new Date().toISOString();
  const project: ProjectRecord = {
    id: uid(),
    name: input?.name?.trim() || `Projeto ${new Date().toLocaleString("pt-BR")}`,
    tags: input?.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
    searchableText: (input?.name ?? "").toLowerCase(),
    pageCount: 0,
  };

  const tx = db.transaction(PROJECTS, "readwrite");
  tx.objectStore(PROJECTS).put(project);
  await transactionDone(tx);
  return project;
};

export const updateProjectMeta = async (projectId: string, updates: Partial<Pick<ProjectRecord, "name" | "tags">>) => {
  const db = await openDb();
  const tx = db.transaction(PROJECTS, "readwrite");
  const store = tx.objectStore(PROJECTS);
  const current = await requestToPromise(store.get(projectId));
  if (!current) {
    await transactionDone(tx);
    return null;
  }

  const next: ProjectRecord = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  store.put(next);
  await transactionDone(tx);
  return next;
};

export const saveProjectSnapshot = async (
  projectId: string,
  pages: ScannedPage[],
  histories: Record<string, unknown>,
  projectMeta?: { name?: string; tags?: string[] },
) => {
  const db = await openDb();
  const tx = db.transaction([PROJECTS, PAGES, HISTORIES], "readwrite");
  const projectsStore = tx.objectStore(PROJECTS);
  const pagesStore = tx.objectStore(PAGES);
  const historiesStore = tx.objectStore(HISTORIES);

  let project = await requestToPromise(projectsStore.get(projectId));
  if (!project) {
    const timestamp = new Date().toISOString();
    project = {
      id: projectId,
      name: projectMeta?.name || suggestProjectName(pages),
      tags: projectMeta?.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      searchableText: "",
      pageCount: 0,
    } satisfies ProjectRecord;
  }

  const range = IDBKeyRange.only(projectId);

  // Evita apagar tudo a cada atualização (isso trava em celular). Faz upsert e remove só o que sumiu.
  const existingPageKeys = new Set(await getAllKeysSafe(pagesStore.index("projectId"), range));
  const existingHistoryKeys = new Set(await getAllKeysSafe(historiesStore.index("projectId"), range));

  pages.forEach((page, index) => {
    const storedId = `${projectId}:${page.id}`;
    existingPageKeys.delete(storedId);
    const record: StoredPage = {
      ...page,
      id: storedId,
      projectId,
      order: index,
      textContent: getTextFromPage(page),
    };
    pagesStore.put(record);
  });

  existingPageKeys.forEach((key) => pagesStore.delete(key));

  Object.entries(histories).forEach(([pageId, payload]) => {
    const storedId = `${projectId}:${pageId}`;
    existingHistoryKeys.delete(storedId);
    const history: StoredEditHistory = {
      id: storedId,
      projectId,
      pageId,
      payload,
      updatedAt: new Date().toISOString(),
    };
    historiesStore.put(history);
  });

  existingHistoryKeys.forEach((key) => historiesStore.delete(key));

  const nextProject: ProjectRecord = {
    ...project,
    name: projectMeta?.name?.trim() || project.name,
    tags: projectMeta?.tags ?? project.tags,
    pageCount: pages.length,
    updatedAt: new Date().toISOString(),
    searchableText: buildSearchableText(projectMeta?.name || project.name, projectMeta?.tags ?? project.tags, pages),
  };

  projectsStore.put(nextProject);
  await transactionDone(tx);
  return nextProject;
};

export const loadProjectSnapshot = async (projectId: string): Promise<ProjectSnapshot | null> => {
  const db = await openDb();
  const tx = db.transaction([PROJECTS, PAGES, HISTORIES], "readonly");
  const project = await requestToPromise(tx.objectStore(PROJECTS).get(projectId));
  if (!project) {
    await transactionDone(tx);
    return null;
  }

  const pageRecords = await requestToPromise(tx.objectStore(PAGES).index("projectId").getAll(IDBKeyRange.only(projectId)));
  const historyRecords = await requestToPromise(tx.objectStore(HISTORIES).index("projectId").getAll(IDBKeyRange.only(projectId)));
  await transactionDone(tx);

  const pages = (pageRecords as StoredPage[])
    .sort((a, b) => a.order - b.order)
    .map((record) => ({
      ...record,
      id: record.id.replace(`${projectId}:`, ""),
    }));

  const histories = (historyRecords as StoredEditHistory[]).reduce<Record<string, unknown>>((acc, item) => {
    acc[item.pageId] = item.payload;
    return acc;
  }, {});

  return { project, pages, histories };
};

export const listProjects = async (query?: string) => {
  const db = await openDb();
  const tx = db.transaction(PROJECTS, "readonly");
  const records = await requestToPromise(tx.objectStore(PROJECTS).getAll());
  await transactionDone(tx);

  const normalized = query?.trim().toLowerCase();
  return (records as ProjectRecord[])
    .filter((project) => {
      if (!normalized) return true;
      return project.searchableText.includes(normalized);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const deleteProject = async (projectId: string) => {
  const db = await openDb();
  const tx = db.transaction([PROJECTS, PAGES, HISTORIES], "readwrite");
  tx.objectStore(PROJECTS).delete(projectId);

  const pages = await requestToPromise(tx.objectStore(PAGES).index("projectId").getAll(IDBKeyRange.only(projectId)));
  pages.forEach((page) => tx.objectStore(PAGES).delete(page.id));

  const histories = await requestToPromise(tx.objectStore(HISTORIES).index("projectId").getAll(IDBKeyRange.only(projectId)));
  histories.forEach((item) => tx.objectStore(HISTORIES).delete(item.id));

  await transactionDone(tx);
};
