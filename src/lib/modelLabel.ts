export function publicModelLabel(value?: string): string | null {
  const text = (value || "")
    .replace(/\s*\([^)]*fallback[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || /offline|retskildematrix|fallback/i.test(text)) return null;
  return text;
}
