import { NextResponse } from "next/server";
import { deleteOwnCase, updateOwnCaseTitle } from "@/lib/userCases";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const title = String(body?.title || "");
  const result = await updateOwnCaseTitle(id, title);

  if (result.error === "Log ind, før du retter titlen.") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  if (result.error || !result.case) {
    return NextResponse.json({ error: result.error || "Titlen kunne ikke gemmes." }, { status: 400 });
  }

  return NextResponse.json({ case: result.case });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await deleteOwnCase(id);

  if (result.error === "Log ind, før du sletter sagen.") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  if (result.error === "Sagen blev ikke fundet.") {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
