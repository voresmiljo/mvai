import { THEME_FOLDERS } from "@/lib/themeFolders";

export type CatalogDocument = {
  name: string;
  themes: Array<string | null>;
  scopes: string[];
};

export function documentName(title: string, lawSection: string | null | undefined): string {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const section = (lawSection || "").replace(/\s+/g, " ").trim();
  if (section && cleanTitle.endsWith(section)) {
    const stripped = cleanTitle.slice(0, -section.length).replace(/[\s,.:;-]+$/g, "").trim();
    if (stripped) return stripped;
  }
  return cleanTitle;
}

export function pickDocumentName(names: string[]): string {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  unique.sort((a, b) => a.length - b.length || a.localeCompare(b, "da"));
  if (unique.length === 0) return "";
  const shortest = unique[0];
  if (unique.every((name) => name.startsWith(shortest))) return shortest;
  return shortest;
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loosen(value: string): string {
  return fold(value).replace(/\b(\w+?)(?:erne|en|et|ne)\b/g, "$1");
}

function nameStems(name: string): string[] {
  const folded = loosen(name);
  const stems = [folded];
  for (const suffix of ["erne", "en", "et"]) {
    if (folded.endsWith(suffix) && folded.length - suffix.length >= 8) {
      stems.push(folded.slice(0, -suffix.length));
    }
  }
  return stems;
}

export function matchAskedDocument(message: string, documents: CatalogDocument[]): CatalogDocument | null {
  const folded = loosen(message);
  if (fold(message).includes(fold("habitatdirektiv"))) {
    const bekendtgorelse = documents.find((doc) => fold(doc.name).startsWith(fold("Habitatbekendtgørelse")));
    if (bekendtgorelse) return bekendtgorelse;
  }

  let best: { doc: CatalogDocument; length: number } | null = null;
  for (const doc of documents) {
    for (const stem of nameStems(doc.name)) {
      if (stem.length < 8 || !folded.includes(stem)) continue;
      if (!best || stem.length > best.length) best = { doc, length: stem.length };
    }
  }
  return best?.doc ?? null;
}

export function activeThemeNames(themes: string[]): string {
  if (themes.length === 0) return "ingen";
  return themes
    .map((id) => THEME_FOLDERS.find((folder) => folder.id === id)?.name ?? id)
    .join(", ");
}

export function formatArchiveOverview(
  documents: CatalogDocument[],
  themes: string[],
  scope: "plan" | "projekt"
): string {
  const lines = [...documents]
    .sort((a, b) => a.name.localeCompare(b.name, "da"))
    .map((doc) => `- ${doc.name}: ${sourceBasisReply(doc, themes, scope)}`);
  return [`Markerede temamapper: ${activeThemeNames(themes)}.`, "Grundmappen indgår altid.", ...lines].join("\n");
}

const FOLDER_SEQUENCE = [
  "natura2000",
  "artsbeskyttelse",
  ...THEME_FOLDERS.map((folder) => folder.id).filter((id) => id !== "natura2000" && id !== "artsbeskyttelse"),
];

export function folderLabels(themes: Array<string | null>): string[] {
  const ids = new Set(themes);
  const labels: string[] = [];
  if ([...ids].some((theme) => theme == null || theme === "grund")) labels.push("Grundmappen");
  for (const id of FOLDER_SEQUENCE) {
    if (!ids.has(id)) continue;
    const folder = THEME_FOLDERS.find((item) => item.id === id);
    if (folder) labels.push(folder.name);
  }
  return labels;
}

function joinDanish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} og ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} og ${items[items.length - 1]}`;
}

export function locationPhrase(labels: string[]): string {
  const themes = labels.filter((label) => label !== "Grundmappen");
  const parts: string[] = [];
  if (labels.includes("Grundmappen")) parts.push("grundmappen");
  if (themes.length > 0) parts.push(`temamappe ${joinDanish(themes)}`);
  return joinDanish(parts);
}

export function isInSelectedBasis(doc: CatalogDocument, themes: string[], scope: "plan" | "projekt"): boolean {
  const scopeOk = doc.scopes.includes("begge") || doc.scopes.includes(scope);
  if (!scopeOk) return false;
  const selected = new Set(themes);
  return doc.themes.some((theme) => theme == null || theme === "grund" || selected.has(theme));
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function sourceBasisReply(doc: CatalogDocument, themes: string[], scope: "plan" | "projekt"): string {
  const where = locationPhrase(folderLabels(doc.themes));
  if (!isInSelectedBasis(doc, themes, scope)) {
    return `Der findes ikke ${lowerFirst(doc.name)} i de temamapper, der er markeret som kildegrundlag. ${doc.name} ligger i ${where}.`;
  }
  const selectedTheme = doc.themes.some((theme) => theme != null && theme !== "grund" && themes.includes(theme));
  if (!selectedTheme) {
    return `${doc.name} indgår i kildegrundlaget. ${doc.name} ligger i ${where}.`;
  }
  return `${doc.name} indgår i de temamapper, der er markeret som kildegrundlag. ${doc.name} ligger i ${where}.`;
}
