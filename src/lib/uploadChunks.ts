import type { DocumentPage } from "@/lib/documentText";

export type UploadChunk = {
  fileId: string;
  fileName: string;
  page: number | null;
  part: number;
  content: string;
};

const CHUNK = 1600;
const MAX_CHUNKS = 160;
const SEARCH_CHUNKS = 480;

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

export function chunksFromPages(
  fileId: string,
  fileName: string,
  pages: DocumentPage[],
  maxChunks = MAX_CHUNKS
): UploadChunk[] {
  const chunks: UploadChunk[] = [];
  for (const item of pages) {
    const text = typeof item.text === "string" ? item.text : "";
    const page = typeof item.page === "number" && item.page > 0 ? item.page : null;
    let part = 0;
    for (const content of windows(text)) {
      chunks.push({ fileId, fileName, page, part, content });
      part += 1;
      if (chunks.length >= maxChunks) return chunks;
    }
  }
  return chunks;
}

export function searchChunksFromPages(fileId: string, fileName: string, pages: DocumentPage[]): UploadChunk[] {
  return chunksFromPages(fileId, fileName, pages, SEARCH_CHUNKS);
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 4);
}

function sameWord(left: string, right: string): boolean {
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;
  return shorter.length >= 6 && longer.startsWith(shorter);
}

function mentions(words: string[], word: string): boolean {
  return words.some((item) => sameWord(item, word));
}

export function nameOverlap(question: string, fileName: string): number {
  const asked = tokens(question);
  const name = tokens(fileName);
  return asked.filter((word) => mentions(name, word)).length;
}

export function selectUploadChunks(
  question: string,
  chunks: UploadChunk[],
  keep = 4,
  requireMatch = false
): UploadChunk[] {
  const asked = tokens(question);
  const scored = chunks.map((chunk, index) => {
    const body = tokens(chunk.content);
    const name = tokens(chunk.fileName);
    let score = 0;
    for (const word of asked) {
      if (mentions(body, word)) score += 10;
      else if (mentions(name, word)) score += 1;
    }
    return { chunk, index, score };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  const inText = scored.filter((item) => item.score >= 10).slice(0, keep);
  if (inText.length) return inText.map((item) => item.chunk);
  const inName = scored.filter((item) => item.score > 0).slice(0, keep);
  if (inName.length) return inName.map((item) => item.chunk);
  if (requireMatch) return [];
  return chunks.slice(0, Math.min(2, keep));
}
