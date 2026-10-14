import { originalSourceIds } from "@/lib/sourceOriginals";
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
  hasOriginal: boolean;
  relevanceScore: number;
}

export async function searchSupabaseLegalSources(
  prompt: string,
  scope: "projekt" | "plan",
  themes: string[] = []
): Promise<RetrievedSource[]> {
  if (!supabase) {
    return [];
  }

  // 1. Forsøg semantisk vektorsøgning via OpenAI embeddings, hvis OPENAI_API_KEY er aktiv
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: prompt.trim(),
      });

      const vector = embeddingResponse.data[0]?.embedding;
      if (vector) {
        const { data, error } = await supabase.rpc("match_legal_sources", {
          query_embedding: vector,
          match_threshold: 0.45,
          match_count: 5,
          filter_themes: themes,
          filter_scope: scope,
        });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          return withOriginals(data.map((row: {
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
            date: row.metadata?.date || "Gældende praksis",
            textSnippet: row.content,
            pdfUrl: "",
            pdfFileName: row.pdf_file_name || "retskilde.pdf",
            hasOriginal: false,
            relevanceScore: Math.round(row.similarity * 100),
          })));
        }
      }
    } catch (err) {
      console.warn("Vector embedding search skipped, falling back to text query:", err);
    }
  }

  // 2. Direkte metadata- og tekstsøgning i Supabase (hvis vektorsøgning ikke returnerer noget)
  try {
    let query = supabase
      .from("legal_sources")
      .select("id, title, citation, law_section, content, pdf_file_name, pdf_url, metadata, theme, scope")
      .limit(5);

    if (themes.length > 0) {
      query = query.in("theme", themes);
    } else {
      query = query.is("theme", null);
    }

    const { data, error } = await query;
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return withOriginals(data.map((row) => ({
        id: row.id,
        title: row.title,
        citation: row.citation,
        lawSection: row.law_section || "",
        date: row.metadata?.date || "Ajourført",
        textSnippet: row.content,
        pdfUrl: "",
        pdfFileName: row.pdf_file_name || "retskilde.pdf",
        hasOriginal: false,
        relevanceScore: 92,
      })));
    }
  } catch (err) {
    console.error("Supabase direct query error:", err);
  }

  return [];
}

async function withOriginals(sources: RetrievedSource[]): Promise<RetrievedSource[]> {
  const archived = await originalSourceIds(sources.map((source) => source.id));
  return sources.map((source) => ({
    ...source,
    hasOriginal: archived.has(source.id),
    pdfUrl: archived.has(source.id) ? `/api/sources/${source.id}/original` : "",
  }));
}
