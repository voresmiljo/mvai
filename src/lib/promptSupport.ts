export type PromptTurn = {
  sender: "user" | "ai";
  text: string;
};

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

function subjectOf(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ").replace(/[?？.]+$/g, "");
  const core = text
    .replace(/^(hvad med|hvad siger loven om|hvad siger|hvordan med|hvordan|hvad)\s+/i, "")
    .trim();
  const subject = core || text;
  return subject.length > 160 ? `${subject.slice(0, 157).trim()}…` : subject;
}

export function userTurns(messages: PromptTurn[]): string[] {
  return messages
    .filter((message) => message.sender === "user")
    .map((message) => message.text.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export function suggestQuestionsLocally(messages: PromptTurn[]): string[] {
  const users = userTurns(messages);
  if (!users.length) return [];
  const newest = subjectOf(users[users.length - 1]);
  const previous = users.length > 1 ? subjectOf(users[users.length - 2]) : "";
  const third =
    previous && previous.toLowerCase() !== newest.toLowerCase()
      ? `Hvordan skal ${newest} ses i lyset af det tidligere spørgsmål om ${previous}?`
      : `Hvilke forhold ved ${newest} er stadig uafklarede?`;
  return [
    `Hvilke krav stiller gældende praksis og vejledninger til ${newest}?`,
    `Hvad skal vurderingen tage stilling til om ${newest}?`,
    third,
  ];
}

export function takeThreeQuestions(raw: string, fallback: string[]): string[] {
  let source = raw.trim();
  if (source.startsWith("[")) {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) source = parsed.filter((item) => typeof item === "string").join("\n");
    } catch {
      source = raw;
    }
  }
  const lines = source
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").replace(/^["“]|["”]$/g, "").trim())
    .filter((line) => line.length > 12);
  const unique = [...new Set([...lines, ...fallback])];
  return unique.slice(0, 3);
}
