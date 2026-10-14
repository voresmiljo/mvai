import { NextResponse } from "next/server";
import { sendFeedbackMail } from "@/lib/authMail";
import { getSessionUser } from "@/lib/session";

type FeedbackSource = {
  title: string;
  citation: string;
  relevance: string;
};

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sourcesFrom(value: unknown): FeedbackSource[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      title: clip(source.title, 180) || "Uden titel",
      citation: clip(source.citation, 180),
      relevance: clip(source.relevance, 12),
    };
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Log ind for at sende feedback." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const vote = body?.vote === "up" ? "Tommel op" : body?.vote === "down" ? "Tommel ned" : null;
  if (!vote) {
    return NextResponse.json({ error: "Vælg tommel op eller tommel ned." }, { status: 400 });
  }

  const comment = clip(body?.comment, 200);
  const question = clip(body?.question, 4000);
  const answer = clip(body?.answer, 8000);
  const themes = Array.isArray(body?.themes)
    ? body.themes.map((theme: unknown) => clip(theme, 80)).filter(Boolean).slice(0, 3)
    : [];
  const sources = sourcesFrom(body?.sources);

  const sourceLines = sources.length
    ? sources
        .map((source, index) => `${index + 1}. ${source.title}${source.citation ? ` (${source.citation})` : ""}${source.relevance ? ` — ${source.relevance}` : ""}`)
        .join("\n")
    : "Ingen kilder i svaret.";

  const text = [
    `Vurdering: ${vote}`,
    `Fra: ${user.email}`,
    "",
    "Bemærkning:",
    comment || "Ingen bemærkning.",
    "",
    "Spørgsmål:",
    question || "Intet spørgsmål.",
    "",
    "Svar:",
    answer || "Intet svar.",
    "",
    "Temamapper:",
    themes.join(", ") || "Ingen.",
    "",
    "Kilder:",
    sourceLines,
  ].join("\n");

  const html = `<pre style="font-family:sans-serif;white-space:pre-wrap">${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</pre>`;

  try {
    await sendFeedbackMail({
      to: "kontakt@mvai.dk",
      subject: `MVAI feedback: ${vote}`,
      text,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedbacken kunne ikke sendes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
