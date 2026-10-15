type RankableSource = {
  title?: string;
  citation?: string;
  lawSection?: string;
  pdfFileName?: string;
  sourceType?: string;
};

export function legalSourceRank(source: RankableSource): number {
  const type = (source.sourceType || "").toLowerCase();
  const text = `${source.title || ""} ${source.citation || ""} ${source.lawSection || ""} ${source.pdfFileName || ""}`.toLowerCase();
  if (type === "naevnskendelse" || /klagenævn|mfkn|pkn|nævnsafgørelse|naevnsafgoerelse/.test(text)) return 4;
  if (type === "eu_dom") return 4;
  if (type === "lov" || type === "bekendtgoerelse" || /\blbk\b|lovbekendtgørelse|bekendtgørelse|\bbek nr\b/.test(text)) return 0;
  if (type === "vejledning" || /vejledning/.test(text)) return 1;
  if (/direktiv/.test(text)) return 2;
  if (/håndbog|haandbog|forvaltningsplan|styrelsesnotat|\bnotat\b|udtalelse/.test(text)) return 3;
  return 5;
}

export function rankLegalSources<T extends RankableSource>(sources: T[], keep = 5): T[] {
  return sources
    .map((source, index) => ({ source, index, rank: legalSourceRank(source) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, keep)
    .map((item) => item.source);
}
