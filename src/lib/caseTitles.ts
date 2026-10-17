const PLACEHOLDER_TITLE =
  /^(?:ny sag|sag\s*\d+|uploadet dokument|sagsanalyse|ny miljøvurdering|analysenotat|notat|mv (?:plan|projekt) \d+)$/i;

export function isPlaceholderTitle(title: string): boolean {
  return PLACEHOLDER_TITLE.test(title.trim());
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
  if (/smv-?afgrænsning|afgrænsning af miljørapport/i.test(text)) add("SMV-afgrænsning");
  if (/habitatkonsekvens/i.test(text)) add("Habitatkonsekvensvurdering");
  return found.slice(0, 2);
}

function fileLabel(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ");
}

export function composeCaseTitle(parts: { name?: string; text?: string }[]): string | null {
  const texts = parts.map((part) => part.text || "").filter((text) => text.trim());
  const names = parts.map((part) => fileLabel(part.name || "")).filter((name) => name.trim());
  const body = texts.join("\n").slice(0, 20000);
  const labels = names.join("\n");
  if (!body.trim() && !labels.trim()) return null;
  const topics = findTopics(`${body}\n${labels}`);
  if (topics.length === 0) return null;
  return normalizeCaseTitle(topics.join(" & "));
}

const TITLE_STOP = new Set(["og", "ved", "for", "med", "den", "det", "som", "til", "fra", "eller", "samt", "efter", "uden", "ikke"]);

export function titleIsGrounded(title: string, source: string): boolean {
  const hay = source.toLocaleLowerCase("da-DK");
  const words = title
    .toLocaleLowerCase("da-DK")
    .split(/[^\p{L}\d]+/u)
    .filter((word) => word.length > 2 && !TITLE_STOP.has(word));
  return words.some((word) => hay.includes(word));
}

export function normalizeCaseTitle(raw: string): string | null {
  let text = raw.replace(/\s+/g, " ").trim().replace(/^["'«»]+|["'«»]+$/g, "");
  const sides = text.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (sides.length >= 2) text = sides[sides.length - 1];
  text = text.replace(/[.\s]+$/g, "");
  if (text.length > 120) text = text.slice(0, 120).trim();
  if (!text || text.length < 4 || isPlaceholderTitle(text)) return null;
  if (findTopics(text).length === 0) return null;
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
