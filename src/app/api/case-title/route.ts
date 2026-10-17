import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { composeCaseTitle, normalizeCaseTitle, titleIsGrounded } from "@/lib/caseTitles";

const instruction = `Du navngiver en dansk miljøsag ud fra sagsakterne.
Svar kun med én titel.
Formen er: [Lokalitet/Plan/Projekt] – [Miljøretligt kerneemne]
Brug tankestreg. Højst 120 tegn.
Opfind ikke sted, anlæg eller emne, som ikke står i materialet.
Brug aldrig Sag 1, Uploadet dokument, Sagsanalyse, Analysenotat, Notat, Ny sag eller Ny Miljøvurdering.
Kald ikke et fagnotat for en miljørapport eller en miljøkonsekvensrapport.`;

function material(value: unknown): { name: string; text: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 4)
    .map((item) => {
      const row = item as { name?: unknown; text?: unknown };
      const name = typeof row.name === "string" ? row.name.trim().slice(0, 180) : "";
      const text = typeof row.text === "string" ? row.text.replace(/\u0000/g, "").trim().slice(0, 6000) : "";
      return { name, text };
    })
    .filter((item) => item.name || item.text);
}

async function titleFromModel(source: string): Promise<string | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const retired = new Set([
    "claude-3-sonnet-20240229",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-sonnet-20241022",
    "claude-3-7-sonnet-20250219",
  ]);
  const configured = process.env.ANTHROPIC_MODEL?.trim();
  const model = configured && !retired.has(configured) ? configured : "claude-sonnet-5-5";

  if (anthropicKey) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 80,
        temperature: 0,
        system: instruction,
        messages: [{ role: "user", content: source }],
      });
      const text = response.content
        .map((block) => ("text" in block ? block.text : ""))
        .join(" ")
        .trim();
      const title = normalizeCaseTitle(text);
      if (title) return title;
    } catch (error) {
      console.error("Sagstitel via Claude fejlede:", error);
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: source },
        ],
      });
      return normalizeCaseTitle(completion.choices[0]?.message?.content || "");
    } catch (error) {
      console.error("Sagstitel via OpenAI fejlede:", error);
    }
  }

  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const documents = material(body?.documents);
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!documents.length && !question) {
    return NextResponse.json({ error: "Der er ikke noget at navngive sagen ud fra." }, { status: 400 });
  }

  const source = [
    ...documents.map((item) => `Dokument: ${item.name || "uden navn"}\n${item.text}`),
    question ? `Spørgsmål: ${question}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 14000);

  const parts = [...documents, ...(question ? [{ text: question }] : [])];
  const composed = composeCaseTitle(parts);
  if (composed) return NextResponse.json({ title: composed });

  const hasDocumentText = documents.some((item) => item.text.trim().length > 40);
  const modeled = hasDocumentText ? await titleFromModel(source) : null;
  if (modeled && titleIsGrounded(modeled, source)) {
    return NextResponse.json({ title: modeled });
  }
  return NextResponse.json({ title: null });
}
