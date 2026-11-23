import { NextResponse } from "next/server";
import { pagesFromDocument } from "@/lib/documentText";

export const maxDuration = 60;

const MAX_BYTES = 4_000_000;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Vælg et dokument." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ text: "" });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pages = await pagesFromDocument(file.name, bytes);
  const text = pages.map((item) => item.text).join("\n\n").slice(0, 40000);
  return NextResponse.json({ text, pages });
}
