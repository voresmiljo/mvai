type GuardableSource = {
  title?: string;
  citation?: string;
  lawSection?: string;
  textSnippet?: string;
};

const INSUFFICIENT =
  "Det foreliggende kildegrundlag i MVAI indeholder ikke tilstrækkelige oplysninger til at besvare dette spørgsmål med den fornødne juridiske sikkerhed.";

const FAMILIES: { detect: RegExp; support: RegExp }[] = [
  {
    detect: /habitatdirektiv|habitatbekendtg|bilag iv|yngle- og raste|artikel 12|artikel 16/,
    support: /habitatdirektiv|habitatbekendtg|bilag iv|yngle- og raste|artikel 12|artikel 16/,
  },
  {
    detect: /officialprincip/,
    support: /officialprincip/,
  },
];

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceBlob(source: GuardableSource): string {
  return fold(`${source.title || ""} ${source.citation || ""} ${source.lawSection || ""} ${source.textSnippet || ""}`);
}

function familiesIn(text: string): { detect: RegExp; support: RegExp }[] {
  const folded = fold(text);
  return FAMILIES.filter((family) => family.detect.test(folded));
}

function supports(blob: string, families: { support: RegExp }[]): boolean {
  return families.every((family) => family.support.test(blob));
}

function citationNumbers(sentence: string): number[] {
  return [...sentence.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1]));
}

function stripCitations(sentence: string): string {
  return sentence
    .replace(/\s*\[\d{1,2}\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.!?])/g, "$1")
    .trim();
}

function withCitations(sentence: string, numbers: number[]): string {
  const bare = stripCitations(sentence);
  if (!bare) return "";
  if (!numbers.length) return bare;
  const marks = numbers.map((number) => `[${number}]`).join("");
  if (/[.!?]$/.test(bare)) return `${bare.slice(0, -1)} ${marks}${bare.slice(-1)}`;
  return `${bare} ${marks}`;
}

function isInsufficiency(sentence: string): boolean {
  return fold(sentence).includes("kildegrundlag i mvai");
}

function rewriteSentence(sentence: string, blobs: string[]): string {
  const trimmed = sentence.trim();
  if (!trimmed || isInsufficiency(trimmed)) return trimmed;
  const families = familiesIn(trimmed);
  if (!families.length) return trimmed;

  const numbers = citationNumbers(trimmed).filter((number) => number >= 1 && number <= blobs.length);
  const valid = numbers.filter((number) => supports(blobs[number - 1], families));
  if (valid.length) return withCitations(trimmed, valid);

  const supporters = blobs
    .map((blob, index) => (supports(blob, families) ? index + 1 : 0))
    .filter((number) => number > 0);
  if (supporters.length === 1) return withCitations(trimmed, supporters);
  if (supporters.length > 1) return stripCitations(trimmed);
  return "";
}

export function guardCitations(text: string, sources: GuardableSource[]): string {
  const blobs = sources.map(sourceBlob);
  const rewritten = text
    .split(/(\n)/)
    .map((piece) => {
      if (piece === "\n" || !piece.trim()) return piece;
      const kept = piece
        .split(/(?<=[a-zæøå][.!?])\s+(?=[A-ZÆØÅ])/i)
        .map((sentence) => rewriteSentence(sentence, blobs))
        .filter((sentence) => sentence.trim().length > 0);
      return kept.join(" ");
    })
    .join("")
    .replace(/^[ \t]*\d+\.[ \t]*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!/[a-zæøå]/i.test(rewritten)) return INSUFFICIENT;
  return rewritten;
}
