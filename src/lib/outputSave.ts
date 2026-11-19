export type OutputTurn = {
  sender: "user" | "ai";
  text: string;
};

export type OutputDraft = {
  title: string;
  content: string;
};

const SAVE_REQUEST =
  /\b(?:læg|gem|tilføj|sæt|put)\b[\s\S]{0,180}\boutput\b|\boutput\b[\s\S]{0,80}\b(?:læg|gem|tilføj|sæt|put)\b/i;

export function asksToSaveOutput(message: string): boolean {
  const text = message.trim();
  if (!SAVE_REQUEST.test(text)) return false;
  if (/\bhvordan\b/i.test(text)) return false;
  return true;
}

export function isOutputSaveOnly(message: string): boolean {
  if (!asksToSaveOutput(message)) return false;
  const rest = message
    .replace(/(?:^|[.!\n]\s*)[^.!?\n]*\b(?:læg|gem|tilføj|sæt|put)\b[^.!?\n]*\boutput\b[^.!?\n]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return rest.length < 40 && !rest.includes("?");
}

function ownText(message: string): string {
  return message
    .replace(/(?:^|[.!\n]\s*)[^.!?\n]*\b(?:læg|gem|tilføj|sæt|put)\b[^.!?\n]*\boutput\b[^.!?\n]*/gi, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function lastText(history: OutputTurn[], sender: "user" | "ai"): string {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.sender !== sender) continue;
    const text = turn.text.trim();
    if (text.length < 40) continue;
    if (sender === "user" && asksToSaveOutput(text)) continue;
    return text;
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
    .find((item) => item.length > 12 && !/^hej\b/i.test(item));
  return (line || "Sagsnotat").slice(0, 120);
}

export function outputDraft(message: string, history: OutputTurn[]): OutputDraft | { empty: true } | null {
  if (!asksToSaveOutput(message)) return null;

  const attached = ownText(message);
  const wantsMail = /\b(e-?mail|mailen|mail|korrespondance|indsat)\b/i.test(message);
  const wantsReply = /\b(dit svar|svaret|analysen|notatet|dit notat)\b/i.test(message);

  let content = "";
  if (attached.length >= 40) content = attached;
  else if (wantsMail && !wantsReply) content = lastText(history, "user");
  else if (wantsReply && !wantsMail) content = lastText(history, "ai");
  else {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const text = history[index]?.text.trim() || "";
      if (text.length >= 40 && !(history[index]?.sender === "user" && asksToSaveOutput(text))) {
        content = text;
        break;
      }
    }
  }

  if (content.length < 20) return { empty: true };
  return { title: noteTitle(content), content };
}
