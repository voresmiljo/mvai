import { legalSourceRank } from "@/lib/sourceRank";

export type SourceLevel = 1 | 2 | 3;

type SourceFactsInput = {
  title?: string;
  citation?: string;
  lawSection?: string;
  pdfFileName?: string;
  sourceType?: string;
  date?: string;
};

export function sourceLevel(source: SourceFactsInput): SourceLevel | null {
  const type = (source.sourceType || "").toLowerCase();
  if (type === "eu_dom" || /direktiv/.test(`${source.title || ""} ${source.citation || ""}`.toLowerCase())) return 1;
  const rank = legalSourceRank(source);
  if (rank === 0) return 1;
  if (rank === 1 || rank === 3) return 2;
  if (rank === 4) return 3;
  return null;
}

export function sourceLevelLabel(level: SourceLevel): string {
  if (level === 1) return "Niveau 1: Lovbekendtgørelse / EU-direktiv";
  if (level === 2) return "Niveau 2: Vejledning / notat";
  return "Niveau 3: Klagenævnspraksis";
}

export function sourceLevelClass(level: SourceLevel): string {
  if (level === 1) return "bg-[#0F382C] text-white";
  if (level === 2) return "bg-[#1e3a5f] text-white";
  return "bg-[#7a2e3a] text-white";
}

export function sourceMeta(source: SourceFactsInput): string {
  const blob = `${source.title || ""} ${source.citation || ""} ${source.sourceType || ""}`.toLowerCase();
  let authority = "";
  if (/planklagenævn|\bpkn\b/.test(blob)) authority = "Planklagenævnet";
  else if (/klagenævn|\bmfkn\b|naevn/.test(blob)) authority = "Miljø- og Fødevareklagenævnet";
  else if (/eu-dom|eu_dom|domstolen/.test(blob)) authority = "EU-Domstolen";
  else if (/vejledning|styrelse|sgav|notat|håndbog|haandbog/.test(blob)) authority = "Styrelsen for Grøn Arealomlægning og Vandmiljø";
  else if (/bekendtgørelse|lovbekendtgørelse|\blbk\b|\bbek\b|direktiv/.test(blob)) authority = "Miljøministeriet";
  const journal = source.citation?.match(/j\.?\s*nr\.?\s*[\w./-]+/i)?.[0] || "";
  const reference = journal || source.citation || "";
  return [authority, source.date, reference].filter(Boolean).join(" • ");
}
