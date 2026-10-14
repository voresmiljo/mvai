import { NextResponse } from "next/server";
import { deleteOwnCase, retitleOwnCaseFromQuestion, touchOwnCase, updateOwnCaseTitle } from "@/lib/userCases";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (body?.touch === true) {
    const touched = await touchOwnCase(id);
    if (touched.error === "Du er ikke logget ind.") {
      return NextResponse.json({ error: touched.error }, { status: 401 });
    }
    if (touched.error || !touched.case) {
      return NextResponse.json({ error: touched.error || "Sagen kunne ikke opdateres." }, { status: 400 });
    }
    return NextResponse.json({ case: touched.case });
  }

  const result =
    typeof body?.question === "string" && body.question.trim()
      ? await retitleOwnCaseFromQuestion(id, body.question)
      : await updateOwnCaseTitle(id, String(body?.title || ""));

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
