import { supabase } from "@/lib/supabase";
import { documentName, pickDocumentName, type CatalogDocument } from "@/lib/sourceBasis";

type CatalogRow = {
  pdf_file_name: string | null;
  title: string | null;
  law_section: string | null;
  theme: string | null;
  scope: string | null;
};

let cached: { at: number; documents: CatalogDocument[] } | null = null;

export async function loadArchiveCatalog(): Promise<CatalogDocument[]> {
  if (cached && Date.now() - cached.at < 60_000) return cached.documents;
  if (!supabase) return cached?.documents ?? [];

  const rows: CatalogRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("legal_sources")
      .select("pdf_file_name, title, law_section, theme, scope")
      .range(from, from + pageSize - 1);
    if (error || !data) return cached?.documents ?? [];
    rows.push(...(data as CatalogRow[]));
    if (data.length < pageSize) break;
  }

  const grouped = new Map<string, { names: string[]; themes: Set<string | null>; scopes: Set<string> }>();
  for (const row of rows) {
    const key = (row.pdf_file_name || row.title || "").trim();
    if (!key) continue;
    const group = grouped.get(key) ?? { names: [], themes: new Set<string | null>(), scopes: new Set<string>() };
    if (row.title) group.names.push(documentName(row.title, row.law_section));
    group.themes.add(row.theme);
    if (row.scope) group.scopes.add(row.scope);
    grouped.set(key, group);
  }

  const documents = [...grouped.values()]
    .map((group) => ({
      name: pickDocumentName(group.names),
      themes: [...group.themes],
      scopes: [...group.scopes],
    }))
    .filter((doc) => doc.name);

  cached = { at: Date.now(), documents };
  return documents;
}
