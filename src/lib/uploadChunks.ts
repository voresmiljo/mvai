import type { DocumentPage } from "@/lib/documentText";

export type UploadChunk = {
  fileId: string;
  fileName: string;
  page: number | null;
  part: number;
  content: string;
};

const CHUNK = 1600;
const MAX_CHUNKS = 40;

function windows(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK) return [clean];
  const parts: string[] = [];
  for (let start = 0; start < clean.length && parts.length < 6; start += CHUNK) {
    parts.push(clean.slice(start, start + CHUNK));
  }
  return parts;
}

export function chunksFromPages(fileId: string, fileName: string, pages: DocumentPage[]): UploadChunk[] {
  const chunks: UploadChunk[] = [];
  for (const item of pages) {
    const text = typeof item.text === "string" ? item.text : "";
    const page = typeof item.page === "number" && item.page > 0 ? item.page : null;
    let part = 0;
    for (const content of windows(text)) {
      chunks.push({ fileId, fileName, page, part, content });
      part += 1;
      if (chunks.length >= MAX_CHUNKS) return chunks;
    }
  }
  return chunks;
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/æ/g, "ae")
      .replace(/ø/g, "oe")
      .replace(/å/g, "aa")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 4)
  );
}

export function selectUploadChunks(question: string, chunks: UploadChunk[], keep = 4): UploadChunk[] {
  const asked = tokens(question);
  const scored = chunks.map((chunk, index) => {
    const body = tokens(chunk.content);
    const name = tokens(chunk.fileName);
    let score = 0;
    for (const word of asked) {
      if (body.has(word)) score += 10;
      else if (name.has(word)) score += 1;
    }
    return { chunk, index, score };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  const inText = scored.filter((item) => item.score >= 10).slice(0, keep);
  if (inText.length) return inText.map((item) => item.chunk);
  const inName = scored.filter((item) => item.score > 0).slice(0, keep);
  if (inName.length) return inName.map((item) => item.chunk);
  return chunks.slice(0, Math.min(2, keep));
}
