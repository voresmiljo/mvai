export const EXAMPLE_QUESTIONS = [
  {
    label: "VVM-Screening (§ 21)",
    question:
      "Tjek om etablering af solcelleanlæg i landzone kræver fuld miljøkonsekvensrapport jf. bilag 2, pkt. 10.",
  },
  {
    label: "Artsbeskyttelse (Bilag IV)",
    question:
      "Gennemgå kravene til vurdering af den økologiske funktionalitet for bilag IV-arter jf. artikel 12.",
  },
  {
    label: "Natura 2000 & Habitat",
    question:
      "Hvilke formkrav og bevisbyrder stiller MFKN til væsentlighedsscreening jf. § 8, stk. 1, nr. 2?",
  },
  {
    label: "Støj & Gener",
    question:
      "Hvilke støjgrænser og afstandskrav finder anvendelse ved vindmøller nær samlet bebyggelse?",
  },
] as const;

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
