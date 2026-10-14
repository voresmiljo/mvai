import { NextResponse } from "next/server";
import { createOwnCase, listOwnCases } from "@/lib/userCases";

export async function GET() {
  const result = await listOwnCases();
  if (result.error === "Du er ikke logget ind.") {
    return NextResponse.json({ cases: [], error: result.error }, { status: 401 });
  }
  if (result.error) {
    return NextResponse.json({ cases: [], error: result.error }, { status: 500 });
  }
  return NextResponse.json(
    { cases: result.cases },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const scope = body?.scope === "plan" ? "plan" : body?.scope === "projekt" ? "projekt" : null;
  if (!scope) {
    return NextResponse.json({ error: "Vælg plan eller projekt." }, { status: 400 });
  }

  const question = typeof body?.question === "string" ? body.question : undefined;
  const result = await createOwnCase(scope, question);
  if (result.error === "Log ind, før du opretter en sag.") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  if (result.error || !result.case) {
    return NextResponse.json({ error: result.error || "Sagen kunne ikke oprettes." }, { status: 500 });
  }

  return NextResponse.json({ case: result.case });
}
