import { loadProjectSnapshot, saveProjectSnapshot } from "@/lib/storage";
import type { ProjectSnapshot } from "@/lib/storage/types";
import type { ScannedPage } from "@/lib/scan-context";

type BundleProject = {
  id: string;
  name: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type BundlePageMeta = {
  id: string;
  file: string;
  detectedCorners: ScannedPage["detectedCorners"];
  filter: ScannedPage["filter"];
  rotation: number;
  ocr?: ScannedPage["ocr"];
};

type BundlePayload = {
  version: 1;
  project: BundleProject;
  pages: BundlePageMeta[];
  histories: Record<string, unknown>;
};

async function dataUrlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return await res.blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compressToJpeg(src: string, maxLongEdgePx = 2100, quality = 0.76): Promise<Blob> {
  const image = new Image();
  image.src = src;
  await image.decode();

  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestEdge > maxLongEdgePx ? maxLongEdgePx / longestEdge : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return await dataUrlToBlob(src);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
  return await dataUrlToBlob(jpegDataUrl);
}

export async function createProjectBundle(projectId: string): Promise<Blob> {
  const snapshot = await loadProjectSnapshot(projectId);
  if (!snapshot) throw new Error("Documento não encontrado.");

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const payload: BundlePayload = {
    version: 1,
    project: {
      id: snapshot.project.id,
      name: snapshot.project.name,
      tags: snapshot.project.tags,
      createdAt: snapshot.project.createdAt,
      updatedAt: snapshot.project.updatedAt,
    },
    pages: [],
    histories: snapshot.histories,
  };

  const pagesFolder = zip.folder("pages");
  if (!pagesFolder) throw new Error("Falha ao criar pacote.");

  for (let i = 0; i < snapshot.pages.length; i++) {
    const page = snapshot.pages[i];
    const src = page.croppedUrl || page.processedUrl || page.rawUrl;
    const filename = `page-${String(i + 1).padStart(3, "0")}.jpg`;

    // Mantém o bundle leve: jpeg comprimido e em resolução segura.
    const jpegBlob = await compressToJpeg(src, 2100, 0.76);
    pagesFolder.file(filename, jpegBlob);

    payload.pages.push({
      id: page.id,
      file: `pages/${filename}`,
      detectedCorners: page.detectedCorners ?? null,
      filter: page.filter,
      rotation: page.rotation,
      ocr: page.ocr,
    });
  }

  zip.file("project.json", JSON.stringify(payload));
  return await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function importProjectBundle(bundleBlob: Blob): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bundleBlob);
  const projectText = await zip.file("project.json")?.async("string");
  if (!projectText) throw new Error("Pacote inválido: project.json não encontrado.");

  const payload = JSON.parse(projectText) as BundlePayload;
  if (!payload?.project?.id || !Array.isArray(payload.pages)) throw new Error("Pacote inválido.");

  // Se já existe localmente, criamos uma cópia para não sobrescrever sem querer.
  let finalProjectId = payload.project.id;
  const existing = await loadProjectSnapshot(finalProjectId);
  if (existing) {
    finalProjectId = `${payload.project.id}-${newId()}`;
  }

  const pages: ScannedPage[] = [];
  for (let i = 0; i < payload.pages.length; i++) {
    const meta = payload.pages[i];
    const file = zip.file(meta.file);
    if (!file) continue;
    const pageBlob = await file.async("blob");
    const dataUrl = await blobToDataUrl(pageBlob);
    pages.push({
      id: meta.id,
      rawUrl: dataUrl,
      processedUrl: dataUrl,
      detectedCorners: meta.detectedCorners ?? null,
      filter: meta.filter ?? "normal",
      rotation: meta.rotation ?? 0,
      ocr: meta.ocr,
    });
  }

  const histories = payload.histories ?? {};

  // Salva como um projeto novo ou cópia.
  await saveProjectSnapshot(finalProjectId, pages, histories, {
    name: payload.project.name,
    tags: payload.project.tags,
  });

  return finalProjectId;
}
