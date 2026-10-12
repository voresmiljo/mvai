import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { extractPdfText } from "@/lib/extractPdfText";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const theme = (formData.get("theme") as string) || "naevnspraksis";
    const scope = (formData.get("scope") as string) || "begge";
    const sourceType = (formData.get("sourceType") as string) || "naevnskendelse";
    const title = (formData.get("title") as string) || (file ? file.name.replace(/\.pdf$/i, "") : "Uden titel");

    if (!file) {
      return NextResponse.json({ error: "Ingen fil modtaget." }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase er ikke konfigureret." }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: fullText, pageCount } = await extractPdfText(buffer);

    if (!fullText) {
      return NextResponse.json({ error: "PDF-filen indeholder ingen læsbar tekst." }, { status: 400 });
    }

    // Del teksten op i bidder (chunks på ca. 1500 tegn med overlap)
    const chunkSize = 1500;
    const overlap = 200;
    const chunks: string[] = [];
    
    for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
      const chunk = fullText.slice(i, i + chunkSize).trim();
      if (chunk.length > 50) {
        chunks.push(chunk);
      }
      if (i + chunkSize >= fullText.length) break;
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey.trim() }) : null;

    let insertedCount = 0;

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      let embedding: number[] | null = null;

      if (openai) {
        try {
          const embRes = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: `${title} (afsnit ${idx + 1}): ${chunkText}`,
          });
          embedding = embRes.data[0]?.embedding || null;
        } catch (e) {
          console.warn("Embedding error for chunk:", e);
        }
      }

      const chunkTitle = chunks.length > 1 ? `${title} (del ${idx + 1}/${chunks.length})` : title;

      const { error: insErr } = await supabase.from("legal_sources").insert({
        title: chunkTitle,
        citation: `${title}, afsnit ${idx + 1}`,
        law_section: `Uddrag ${idx + 1}`,
        content: chunkText,
        source_type: sourceType,
        scope: scope,
        theme: theme,
        pdf_file_name: file.name,
        metadata: {
          originalFileName: file.name,
          chunkIndex: idx,
          totalChunks: chunks.length,
          pageCount,
          date: new Date().toLocaleDateString("da-DK"),
        },
        ...(embedding ? { embedding } : {}),
      });

      if (!insErr) {
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      title,
      fileName: file.name,
      chunksCount: chunks.length,
      insertedCount,
      theme,
      scope,
    });
  } catch (err: unknown) {
    console.error("Upload source error:", err);
    return NextResponse.json(
      { error: "Fejl under upload og indeksering.", details: String(err) },
      { status: 500 }
    );
  }
}
