import { supabase } from "@/lib/supabase";
import { THEME_FOLDERS } from "@/lib/themeFolders";

export type FolderCount = {
  id: string;
  name: string;
  category: string;
  documents: number;
};

export type LibraryCounts = {
  configured: boolean;
  totalDocuments: number;
  groundDocuments: number;
  decisionDocuments: number;
  themes: FolderCount[];
};

function emptyCounts(configured: boolean): LibraryCounts {
  return {
    configured,
    totalDocuments: 0,
    groundDocuments: 0,
    decisionDocuments: 0,
    themes: THEME_FOLDERS.map((folder) => ({
      id: folder.id,
      name: folder.name,
      category: folder.category,
      documents: 0,
    })),
  };
}

export async function getLibraryCounts(): Promise<LibraryCounts> {
  if (!supabase) return emptyCounts(false);

  const data: Array<{
    theme: string | null;
    pdf_file_name: string | null;
    title: string | null;
    source_type: string | null;
  }> = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from("legal_sources")
      .select("theme, pdf_file_name, title, source_type")
      .range(from, from + pageSize - 1);
    if (error || !page) return emptyCounts(true);
    data.push(...page);
    if (page.length < pageSize) break;
  }

  const documents = new Map<string, { themes: Set<string | null>; sourceType: string | null }>();
  for (const row of data) {
    const key = (row.pdf_file_name || row.title || "").trim();
    if (!key) continue;
    const existing = documents.get(key);
    if (existing) {
      existing.themes.add(row.theme);
      if (!existing.sourceType && row.source_type) existing.sourceType = row.source_type;
      continue;
    }
    documents.set(key, {
      themes: new Set([row.theme]),
      sourceType: row.source_type,
    });
  }

  const values = [...documents.values()];

  return {
    configured: true,
    totalDocuments: documents.size,
    groundDocuments: values.filter((doc) => doc.themes.has(null) || doc.themes.has("grund")).length,
    decisionDocuments: values.filter((doc) => doc.sourceType === "naevnskendelse").length,
    themes: THEME_FOLDERS.map((folder) => ({
      id: folder.id,
      name: folder.name,
      category: folder.category,
      documents: values.filter((doc) => doc.themes.has(folder.id)).length,
    })),
  };
}
