import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { suggestQuestionsLocally, takeThreeQuestions, type PromptTurn } from "@/lib/suggestedQuestions";

const instruction = `Foreslå præcis tre opfølgende spørgsmål på dansk til en sagsbehandler.
Det nyeste brugerindlæg vejer mest. Ældre indlæg er kun baggrund.
Hold dig til emner, der allerede er nævnt. Tilføj ikke anlæg, steder, arter eller paragraffer, som ikke står i samtalen.
Hvis samtalen nævner artikel 12 eller artikel 6, skriv Habitatdirektivets artikel 12 eller Habitatdirektivets artikel 6. Opfind ikke en hjemmel, som ikke allerede er nævnt.
Svar kun med tre linjer. Ét spørgsmål pr. linje. Ingen nummerering.`;

function turns(value: unknown): PromptTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { sender?: unknown; text?: unknown };
      if (row.sender !== "user" && row.sender !== "ai") return null;
      const text = typeof row.text === "string" ? row.text.trim().slice(0, row.sender === "user" ? 1000 : 500) : "";
      if (!text) return null;
      return { sender: row.sender, text };
    })
    .filter((item): item is PromptTurn => item !== null)
    .slice(-8);
}

function promptFor(history: PromptTurn[]): string {
  const newestIndex = [...history].reverse().findIndex((message) => message.sender === "user");
  const newestAt = newestIndex === -1 ? -1 : history.length - 1 - newestIndex;
  const newest = newestAt >= 0 ? history[newestAt] : null;
  const older = history.filter((_, index) => index !== newestAt);
  const background = older
    .map((message) => `${message.sender === "user" ? "Bruger" : "Svar"}: ${message.text}`)
    .join("\n");
  return `Nyeste brugerindlæg, det skal vægte mest:\n${newest?.text || ""}\n\nÆldre samtale, kun baggrund:\n${background || "Ingen."}`;
}

async function suggestWithModel(history: PromptTurn[]): Promise<string | null> {
  const content = promptFor(history);
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
        max_tokens: 400,
        temperature: 0.2,
        system: instruction,
        messages: [{ role: "user", content }],
      });
      const text = response.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("\n")
        .trim();
      if (text) return text;
    } catch (error) {
      console.error("Spørgsmålsforslag via Claude fejlede:", error);
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
          { role: "user", content },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (error) {
      console.error("Spørgsmålsforslag via OpenAI fejlede:", error);
    }
  }

  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const history = turns(body?.messages);
  const fallback = suggestQuestionsLocally(history);
  if (fallback.length !== 3) {
    return NextResponse.json({ questions: [] });
  }

  const rewritten = await suggestWithModel(history);
  const questions = rewritten ? takeThreeQuestions(rewritten, fallback) : fallback;
  return NextResponse.json({ questions: questions.length === 3 ? questions : fallback });
}
