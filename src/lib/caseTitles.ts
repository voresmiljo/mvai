const PLACEHOLDER_TITLE = /^mv (plan|projekt) \d+$/i;

export function isPlaceholderTitle(title: string): boolean {
  const text = title.trim();
  return text.toLowerCase() === "ny sag" || PLACEHOLDER_TITLE.test(text);
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
