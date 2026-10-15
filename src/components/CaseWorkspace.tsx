"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CitationText } from "@/components/CitationText";
import type { CaseRoom } from "@/lib/caseRoom";
import { isPlaceholderTitle } from "@/lib/caseTitles";
import { downloadNote } from "@/lib/noteDownload";
import { buildQuestion } from "@/lib/promptSupport";
import { INITIAL_CASES } from "@/lib/casesData";
import { THEME_CATEGORIES, THEME_FOLDERS } from "@/lib/themeFolders";
import {
  FileText,
  Upload,
  AlertTriangle,
  Download,
  ChevronDown,
  Sparkles,
  Search,
  CornerDownLeft,
  BookOpen,
  ArrowLeft,
  Copy,
  Check,
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
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  timestamp: string;
  text: string;
  warning?: string;
  sources?: SourceSnippet[];
  modelUsed?: string;
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

function DocumentMenu({
  open,
  anchorRef,
  lines,
  menuId,
  onMouseEnter,
  onMouseLeave,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  lines: string[];
  menuId: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!open || !anchor || !menu) return;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const margin = 8;
      const width = menu.scrollWidth;
      let left = rect.left;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - width);
      }
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${left}px`;
      menu.style.maxWidth = `${window.innerWidth - margin * 2}px`;
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, lines]);

  if (!open || lines.length === 0 || typeof document === "undefined") return null;

  const rect = anchorRef.current?.getBoundingClientRect();

  return createPortal(
    <div
      ref={menuRef}
      data-upload-menu={menuId}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        top: rect ? rect.bottom + 4 : 0,
        left: rect ? rect.left : 0,
        zIndex: 80,
      }}
      className="fixed max-h-64 overflow-auto rounded-md border border-slate-200 bg-white py-1 text-xs text-slate-800 shadow-md"
    >
      {lines.map((line, index) => (
        <div key={`${line}-${index}`} className="whitespace-nowrap px-3 py-1">
          {line}
        </div>
      ))}
    </div>,
    document.body
  );
}

type CaseDocument = {
  id: string;
  name: string;
  included: boolean;
};

function newCaseDocument(name: string): CaseDocument {
  return {
    id: `dok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    included: true,
  };
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
  "Du kan uploade sagens dokumenter ovenfor, vælge de relevante temamapper til venstre, og stille dine konkrete juridiske eller miljøfaglige spørgsmål i feltet nedenfor. Til højre finder du både kildehenvisninger og de output du selv producerer undervejs.";

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
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const supplementaryInputRef = useRef<HTMLInputElement>(null);
  const primaryAnchorRef = useRef<HTMLDivElement>(null);
  const secondaryAnchorRef = useRef<HTMLDivElement>(null);
  const [primaryMenuOpen, setPrimaryMenuOpen] = useState(false);
  const [secondaryMenuOpen, setSecondaryMenuOpen] = useState(false);
  const primaryMenuTimer = useRef<number | null>(null);
  const secondaryMenuTimer = useRef<number | null>(null);

  const holdPrimaryMenu = () => {
    if (!primaryFile) return;
    if (primaryMenuTimer.current) window.clearTimeout(primaryMenuTimer.current);
    setPrimaryMenuOpen(true);
  };
  const releasePrimaryMenu = () => {
    if (primaryMenuTimer.current) window.clearTimeout(primaryMenuTimer.current);
    primaryMenuTimer.current = window.setTimeout(() => setPrimaryMenuOpen(false), 150);
  };
  const holdSecondaryMenu = () => {
    if (!supplementaryFiles.length) return;
    if (secondaryMenuTimer.current) window.clearTimeout(secondaryMenuTimer.current);
    setSecondaryMenuOpen(true);
  };
  const releaseSecondaryMenu = () => {
    if (secondaryMenuTimer.current) window.clearTimeout(secondaryMenuTimer.current);
    secondaryMenuTimer.current = window.setTimeout(() => setSecondaryMenuOpen(false), 150);
  };

  // Right panel tab state: 'kilde' vs 'notater'
  const [rightPanelTab, setRightPanelTab] = useState<"kilde" | "notater">("kilde");

  // Active source in right preview panel
  const [activeSnippet, setActiveSnippet] = useState<SourceSnippet | null>(null);
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

  // Chat message state: starter altid helt rent med en velkomsthilsen
  const [messages, setMessages] = useState<ChatMessage[]>(restored?.messages ?? [welcomeMessage()]);

  // Generated long-form notes / outputs in studio
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNote[]>(restored?.notes ?? []);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const roomSnapshot = useRef("");
  const [storedCaseTick, setStoredCaseTick] = useState(0);

  const [inputPrompt, setInputPrompt] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTopic, setBuilderTopic] = useState("");
  const [builderPurpose, setBuilderPurpose] = useState("");
  const [builderProblem, setBuilderProblem] = useState("");
  const [enhancing, setEnhancing] = useState(false);

  useEffect(() => {
    const snapshot = JSON.stringify({
      messages,
      primaryFile,
      supplementaryFiles,
      notes: generatedNotes,
      themes: selectedThemes,
    });
    if (!roomSnapshot.current) {
      roomSnapshot.current = snapshot;
      return;
    }
    if (snapshot === roomSnapshot.current) return;
    const id = activeCaseIdRef.current;
    if (!isStoredCaseId(id)) return;
    roomSnapshot.current = snapshot;
    void fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: {
          messages,
          primaryFile,
          supplementaryFiles,
          notes: generatedNotes,
          themes: [],
        },
        primaryDocument: primaryFile?.name ?? null,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [messages, primaryFile, supplementaryFiles, generatedNotes, selectedThemes, storedCaseTick]);

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

  const ensureSavedCase = async (question: string) => {
    const currentId = activeCaseIdRef.current;
    if (!isStoredCaseId(currentId)) {
      if (currentId !== "ny") return;
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, question }),
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
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.case?.title) {
        throw new Error(data.error || "Titlen kunne ikke gemmes.");
      }
      rememberCase(currentId, data.case.title, data.case.caseNumber);
    }
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

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsAnalyzing(true);

    try {
      await ensureSavedCase(userText);
    } catch (err) {
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

    void touchStoredCase(activeCaseIdRef.current);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          scope,
          themes: selectedThemes,
          caseTitle: savedTitle.current,
          caseNumber: caseNumberRef.current,
          primaryFile: primaryFile?.included ? primaryFile.name : null,
          supplementaryFiles: supplementaryFiles.filter((file) => file.included).map((file) => file.name),
          history: messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text })),
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

      if (!res.ok) {
        throw new Error("Fejl fra analyse-API");
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: data.text,
        warning: data.warning,
        sources: data.sources || [],
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Graceful fallback
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
      setIsAnalyzing(false);
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

  const handlePrimarySelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPrimaryFile(newCaseDocument(file.name));
  };

  const handleSupplementarySelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setSupplementaryFiles((prev) => [...prev, ...files.map((file) => newCaseDocument(file.name))]);
  };

  const togglePrimaryFile = () => {
    setPrimaryFile((current) => (current ? { ...current, included: !current.included } : current));
  };

  const toggleSupplementaryFile = (id: string) => {
    setSupplementaryFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, included: !file.included } : file))
    );
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const handleDownloadOriginal = async (source: SourceSnippet) => {
    if (!source.hasOriginal || downloadingOriginal) return;
    setOriginalError("");
    setDownloadingOriginal(true);
    try {
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
      const url = URL.createObjectURL(blob);
      const element = document.createElement("a");
      element.href = url;
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      element.remove();
      URL.revokeObjectURL(url);
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
        {/* PANEL 1: VENSTRE SIDEBAR (KUN TEMAMAPPER MED AFKRYDSNING) */}
        <aside className="w-80 shrink-0 border-r border-slate-200 bg-[#F7FAFA] flex flex-col justify-between overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Temamapper Header */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-700">
                  Temamapper
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedThemes.length}/3 aktive
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Aktivér de fagområder, sagen handler om.
              </p>

              {/* Temamapper Opremsning med afkrydsningsfelter */}
              <div className="space-y-4">
                {THEME_CATEGORIES.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {category.name}
                    </p>
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
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? "border-emerald-600/40 bg-white shadow-2xs text-slate-900"
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

            {/* Sektion til brugerens egne sagsdokumenter */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-700">
                  Sagsdokumenter
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {(primaryFile ? 1 : 0) + supplementaryFiles.length} fil(er)
                </span>
              </div>

              <div className="space-y-2">
                {primaryFile ? (
                  <label
                    data-case-file="primary"
                    onClick={(event) => {
                      event.preventDefault();
                      togglePrimaryFile();
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      primaryFile.included
                        ? "border-emerald-600/40 bg-white shadow-2xs text-slate-900"
                        : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={primaryFile.included}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
                    />
                    <span className={`min-w-0 flex-1 truncate font-semibold ${primaryFile.included ? "text-[#0F382C]" : "text-slate-700"}`}>
                      {primaryFile.name}
                    </span>
                    <span className="rounded bg-[#0F382C] text-white text-[9px] px-1 py-0.2 font-mono shrink-0">
                      Primært
                    </span>
                  </label>
                ) : null}
                {supplementaryFiles.map((file) => (
                    <label
                      key={file.id}
                      data-case-file={file.id}
                      onClick={(event) => {
                        event.preventDefault();
                        toggleSupplementaryFile(file.id);
                      }}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        file.included
                          ? "border-emerald-600/40 bg-white shadow-2xs text-slate-900"
                          : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={file.included}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
                      />
                      <span className={`min-w-0 flex-1 truncate font-semibold ${file.included ? "text-[#0F382C]" : "text-slate-700"}`}>
                        {file.name}
                      </span>
                    </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* PANEL 2: MIDTERPANEL (CHAT & ANALYSE MED OMDØBTE UPLOAD-KNAPPER OG EXPORT) */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-white border-r border-slate-200">
          {/* Top Bar: Upload-knapper (Primært dokument og sekundære dokumenter) */}
          <div className="border-b border-slate-200 bg-[#F7FAFA]/60 p-3 px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Sagsmateriale:
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  ref={primaryAnchorRef}
                  className="relative"
                  onMouseEnter={holdPrimaryMenu}
                  onMouseLeave={releasePrimaryMenu}
                >
                  <label
                    htmlFor="mvai-primary-file"
                    data-upload="primary"
                    className="relative inline-flex h-8 w-[13.5rem] shrink-0 cursor-pointer items-center gap-2 rounded-lg border-2 border-[#0F382C] bg-white px-3.5 text-xs font-bold text-[#0F382C] hover:bg-emerald-50 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0 text-[#2E8B57]" />
                    <span className="min-w-0 flex-1 truncate text-left">
                      {primaryFile?.name || "1. Primært dokument"}
                    </span>
                    <input
                      id="mvai-primary-file"
                      ref={primaryInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.odt,.txt,.rtf,application/pdf"
                      className="absolute h-px w-px overflow-hidden opacity-0"
                      onChange={handlePrimarySelected}
                    />
                  </label>
                  <DocumentMenu
                    open={primaryMenuOpen}
                    anchorRef={primaryAnchorRef}
                    lines={primaryFile ? [primaryFile.name] : []}
                    menuId="primary"
                    onMouseEnter={holdPrimaryMenu}
                    onMouseLeave={releasePrimaryMenu}
                  />
                </div>

                <div
                  ref={secondaryAnchorRef}
                  className="relative"
                  onMouseEnter={holdSecondaryMenu}
                  onMouseLeave={releaseSecondaryMenu}
                >
                  <label
                    htmlFor="mvai-secondary-file"
                    data-upload="secondary"
                    className="relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>2. Sekundære dokumenter</span>
                    <span className="inline-block w-8 text-center text-[10px] tabular-nums text-slate-400">
                      ({supplementaryFiles.length})
                    </span>
                    <input
                      id="mvai-secondary-file"
                      ref={supplementaryInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.odt,.txt,.rtf,application/pdf"
                      className="absolute h-px w-px overflow-hidden opacity-0"
                      onChange={handleSupplementarySelected}
                    />
                  </label>
                  <DocumentMenu
                    open={secondaryMenuOpen}
                    anchorRef={secondaryAnchorRef}
                    lines={supplementaryFiles.map((file) => file.name)}
                    menuId="secondary"
                    onMouseEnter={holdSecondaryMenu}
                    onMouseLeave={releaseSecondaryMenu}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Besvarelsesvindue */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
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

                  <div className="prose prose-sm max-w-none text-current">
                    {msg.sender === "ai" && msg.sources && msg.sources.length > 0 ? (
                      <CitationText
                        text={msg.text}
                        sources={msg.sources}
                        activeId={rightPanelTab === "kilde" ? activeSnippet?.id : null}
                        onDownloadOriginal={handleDownloadOriginal}
                        onSelectSource={(src) => {
                          setActiveSnippet(src);
                          setOriginalError("");
                          setRightPanelTab("kilde");
                        }}
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

                        <button
                          type="button"
                          onClick={() => {
                            const newNote: GeneratedNote = {
                              id: `note-${Date.now()}`,
                              title: `Uddrag fra analyse (${msg.timestamp})`,
                              caseType: scope === "plan" ? "Miljøvurdering af plan (afsnit II, §§ 8–14)" : "Konkret projekt (afsnit III, §§ 15–25)",
                              date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
                <div className="rounded-xl p-4 text-xs bg-[#F7FAFA] border border-slate-200 text-slate-600 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[#2E8B57] animate-pulse" />
                  <span>Genererer miljøretlig analyse...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="relative rounded-xl border border-slate-300 bg-white shadow-xs focus-within:border-[#0F382C] focus-within:ring-1 focus-within:ring-[#0F382C]">
                <textarea
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
                    <button
                      type="submit"
                      disabled={!inputPrompt.trim() || isAnalyzing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F382C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#14493a] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span>{isAnalyzing ? "Analyserer..." : "Analysér"}</span>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </button>
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
                    {/* Source metadata card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E8B57]">
                        Retskilde
                      </span>
                      <h4 className="mt-1 font-bold text-sm text-slate-900 leading-snug">
                        {activeSnippet.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 font-mono">
                        {activeSnippet.citation}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Afsnit:</span> {activeSnippet.lawSection}
                      </div>
                    </div>

                    {/* Excerpt / text quotation */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Gældende ordlyd / Citat
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{activeSnippet.date}</span>
                      </div>
                      <div className="rounded-md border border-slate-100 bg-[#F7FAFA] p-3 text-xs leading-relaxed text-slate-700 font-mono whitespace-pre-wrap">
                        {activeSnippet.textSnippet}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400 italic">
                        {activeSnippet.citation.startsWith("Output:")
                          ? "Teksten er gemt output fra denne sag og bruges som kildemateriale i de næste svar."
                          : "Teksten er en forhåndsvisning. Knappen henter den originale fil."}
                      </p>
                    </div>

                    {activeSnippet.hasOriginal && (
                    <div className="rounded-xl border-2 border-dashed border-[#0F382C]/30 bg-emerald-50/40 p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#0F382C]" />
                        <div>
                          <p className="text-xs font-bold text-[#0F382C]">Originalt dokument (PDF)</p>
                          <p className="text-[10px] text-slate-500 font-mono">{activeSnippet.pdfFileName}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadOriginal(activeSnippet)}
                        disabled={downloadingOriginal}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F382C] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#14493a] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingOriginal ? "Henter..." : "Download original"}</span>
                      </button>
                      {originalError && (
                        <p className="mt-1.5 text-center text-[10px] text-amber-800">{originalError}</p>
                      )}
                      <p className="mt-1.5 text-center text-[10px] text-slate-500">
                        Filen er det originale dokument.
                      </p>
                    </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-12 text-center text-slate-400 p-6">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">
                      Hold musen over et kildetal i svaret, og tryk Vis kilde.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FANE 2: GENEREREDE NOTATER / OUTPUTS */}
            {rightPanelTab === "notater" && (
              <div className="p-4 space-y-4">
                {generatedNotes.some((note) => note.included) && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Output indgår i analysen.</span>
                      <p className="text-[11px] leading-tight mt-0.5">
                        Det afkrydsede output indgår nu i kildematerialet (ligesom temamapperne)
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {generatedNotes.length > 0 ? (
                    generatedNotes.map((note) => {
                      const open = openNoteId === note.id;
                      return (
                      <div
                        key={note.id}
                        data-output-note={note.id}
                        data-output-open={open ? "true" : "false"}
                        onClick={() => setOpenNoteId(note.id)}
                        className={`rounded-lg border bg-white p-2.5 text-xs cursor-pointer transition-all ${
                          note.included
                            ? "border-emerald-600/40 shadow-2xs"
                            : "border-slate-200 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
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
                            aria-label={`Medtag ${note.title} i kildematerialet`}
                            className="mt-0.5 rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`font-semibold leading-snug ${note.included ? "text-[#0F382C]" : "text-slate-700"}`}>
                                {note.title}
                              </h4>
                              {open && (
                                <button
                                  type="button"
                                  aria-label="Luk"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenNoteId(null);
                                  }}
                                  className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                  Luk
                                </button>
                              )}
                            </div>
                            {!open && (
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                {note.content}
                              </p>
                            )}
                          </div>
                        </div>

                        {open && (
                          <div className="mt-2 space-y-2" onClick={(event) => event.stopPropagation()}>
                            <p className="text-[10px] text-slate-400 font-mono">{note.date}</p>
                            <div className="max-h-64 overflow-y-auto rounded bg-[#F7FAFA] border border-slate-100 p-2 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </div>
                            <div className="relative" data-output-download-root={note.id}>
                              <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={downloadMenuId === note.id}
                                data-output-download-toggle={note.id}
                                onClick={() => setDownloadMenuId((current) => (current === note.id ? null : note.id))}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F382C] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#14493a] transition-colors cursor-pointer shadow-2xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              {downloadMenuId === note.id && (
                                <div
                                  role="menu"
                                  data-output-download-menu={note.id}
                                  className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
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
                                    Download som PDF
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
                                    Download som Word
                                  </button>
                                </div>
                              )}
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
                        Intet output endnu. Gem et svar fra chatten med Gem i output.
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
