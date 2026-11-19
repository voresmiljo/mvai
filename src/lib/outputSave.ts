export type OutputTurn = {
  sender: "user" | "ai";
  text: string;
};

export type OutputDraft = {
  title: string;
  content: string;
};

const SAVE_VERB =
  "læg(?:ge[rs]?|t)?|lagde|gem(?:me[rs]?|t)?|tilføj(?:e[rs]?|et)?|sæt(?:te[rs]?)?|satte|sat|put(?:te[rs]?)?";
const OUTPUT_WORD = "outputs?(?:tet|en)?";
const PLACE = "(?:over\\s+i|hen\\s+i|med\\s+i|i|til|på)\\s+(?:\\S+\\s+){0,2}";
const BEFORE = `(?<![\\p{L}\\p{N}_])`;
const AFTER = `(?![\\p{L}\\p{N}_])`;

const SAVE_REQUEST = new RegExp(
  `${BEFORE}(?:${SAVE_VERB})${AFTER}[\\s\\S]{0,200}?${PLACE}(?:${OUTPUT_WORD})${AFTER}|${BEFORE}skal${AFTER}(?:\\s+(?:med|hen|over))?\\s+(?:i|til|på)\\s+(?:\\S+\\s+){0,2}(?:${OUTPUT_WORD})${AFTER}`,
  "iu"
);

function instructionPattern(): RegExp {
  return new RegExp(
    `(?:^|[.!\\n]\\s*)[^.!?\\n]*${BEFORE}(?:${SAVE_VERB})${AFTER}[^.!?\\n]*${PLACE}(?:${OUTPUT_WORD})${AFTER}[^.!?\\n]*|(?:^|[.!\\n]\\s*)[^.!?\\n]*${BEFORE}skal${AFTER}[^.!?\\n]*(?:i|til|på)\\s+(?:\\S+\\s+){0,2}(?:${OUTPUT_WORD})${AFTER}[^.!?\\n]*`,
    "giu"
  );
}

export function asksToSaveOutput(message: string): boolean {
  const text = message.trim();
  if (/\bhvordan\b/iu.test(text)) return false;
  if (SAVE_REQUEST.test(text)) return true;
  if (text.length > 60 || text.includes("?")) return false;
  if (new RegExp(`${BEFORE}(?:hvad|hvilke[nt]?|hvorfor|hvorvidt|skal)${AFTER}`, "iu").test(text)) return false;
  return new RegExp(`${PLACE}(?:${OUTPUT_WORD})${AFTER}`, "iu").test(text);
}

export function isOutputSaveOnly(message: string): boolean {
  if (!asksToSaveOutput(message)) return false;
  const rest = message.replace(instructionPattern(), " ").replace(/\s+/g, " ").trim();
  if (rest.includes("?") && /\p{L}/u.test(rest)) return false;
  return rest.replace(/[?\s.!,]+/g, "").length < 40;
}

function ownText(message: string): string {
  return message
    .replace(instructionPattern(), "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const rest = line.replace(instructionPattern(), " ").replace(/\s+/g, " ").trim();
      return !(SAVE_REQUEST.test(line) && rest.replace(/[?\s.!,]+/g, "").length < 15);
    })
    .join("\n")
    .trim();
}

function usableText(text: string): boolean {
  const value = text.trim();
  return value.length >= 40 && !value.startsWith("Du kan uploade sagens dokumenter ovenfor");
}

function skipped(turn: OutputTurn): boolean {
  const text = turn.text.trim();
  if (!usableText(text)) return true;
  if (turn.sender === "user" && asksToSaveOutput(text)) return true;
  return (
    turn.sender === "ai" &&
    /^(?:Jeg kan ikke gemme|Der er på nuværende tidspunkt ikke uploadet|Der er ingen tidligere tekst|Lagt i output|Sagen kunne ikke|Fejl fra)/.test(text)
  );
}

function lastText(history: OutputTurn[], sender: "user" | "ai"): string {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.sender !== sender || skipped(turn)) continue;
    return turn.text.trim();
  }
  return "";
}

function noteTitle(content: string): string {
  const heading = content.match(/^###\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 120);
  const greeted = content.match(/\bHej\s+([A-ZÆØÅ][\p{L}'’-]{1,40})/u)?.[1];
  if (greeted) return `Mail til ${greeted}`.slice(0, 120);
  const line = content
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !/^hej\b/iu.test(item));
  return (line || "Sagsnotat").slice(0, 120);
}

export function outputDraft(message: string, history: OutputTurn[]): OutputDraft | { empty: true } | null {
  if (!asksToSaveOutput(message)) return null;

  const attached = ownText(message);
  const wantsMail = /\b(e-?mail|mailen|mail|korrespondance|indsat)\b/iu.test(message);
  const wantsReply = /\b(dit svar|svaret|analysen|notatet|dit notat)\b/iu.test(message);

  let content = "";
  if (attached.length > 0) content = attached;
  else if (wantsMail && !wantsReply) content = lastText(history, "user");
  else if (wantsReply && !wantsMail) content = lastText(history, "ai");
  else {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const turn = history[index];
      if (turn && !skipped(turn)) {
        content = turn.text.trim();
        break;
      }
    }
  }

  if (!content || (attached.length === 0 && content.length < 20)) return { empty: true };
  return { title: noteTitle(content), content };
}
