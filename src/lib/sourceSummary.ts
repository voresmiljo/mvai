const PLACEHOLDER = new Set([
  "Dokumentet læses endnu.",
  "Der er ingen læsbar tekst i dokumentet.",
]);

export function sourceFileTitle(source: { title?: string; pdfFileName?: string }): string {
  const file = source.pdfFileName?.trim() || "";
  if (file && !/^(?:retskilde|kilde)\.pdf$/i.test(file)) return file;
  return (source.title || file).trim();
}

export function readableSourceText(text: string): string {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || PLACEHOLDER.has(value)) return "";
  return value;
}

export function cleanSummary(value: string): string {
  const stripped = value
    .replace(/\r/g, "")
    .replace(
      /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:resume|resumé|sammenfatning|kort\s+beskrivelse)(?:\*\*)?\s*[:.\-–]?\s*/i,
      ""
    )
    .trim();
  return stripped
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:resume|resumé|sammenfatning)(?:\*\*)?\s*[:.\-–]?\s*/i, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1400);
}

export function summaryFromText(text: string): string {
  const clean = readableSourceText(text);
  if (!clean) return "";
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = "";
  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index].trim();
    const next = out ? `${out} ${sentence}` : sentence;
    if (out && (next.length > 650 || index >= 4)) break;
    out = next;
  }
  return cleanSummary(out);
}
