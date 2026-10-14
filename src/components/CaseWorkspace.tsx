"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { INITIAL_CASES } from "@/lib/casesData";
import { THEME_CATEGORIES, THEME_FOLDERS } from "@/lib/themeFolders";
import {
  FileText,
  Upload,
  AlertTriangle,
  Download,
  Sparkles,
  FileCheck,
  Search,
  CornerDownLeft,
  BookOpen,
  ShieldCheck,
  ArrowLeft,
  Copy,
  Check,
  FileCode,
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

function isStoredCaseId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function touchStoredCase(id: string): Promise<void> {
  if (!isStoredCaseId(id)) return Promise.resolve();
  const touch = fetch(`/api/cases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ touch: true }),
    keepalive: true,
  }).then(
    () => undefined,
    () => undefined
  );
  const giveUp = new Promise<void>((resolve) => {
    window.setTimeout(resolve, 1500);
  });
  return Promise.race([touch, giveUp]);
}

export function CaseWorkspace({
  forcedCaseId,
  forcedScope,
  forcedTitle,
  forcedCaseNumber,
}: {
  forcedCaseId?: string;
  forcedScope?: ScopeType;
  forcedTitle?: string;
  forcedCaseNumber?: string;
}) {
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = forcedCaseId || (params?.id as string) || "sag-biogas-2026";
  const existingCase = INITIAL_CASES.find((c) => c.id === caseId);

  useEffect(() => {
    void touchStoredCase(caseId);
  }, [caseId]);

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
    (scope === "plan" ? "mv plan 01" : "mv projekt 01");
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const savedTitle = useRef(initialTitle);
  const skipTitleSave = useRef(false);
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
    if (!isStoredCaseId(caseId)) {
      savedTitle.current = next;
      return;
    }
    const res = await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (!res.ok) {
      savedTitle.current = previous;
      setTitleDraft(previous);
      return;
    }
    savedTitle.current = next;
  };

  const caseNumber =
    forcedCaseNumber ||
    existingCase?.caseNumber ||
    `2026-${scope === "plan" ? "PLAN" : "VVM"}-${caseId.slice(-4)}`;

  // Selected themes (Max 3, warn on 4+)
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    scope === "plan" ? ["natura2000"] : ["artsbeskyttelse"]
  );

  // Uploaded files: starts empty for new cases unless explicitly provided by an existing case
  const isNewCase = caseId.startsWith("ny-");
  const [primaryFile, setPrimaryFile] = useState<string | null>(
    isNewCase ? null : existingCase?.primaryDocument || null
  );
  const [supplementaryFiles, setSupplementaryFiles] = useState<string[]>(
    isNewCase ? [] : (existingCase ? ["Bilag_4_Artskortlaegning_Feltundersoegelse.pdf"] : [])
  );

  // Right panel tab state: 'kilde' vs 'notater'
  const [rightPanelTab, setRightPanelTab] = useState<"kilde" | "notater">("kilde");

  // Active source in right preview panel
  const [activeSnippet, setActiveSnippet] = useState<SourceSnippet | null>(null);
  const [downloadingOriginal, setDownloadingOriginal] = useState(false);
  const [originalError, setOriginalError] = useState("");

  // Copy status per message ID
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Loading state for LLM analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Chat message state: starter altid helt rent med en velkomsthilsen
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: "Du kan uploade sagens dokumenter ovenfor, vælge de relevante temamapper til venstre, og stille dine konkrete juridiske eller miljøfaglige spørgsmål i feltet nedenfor. Til højre finder du både kildehenvisninger og de output du selv producerer undervejs.",
    },
  ]);

  // Generated long-form notes / outputs in studio
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNote[]>([]);

  const [inputPrompt, setInputPrompt] = useState("");

  const handleToggleTheme = (themeId: string) => {
    if (selectedThemes.includes(themeId)) {
      setSelectedThemes(selectedThemes.filter((t) => t !== themeId));
    } else {
      setSelectedThemes([...selectedThemes, themeId]);
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          scope,
          themes: selectedThemes,
          caseTitle,
          caseNumber,
          primaryFile,
          supplementaryFiles,
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

      // If new sources returned, set first as active snippet
      if (data.sources && data.sources.length > 0) {
        setActiveSnippet(data.sources[0]);
      }
    } catch {
      // Graceful fallback
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter eller sagsakter i databasen for ${
          scope === "plan" ? "Plan / Program (§ 8)" : "Konkret Projekt (§§ 15–25)"
        }.\n\nNår du uploader et sagsdokument eller tilføjer afgørelser til temamapperne, analyseres spørgsmålet med kildehenvisninger.`,
        sources: [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUploadPrimary = async () => {
    const filename = prompt("Indtast filnavn på det primære dokument (PDF):", "Miljorapport_Sag_2026.pdf");
    if (!filename) return;
    setPrimaryFile(filename);

    // Kør hurtig baggrundstagging med GPT-4o-mini API
    try {
      const res = await fetch("/api/tag-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: filename, scope }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recommendedThemes && Array.isArray(data.recommendedThemes)) {
          setSelectedThemes((prev) => Array.from(new Set([...prev, ...data.recommendedThemes])));
        }
      }
    } catch {
      // Ignorér baggrundstagging-fejl
    }
  };

  const handleUploadSupplementary = async () => {
    const filename = prompt("Indtast filnavn på sekundært dokument (PDF):", "Trafiknotat_Kapacitetsvurdering.pdf");
    if (!filename) return;
    setSupplementaryFiles((prev) => [...prev, filename]);

    // Kør hurtig baggrundstagging med GPT-4o-mini API
    try {
      const res = await fetch("/api/tag-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: filename, scope }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recommendedThemes && Array.isArray(data.recommendedThemes)) {
          setSelectedThemes((prev) => Array.from(new Set([...prev, ...data.recommendedThemes])));
        }
      }
    } catch {
      // Ignorér baggrundstagging-fejl
    }
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

  const handleDownloadPDF = (text: string, title: string = "MVAI-Analyse") => {
    // Generates a downloadable text-based PDF / document blob
    const element = document.createElement("a");
    const headerContent = `MVAI.DK — MILJØVURDERINGSVEJEN\nSag: ${caseTitle} (${caseNumber})\nDato: ${new Date().toLocaleDateString("da-DK")}\n\n==================================================\n\n`;
    const file = new Blob([headerContent + text], { type: "application/pdf;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadNote = (note: GeneratedNote, format: "docx" | "pdf") => {
    const element = document.createElement("a");
    const mimeType = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
    const file = new Blob([note.content], { type: `${mimeType};charset=utf-8` });
    element.href = URL.createObjectURL(file);
    element.download = `${note.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isThemeLimitExceeded = selectedThemes.length > 3;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7FAFA] text-slate-800">
      {/* Top Application Header - NotebookLM style */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={(event) => {
              if (!isStoredCaseId(caseId)) return;
              event.preventDefault();
              void touchStoredCase(caseId).finally(() => {
                window.location.assign("/");
              });
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Gå tilbage til sagsdashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dine sager</span>
          </Link>

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
              <span>{scope === "plan" ? "Plan" : "Projekt"}</span>
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
                <span
                  className={`text-xs font-semibold ${
                    isThemeLimitExceeded ? "text-amber-600 font-bold" : "text-slate-500"
                  }`}
                >
                  {selectedThemes.length}/3 aktive
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Aktivér de fagområder, sagen handler om.
              </p>

              {/* Warning banner when >= 4 */}
              {isThemeLimitExceeded && (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Fagligt advarselsloft:</span>
                    <p className="text-[11px] leading-tight mt-0.5">
                      Flere end 3 temamapper øger risikoen for informationsstøj og udvander det retslige præcisionstjek.
                    </p>
                  </div>
                </div>
              )}

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
                        <label
                          key={theme.id}
                          onClick={() => handleToggleTheme(theme.id)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? "border-emerald-600/40 bg-white shadow-2xs text-slate-900"
                              : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-slate-300 text-[#0F382C] focus:ring-[#0F382C]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-semibold ${isChecked ? "text-[#0F382C]" : "text-slate-700"}`}>
                                {theme.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {theme.count} dok.
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                              {theme.description}
                            </p>
                          </div>
                        </label>
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
                {/* Primært dokument */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F382C] flex items-center gap-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-[#2E8B57] shrink-0" />
                      <span className="truncate">{primaryFile || "Intet primært dokument"}</span>
                    </span>
                    <span className="rounded bg-[#0F382C] text-white text-[9px] px-1 py-0.2 font-mono shrink-0">
                      Primært
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadPrimary}
                    className="mt-2 text-[10px] text-emerald-800 font-semibold hover:underline cursor-pointer"
                  >
                    Skift primært dokument &rarr;
                  </button>
                </div>

                {/* Sekundære dokumenter */}
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600 font-semibold text-[11px]">
                    <span>Sekundære dokumenter ({supplementaryFiles.length})</span>
                    <button
                      type="button"
                      onClick={handleUploadSupplementary}
                      className="text-[#2E8B57] hover:underline cursor-pointer text-[10px]"
                    >
                      + Tilføj
                    </button>
                  </div>
                  {supplementaryFiles.length > 0 ? (
                    <div className="space-y-1">
                      {supplementaryFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate py-0.5"
                        >
                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Ingen sekundære dokumenter tilføjet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E8B57]" />
              RAG Version 2026.4
            </span>
            <span>Fortroligt sagsrum</span>
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
                {/* Knap 1: Primært dokument */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleUploadPrimary}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0F382C] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F382C] hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#2E8B57]" />
                    <span>1. Primært dokument</span>
                    <span className="rounded bg-[#0F382C] text-white text-[9px] px-1 py-0.2 font-mono">
                      Fokus
                    </span>
                  </button>
                </div>

                {/* Knap 2: Sekundære dokumenter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleUploadSupplementary}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>2. Sekundære dokumenter</span>
                    <span className="text-[10px] text-slate-400">
                      ({supplementaryFiles.length})
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Uploaded badges row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {primaryFile && (
                <div className="inline-flex items-center gap-1.5 rounded bg-emerald-100/70 border border-emerald-300/60 px-2 py-0.5 text-[#0F382C] font-medium text-[11px]">
                  <FileText className="w-3 h-3 text-[#2E8B57]" />
                  <span className="font-semibold truncate max-w-xs">{primaryFile}</span>
                  <span className="text-[9px] text-emerald-800 font-bold bg-white/70 px-1 rounded">Primært</span>
                </div>
              )}
              {supplementaryFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-700 text-[11px]"
                >
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-xs">{file}</span>
                </div>
              ))}
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
                      {msg.modelUsed && (
                        <span className="rounded bg-emerald-100 text-[#0F382C] px-1.5 py-0.2 text-[9px] font-mono font-medium">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                    <span className={msg.sender === "user" ? "text-slate-400" : "text-slate-400 font-mono"}>
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className="prose prose-sm max-w-none text-current whitespace-pre-line">
                    {msg.text}
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

                  {/* Citations block */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Anvendte retskilder (Klik for at inspicere i kildelæser):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src) => (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => {
                              setActiveSnippet(src);
                              setOriginalError("");
                              setRightPanelTab("kilde");
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border text-left transition-all cursor-pointer ${
                              activeSnippet?.id === src.id && rightPanelTab === "kilde"
                                ? "border-[#0F382C] bg-[#0F382C] text-white font-semibold"
                                : "border-slate-300 bg-white text-slate-700 hover:border-[#0F382C]"
                            }`}
                          >
                            <FileCheck className="w-3 h-3 text-[#2E8B57]" />
                            <span className="truncate max-w-[220px]">{src.title}</span>
                            <span className="text-[10px] opacity-75">({src.relevanceScore}%)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bunden af besvarelse: Knapper til [Kopier tekst] og [Download PDF] */}
                  {msg.sender === "ai" && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
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
                          onClick={() => handleDownloadPDF(msg.text, `analyse_${caseNumber}`)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Download PDF</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newNote: GeneratedNote = {
                            id: `note-${Date.now()}`,
                            title: `Uddrag fra analyse (${msg.timestamp})`,
                            caseType: scope === "plan" ? "Miljøvurdering af Plan (§ 8)" : "Konkret Projekt (§§ 15–25)",
                            date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            format: "docx",
                            content: msg.text,
                            included: false,
                          };
                          setGeneratedNotes((prev) => [newNote, ...prev]);
                          setRightPanelTab("notater");
                        }}
                        className="text-[11px] font-medium text-[#2E8B57] hover:underline"
                      >
                        + Gem i output
                      </button>
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

                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/50 rounded-b-xl">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Claude 3.5 Sonnet RAG-analyse
                    </span>
                  </div>

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
                {activeSnippet && (
                  <div className="flex items-center justify-end pb-3 border-b border-slate-200">
                    <span className="rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5">
                      {activeSnippet.relevanceScore}% Match
                    </span>
                  </div>
                )}

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
                      Klik på en kildehenvisning i samtalen for at åbne det fulde tekstsnit og hente originalkilden.
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
                    generatedNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`rounded-xl border bg-white p-4 shadow-xs space-y-3 ${
                          note.included ? "border-emerald-600/40" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={note.included}
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
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F382C] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                              {note.caseType}
                            </span>
                            <h4 className="mt-1.5 font-bold text-xs text-slate-900 leading-snug">
                              {note.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{note.date}</p>
                          </div>
                          </label>
                        </div>

                        <div className="max-h-36 overflow-y-auto rounded bg-[#F7FAFA] border border-slate-100 p-2 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </div>

                        {/* Download notat (.docx / .pdf) */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadNote(note, "docx")}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>Hent .docx</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadNote(note, "pdf")}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F382C] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#14493a] transition-colors cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-white" />
                            <span>Hent .pdf</span>
                          </button>
                        </div>
                      </div>
                    ))
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

          <div className="p-3 border-t border-slate-200 bg-white text-[10px] text-slate-400 text-center">
            MVAI Kildeverifikationsmotor • Ingen AI-genererede referencer
          </div>
        </aside>
      </div>
    </div>
  );
}
