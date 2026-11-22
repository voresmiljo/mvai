import { NextResponse } from "next/server";
import { removeCaseUploadChunks, replaceCaseUploadChunks } from "@/lib/caseUploadIndex";
import type { DocumentPage } from "@/lib/documentText";

function pagesFrom(value: unknown): DocumentPage[] {
  if (!Array.isArray(value)) return [];
  const pages: DocumentPage[] = [];
  for (const item of value.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const row = item as { page?: unknown; text?: unknown };
    const text = typeof row.text === "string" ? row.text.replace(/\u0000/g, "").trim().slice(0, 8000) : "";
    if (!text) continue;
    const page =
      typeof row.page === "number" && Number.isInteger(row.page) && row.page > 0 && row.page < 5000
        ? row.page
        : null;
    pages.push({ page, text });
  }
  return pages;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const caseId = typeof body?.caseId === "string" ? body.caseId : "";
  const fileId = typeof body?.fileId === "string" ? body.fileId.trim().slice(0, 80) : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim().slice(0, 180) : "";
  const pages = pagesFrom(body?.pages);
  if (!caseId || !fileId || !fileName) {
    return NextResponse.json({ error: "Sagsakten mangler sag eller fil." }, { status: 400 });
  }
  const result = await replaceCaseUploadChunks({ caseId, fileId, fileName, pages });
  if ("error" in result) {
    console.warn("Sagsakt blev ikke indekseret:", result.error);
    return NextResponse.json({ indexed: 0 });
  }
  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId") || "";
  const fileId = (url.searchParams.get("fileId") || "").trim().slice(0, 80);
  if (!caseId || !fileId) {
    return NextResponse.json({ error: "Sagsakten mangler sag eller fil." }, { status: 400 });
  }
  await removeCaseUploadChunks(caseId, fileId);
  return NextResponse.json({ removed: true });
}
