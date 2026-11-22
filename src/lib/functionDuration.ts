export const CHAT_MAX_DURATION = 300;
export const AI_MAX_DURATION = 60;
export const MODEL_WAIT_MS = 110_000;
export const SEARCH_WAIT_MS = 20_000;
export const SHORT_WAIT_MS = 25_000;

export const LATE_ANSWER =
  "Svaret tog for lang tid og blev afbrudt. Prøv igen. Et kortere spørgsmål kommer hurtigere frem.";

export function wait(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export function gaveUp(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    name === "APIUserAbortError" ||
    message.includes("timeout") ||
    message.includes("aborted")
  );
}
