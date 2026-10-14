export type StoredSource = {
  id: string;
  title: string;
  citation: string;
  lawSection: string;
  date: string;
  textSnippet: string;
  pdfUrl: string;
  pdfFileName: string;
  hasOriginal?: boolean;
  relevanceScore: number;
};

export type StoredMessage = {
  id: string;
  sender: "user" | "ai";
  timestamp: string;
  text: string;
  warning?: string;
  sources?: StoredSource[];
  modelUsed?: string;
};

export type StoredDocument = {
  id: string;
  name: string;
  included: boolean;
};

export type StoredNote = {
  id: string;
  title: string;
  caseType: string;
  date: string;
  content: string;
  format: "docx" | "pdf";
  included: boolean;
};

export type CaseRoom = {
  messages: StoredMessage[];
  primaryFile: StoredDocument | null;
  supplementaryFiles: StoredDocument[];
  notes: StoredNote[];
  themes: string[];
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function source(value: unknown): StoredSource | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id, 80);
  const title = text(row.title, 180);
  if (!id || !title) return null;
  const score = Number(row.relevanceScore);
  return {
    id,
    title,
    citation: text(row.citation, 180),
    lawSection: text(row.lawSection, 120),
    date: text(row.date, 40),
    textSnippet: text(row.textSnippet, 2000),
    pdfUrl: text(row.pdfUrl, 300),
    pdfFileName: text(row.pdfFileName, 180),
    hasOriginal: row.hasOriginal === true,
    relevanceScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
  };
}

function message(value: unknown): StoredMessage | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id, 80);
  const body = typeof row.text === "string" ? row.text.slice(0, 8000) : "";
  if (!id || (row.sender !== "user" && row.sender !== "ai")) return null;
  const sources = Array.isArray(row.sources)
    ? row.sources.map(source).filter((item): item is StoredSource => item !== null).slice(0, 8)
    : undefined;
  return {
    id,
    sender: row.sender,
    timestamp: text(row.timestamp, 20),
    text: body,
    warning: text(row.warning, 500) || undefined,
    sources,
    modelUsed: text(row.modelUsed, 40) || undefined,
  };
}

function document(value: unknown): StoredDocument | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name = text(row.name, 180);
  if (!name) return null;
  return {
    id: text(row.id, 80) || `dok-${name.slice(0, 24)}`,
    name,
    included: row.included !== false,
  };
}

function note(value: unknown): StoredNote | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id, 80);
  const content = typeof row.content === "string" ? row.content.slice(0, 8000) : "";
  if (!id || !content) return null;
  return {
    id,
    title: text(row.title, 120) || "Output",
    caseType: text(row.caseType, 80),
    date: text(row.date, 20),
    content,
    format: row.format === "pdf" ? "pdf" : "docx",
    included: row.included === true,
  };
}

export function sanitizeCaseRoom(value: unknown): CaseRoom | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const messages = Array.isArray(row.messages)
    ? row.messages.map(message).filter((item): item is StoredMessage => item !== null).slice(-40)
    : [];
  if (!messages.length) return null;
  const themes = Array.isArray(row.themes)
    ? row.themes.map((theme) => text(theme, 40)).filter((theme) => /^[a-z0-9_]+$/.test(theme)).slice(0, 3)
    : [];
  return {
    messages,
    primaryFile: document(row.primaryFile),
    supplementaryFiles: Array.isArray(row.supplementaryFiles)
      ? row.supplementaryFiles.map(document).filter((item): item is StoredDocument => item !== null).slice(0, 20)
      : [],
    notes: Array.isArray(row.notes)
      ? row.notes.map(note).filter((item): item is StoredNote => item !== null).slice(0, 20)
      : [],
    themes,
  };
}

export function parseCaseRoom(raw: string | null | undefined): CaseRoom | null {
  if (!raw || !raw.startsWith("{")) return null;
  try {
    return sanitizeCaseRoom(JSON.parse(raw));
  } catch {
    return null;
  }
}
