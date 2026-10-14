import { supabase } from "@/lib/supabase";

export const SOURCE_ORIGINALS_BUCKET = "source-originals";

const SOURCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SourceOriginal = {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
};

export function isSourceId(id: string): boolean {
  return SOURCE_ID.test(id);
}

function isSafeStoragePath(path: string): boolean {
  if (!path || path.length > 500) return false;
  if (path.startsWith("/") || path.includes("\\")) return false;
  if (path.split("/").some((part) => part === "" || part === "." || part === "..")) return false;
  return !/[\u0000-\u001f]/.test(path);
}

function originalPathFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const path = (metadata as { original_path?: unknown }).original_path;
  if (typeof path !== "string" || !isSafeStoragePath(path)) return null;
  return path;
}

function fileNameFromPath(path: string): string {
  return path.split("/").pop() || "kilde.pdf";
}

function safeDownloadName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.replace(/[\r\n"]/g, "").trim() || "";
  return base || "kilde.pdf";
}

function contentTypeFor(fileName: string, reported: string): string {
  if (reported && reported !== "application/octet-stream") return reported;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

export function contentDisposition(fileName: string): string {
  const downloadName = safeDownloadName(fileName);
  const ascii = downloadName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
}

export async function originalSourceIds(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter(isSourceId))];
  if (!supabase || unique.length === 0) return new Set();

  const { data, error } = await supabase
    .from("legal_sources")
    .select("id, metadata")
    .in("id", unique);

  if (error || !data) return new Set();

  return new Set(
    data
      .filter((row) => originalPathFromMetadata(row.metadata))
      .map((row) => row.id as string)
  );
}

export async function readSourceOriginal(id: string): Promise<SourceOriginal | null> {
  if (!supabase || !isSourceId(id)) return null;

  const { data, error } = await supabase
    .from("legal_sources")
    .select("metadata, pdf_file_name")
    .eq("id", id)
    .maybeSingle();

  const path = originalPathFromMetadata(data?.metadata);
  if (error || !path) return null;

  const downloaded = await supabase.storage.from(SOURCE_ORIGINALS_BUCKET).download(path);
  if (downloaded.error || !downloaded.data) return null;

  const fileName = safeDownloadName(data?.pdf_file_name || fileNameFromPath(path));
  return {
    bytes: new Uint8Array(await downloaded.data.arrayBuffer()),
    fileName,
    contentType: contentTypeFor(fileName, downloaded.data.type),
  };
}
