import { supabase } from "@/lib/auth/supabase";

export type CloudKind = "pdf" | "bundle";

export type CloudItem = {
  kind: CloudKind;
  name: string;
  path: string;
  createdAt?: string;
};

const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) || "prontopdf";

function ensure() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

function basePrefix(userId: string) {
  return `users/${userId}`;
}

export async function cloudList(userId: string): Promise<CloudItem[]> {
  const sb = ensure();
  const prefix = basePrefix(userId);

  const [pdfRes, bundleRes] = await Promise.all([
    sb.storage.from(bucket).list(`${prefix}/pdf`, { limit: 100, sortBy: { column: "created_at", order: "desc" } }),
    sb.storage.from(bucket).list(`${prefix}/bundle`, { limit: 100, sortBy: { column: "created_at", order: "desc" } }),
  ]);

  const out: CloudItem[] = [];
  if (!pdfRes.error && pdfRes.data) {
    for (const it of pdfRes.data) {
      if (!it.name) continue;
      out.push({
        kind: "pdf",
        name: it.name,
        path: `${prefix}/pdf/${it.name}`,
        createdAt: (it as any).created_at,
      });
    }
  }
  if (!bundleRes.error && bundleRes.data) {
    for (const it of bundleRes.data) {
      if (!it.name) continue;
      out.push({
        kind: "bundle",
        name: it.name,
        path: `${prefix}/bundle/${it.name}`,
        createdAt: (it as any).created_at,
      });
    }
  }

  // Ordena por data (quando disponível)
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}

export async function cloudUploadPdf(params: {
  userId: string;
  docId: string;
  blob: Blob;
}): Promise<void> {
  const sb = ensure();
  const prefix = basePrefix(params.userId);
  const path = `${prefix}/pdf/${params.docId}.pdf`;

  const { error } = await sb.storage.from(bucket).upload(path, params.blob, {
    upsert: true,
    contentType: "application/pdf",
    cacheControl: "3600",
  });
  if (error) throw error;
}

export async function cloudUploadBundle(params: {
  userId: string;
  docId: string;
  blob: Blob;
}): Promise<void> {
  const sb = ensure();
  const prefix = basePrefix(params.userId);
  const path = `${prefix}/bundle/${params.docId}.zip`;

  const { error } = await sb.storage.from(bucket).upload(path, params.blob, {
    upsert: true,
    contentType: "application/zip",
    cacheControl: "3600",
  });
  if (error) throw error;
}

export async function cloudDownload(path: string): Promise<Blob> {
  const sb = ensure();
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error || !data) throw error ?? new Error("Falha ao baixar arquivo.");
  return data;
}
