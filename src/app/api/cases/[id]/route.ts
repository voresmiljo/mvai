import { NextResponse } from "next/server";
import { updateOwnCaseTitle } from "@/lib/userCases";

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
