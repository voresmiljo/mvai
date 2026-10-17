const PLACEHOLDER_TITLE =
  /^(?:ny sag|sag\s*\d+|uploadet dokument|sagsanalyse|ny miljøvurdering|analysenotat|notat|mv (?:plan|projekt) \d+)$/i;

export function isPlaceholderTitle(title: string): boolean {
  return PLACEHOLDER_TITLE.test(title.trim());
}

function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.,:;]+$/g, "");
}

function sentenceCase(value: string): string {
  const text = tidy(value);
  if (!text) return "";
  return text.charAt(0).toLocaleUpperCase("da-DK") + text.slice(1);
}

function findPlace(text: string): string | null {
  const lokalplan = text.match(/lokalplan\s+\d+(?:[.\-]\d+)*(?:\s+[A-ZÆØÅ][\p{L}'-]*){0,4}/iu);
  if (lokalplan) return sentenceCase(lokalplan[0]);

  const park = text.match(/\b[A-ZÆØÅ][\p{L}'-]*(?:\s+[A-ZÆØÅ][\p{L}'-]*){0,3}\s+vindmøllepark(?:en)?/iu);
  if (park) return tidy(park[0]).replace(/parken$/i, "park");

  const plant = text.match(
    /\b(solcelleanlæg(?:get)?|solceller|vindmøller)(?:\s+(?:ved|i))?(?:\s+[A-ZÆØÅ][\p{L}'-]+){1,3}/iu
  );
  if (plant) return sentenceCase(plant[0].replace(/anlægget/i, "anlæg"));

  const named = text.match(/\b(?:ved|i)\s+([A-ZÆØÅ][\p{L}'-]+(?:\s+[A-ZÆØÅ][\p{L}'-]+){0,2})/u);
  if (named) return tidy(named[1]);
  return null;
}

function findTopics(text: string): string[] {
  const found: string[] = [];
  const add = (label: string) => {
    if (!found.includes(label)) found.push(label);
  };
  if (/vvm-?screening|screeningsafgørelse/i.test(text)) add("VVM-screening");
  if (/bilag\s*iv|flagermus/i.test(text)) add("Bilag IV (Flagermus)");
  if (/landzone/i.test(text)) add("Landzone-tilladelse");
  if (/vibration/i.test(text) && /støj/i.test(text)) add("Støj og vibrationer");
  else if (/nabostøj|\bstøj\b/i.test(text)) add("Nabostøj");
  if (/miljøkonsekvensrapport/i.test(text)) add("VVM-miljøkonsekvensrapport");
  if (/fugletræk|\bfugle\b/i.test(text)) add("Fugletræk");
  if (/natura\s*2000/i.test(text)) add("Natura 2000");
  if (/grundvand/i.test(text)) add("Grundvand");
  if (/afgrænsning/i.test(text) && /miljørapport/i.test(text)) add("SMV-afgrænsning");
  return found.slice(0, 2);
}

export function composeCaseTitle(parts: { name?: string; text?: string }[]): string | null {
  const blob = parts
    .map((part) => `${part.name || ""}\n${part.text || ""}`)
    .join("\n")
    .slice(0, 20000);
  if (!blob.trim()) return null;
  const place = findPlace(blob);
  const topics = findTopics(blob);
  if (!place || topics.length === 0) return null;
  return normalizeCaseTitle(`${place} – ${topics.join(" & ")}`);
}

export function normalizeCaseTitle(raw: string): string | null {
  let text = raw.replace(/\s+/g, " ").trim().replace(/^["'«»]+|["'«»]+$/g, "");
  text = text.replace(/\s+[-–—]\s+/, " – ");
  text = text.replace(/[.\s]+$/g, "");
  if (text.length > 120) text = text.slice(0, 120).trim();
  if (!text.includes(" – ") || isPlaceholderTitle(text)) return null;
  const [left, right] = text.split(" – ");
  if (!left.trim() || !right.trim()) return null;
  return text;
}

export function topicFromQuestion(question: string): string {
  let text = question.trim().replace(/\s+/g, " ");
  text = text.replace(/[?\s]+$/g, "").trim();
  if (!text) return "Ny sag";
  const max = 80;
  if (text.length > max) {
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(" ");
    text = (space > 40 ? cut.slice(0, space) : cut).trim();
  }
  return text.charAt(0).toLocaleUpperCase("da-DK") + text.slice(1);
}

export function uniqueCaseTitle(base: string, existing: string[]): string {
  const used = new Set(existing.map((title) => title.trim().toLowerCase()));
  let root = base.trim().replace(/\s+/g, " ");
  if (root.length > 120) root = root.slice(0, 120).trim();
  if (!used.has(root.toLowerCase())) return root;

  let number = 2;
  while (number < 1000) {
    const suffix = ` ${number}`;
    const candidate = `${root.slice(0, 120 - suffix.length).trimEnd()}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
    number += 1;
  }
  return `${root.slice(0, 100).trimEnd()} ${Date.now()}`;
}
