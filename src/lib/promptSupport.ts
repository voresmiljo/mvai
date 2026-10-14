export function buildQuestion(topic: string, purpose: string, problem: string): string {
  const emne = topic.trim().replace(/\s+/g, " ");
  const formaal = purpose.trim().replace(/\s+/g, " ");
  const problemstilling = problem.trim().replace(/\s+/g, " ");
  if (!emne && !formaal && !problemstilling) return "";

  const lead =
    emne && formaal
      ? `Udarbejd ${formaal} om ${emne}.`
      : formaal
        ? `Udarbejd ${formaal}.`
        : emne
          ? `Vurder ${emne}.`
          : "";
  const detail = problemstilling ? `Den konkrete problemstilling er: ${problemstilling}.` : "";
  return [lead, detail].filter(Boolean).join(" ");
}

export function enhanceQuestionLocally(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length > 180 && text.endsWith("?")) return text;
  const core = text
    .replace(/[?？.]+$/g, "")
    .replace(/^(hvad med|hvad siger loven om|hvad siger|hvordan med|hvordan|hvad)\s+/i, "")
    .trim();
  const subject = core || text.replace(/[?？.]+$/g, "");
  return `Hvilke krav stiller gældende praksis og vejledninger til ${subject}, og hvad skal vurderingen tage stilling til?`;
}
