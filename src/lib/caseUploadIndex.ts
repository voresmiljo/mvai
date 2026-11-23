import type { DocumentPage } from "@/lib/documentText";
import { getSessionUser } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RetrievedSource } from "@/lib/vectorSearch";
import { chunksFromPages, selectUploadChunks, type UploadChunk } from "@/lib/uploadChunks";
import OpenAI from "openai";

const CASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CaseUploadFile = {
  id: string;
  name: string;
  pages: DocumentPage[];
};

export function isCaseUuid(value: string): boolean {
  return CASE_ID.test(value);
}

function pageLabel(page: number | null): string {
  return page ? `s. ${page}` : "uden sidetal";
}

export function uploadChunkSource(chunk: UploadChunk, score = 0): RetrievedSource {
  return {
    id: `sagsakt-${chunk.fileId}-${chunk.page ?? "x"}-${chunk.part}`,
    title: chunk.fileName,
    citation: chunk.page ? `${chunk.fileName}, s. ${chunk.page}` : chunk.fileName,
    lawSection: pageLabel(chunk.page),
    date: "",
    textSnippet: chunk.content,
    pdfUrl: "",
    pdfFileName: chunk.fileName,
    hasOriginal: false,
    relevanceScore: score,
    sourceType: "sagsakt",
  };
}

function embedInput(chunk: UploadChunk): string {
  return `${chunk.fileName}. ${pageLabel(chunk.page)}. ${chunk.content}`.slice(0, 8000);
}

async function ownCase(caseId: string): Promise<{ userId: string; client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>> } | null> {
  if (!isCaseUuid(caseId)) return null;
  const user = await getSessionUser();
  const client = await createSupabaseServerClient();
  if (!user || !client) return null;
  const { data, error } = await client.from("cases").select("id").eq("id", caseId).maybeSingle();
  if (error || !data) return null;
  return { userId: user.id, client };
}

export async function replaceCaseUploadChunks(input: {
  caseId: string;
  fileId: string;
  fileName: string;
  pages: DocumentPage[];
}): Promise<{ indexed: number } | { error: string }> {
  const owned = await ownCase(input.caseId);
  if (!owned) return { error: "Sagen kan ikke indekseres." };
  const chunks = chunksFromPages(input.fileId, input.fileName, input.pages);
  const removed = await owned.client
    .from("case_upload_chunks")
    .delete()
    .eq("case_id", input.caseId)
    .eq("file_id", input.fileId);
  if (removed.error) return { error: removed.error.message };
  if (!chunks.length) return { indexed: 0 };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { error: "Indlejring mangler." };
  let vectors: number[][] = [];
  try {
    const openai = new OpenAI({ apiKey, timeout: 60_000 });
    const embedded = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks.map(embedInput),
    });
    vectors = embedded.data.map((item) => item.embedding);
  } catch (err) {
    console.warn("Sagsakt kunne ikke indlejres:", err);
    return { error: "Sagsakten kunne ikke indlejres." };
  }
  if (vectors.length !== chunks.length) return { error: "Sagsakten kunne ikke indlejres." };

  const inserted = await owned.client.from("case_upload_chunks").insert(
    chunks.map((chunk, index) => ({
      user_id: owned.userId,
      case_id: input.caseId,
      file_id: chunk.fileId,
      file_name: chunk.fileName,
      page: chunk.page,
      part: chunk.part,
      content: chunk.content,
      embedding: vectors[index],
    }))
  );
  if (inserted.error) return { error: inserted.error.message };
  return { indexed: chunks.length };
}

export async function removeCaseUploadChunks(caseId: string, fileId: string): Promise<void> {
  const owned = await ownCase(caseId);
  if (!owned) return;
  await owned.client.from("case_upload_chunks").delete().eq("case_id", caseId).eq("file_id", fileId);
}

async function vectorHits(caseId: string, fileIds: string[], question: string): Promise<RetrievedSource[] | null> {
  const owned = await ownCase(caseId);
  if (!owned || !fileIds.length) return [];
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return [];
  try {
    const openai = new OpenAI({ apiKey, timeout: 20_000 });
    const embedded = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question.trim().slice(0, 8000),
    });
    const vector = embedded.data[0]?.embedding;
    if (!vector) return [];
    const { data, error } = await owned.client.rpc("match_case_uploads", {
      query_embedding: vector,
      match_threshold: 0.45,
      match_count: 8,
      filter_case: caseId,
      filter_files: fileIds,
    });
    if (error) {
      console.warn("Sagsaktssøgning sprunget over:", error.message);
      return null;
    }
    if (!Array.isArray(data)) return [];
    return data.map((row: {
      file_id: string;
      file_name: string;
      page: number | null;
      part: number;
      content: string;
      similarity: number;
    }) =>
      uploadChunkSource(
        {
          fileId: row.file_id,
          fileName: row.file_name,
          page: row.page,
          part: row.part,
          content: row.content,
        },
        Math.round((row.similarity || 0) * 100)
      )
    );
  } catch (err) {
    console.warn("Sagsaktssøgning sprunget over:", err);
    return null;
  }
}

export async function caseActSources(input: {
  question: string;
  caseId: string;
  files: CaseUploadFile[];
}): Promise<RetrievedSource[]> {
  const files = input.files.filter((file) => file.id && file.name).slice(0, 8);
  const local = files.flatMap((file) => chunksFromPages(file.id, file.name, file.pages));
  const fallback = () =>
    selectUploadChunks(input.question, local).map((chunk, index) =>
      uploadChunkSource(chunk, Math.max(40, 80 - index * 10))
    );
  if (!files.length) return [];
  if (!isCaseUuid(input.caseId)) return fallback();

  const found = await vectorHits(input.caseId, files.map((file) => file.id), input.question);
  if (found && found.length) return found.slice(0, 4);
  return fallback();
}
