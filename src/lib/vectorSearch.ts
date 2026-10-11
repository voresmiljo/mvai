import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

export interface RetrievedSource {
  id: string;
  title: string;
  citation: string;
  lawSection: string;
  date: string;
  textSnippet: string;
  pdfUrl: string;
  pdfFileName: string;
  relevanceScore: number;
}

export async function searchSupabaseLegalSources(
  prompt: string,
  scope: "projekt" | "plan",
  themes: string[] = []
): Promise<RetrievedSource[]> {
  if (!supabase || !process.env.OPENAI_API_KEY) {
    return [];
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Generér embedding af brugerens spørgsmål
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: prompt.trim(),
    });

    const vector = embeddingResponse.data[0]?.embedding;
    if (!vector) return [];

    // Udfør semantisk vektorsøgning via Supabase match_legal_sources funktionen
    const { data, error } = await supabase.rpc("match_legal_sources", {
      query_embedding: vector,
      match_threshold: 0.50,
      match_count: 5,
      filter_themes: themes.length > 0 ? themes : null,
      filter_scope: scope,
    });

    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    return data.map((row: {
      id: string;
      title: string;
      citation: string;
      law_section: string;
      content: string;
      pdf_file_name: string;
      pdf_url: string;
      metadata?: { date?: string };
      similarity: number;
    }) => ({
      id: row.id,
      title: row.title,
      citation: row.citation,
      lawSection: row.law_section,
      date: row.metadata?.date || "Ajourført",
      textSnippet: row.content,
      pdfUrl: row.pdf_url || "#",
      pdfFileName: row.pdf_file_name || "retskilde.pdf",
      relevanceScore: Math.round(row.similarity * 100),
    }));
  } catch (err) {
    console.error("Supabase vector search error:", err);
    return [];
  }
}
