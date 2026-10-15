import { NextResponse } from "next/server";
import { textFromDocument } from "@/lib/documentText";

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
  const text = await textFromDocument(file.name, bytes);
  return NextResponse.json({ text });
}
