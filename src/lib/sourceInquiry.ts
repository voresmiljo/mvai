import { THEME_FOLDERS } from "@/lib/themeFolders";
import { supabase } from "@/lib/supabase";

const STOP = new Set([
  "lov",
  "loven",
  "om",
  "den",
  "det",
  "og",
  "af",
  "til",
  "en",
  "et",
  "du",
  "har",
  "med",
  "for",
  "som",
  "ved",
  "fra",
  "eller",
  "ikke",
  "mvai",
  "arkivet",
  "arkiv",
  "grundmappen",
  "grundmappe",
  "temamappen",
  "temamappe",
  "mappen",
  "mappe",
  "vores",
  "jeres",
  "adgang",
  "indgår",
  "findes",
  "ligger",
  "hvilken",
  "hvor",
  "pdf",
  "bek",
  "lbk",
  "vej",
  "nr",
  "rapport",
]);

const GENERIC = new Set([
  "filer",
  "filerne",
  "kilder",
  "kilderne",
  "dokumenter",
  "dokumenterne",
  "alle",
  "alt",
  "dem",
  "denne",
  "dette",
]);

export type Inquiry =
  | { kind: "catalog" }
  | { kind: "source"; query: string; tokens: string[] };

export function classifyInquiry(message: string): Inquiry | null {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text || text.length > 240) return null;
  if (
    /(?:alle kilder|alle filer|hele (?:kilde)?biblioteket|fulde overblik|overblik over (?:alle|mine) kilder|liste over (?:alle )?kilder|hvilke kilder (?:har|ligger|indeholder)|hvad (?:ligger|er) i (?:alle )?mapper)/i.test(
      text
    )
  ) {
    return { kind: "catalog" };
  }

  const captured =
    text.match(/^indgår\s+(.+?)[?.!]?$/i)?.[1] ||
    text.match(/^findes\s+(.+?)[?.!]?$/i)?.[1] ||
    text.match(/^har (?:du|mvai|i)\s+(?:adgang til\s+)?(.+?)[?.!]?$/i)?.[1] ||
    text.match(/^(?:er|ligger)\s+(.+?)\s+i\s+(?:vores\s+|jeres\s+)?(?:arkivet|arkiv|mvai|grundmappen|temamappen|mappen)\b.*$/i)?.[1] ||
    text.match(/^hvilken mappe (?:er|ligger)\s+(.+?)[?.!]?$/i)?.[1] ||
    text.match(/^hvor ligger\s+(.+?)[?.!]?$/i)?.[1];
  if (!captured) return null;

  const archivePlace = captured.match(
    /^(.*?)\s+i\s+(?:mvai|arkivet|arkiv|grundmappen|temamappen|mappen|hos jer|jeres arkiv|vores arkiv)\b.*$/i
  );
  if ((/^indgår\s|^findes\s/i.test(text)) && /\si\s/i.test(captured) && !archivePlace) return null;
  const query = (archivePlace?.[1] || captured)
    .replace(/\s+i$/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  const words = tokensOf(query);
  if (words.length === 0 || words.every((word) => GENERIC.has(word))) {
    return { kind: "catalog" };
  }
  return { kind: "source", query, tokens: words };
}

export function searchCoverageLine(themeIds: string[]): string {
  const names: string[] = [];
  for (const id of themeIds) {
    const name = THEME_FOLDERS.find((folder) => folder.id === id)?.name;
    if (name) names.push(name);
  }
  return `Søgning foretaget i: ${["Grundmappe", ...names].join(" + ")}`;
}

export function foldRiskIntoBody(text: string): string {
  const match = text.match(/(?:^|\n)\s*(?:\*\*)?\s*Retslig risikofaktor:\s*(?:\*\*)?\s*([\s\S]+?)\s*$/i);
  if (!match || match.index === undefined) return text;
  const sentence = match[1].replace(/\*\*/g, "").trim();
  const body = text.slice(0, match.index).replace(/\s+$/, "");
  if (!sentence) return body;
  return body ? `${body}\n\n${sentence}` : sentence;
}

export function withSearchCoverage(text: string, themes: string[]): string {
  const folded = foldRiskIntoBody(text).replace(/\n*_?Søgning foretaget i:[^\n]*_?\s*$/i, "").trim();
  if (
    /^(?:Dette emne ligger efter alt at dømme uden for|Modtaget – jeg har registreret|Der fremgår ikke umiddelbart oplysninger)/.test(
      folded
    )
  ) {
    return folded;
  }
  return `${folded}\n\n${searchCoverageLine(themes)}`;
}

function tokensOf(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => (token.length >= 3 || /^\d{2,}$/.test(token)) && !STOP.has(token));
}

function folderName(theme: string | null): string {
  if (!theme || theme === "grund") return "Grundmappen";
  return THEME_FOLDERS.find((folder) => folder.id === theme)?.name || theme;
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa");
}

function tokenVariants(token: string): string[] {
  const folded = fold(token);
  const variants = new Set([folded]);
  const stem = folded.replace(/(?:loven|lovens|bekendtgorelsen|bekendtgorelsens|direktivet|vejledningen)$/u, "");
  if (stem.length >= 6 && !stem.endsWith("s")) variants.add(stem);
  return [...variants];
}

function includesTerm(haystack: string, variant: string): boolean {
  const foldedHaystack = fold(haystack);
  let from = 0;
  while (from < foldedHaystack.length) {
    const at = foldedHaystack.indexOf(variant, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : foldedHaystack[at - 1];
    if (!before || !/\p{L}/u.test(before)) return true;
    from = at + variant.length;
  }
  return false;
}

function documentLabel(titles: string[], citation: string): string {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const stem = title
      .replace(/\s+§\s*[\d\s.a-zæøå-]+$/i, "")
      .replace(/,\s*overgangsbestemmelser$/i, "")
      .replace(/\s+indledning$/i, "")
      .trim();
    if (!stem) continue;
    counts.set(stem, (counts.get(stem) || 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
  return best?.[0] || citation.split(",")[0]?.trim() || titles[0] || "";
}

function useOf(sourceType: string): string {
  if (sourceType === "lov") return "Den indgår som gældende lov.";
  if (sourceType === "bekendtgoerelse") return "Den indgår som gældende bekendtgørelse.";
  if (sourceType === "vejledning") return "Den bruges som fortolkning af reglerne.";
  if (sourceType === "direktiv") return "Den indgår som EU-retligt grundlag.";
  return "Den indgår i kildegrundlaget.";
}

type ArchiveRow = {
  title: string | null;
  citation: string | null;
  theme: string | null;
  pdf_file_name: string | null;
  source_type: string | null;
};

export async function archiveAnswer(message: string): Promise<string | null> {
  const inquiry = classifyInquiry(message);
  if (!inquiry) return null;
  if (inquiry.kind === "catalog") {
    return "MVAI udskriver ikke en samlet liste over alle kilder i alle mapper. Spørg til den enkelte kilde, så kan jeg sige, om den indgår, og hvilken mappe den ligger i.";
  }
  if (!supabase) {
    return `Jeg kan ikke slå ${inquiry.query} op i arkivet lige nu.`;
  }

  const longest = inquiry.tokens.slice().sort((a, b) => b.length - a.length)[0];
  const lead = tokenVariants(longest).sort((a, b) => a.length - b.length)[0];
  const { data, error } = await supabase
    .from("legal_sources")
    .select("title, citation, theme, pdf_file_name, source_type")
    .or(`title.ilike.%${lead}%,citation.ilike.%${lead}%,pdf_file_name.ilike.%${lead}%`)
    .limit(400);
  if (error || !data) {
    return `Jeg kan ikke slå ${inquiry.query} op i arkivet lige nu.`;
  }

  const groups = new Map<
    string,
    { titles: string[]; citation: string; themes: Set<string | null>; sourceType: string; fileName: string }
  >();
  for (const row of data as ArchiveRow[]) {
    const key = row.pdf_file_name || row.title || row.citation || "";
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      if (row.title) existing.titles.push(row.title);
      existing.themes.add(row.theme);
      if (!existing.citation && row.citation) existing.citation = row.citation.split(",")[0]?.trim() || "";
      continue;
    }
    groups.set(key, {
      titles: row.title ? [row.title] : [],
      citation: (row.citation || "").split(",")[0]?.trim() || "",
      themes: new Set([row.theme]),
      sourceType: row.source_type || "",
      fileName: row.pdf_file_name || "",
    });
  }

  const found = [...groups.values()]
    .map((item) => {
      const identity = `${item.fileName} ${documentLabel(item.titles, item.citation)} ${item.citation}`;
      const matched = inquiry.tokens.every((token) =>
        tokenVariants(token).some((variant) => includesTerm(identity, variant))
      );
      const score = inquiry.tokens.reduce((sum, token) => {
        const variants = tokenVariants(token);
        if (variants.some((variant) => includesTerm(item.fileName, variant))) return sum + 10;
        if (variants.some((variant) => includesTerm(item.citation, variant))) return sum + 8;
        if (variants.some((variant) => includesTerm(documentLabel(item.titles, item.citation), variant))) return sum + 6;
        return sum;
      }, 0);
      return { item, matched, score };
    })
    .filter((entry) => entry.matched && entry.score >= 6)
    .sort((a, b) => {
      const exact = (entry: { item: { titles: string[]; citation: string } }) =>
        inquiry.tokens.every((token) => includesTerm(documentLabel(entry.item.titles, entry.item.citation), fold(token)))
          ? 1
          : 0;
      return exact(b) - exact(a) || b.score - a.score;
    })
    .map((entry) => entry.item);
  if (found.length === 0) {
    return `Nej. ${inquiry.query} indgår ikke i arkivet.`;
  }
  if (found.length > 6) {
    return `${inquiry.query} matcher flere kilder. Nævn lovnummeret eller den fulde titel, så kan jeg sige, hvilken mappe den ligger i.`;
  }

  return found
    .map((item) => {
      const unique = [...new Set([...item.themes].map(folderName))];
      const place =
        unique.length === 1
          ? unique[0] === "Grundmappen"
            ? "Grundmappen"
            : `mappen ${unique[0]}`
          : `mapperne ${unique.join(" og ")}`;
      const reference = item.citation ? ` Henvisningen er ${item.citation}.` : "";
      return `Ja. ${documentLabel(item.titles, item.citation)} ligger i ${place}.${reference} ${useOf(item.sourceType)}`;
    })
    .join("\n\n");
}
