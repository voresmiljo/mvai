import { HABITATVEJLEDNING_HEADINGS } from "@/lib/habitatvejledningHeadings";

export type ExcerptBlock = {
  kind: "heading" | "paragraph";
  text: string;
};

export function documentTitle(title: string, lawSection: string): string {
  return stripSection(title, lawSection, "");
}

export function documentCitation(citation: string, lawSection: string): string {
  return stripSection(citation, lawSection, ", ");
}

function stripSection(value: string, lawSection: string, separator: string): string {
  const section = lawSection.trim();
  const source = value.trim();
  if (!section) return source;
  const suffix = `${separator}${section}`;
  if (source.endsWith(suffix)) return source.slice(0, -suffix.length).trim();
  return source;
}

function isNumberedHeading(line: string): boolean {
  if (!/^\d+(?:\.\d+)*\.?\s+[A-ZÆØÅ]/.test(line) || line.length > 160) return false;
  const rest = line.replace(/^\d+(?:\.\d+)*\.?\s+/, "");
  return !/[.!?]\s/.test(rest);
}

function isUnnumberedHeading(line: string, next: string | undefined): boolean {
  if (line.length < 4 || line.length > 90) return false;
  if (/[,:;]$/.test(line) || /[.!?]/.test(line)) return false;
  if (!/^[A-ZÆØÅ§]/.test(line)) return false;
  if (line.split(/\s+/).length > 12) return false;
  if (!next) return true;
  return /^[A-ZÆØÅ§]/.test(next);
}

function isListItem(line: string): boolean {
  return /^\d+\)/.test(line) || /^[a-zæøå]\)/.test(line) || /^[-–•]/.test(line);
}

function joinLines(lines: string[]): string {
  let text = "";
  for (const line of lines) {
    if (!text) {
      text = line;
      continue;
    }
    if (text.endsWith("-") && !text.endsWith(" -")) text = text.slice(0, -1) + line;
    else text = `${text} ${line}`;
  }
  return text.replace(/[ \t]+/g, " ").trim();
}

function withOutlineNumber(line: string, useHabitatOutline: boolean): string {
  if (!useHabitatOutline || /^\d/.test(line)) return line;
  const match = HABITATVEJLEDNING_HEADINGS.find((item) => item.title === line);
  return match ? `${match.number} ${match.title}` : line;
}

export function excerptBlocks(text: string, sourceName: string): ExcerptBlock[] {
  const useHabitatOutline = sourceName.includes("Habitatvejledningen");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];
    if (/^\d+(?:\.\d+){1,6}\.?$/.test(line) && next && isUnnumberedHeading(next, lines[index + 2])) {
      merged.push(`${line.replace(/\.$/, "")} ${next}`);
      index += 1;
    } else {
      merged.push(line);
    }
  }

  const blocks: ExcerptBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", text: joinLines(paragraph) });
    paragraph = [];
  };

  for (let index = 0; index < merged.length; index += 1) {
    const line = merged[index];
    const next = merged[index + 1];
    if (isListItem(line)) {
      flush();
      paragraph = [line];
      if (next && /^[a-zæøå]/.test(next)) continue;
      flush();
      continue;
    }
    if (isNumberedHeading(line) || isUnnumberedHeading(line, next)) {
      flush();
      blocks.push({ kind: "heading", text: withOutlineNumber(line, useHabitatOutline) });
      continue;
    }
    paragraph.push(line);
    if (/[.!?]\d*$/.test(line)) flush();
  }
  flush();
  return blocks;
}
