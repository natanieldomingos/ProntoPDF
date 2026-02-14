import type { ScannedPage } from "@/lib/scan-context";

export type ProjectRecord = {
  id: string;
  name: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  searchableText: string;
  pageCount: number;
};

export type StoredPage = ScannedPage & {
  projectId: string;
  order: number;
  textContent: string;
};

export type StoredEditHistory = {
  id: string;
  projectId: string;
  pageId: string;
  payload: unknown;
  updatedAt: string;
};

export type ProjectSnapshot = {
  project: ProjectRecord;
  pages: ScannedPage[];
  histories: Record<string, unknown>;
};
