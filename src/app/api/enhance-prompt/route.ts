import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { nameLegalReference } from "@/lib/legalNames";
import { enhanceQuestionLocally } from "@/lib/promptSupport";

const instruction = `Omformulér brugerens spørgsmål til ét præcist spørgsmål på dansk til en miljøvurdering.
Behold kun det emne, brugeren selv har nævnt. Tilføj ikke anlæg, steder, arter eller krav, som ikke står i spørgsmålet.
Hvis spørgsmålet nævner artikel 12 eller artikel 6 uden direktivets navn, skriv Habitatdirektivets artikel 12 eller Habitatdirektivets artikel 6. Opfind ikke andre paragraffer eller direktiver.
Svar kun med spørgsmålet.`;

function clipQuestion(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 800);
}

async function rewriteWithModel(question: string): Promise<string | null> {
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
        max_tokens: 300,
        temperature: 0.2,
        system: instruction,
        messages: [{ role: "user", content: question }],
      });
      const text = response.content
        .map((block) => ("text" in block ? block.text : ""))
        .join(" ")
        .trim();
      if (text) return clipQuestion(text);
    } catch (error) {
      console.error("Prompt-forbedring via Claude fejlede:", error);
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0.2,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: question },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return clipQuestion(text);
    } catch (error) {
      console.error("Prompt-forbedring via OpenAI fejlede:", error);
    }
  }

  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) {
    return NextResponse.json({ error: "Skriv et spørgsmål først." }, { status: 400 });
  }

  const rewritten = nameLegalReference((await rewriteWithModel(question)) || enhanceQuestionLocally(question));
  return NextResponse.json({ question: rewritten });
}
