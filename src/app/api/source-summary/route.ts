import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { SHORT_WAIT_MS } from "@/lib/functionDuration";
import { cleanSummary, readableSourceText, summaryFromText } from "@/lib/sourceSummary";

export const maxDuration = 60;

const instruction = `Skriv et kort resume på dansk af kildens indhold.
Svar med ét afsnit. Skriv ingen overskrift, og begynd ikke med ordene Resume, Resumé, Sammenfatning eller Kilde.
Hold dig til teksten. Opfind ikke parter, steder, årstal eller konklusioner, som ikke står i teksten.
Fortæl hvad kilden handler om, hvilke spørgsmål den behandler, og hvad den når frem til, hvis det fremgår.
Højst 130 ord.`;

function clip(value: string): string {
  return cleanSummary(value).slice(0, 1400);
}

async function summaryFromModel(title: string, text: string): Promise<string | null> {
  const content = `Fil: ${title}\n\nTekst:\n${text.slice(0, 12000)}`;
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
      const anthropic = new Anthropic({ apiKey: anthropicKey, timeout: SHORT_WAIT_MS });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 500,
        temperature: 0.2,
        system: instruction,
        messages: [{ role: "user", content }],
      });
      const written = response.content
        .map((block) => ("text" in block ? block.text : ""))
        .join(" ")
        .trim();
      if (written) return clip(written);
    } catch (error) {
      console.error("Kilderesume via Claude fejlede:", error);
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey, timeout: SHORT_WAIT_MS });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content },
        ],
      });
      const written = completion.choices[0]?.message?.content?.trim();
      if (written) return clip(written);
    } catch (error) {
      console.error("Kilderesume via OpenAI fejlede:", error);
    }
  }

  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 240) : "";
  const text = typeof body?.text === "string" ? readableSourceText(body.text) : "";
  if (!text) {
    return NextResponse.json({ summary: "" });
  }

  const summary = (await summaryFromModel(title || "Kilde", text)) || summaryFromText(text);
  return NextResponse.json({ summary });
}
