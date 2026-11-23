"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AnswerBody } from "@/components/AnswerBody";
import { loadCaseFile, saveCaseFile } from "@/lib/caseFileStore";
import { prepareRoomSave, type CaseRoom } from "@/lib/caseRoom";
import { isPlaceholderTitle } from "@/lib/caseTitles";
import { downloadNote } from "@/lib/noteDownload";
import { asksToCreateOutput, createdOutputTitle, isOutputSaveOnly, outputDraft, resumeText } from "@/lib/outputSave";
import { sourceFileTitle } from "@/lib/sourceSummary";
import { buildQuestion } from "@/lib/promptSupport";
import { INITIAL_CASES } from "@/lib/casesData";
import { THEME_CATEGORIES, THEME_FOLDERS } from "@/lib/themeFolders";
import {
  Folder,
  Upload,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  ArrowUp,
  Square,
  BookOpen,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  FileCode,
  ThumbsUp,
  ThumbsDown,
  ClipboardList,
  WandSparkles,
} from "lucide-react";

type ScopeType = "projekt" | "plan";

interface ThemeFolder {
  id: string;
  category: string;
  name: string;
  description: string;
  count: number;
}

interface SourceSnippet {
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
  sourceType?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  timestamp: string;
  text: string;
  warning?: string;
  sources?: SourceSnippet[];
  modelUsed?: string;
  placedInOutput?: boolean;
}

interface GeneratedNote {
  id: string;
  title: string;
  caseType: string;
  date: string;
  content: string;
  format: "docx" | "pdf";
  included: boolean;
}

const AVAILABLE_THEMES: ThemeFolder[] = THEME_FOLDERS.map((folder) => ({
  ...folder,
  count: 0,
}));

function SourceHoverBox({
  top,
  left,
  height,
  name,
  primary,
  onTogglePrimary,
  onView,
  onMouseEnter,
  onMouseLeave,
}: {
  top: number;
  left: number;
  height: number;
  name: string;
  primary: boolean;
  onTogglePrimary: (primary: boolean) => void;
  onView: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return createPortal(
    <div
      data-upload-hover
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ top, left, height }}
      className={`fixed z-[81] flex origin-left items-center gap-2 rounded-r-md border border-l-0 border-[#0F382C] bg-white pl-2.5 pr-1.5 shadow-md transition duration-150 ease-out ${
        shown ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
      }`}
    >
      <span className="text-[11px] font-semibold text-[#0F382C]">Primær</span>
      <input
        type="checkbox"
        checked={primary}
        data-primary-toggle
        aria-label={`Markér ${name} som primær kilde`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onTogglePrimary(event.target.checked)}
        className="rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
      />
      <button
        type="button"
        data-upload-view
        aria-label={`Vis ${name} i kildeupload`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onView();
        }}
        className="rounded px-1.5 py-1 text-[11px] font-semibold text-[#0F382C] hover:bg-emerald-50"
      >
        Vis
      </button>
    </div>,
    document.body
  );
}

function UploadedSourceRow({
  fileId,
  name,
  included,
  primary,
  onToggle,
  onTogglePrimary,
  onView,
}: {
  fileId: string;
  name: string;
  included: boolean;
  primary: boolean;
  onToggle: () => void;
  onTogglePrimary: (primary: boolean) => void;
  onView: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [hover, setHover] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; height: number } | null>(null);

  const place = () => {
    const row = rowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    setBox({ top: rect.top, left: rect.right - 1, height: rect.height });
  };

  useLayoutEffect(() => {
    if (!hover) return;
    place();
  }, [hover, primary, name]);

  useEffect(() => {
    if (!hover) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [hover]);

  const keepOpen = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setHover(true);
  };

  const scheduleClose = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHover(false), 180);
  };

  return (
    <>
      <div
        ref={rowRef}
        data-case-file={fileId}
        data-primary={primary ? "true" : "false"}
        onClick={onToggle}
        onMouseEnter={keepOpen}
        onMouseLeave={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Element && next.closest("[data-upload-hover]")) return;
          scheduleClose();
        }}
        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-all ${
          included
            ? "border-emerald-600/40 bg-white text-slate-900 shadow-2xs"
            : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
        }`}
      >
        <input
          type="checkbox"
          checked={included}
          onClick={(event) => event.stopPropagation()}
          onChange={onToggle}
          aria-label={`Brug ${name} som kilde i næste spørgsmål`}
          title="Brug som kilde i næste spørgsmål"
          className="mt-0.5 rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
        />
        <span className={`min-w-0 flex-1 truncate font-semibold ${included ? "text-[#0F382C]" : "text-slate-700"}`}>
          {name}
        </span>
      </div>
      {hover && box && (
        <SourceHoverBox
          top={box.top}
          left={box.left}
          height={box.height}
          name={name}
          primary={primary}
          onTogglePrimary={onTogglePrimary}
          onView={onView}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
}

type CaseDocument = {
  id: string;
  name: string;
  included: boolean;
  text?: string;
  reading?: boolean;
};

function newCaseDocument(name: string): CaseDocument {
  return {
    id: `dok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    included: true,
    text: "",
  };
}

function uploadedPreview(file: CaseDocument, storedText?: string): string {
  const text = (storedText || file.text || "").trim();
  if (text) return text;
  return file.reading ? "Dokumentet læses endnu." : "Der er ingen læsbar tekst i dokumentet.";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");
  element.href = url;
  element.download = fileName;
  document.body.appendChild(element);
  element.click();
  element.remove();
  URL.revokeObjectURL(url);
}

async function readDocument(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/read-document", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  return typeof data.text === "string" ? data.text : "";
}

function isStoredCaseId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function touchStoredCase(id: string): void {
  if (!isStoredCaseId(id)) return;
  void fetch(`/api/cases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ touch: true }),
    keepalive: true,
  }).catch(() => undefined);
}

const WELCOME_TEXT =
  "Under Kildeupload til venstre lægger du kilderne. Hold musen over en kilde for at markere den som primær. Under Temamapper vælger du de relevante fagområder. Stil dine spørgsmål i feltet nedenfor. Til højre finder du kildehenvisninger og de output du selv producerer.";

function welcomeMessage(): ChatMessage {
  return {
    id: "welcome-1",
    sender: "ai",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    text: WELCOME_TEXT,
  };
}

export function CaseWorkspace({
  forcedCaseId,
  forcedScope,
  forcedTitle,
  forcedCaseNumber,
  forcedRoom,
}: {
  forcedCaseId?: string;
  forcedScope?: ScopeType;
  forcedTitle?: string;
  forcedCaseNumber?: string;
  forcedRoom?: CaseRoom | null;
}) {
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = forcedCaseId || (params?.id as string) || "sag-biogas-2026";
  const draftCase = caseId === "ny";
  const activeCaseIdRef = useRef(caseId);
  const existingCase = INITIAL_CASES.find((c) => c.id === caseId);

  // Scope: derive from URL query ?scope=plan or existing case or fallback
  const queryScope = searchParams?.get("scope") as ScopeType | null;
  const scope: ScopeType =
    forcedScope ||
    queryScope ||
    existingCase?.scope ||
    (caseId.includes("plan") ? "plan" : "projekt");

  const initialTitle =
    forcedTitle ||
    existingCase?.title ||
    (draftCase ? "Ny sag" : scope === "plan" ? "mv plan 01" : "mv projekt 01");
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const savedTitle = useRef(initialTitle);
  const skipTitleSave = useRef(false);
  const titledFromQuestion = useRef(isStoredCaseId(caseId) && !isPlaceholderTitle(initialTitle));
  const caseTitle = titleDraft;

  const saveTitle = async () => {
    if (skipTitleSave.current) {
      skipTitleSave.current = false;
      return;
    }
    const next = titleDraft.trim().replace(/\s+/g, " ");
    if (!next) {
      setTitleDraft(savedTitle.current);
      return;
    }
    if (next === savedTitle.current) {
      setTitleDraft(next);
      return;
    }
    const previous = savedTitle.current;
    setTitleDraft(next);
    if (!isStoredCaseId(activeCaseIdRef.current)) {
      savedTitle.current = next;
      return;
    }
    const res = await fetch(`/api/cases/${activeCaseIdRef.current}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.case?.title) {
      savedTitle.current = previous;
      setTitleDraft(previous);
      return;
    }
    savedTitle.current = data.case.title;
    setTitleDraft(data.case.title);
    titledFromQuestion.current = true;
  };

  const initialCaseNumber =
    forcedCaseNumber ||
    existingCase?.caseNumber ||
    `2026-${scope === "plan" ? "PLAN" : "VVM"}-${caseId.slice(-4)}`;
  const [caseNumber, setCaseNumber] = useState(initialCaseNumber);
  const caseNumberRef = useRef(initialCaseNumber);

  // Temamapper starter altid slukkede, også når man vender tilbage til sagen.
  const restored = forcedRoom && forcedRoom.messages.length > 0 ? forcedRoom : null;
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  useEffect(() => {
    setSelectedThemes([]);
  }, [caseId]);

  // Uploaded files: empty until the user picks a file in this case
  const isNewCase = draftCase || caseId.startsWith("ny-");
  const [primaryFile, setPrimaryFile] = useState<CaseDocument | null>(
    restored?.primaryFile ??
      (!isNewCase && existingCase?.primaryDocument
        ? { id: "primary-existing", name: existingCase.primaryDocument, included: true }
        : null)
  );
  const [supplementaryFiles, setSupplementaryFiles] = useState<CaseDocument[]>(
    restored?.supplementaryFiles ?? []
  );
  const filesRef = useRef({ primary: primaryFile, secondary: supplementaryFiles });
  filesRef.current = { primary: primaryFile, secondary: supplementaryFiles };
  const bootDocuments = useRef<{ primary: CaseDocument | null; secondary: CaseDocument[] } | null>(null);
  if (!bootDocuments.current) {
    bootDocuments.current = { primary: primaryFile, secondary: supplementaryFiles };
  }
  const fileTextRef = useRef<Map<string, string>>(new Map());
  const fileBytesRef = useRef(new Map<string, File>());
  const pendingReads = useRef<Map<string, Promise<void>>>(new Map());
  if (primaryFile?.text) fileTextRef.current.set(primaryFile.id, primaryFile.text);
  for (const file of supplementaryFiles) {
    if (file.text) fileTextRef.current.set(file.id, file.text);
  }
  // Left panel: kildeupload vs. temamapper. Right panel: kildeviser vs. output.
  const [leftPanelTab, setLeftPanelTab] = useState<"kilder" | "temaer">("kilder");
  const [openUploadId, setOpenUploadId] = useState<string | null>(null);
  const [uploadDownloadError, setUploadDownloadError] = useState("");
  const [rightPanelTab, setRightPanelTab] = useState<"kilde" | "notater">("kilde");

  // Active source in right preview panel
  const [activeSnippet, setActiveSnippet] = useState<SourceSnippet | null>(null);
  const [sourceSummary, setSourceSummary] = useState("");
  const [summaryPending, setSummaryPending] = useState(false);
  const summaryCache = useRef(new Map<string, string>());
  const [downloadingOriginal, setDownloadingOriginal] = useState(false);
  const [originalError, setOriginalError] = useState("");

  // Copy status per message ID
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedbackVote, setFeedbackVote] = useState<Record<string, "up" | "down">>({});
  const [feedbackOpenId, setFeedbackOpenId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackState, setFeedbackState] = useState<Record<string, "sending" | "sent" | "error">>({});

  // Loading state for LLM analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const answerRun = useRef(0);
  const answerAbort = useRef<AbortController | null>(null);
  const pendingQuestion = useRef<{ id: string; text: string } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Chat message state: starter altid helt rent med en velkomsthilsen
  const [messages, setMessages] = useState<ChatMessage[]>(restored?.messages ?? [welcomeMessage()]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    const pinToLatest = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    pinToLatest();
    const frame = requestAnimationFrame(pinToLatest);
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  // Generated long-form notes / outputs in studio
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNote[]>(restored?.notes ?? []);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const lastSavedRoom = useRef<string | null>(null);
  const skipFirstRoomSave = useRef(Boolean(restored));
  const [storedCaseTick, setStoredCaseTick] = useState(0);

  const [inputPrompt, setInputPrompt] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTopic, setBuilderTopic] = useState("");
  const [builderPurpose, setBuilderPurpose] = useState("");
  const [builderProblem, setBuilderProblem] = useState("");
  const [enhancing, setEnhancing] = useState(false);

  const roomStateRef = useRef({ messages, primaryFile, supplementaryFiles, notes: generatedNotes });
  roomStateRef.current = { messages, primaryFile, supplementaryFiles, notes: generatedNotes };

  const sendRoom = (keepalive: boolean) => {
    const id = activeCaseIdRef.current;
    if (!isStoredCaseId(id)) return;
    const prepared = prepareRoomSave({ ...roomStateRef.current, themes: [] });
    if (!prepared || prepared.canonical === lastSavedRoom.current) return;
    const sent = prepared.canonical;
    void fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: JSON.parse(prepared.stamped) as CaseRoom,
        primaryDocument: roomStateRef.current.primaryFile?.name ?? null,
      }),
      keepalive,
    })
      .then((res) => {
        if (!res.ok) return;
        const latest = prepareRoomSave({ ...roomStateRef.current, themes: [] });
        if (latest?.canonical === sent) lastSavedRoom.current = sent;
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    if (skipFirstRoomSave.current && isStoredCaseId(activeCaseIdRef.current)) {
      const prepared = prepareRoomSave({ ...roomStateRef.current, themes: [] });
      if (prepared) lastSavedRoom.current = prepared.canonical;
      skipFirstRoomSave.current = false;
      return;
    }
    sendRoom(true);
  }, [messages, primaryFile, supplementaryFiles, generatedNotes, storedCaseTick]);

  useEffect(() => {
    const flush = () => sendRoom(true);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      sendRoom(true);
    };
  }, []);

  const handleToggleTheme = (themeId: string) => {
    if (selectedThemes.includes(themeId)) {
      setSelectedThemes(selectedThemes.filter((t) => t !== themeId));
      return;
    }
    if (selectedThemes.length >= 3) return;
    setSelectedThemes([...selectedThemes, themeId]);
  };

  const rememberCase = (id: string, title: string, number?: string) => {
    activeCaseIdRef.current = id;
    savedTitle.current = title;
    setTitleDraft(title);
    titledFromQuestion.current = true;
    if (number) {
      caseNumberRef.current = number;
      setCaseNumber(number);
    }
    setStoredCaseTick((tick) => tick + 1);
  };

  const namingTask = useRef<Promise<string | null> | null>(null);

  const documentsForTitle = () =>
    [filesRef.current.primary, ...filesRef.current.secondary]
      .filter((file): file is CaseDocument => Boolean(file))
      .map((file) => ({
        name: file.name,
        text: (fileTextRef.current.get(file.id) || file.text || "").slice(0, 6000),
      }))
      .filter((file) => file.text.trim());

  const proposeCaseTitle = (question?: string) => {
    if (!isPlaceholderTitle(savedTitle.current)) return Promise.resolve(null);
    if (namingTask.current) return namingTask.current;
    const documents = documentsForTitle();
    if (!documents.length && !question?.trim()) return Promise.resolve(null);
    const task = fetch("/api/case-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents, scope, question: question || "" }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        return typeof data.title === "string" && data.title.trim() ? data.title.trim() : null;
      })
      .catch(() => null)
      .finally(() => {
        namingTask.current = null;
      });
    namingTask.current = task;
    return task;
  };

  const applyCaseTitle = async (title: string) => {
    if (!title || !isPlaceholderTitle(savedTitle.current)) return;
    const id = activeCaseIdRef.current;
    if (!isStoredCaseId(id)) {
      savedTitle.current = title;
      setTitleDraft(title);
      return;
    }
    const res = await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.case?.title) return;
    savedTitle.current = data.case.title;
    setTitleDraft(data.case.title);
    titledFromQuestion.current = true;
  };

  const nameFromDocuments = () => {
    void proposeCaseTitle().then((title) => {
      if (title) void applyCaseTitle(title);
    });
  };

  const ensureSavedCase = async (question: string) => {
    const currentId = activeCaseIdRef.current;
    await Promise.all([...pendingReads.current.values()]);
    const proposed = isPlaceholderTitle(savedTitle.current) ? await proposeCaseTitle(question) : null;
    const title = proposed && !isPlaceholderTitle(proposed) ? proposed : null;

    if (!isStoredCaseId(currentId)) {
      if (currentId !== "ny") return;
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, question, title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.case?.id) {
        throw new Error(data.error || "Sagen kunne ikke gemmes.");
      }
      rememberCase(data.case.id, data.case.title, data.case.caseNumber);
      window.history.replaceState(null, "", `/sag/${data.case.id}?scope=${scope}`);
      return;
    }

    if (!titledFromQuestion.current && isPlaceholderTitle(savedTitle.current)) {
      const res = await fetch(`/api/cases/${currentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(title ? { title } : { question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.case?.title) {
        throw new Error(data.error || "Titlen kunne ikke gemmes.");
      }
      rememberCase(currentId, data.case.title, data.case.caseNumber);
    }
  };

  const storeOutput = (title: string, content: string) => {
    const noteId = `note-${Date.now()}`;
    setGeneratedNotes((prev) => [
      {
        id: noteId,
        title: title.slice(0, 120),
        caseType:
          scope === "plan"
            ? "Miljøvurdering af plan (afsnit II, §§ 8–14)"
            : "Konkret projekt (afsnit III, §§ 15–25)",
        date: new Date().toLocaleString("da-DK", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        format: "docx",
        content,
        included: false,
      },
      ...prev,
    ]);
    setRightPanelTab("notater");
  };

  const stopThinking = () => {
    const pending = pendingQuestion.current;
    answerRun.current += 1;
    answerAbort.current?.abort();
    answerAbort.current = null;
    pendingQuestion.current = null;
    if (pending) {
      setMessages((prev) => prev.filter((msg) => msg.id !== pending.id));
      setInputPrompt((current) => (current.trim() ? current : pending.text));
    }
    setIsAnalyzing(false);
    promptRef.current?.focus();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isAnalyzing) return;

    const userText = inputPrompt;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: userText,
    };
    const run = ++answerRun.current;
    const controller = new AbortController();
    answerAbort.current = controller;
    pendingQuestion.current = { id: userMsg.id, text: userText };
    const stillGoing = () => run === answerRun.current && !controller.signal.aborted;

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsAnalyzing(true);

    const draft = outputDraft(
      userText,
      messages.map((item) => ({ sender: item.sender, text: item.text }))
    );
    const saveOnly = Boolean(draft && isOutputSaveOnly(userText));
    const createOutput = asksToCreateOutput(userText);
    if (draft && "content" in draft) {
      storeOutput(draft.title, draft.content);
    }
    if (saveOnly && draft) {
      pendingQuestion.current = null;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: "content" in draft ? "Lagt i output." : "Der er ingen tidligere tekst at lægge i output.",
        },
      ]);
      setIsAnalyzing(false);
    }

    try {
      await ensureSavedCase(userText);
    } catch (err) {
      if (saveOnly || !stillGoing()) return;
      pendingQuestion.current = null;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: err instanceof Error ? err.message : "Sagen kunne ikke gemmes.",
        },
      ]);
      setIsAnalyzing(false);
      return;
    }

    if (!stillGoing()) return;
    void touchStoredCase(activeCaseIdRef.current);
    await Promise.all([...pendingReads.current.values()]);

    if (!stillGoing() || saveOnly) return;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: userText,
          scope,
          themes: selectedThemes,
          caseTitle: savedTitle.current,
          caseNumber: caseNumberRef.current,
          primaryFile: filesRef.current.primary?.included
            ? {
                name: filesRef.current.primary.name,
                text: fileTextRef.current.get(filesRef.current.primary.id) || filesRef.current.primary.text || "",
              }
            : null,
          supplementaryFiles: filesRef.current.secondary
            .filter((file) => file.included)
            .map((file) => ({
              name: file.name,
              text: fileTextRef.current.get(file.id) || file.text || "",
            })),
          history: messages.slice(-20).map((m) => ({ sender: m.sender, text: m.text })),
          output: generatedNotes
            .filter((note) => note.included)
            .map((note) => ({
              id: note.id,
              title: note.title,
              content: note.content,
              date: note.date,
            })),
        }),
      });

      if (!stillGoing()) return;
      if (!res.ok) {
        throw new Error("Fejl fra analyse-API");
      }

      const data = await res.json();
      if (!stillGoing()) return;
      const rawReply = typeof data.text === "string" ? data.text.trim() : "";
      const reply = createOutput ? resumeText(rawReply) : rawReply;
      const usableReply =
        data.isLiveLLM === true &&
        reply.length >= 20 &&
        !/^(?:Jeg kan ikke gemme|Der er på nuværende tidspunkt ikke uploadet|Lagt i output|Sagen kunne ikke|Fejl fra)/.test(reply);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: reply,
        warning: data.warning,
        sources: data.sources || [],
        modelUsed: data.modelUsed,
        placedInOutput: createOutput && usableReply,
      };

      pendingQuestion.current = null;
      setMessages((prev) => [...prev, aiMsg]);
      if (aiMsg.placedInOutput) {
        storeOutput(createdOutputTitle(userText), reply);
      }
    } catch (err) {
      if (!stillGoing() || (err instanceof Error && err.name === "AbortError")) return;
      pendingQuestion.current = null;
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter eller sagsakter i databasen for ${
          scope === "plan" ? "Plan / program (afsnit II, §§ 8–14)" : "Konkret projekt (afsnit III, §§ 15–25)"
        }.\n\nNår du uploader et sagsdokument eller tilføjer afgørelser til temamapperne, analyseres spørgsmålet med kildehenvisninger.`,
        sources: [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      if (run === answerRun.current) {
        answerAbort.current = null;
        pendingQuestion.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const insertBuiltQuestion = () => {
    const next = buildQuestion(builderTopic, builderPurpose, builderProblem);
    if (next) setInputPrompt(next);
    setBuilderOpen(false);
  };

  const handleEnhanceQuestion = async () => {
    const current = inputPrompt.trim();
    if (!current || enhancing || isAnalyzing) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: current }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.question === "string" && data.question.trim()) {
        setInputPrompt(data.question.trim());
      }
    } catch {
      setInputPrompt(current);
    } finally {
      setEnhancing(false);
    }
  };

  const rememberDocumentText = (id: string, file: File, apply: (text: string) => void) => {
    const task = readDocument(file)
      .then((text) => {
        fileTextRef.current.set(id, text);
        apply(text);
      })
      .catch(() => {
        fileTextRef.current.set(id, "");
        apply("");
      })
      .finally(() => {
        pendingReads.current.delete(id);
      });
    pendingReads.current.set(id, task);
  };

  const readIntoDocument = (id: string, file: File) => {
    fileBytesRef.current.set(id, file);
    void saveCaseFile(id, file).catch(() => undefined);
    const markReading = (reading: boolean, text?: string) => {
      const update = (item: CaseDocument) =>
        item.id === id ? { ...item, name: file.name, reading, text: text ?? item.text } : item;
      setPrimaryFile((current) => (current ? update(current) : current));
      setSupplementaryFiles((current) => current.map(update));
    };
    markReading(true, "");
    rememberDocumentText(id, file, (text) => {
      markReading(false, text);
      nameFromDocuments();
    });
  };

  const handleSourcesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    let nextPrimary = filesRef.current.primary;
    const next = [...filesRef.current.secondary];
    const placed: { id: string; file: File }[] = [];
    for (const file of files) {
      if (nextPrimary && nextPrimary.name === file.name && !nextPrimary.text) {
        nextPrimary = { ...nextPrimary, name: file.name, text: "", reading: true };
        placed.push({ id: nextPrimary.id, file });
        continue;
      }
      const index = next.findIndex((item) => item.name === file.name && !item.text);
      if (index >= 0) {
        const id = next[index].id;
        next[index] = { ...next[index], name: file.name, text: "", reading: true };
        placed.push({ id, file });
      } else {
        const document = { ...newCaseDocument(file.name), reading: true };
        next.push(document);
        placed.push({ id: document.id, file });
      }
    }
    setPrimaryFile(nextPrimary);
    setSupplementaryFiles(next);
    for (const item of placed) readIntoDocument(item.id, item.file);
  };

  useEffect(() => {
    let cancel = false;
    const boot = bootDocuments.current;
    if (!boot) return;
    const missing = [
      ...(boot.primary && !boot.primary.text ? [boot.primary.id] : []),
      ...boot.secondary.filter((file) => !file.text).map((file) => file.id),
    ];
    for (const id of missing) {
      void loadCaseFile(id).then((file) => {
        if (cancel || !file) return;
        readIntoDocument(id, file);
      });
    }
    return () => {
      cancel = true;
    };
    // Kun ved åbning af sagen. Senere uploads gemmer selv teksten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const toggleUploadedFile = (id: string) => {
    if (filesRef.current.primary?.id === id) {
      setPrimaryFile((current) => (current ? { ...current, included: !current.included } : current));
      return;
    }
    setSupplementaryFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, included: !file.included } : file))
    );
  };

  const setSourcePrimary = (id: string, primary: boolean) => {
    const currentPrimary = filesRef.current.primary;
    const secondary = filesRef.current.secondary;
    if (primary) {
      if (currentPrimary?.id === id) return;
      const chosen = secondary.find((file) => file.id === id);
      if (!chosen) return;
      setPrimaryFile(chosen);
      setSupplementaryFiles([
        ...(currentPrimary ? [currentPrimary] : []),
        ...secondary.filter((file) => file.id !== id),
      ]);
      return;
    }
    if (currentPrimary?.id !== id) return;
    setPrimaryFile(null);
    setSupplementaryFiles([currentPrimary, ...secondary]);
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const openUploadedSource = (id: string) => {
    setUploadDownloadError("");
    setOpenUploadId(id);
    setLeftPanelTab("kilder");
  };

  const downloadUploadedFile = async (file: CaseDocument) => {
    setUploadDownloadError("");
    try {
      const stored = fileBytesRef.current.get(file.id) || (await loadCaseFile(file.id));
      if (!stored) {
        setUploadDownloadError("Filen kunne ikke hentes.");
        return;
      }
      downloadBlob(stored, stored.name || file.name);
    } catch {
      setUploadDownloadError("Filen kunne ikke hentes.");
    }
  };

  useEffect(() => {
    setActiveSnippet((current) => {
      if (!current || current.sourceType !== "sagsdokument") return current;
      const file =
        primaryFile?.id === current.id
          ? primaryFile
          : supplementaryFiles.find((item) => item.id === current.id);
      if (!file) return current;
      const next = uploadedPreview(file, fileTextRef.current.get(file.id));
      if (next === current.textSnippet && file.name === current.title) return current;
      return { ...current, title: file.name, pdfFileName: file.name, textSnippet: next };
    });
  }, [primaryFile, supplementaryFiles]);

  useEffect(() => {
    if (!activeSnippet) {
      setSourceSummary("");
      setSummaryPending(false);
      return;
    }
    const text = activeSnippet.textSnippet.trim();
    const readable =
      text &&
      text !== "Dokumentet læses endnu." &&
      text !== "Der er ingen læsbar tekst i dokumentet.";
    if (!readable) {
      setSourceSummary("");
      setSummaryPending(text === "Dokumentet læses endnu.");
      return;
    }
    const key = `${activeSnippet.id}:${text.length}:${text.slice(0, 80)}`;
    const cached = summaryCache.current.get(key);
    if (cached) {
      setSourceSummary(cached);
      setSummaryPending(false);
      return;
    }
    let cancel = false;
    setSourceSummary("");
    setSummaryPending(true);
    void fetch("/api/source-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: sourceFileTitle(activeSnippet),
        text: text.slice(0, 12000),
      }),
    })
      .then((res) => res.json())
      .then((data: { summary?: unknown }) => {
        if (cancel) return;
        const summary = typeof data.summary === "string" ? data.summary.trim() : "";
        if (summary) summaryCache.current.set(key, summary);
        setSourceSummary(summary);
      })
      .catch(() => {
        if (!cancel) setSourceSummary("");
      })
      .finally(() => {
        if (!cancel) setSummaryPending(false);
      });
    return () => {
      cancel = true;
    };
  }, [activeSnippet]);

  const handleDownloadOriginal = async (source: SourceSnippet) => {
    if (!source.hasOriginal || downloadingOriginal) return;
    setOriginalError("");
    setDownloadingOriginal(true);
    try {
      if (source.sourceType === "sagsdokument") {
        const file = fileBytesRef.current.get(source.id) || (await loadCaseFile(source.id));
        if (!file) {
          setOriginalError("Originalen kunne ikke hentes.");
          return;
        }
        downloadBlob(file, file.name || source.pdfFileName || source.title);
        return;
      }
      const res = await fetch(`/api/sources/${source.id}/original`);
      if (!res.ok) {
        setOriginalError("Originalen kunne ikke hentes.");
        return;
      }
      const blob = await res.blob();
      const header = res.headers.get("Content-Disposition") || "";
      const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plain = header.match(/filename="([^"]+)"/i)?.[1];
      const fileName = encoded ? decodeURIComponent(encoded) : plain || source.pdfFileName || "kilde.pdf";
      downloadBlob(blob, fileName);
    } catch {
      setOriginalError("Originalen kunne ikke hentes.");
    } finally {
      setDownloadingOriginal(false);
    }
  };

  const chooseFeedback = (msgId: string, vote: "up" | "down") => {
    if (feedbackState[msgId] === "sent" || feedbackState[msgId] === "sending") return;
    setFeedbackVote((prev) => ({ ...prev, [msgId]: vote }));
    if (feedbackOpenId !== msgId) setFeedbackNote("");
    setFeedbackOpenId(msgId);
  };

  const sendFeedback = async (msg: ChatMessage) => {
    const vote = feedbackVote[msg.id];
    if (!vote || feedbackState[msg.id] === "sending") return;
    const index = messages.findIndex((item) => item.id === msg.id);
    let question = "";
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i]?.sender === "user") {
        question = messages[i].text;
        break;
      }
    }
    setFeedbackState((prev) => ({ ...prev, [msg.id]: "sending" }));
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vote,
          comment: feedbackNote,
          question,
          answer: msg.text,
          themes: selectedThemes.map((id) => AVAILABLE_THEMES.find((theme) => theme.id === id)?.name || id),
          sources: (msg.sources || []).map((source) => ({
            title: source.title,
            citation: source.citation,
            relevance: `${Math.round(source.relevanceScore)}%`,
          })),
        }),
      });
      if (!res.ok) throw new Error("Feedbacken kunne ikke sendes.");
      setFeedbackState((prev) => ({ ...prev, [msg.id]: "sent" }));
      setFeedbackOpenId(null);
    } catch {
      setFeedbackState((prev) => ({ ...prev, [msg.id]: "error" }));
    }
  };

  useEffect(() => {
    if (!downloadMenuId) return;
    const close = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-output-download-root]")) return;
      setDownloadMenuId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [downloadMenuId]);

  const openedUpload =
    (openUploadId && primaryFile?.id === openUploadId && primaryFile) ||
    supplementaryFiles.find((file) => file.id === openUploadId) ||
    null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7FAFA] text-slate-800">
      {/* Top Application Header - NotebookLM style */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 z-20">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Gå tilbage til sagsdashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dine sager</span>
          </a>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                scope === "plan"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : "bg-slate-100 text-slate-800 border-slate-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${scope === "plan" ? "bg-[#2E8B57]" : "bg-slate-600"}`} />
              <span>{scope === "plan" ? "Plan §§ 8–14" : "Projekt §§ 15–25"}</span>
            </span>

            <input
              aria-label="Sagens titel"
              value={titleDraft}
              maxLength={120}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  skipTitleSave.current = true;
                  setTitleDraft(savedTitle.current);
                  event.currentTarget.blur();
                }
              }}
              className="w-56 max-w-[42vw] rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs font-bold text-slate-900 outline-none hover:border-slate-200 focus:border-[#0F382C] focus:bg-white md:w-80"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/om"
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Om MVAI
          </Link>
        </div>
      </header>

      {/* Main 3-Panel Layout (NotebookLM) */}
      <div className="flex flex-1 overflow-hidden">
        {/* PANEL 1: VENSTRE SIDEBAR */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#F7FAFA]">
          <div className="flex shrink-0 border-b border-slate-200 bg-white">
            <button
              type="button"
              data-left-tab="kilder"
              onClick={() => setLeftPanelTab("kilder")}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                leftPanelTab === "kilder"
                  ? "border-[#0F382C] bg-[#F7FAFA] text-[#0F382C]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Kildeupload</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                {(primaryFile ? 1 : 0) + supplementaryFiles.length}
              </span>
            </button>
            <button
              type="button"
              data-left-tab="temaer"
              onClick={() => setLeftPanelTab("temaer")}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                leftPanelTab === "temaer"
                  ? "border-[#0F382C] bg-[#F7FAFA] text-[#0F382C]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>Temamapper</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                {selectedThemes.length}
              </span>
            </button>
          </div>

          <div className={`min-h-0 flex-1 ${openedUpload && leftPanelTab === "kilder" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
            {leftPanelTab === "kilder" && openedUpload ? (
              <div className="flex min-h-0 flex-1 flex-col" data-upload-reader={openedUpload.id}>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
                  <button
                    type="button"
                    data-upload-collapse
                    onClick={() => {
                      setUploadDownloadError("");
                      setOpenUploadId(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F382C] hover:underline"
                  >
                    <ChevronUp className="h-4 w-4 shrink-0" />
                    <span>Sammenklap</span>
                  </button>
                  <button
                    type="button"
                    data-upload-download
                    onClick={() => void downloadUploadedFile(openedUpload)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#0F382C] bg-white px-2 py-1 text-xs font-semibold text-[#0F382C] hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>Download</span>
                  </button>
                </div>
                {uploadDownloadError ? (
                  <p className="shrink-0 px-3 py-1.5 text-[10px] text-amber-800">{uploadDownloadError}</p>
                ) : null}
                <h2 className="shrink-0 break-words px-4 pt-4 text-sm font-bold leading-snug text-slate-900">
                  {openedUpload.name}
                </h2>
                <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-4 py-3 text-xs leading-relaxed text-slate-800">
                  {uploadedPreview(openedUpload, fileTextRef.current.get(openedUpload.id))}
                </div>
              </div>
            ) : leftPanelTab === "kilder" ? (
              <div className="space-y-3 p-4">
                <label
                  htmlFor="mvai-source-file"
                  data-upload="source"
                  className="relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-[#0F382C] bg-white px-3 py-2 text-xs font-bold text-[#0F382C] hover:bg-emerald-50"
                >
                  <Upload className="h-3.5 w-3.5 shrink-0 text-[#2E8B57]" />
                  <span>Upload kilde</span>
                  <input
                    id="mvai-source-file"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.odt,.txt,.rtf,application/pdf"
                    className="absolute h-px w-px overflow-hidden opacity-0"
                    onChange={handleSourcesSelected}
                  />
                </label>
                {primaryFile || supplementaryFiles.length > 0 ? (
                  <div className="space-y-2">
                    {[
                      ...(primaryFile ? [{ file: primaryFile, primary: true }] : []),
                      ...supplementaryFiles.map((file) => ({ file, primary: false })),
                    ].map(({ file, primary }) => (
                      <UploadedSourceRow
                        key={file.id}
                        fileId={file.id}
                        name={file.name}
                        included={file.included}
                        primary={primary}
                        onToggle={() => toggleUploadedFile(file.id)}
                        onTogglePrimary={(next) => setSourcePrimary(file.id, next)}
                        onView={() => openUploadedSource(file.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    Ingen kilder endnu.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Temamapper</span>
                    <span className="text-xs font-semibold text-slate-500">{selectedThemes.length}/3 aktive</span>
                  </div>
                  <p className="mb-3 text-[11px] text-slate-500">Aktivér de fagområder, sagen handler om.</p>
                  <div className="space-y-4">
                    {THEME_CATEGORIES.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{category.name}</p>
                        {AVAILABLE_THEMES.filter((theme) => theme.category === category.id).map((theme) => {
                          const isChecked = selectedThemes.includes(theme.id);
                          return (
                            <div
                              key={theme.id}
                              onClick={(event) => {
                                if ((event.target as HTMLElement).tagName === "INPUT") return;
                                handleToggleTheme(theme.id);
                              }}
                              data-theme={theme.id}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-all ${
                                isChecked
                                  ? "border-emerald-600/40 bg-white text-slate-900 shadow-2xs"
                                  : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() => handleToggleTheme(theme.id)}
                                className="rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
                              />
                              <span className={`font-semibold ${isChecked ? "text-[#0F382C]" : "text-slate-700"}`}>
                                {theme.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col justify-between overflow-hidden border-r border-slate-200 bg-white">
          {/* Chat Besvarelsesvindue */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.sender === "user" ? "ml-auto justify-end" : "mr-auto"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                  </div>
                )}

                <div
                  className={`rounded-xl p-4 text-sm leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-[#2A3B47] text-white max-w-xl"
                      : "bg-[#F7FAFA] border border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={msg.sender === "user" ? "text-slate-300 font-semibold" : "text-[#0F382C] font-bold"}>
                        {msg.sender === "user" ? "Du" : "MVAI Afgørelsesanalyse"}
                      </span>
                    </div>
                    <span className={msg.sender === "user" ? "text-slate-400" : "text-slate-400 font-mono"}>
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className="max-w-none text-current">
                    {msg.sender === "ai" ? (
                      <AnswerBody
                        text={msg.text}
                        sources={msg.sources}
                        activeId={rightPanelTab === "kilde" ? activeSnippet?.id : null}
                        onDownloadOriginal={msg.sources?.length ? handleDownloadOriginal : undefined}
                        onSelectSource={
                          msg.sources?.length
                            ? (src) => {
                                setActiveSnippet(src);
                                setSourceExpanded(false);
                                setOriginalError("");
                                setRightPanelTab("kilde");
                              }
                            : undefined
                        }
                      />
                    ) : (
                      <div className="whitespace-pre-line">{msg.text}</div>
                    )}
                  </div>

                  {/* Warning banner inside AI message */}
                  {msg.warning && (
                    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Retslig risikofaktor:</span>
                        <p className="mt-0.5 leading-normal">{msg.warning}</p>
                      </div>
                    </div>
                  )}

                  {msg.sender === "ai" && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#2E8B57]" />
                                <span className="text-[#2E8B57] font-semibold">Kopieret!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Kopier tekst</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label="Tommel op"
                            aria-pressed={feedbackVote[msg.id] === "up"}
                            onClick={() => chooseFeedback(msg.id, "up")}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white cursor-pointer ${
                              feedbackVote[msg.id] === "up"
                                ? "border-[#2E8B57] text-[#2E8B57]"
                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Tommel ned"
                            aria-pressed={feedbackVote[msg.id] === "down"}
                            onClick={() => chooseFeedback(msg.id, "down")}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white cursor-pointer ${
                              feedbackVote[msg.id] === "down"
                                ? "border-amber-600 text-amber-700"
                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {!msg.placedInOutput && (
                        <button
                          type="button"
                          onClick={() => {
                            const heading = msg.text.match(/^###\s+(.+)$/m)?.[1]?.replace(/^#+\s*/, "").trim() || "";
                            const line = msg.text
                              .split("\n")
                              .map((item) => item.replace(/^#+\s*/, "").trim())
                              .find((item) => item && !isPlaceholderTitle(item));
                            const noteTitle =
                              heading && !isPlaceholderTitle(heading)
                                ? heading
                                : !isPlaceholderTitle(savedTitle.current)
                                  ? savedTitle.current
                                  : line || "Sagsnotat";
                            const newNote: GeneratedNote = {
                              id: `note-${Date.now()}`,
                              title: noteTitle.slice(0, 120),
                              caseType: scope === "plan" ? "Miljøvurdering af plan (afsnit II, §§ 8–14)" : "Konkret projekt (afsnit III, §§ 15–25)",
                              date: new Date().toLocaleString("da-DK", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                              format: "docx",
                              content: msg.text,
                              included: false,
                            };
                            setGeneratedNotes((prev) => [newNote, ...prev]);
                            setRightPanelTab("notater");
                          }}
                          className="text-[11px] font-semibold text-[#2E8B57] hover:underline"
                        >
                          + Gem i output
                        </button>
                        )}
                      </div>
                      {feedbackOpenId === msg.id && feedbackState[msg.id] !== "sent" && (
                        <form
                          className="mt-2 rounded-lg border border-slate-200 bg-white p-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void sendFeedback(msg);
                          }}
                        >
                          <textarea
                            rows={2}
                            maxLength={200}
                            value={feedbackNote}
                            onChange={(event) => setFeedbackNote(event.target.value)}
                            placeholder="Kort bemærkning"
                            className="w-full resize-none rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                          />
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-amber-700">
                              {feedbackState[msg.id] === "error" ? "Feedbacken kunne ikke sendes." : ""}
                            </span>
                            <button
                              type="submit"
                              disabled={feedbackState[msg.id] === "sending"}
                              className="rounded bg-[#0F382C] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40 cursor-pointer"
                            >
                              {feedbackState[msg.id] === "sending" ? "Sender..." : "Send"}
                            </button>
                          </div>
                        </form>
                      )}
                      {feedbackState[msg.id] === "sent" && (
                        <p className="mt-2 text-[11px] font-medium text-[#2E8B57]">Tak. Bemærkningen er sendt.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                  <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
                </div>
                <div className="rounded-xl p-4 text-xs bg-[#F7FAFA] border border-slate-200 text-slate-600 flex items-center gap-3">
                  <span className="flex h-2 w-2 rounded-full bg-[#2E8B57] animate-pulse" />
                  <span>Arbejder...</span>
                  <button
                    type="button"
                    data-stop-answer
                    onClick={stopThinking}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="relative rounded-xl border border-slate-300 bg-white shadow-xs focus-within:border-[#0F382C] focus-within:ring-1 focus-within:ring-[#0F382C]">
                <textarea
                  ref={promptRef}
                  rows={3}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Tekstfelt"
                  className="w-full resize-none border-0 bg-transparent p-3 text-sm placeholder-slate-400 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 bg-slate-50/50 rounded-b-xl">
                  <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500">
                    <button
                      type="button"
                      data-prompt-builder
                      onClick={() => setBuilderOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-[#0F382C] hover:bg-emerald-50 cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Byg spørgsmål
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-prompt-enhance
                      aria-label="Forbedr spørgsmål"
                      disabled={!inputPrompt.trim() || enhancing || isAnalyzing}
                      onClick={() => void handleEnhanceQuestion()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-[#0F382C] hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <WandSparkles className={`w-3.5 h-3.5 ${enhancing ? "animate-spin" : ""}`} />
                    </button>
                    {isAnalyzing ? (
                      <button
                        type="button"
                        data-stop-answer
                        onClick={stopThinking}
                        title="Stop"
                        aria-label="Stop"
                        className="inline-flex items-center justify-center rounded-full bg-slate-900 p-2 text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <Square className="h-4 w-4 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputPrompt.trim()}
                        title="Send forespørgsel"
                        aria-label="Send forespørgsel"
                        className={`inline-flex items-center justify-center rounded-full p-2 transition-all cursor-pointer ${
                          inputPrompt.trim()
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <ArrowUp className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* PANEL 3: HØJRE PANEL (STUDIO / OUTPUT & KILDELÆSER MED FANER) */}
        <aside className="w-96 shrink-0 border-l border-slate-200 bg-[#F7FAFA] flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Faner i toppen: Kildelæser vs. Genererede notater / Outputs */}
            <div className="flex border-b border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setRightPanelTab("kilde")}
                className={`flex-1 py-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  rightPanelTab === "kilde"
                    ? "border-[#0F382C] text-[#0F382C] bg-[#F7FAFA]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kildeviser</span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab("notater")}
                className={`flex-1 py-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  rightPanelTab === "notater"
                    ? "border-[#0F382C] text-[#0F382C] bg-[#F7FAFA]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Output</span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  {generatedNotes.length}
                </span>
              </button>
            </div>

            {/* FANE 1: KILDELÆSER */}
            {rightPanelTab === "kilde" && (
              <div className="p-4">
                {activeSnippet ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                        {sourceFileTitle(activeSnippet)}
                      </h3>
                      {sourceSummary ? (
                        <p className="mt-3 text-sm leading-relaxed text-slate-700">{sourceSummary}</p>
                      ) : summaryPending ? (
                        <p className="mt-3 text-xs text-slate-400">Læser kilden...</p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Citat
                      </span>
                      <div className={`mt-2 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/60 p-3 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap ${sourceExpanded ? "" : "max-h-48 overflow-y-auto"}`}>
                        {activeSnippet.textSnippet}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSourceExpanded((open) => !open)}
                        className="mt-3 text-xs font-semibold text-[#0F382C] hover:underline cursor-pointer"
                      >
                        {sourceExpanded ? "Vis kun citatet" : "Vis i sammenhæng"}
                      </button>
                    </div>

                    {activeSnippet.hasOriginal && (
                      <button
                        type="button"
                        onClick={() => handleDownloadOriginal(activeSnippet)}
                        disabled={downloadingOriginal}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F382C] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#14493a] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {downloadingOriginal
                            ? "Henter..."
                            : activeSnippet.sourceType === "sagsdokument" &&
                                !/\.pdf$/i.test(activeSnippet.pdfFileName || activeSnippet.title)
                              ? "Hent original"
                              : "Hent original PDF"}
                        </span>
                      </button>
                    )}
                    {originalError && (
                      <p className="text-center text-[10px] text-amber-800">{originalError}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-12 text-center text-slate-400 p-6">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">
                      Hold musen over et kildetal i svaret, og tryk Åbn i Kildeviser.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FANE 2: GENEREREDE NOTATER / OUTPUTS */}
            {rightPanelTab === "notater" && (
              <div className="p-4">
                <div className="space-y-2">
                  {generatedNotes.length > 0 ? (
                    generatedNotes.map((note) => {
                      const open = openNoteId === note.id;
                      return (
                      <div
                        key={note.id}
                        data-output-note={note.id}
                        data-output-open={open ? "true" : "false"}
                        className={`rounded-lg border text-xs transition-all ${
                          open
                            ? "border-emerald-600/40 bg-white shadow-2xs text-slate-900"
                            : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <div
                          aria-expanded={open}
                          onClick={() => setOpenNoteId(open ? null : note.id)}
                          className="flex cursor-pointer items-center gap-2.5 p-2.5"
                        >
                          <input
                            type="checkbox"
                            checked={note.included}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                              setGeneratedNotes((prev) =>
                                prev.map((item) =>
                                  item.id === note.id ? { ...item, included: !item.included } : item
                                )
                              )
                            }
                            aria-label={`Brug ${note.title} som kilde i næste spørgsmål`}
                            className="rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
                          />
                          <span className={`min-w-0 flex-1 truncate font-semibold ${open ? "text-[#0F382C]" : "text-slate-700"}`}>
                            {note.title}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </div>
                        {open && (
                          <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                            <p className="text-[11px] text-slate-400">{note.date}</p>
                            <div className="mt-2">
                              <AnswerBody text={note.content} />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(note.content, note.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  {copiedMsgId === note.id ? "Kopieret" : "Kopier"}
                                </button>
                                <div className="relative" data-output-download-root={note.id}>
                                  <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={downloadMenuId === note.id}
                                    data-output-download-toggle={note.id}
                                    onClick={() => setDownloadMenuId((current) => (current === note.id ? null : note.id))}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Hent
                                  </button>
                                  {downloadMenuId === note.id && (
                                    <div
                                      role="menu"
                                      data-output-download-menu={note.id}
                                      className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        data-output-download="pdf"
                                        onClick={() => {
                                          downloadNote(note.title, note.content, "pdf");
                                          setDownloadMenuId(null);
                                        }}
                                        className="block w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 cursor-pointer"
                                      >
                                        Som PDF
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        data-output-download="docx"
                                        onClick={() => {
                                          downloadNote(note.title, note.content, "docx");
                                          setDownloadMenuId(null);
                                        }}
                                        className="block w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 cursor-pointer"
                                      >
                                        Som Word
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGeneratedNotes((prev) => prev.filter((item) => item.id !== note.id));
                                  if (openNoteId === note.id) setOpenNoteId(null);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Slet fra output
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <div className="mt-12 text-center text-slate-400 p-6">
                      <FileCode className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">
                        Intet output endnu. Gem et svar med Gem i output, eller bed om at lægge en tekst i output.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      {builderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setBuilderOpen(false)}
        >
          <form
            data-prompt-builder-dialog
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              insertBuiltQuestion();
            }}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
          >
            <h2 className="text-sm font-bold text-[#0F382C]">Byg spørgsmål</h2>
            <label className="mt-3 block text-[11px] font-semibold text-slate-700">
              Emne / Miljøfaktor
              <input
                value={builderTopic}
                onChange={(event) => setBuilderTopic(event.target.value)}
                placeholder="Flagermus, Støj, Grundvand, Natura 2000"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-800 focus:outline-none focus:border-[#0F382C]"
              />
            </label>
            <label className="mt-3 block text-[11px] font-semibold text-slate-700">
              Formål / Produkttype
              <input
                value={builderPurpose}
                onChange={(event) => setBuilderPurpose(event.target.value)}
                placeholder="Screeningsafgørelse, Lokalplannotat, Præcedens-tjek"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-800 focus:outline-none focus:border-[#0F382C]"
              />
            </label>
            <label className="mt-3 block text-[11px] font-semibold text-slate-700">
              Konkret problemstilling
              <textarea
                rows={3}
                value={builderProblem}
                onChange={(event) => setBuilderProblem(event.target.value)}
                placeholder="Fældning af 3 hule løvtræer i en skovbryn"
                className="mt-1 w-full resize-none rounded border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-800 focus:outline-none focus:border-[#0F382C]"
              />
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBuilderOpen(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Luk
              </button>
              <button
                type="submit"
                data-builder-insert
                className="rounded-md bg-[#0F382C] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#14493a] cursor-pointer"
              >
                Indsæt i chat
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
