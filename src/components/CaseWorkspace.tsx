"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { INITIAL_CASES } from "@/lib/casesData";
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  Sparkles,
  FileCheck,
  Search,
  CornerDownLeft,
  BookOpen,
  Scale,
  ShieldCheck,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

type ScopeType = "projekt" | "plan";

interface ThemeFolder {
  id: string;
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
  relevanceScore: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  timestamp: string;
  text: string;
  warning?: string;
  sources?: SourceSnippet[];
}

const AVAILABLE_THEMES: ThemeFolder[] = [
  {
    id: "artsbeskyttelse",
    name: "Artsbeskyttelse & Bilag IV",
    description: "Markfirben, flagermus, padder og yngle-/rasteområder jf. habitatdirektivets art. 12.",
    count: 240,
  },
  {
    id: "naevnspraksis",
    name: "Klagenævnspraksis (MFKN)",
    description: "Miljø- og Fødevareklagenævnets principielle afgørelser vedr. screeningsfejl og ophævelser.",
    count: 485,
  },
  {
    id: "natura2000",
    name: "Natura 2000 & Habitatvurdering",
    description: "Kumulative effekter, kvælstofdeposition og væsentlighedsvurderinger for habitatområder.",
    count: 195,
  },
  {
    id: "stoej_og_luft",
    name: "Støj, Luft & Lugt",
    description: "Miljøstyrelsens vejledninger om industristøj, lavfrekvent støj og lugtemissioner.",
    count: 110,
  },
  {
    id: "grundvand",
    name: "Drikkevand & Grundvand",
    description: "BNBO, sårbare indvindingsområder og nedsivningstilladelser jf. miljøbeskyttelsesloven.",
    count: 145,
  },
  {
    id: "kyst_og_landskab",
    name: "Kystnærhed & Landskabshensyn",
    description: "Kystnærhedszonen, naturbeskyttelseslovens bygge- og beskyttelseslinjer.",
    count: 82,
  },
];

const INITIAL_SNIPPET: SourceSnippet = {
  id: "src-1",
  title: "Miljøvurderingsloven (Lovbekendtgørelse nr. 4 af 03/01/2023)",
  citation: "LBK nr. 4 af 03/01/2023, § 21, stk. 1 & Bilag 2 pkt. 11 b",
  lawSection: "§ 21 (Screeningspligt) & Bilag 6 (Udvælgelseskriterier)",
  date: "Gældende lov 2026",
  textSnippet:
    "§ 21. Projekter omfattet af bilag 2 skal screenes af den kompetente myndighed på grundlag af bygherrens anmeldelse for at vurdere, om projektet kan have væsentlige indvirkninger på miljøet.\n\nStk. 2. Ved vurderingen efter stk. 1 skal myndigheden tage hensyn til de relevante udvælgelseskriterier, der er fastsat i bilag 6, herunder projektets karakteristika, projektets placering samt arten og kendetegnene ved den forventede indvirkning på miljøet.",
  pdfUrl: "#",
  pdfFileName: "miljoevurderingsloven-lbk-4-2023.pdf",
  relevanceScore: 98,
};

const PLAN_SNIPPET: SourceSnippet = {
  id: "src-plan-1",
  title: "Miljøvurderingsloven (Lovbekendtgørelse nr. 4 af 03/01/2023)",
  citation: "LBK nr. 4 af 03/01/2023, § 8, stk. 1 & 2",
  lawSection: "§ 8 (Obligatorisk miljøvurdering af planer og programmer)",
  date: "Gældende lov 2026",
  textSnippet:
    "§ 8. Myndigheden skal gennemføre en miljøvurdering af planer og programmer, hvor planerne eller programmerne:\n1) fastlægger rammerne for fremtidige anlægstilladelser til projekter omfattet af bilag 1 og 2, eller\n2) kan påvirke et udpeget internationalt naturbeskyttelsesområde væsentligt.\n\nStk. 2. For planer og programmer, som alene fastlægger anvendelsen af mindre områder på lokalt plan, gennemføres kun en miljøvurdering, hvis de må antages at kunne få væsentlig indvirkning på miljøet.",
  pdfUrl: "#",
  pdfFileName: "miljoevurderingsloven-planer-smv.pdf",
  relevanceScore: 99,
};

export function CaseWorkspace({
  forcedCaseId,
  forcedScope,
}: {
  forcedCaseId?: string;
  forcedScope?: ScopeType;
}) {
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = forcedCaseId || (params?.id as string) || "sag-biogas-2026";
  const existingCase = INITIAL_CASES.find((c) => c.id === caseId);

  // Scope: derive from route, param or existing case
  const queryScope = searchParams?.get("scope") as ScopeType | null;
  const [scope, setScope] = useState<ScopeType>(
    forcedScope ||
      queryScope ||
      existingCase?.scope ||
      (caseId.includes("plan") ? "plan" : "projekt")
  );

  const caseTitle =
    existingCase?.title ||
    (scope === "plan"
      ? "Ny Miljøvurdering af Plan / Program (§ 8)"
      : "Ny VVM-sag / Miljøvurdering af Projekt (§§ 15–25)");

  const caseNumber =
    existingCase?.caseNumber ||
    `2026-${scope === "plan" ? "PLAN" : "VVM"}-${caseId.slice(-4)}`;

  // Selected themes (Max 3, warn on 4+)
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    scope === "plan" ? ["naevnspraksis", "natura2000"] : ["artsbeskyttelse", "naevnspraksis"]
  );

  // Uploaded files
  const [primaryFile, setPrimaryFile] = useState<string | null>(
    existingCase?.primaryDocument ||
      (scope === "plan"
        ? "Planudkast_Lokalplan_Solceller_2026.pdf"
        : "Udkast_Afgørelse_Biogas_VVM_Screening_rev3.pdf")
  );
  const [supplementaryFiles, setSupplementaryFiles] = useState<string[]>(
    scope === "plan"
      ? ["Miljoescreening_Bilag_Grundvand.pdf"]
      : ["Bilag_4_Artskortlaegning_Feltundersoegelse.pdf"]
  );

  // Active source in right preview panel
  const [activeSnippet, setActiveSnippet] = useState<SourceSnippet | null>(
    scope === "plan" ? PLAN_SNIPPET : INITIAL_SNIPPET
  );

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (scope === "plan") {
      return [
        {
          id: "msg-p1",
          sender: "user",
          timestamp: "09:30",
          text: "Vi udarbejder et nyt kommuneplantillæg for et solcelleområde på 45 ha. Udløser planændringen obligatorisk miljøvurdering jf. § 8, stk. 1, eller kan planen screenes efter § 8, stk. 2 som et mindre område på lokalt plan?",
        },
        {
          id: "msg-p2",
          sender: "ai",
          timestamp: "09:30",
          text: `På baggrund af gældende ret for **Plan / Program (§ 8)** og dine uploadede sagsakter er vurderingen:

### 1. Retsgrundlag efter § 8
Et areal på 45 ha til teknisk anlæg betragtes ifølge fast nævnspraksis (MFKN) **ikke som et mindre område på lokalt plan**. 

Planen fastlægger rammerne for fremtidige anlægstilladelser til projekter omfattet af bilag 2 (energianlæg). Derfor er der som udgangspunkt **krav om gennemførelse af en fuld strategisk miljøvurdering (SMV)** med tilhørende miljørapport jf. § 8, stk. 1, nr. 1.

### 2. Opmærksomhedspunkter
- **Kumulative effekter med nabokommuner:** Skal belyse det samlede landskabelige pres.
- **Natura 2000 væsentlighed:** Hvis afstrømning kan påvirke et habitatområde, er fuld vurdering altid obligatorisk jf. § 8, stk. 1, nr. 2.`,
          warning:
            "MFKN ophæver rutinemæssigt lokalplaner/kommuneplantillæg, hvis kommunen fejlagtigt anvender undtagelsen om 'mindre områder' på anlæg af denne skala uden dokumenteret screening for væsentlighed.",
          sources: [
            PLAN_SNIPPET,
            {
              id: "src-plan-2",
              title: "MFKN Kendelse 2024-512 (Kommuneplantillæg Solceller)",
              citation: "Miljø- og Fødevareklagenævnets afgørelse af 22. maj 2024",
              lawSection: "Miljøvurderingslovens § 8, stk. 1 vs. stk. 2",
              date: "22/05/2024",
              textSnippet:
                "Nævnet fandt, at et planområde på over 20 ha i det åbne land ikke kan henføres under begrebet 'mindre områder på lokalt plan', hvorfor planforslaget var underlagt ubetinget miljøvurderingspligt.",
              pdfUrl: "#",
              pdfFileName: "mfkn-2024-512-kendelse.pdf",
              relevanceScore: 96,
            },
          ],
        },
      ];
    }

    return [
      {
        id: "msg-1",
        sender: "user",
        timestamp: "10:14",
        text: "Vi behandler en anmeldelse om udvidelse af et eksisterende biogasanlæg med 18.000 ton biomasse/år i landzone. Er der krav om fuld miljøkonsekvensrapport (VVM), eller kan vi nøjes med en § 21-screening?",
      },
      {
        id: "msg-2",
        sender: "ai",
        timestamp: "10:14",
        text: `På baggrund af gældende lov og din uploadede sagsakt for **Konkret Projekt (§§ 15–25)** er vurderingen:

### 1. Retsgrundlag og Pligtkategori
Projektet falder ind under **VVM-lovens bilag 2, punkt 11 b** (*anlæg til bortskaffelse af affald* / biogasproduktion under tærskelværdien for bilag 1, pkt. 9).

Der er derfor **ikke obligatorisk krav om fuld miljøkonsekvensrapport**, men derimod en **obligatorisk screeningspligt efter § 21**.

### 2. Afgørende kriterier efter Bilag 6
Ved screeningsafgørelsen skal kommunen lægge særlig vægt på:
- **Kumulative effekter:** Den samlede kapacitet sammenholdt med eksisterende tilladelser (jf. *MFKN kendelse 2024-819*).
- **Lugt- og transportgener:** Tung trafik gennem nærliggende boligområder.
- **Artsbeskyttelse (Bilag IV):** Da der er registreret markfirben i naboområdet (se *Feltundersøgelse, side 14*), skal der ske en konkret vurdering af, om anlægsfasen kan beskadige eller ødelægge yngle- eller rasteområder.

### 3. Konklusion for afgørelsen
Afgørelsen kan træffes som en § 21-screeningsafgørelse om ikke-VVM-pligt, **forudsat** at bygherre har indarbejdet dokumenterede afværgeforanstaltninger for lugt og beskyttelse af eventuelle Bilag IV-arter i projektbeskrivelsen.`,
        warning:
          "Opmærksomhed: Hvis afværgeforanstaltninger først fastlægges efterfølgende uden for projektets ramme, tilsidesætter Klagenævnet rutinemæssigt screeningen som ugyldig.",
        sources: [
          INITIAL_SNIPPET,
          {
            id: "src-2",
            title: "MFKN Kendelse 2024-819 (Biogasanlæg Vesthimmerland)",
            citation: "Miljø- og Fødevareklagenævnets afgørelse af 14. marts 2024",
            lawSection: "VVM-lovens § 21 & kumulationsprincippet",
            date: "14/03/2024",
            textSnippet:
              "Nævnet fandt, at kommunens screeningsafgørelse var behæftet med en væsentlig retlig mangel, idet der ikke var foretaget en tilstrækkelig vurdering af den kumulative transportbelastning fra tilkørselsveje.",
            pdfUrl: "#",
            pdfFileName: "mfkn-2024-819-kendelse.pdf",
            relevanceScore: 94,
          },
          {
            id: "src-3",
            title: "Habitatsdirektivets Artikel 12 Vejledning (Miljøstyrelsen)",
            citation: "MST Vejledning om administration af plan- og projektregler for Bilag IV-arter",
            lawSection: "Afsnit 4.2 — Forebyggende foranstaltninger vs. afbødning",
            date: "Rev. 2025",
            textSnippet:
              "En screening kan alene lægge vægt på tiltag, som bygherre har integreret uigenkaldeligt i projektets udformning forud for afgørelsen.",
            pdfUrl: "#",
            pdfFileName: "mst-vejledning-bilag-iv-arter.pdf",
            relevanceScore: 91,
          },
        ],
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState("");

  const handleToggleTheme = (themeId: string) => {
    if (selectedThemes.includes(themeId)) {
      setSelectedThemes(selectedThemes.filter((t) => t !== themeId));
    } else {
      setSelectedThemes([...selectedThemes, themeId]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: inputPrompt,
    };

    const currentDefaultSnippet = scope === "plan" ? PLAN_SNIPPET : INITIAL_SNIPPET;

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: `Analyserer dit spørgsmål i henhold til **${
        scope === "projekt" ? "Konkret Projekt (§§ 15–25)" : "Plan / Program (§ 8)"
      }** og de **${selectedThemes.length} aktive temamapper**...\n\nSvaret er forankret i gældende lov og dine uploadede sagsakter. Klik på kilderne i højre panel for at verificere citatet.`,
      sources: [currentDefaultSnippet],
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputPrompt("");
  };

  const handleUploadPrimary = () => {
    const filename = prompt("Indtast filnavn på primært sagsdokument (PDF):", "Screeningsudkast_Sag_2026.pdf");
    if (filename) setPrimaryFile(filename);
  };

  const handleUploadSupplementary = () => {
    const filename = prompt("Indtast filnavn på supplerende kilde (PDF):", "Trafiknotat_Kapacitetsvurdering.pdf");
    if (filename) setSupplementaryFiles((prev) => [...prev, filename]);
  };

  const isThemeLimitExceeded = selectedThemes.length > 3;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7FAFA] text-slate-800">
      {/* Top Application Header - NotebookLM style */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
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
              <span>{scope === "plan" ? "Plan / Program (§ 8)" : "Projekt (§§ 15–25)"}</span>
            </span>

            <span className="text-xs font-bold text-slate-900 truncate max-w-xs md:max-w-md">
              {caseTitle}
            </span>

            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              ({caseNumber})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setMessages(messages.slice(0, 2));
            }}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            title="Nulstil samtale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nulstil</span>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Kildematrix aktiv</span>
            <span className="sm:hidden font-mono">OK</span>
          </div>

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
        {/* PANEL 1: VENSTRE SIDEBAR (KILDE- OG TEMASTYRING) */}
        <aside className="w-80 shrink-0 border-r border-slate-200 bg-[#F7FAFA] flex flex-col justify-between overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* 1. Arbejdsområde-vælger: Plan vs. Projekt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                  1. Retsligt Arbejdsområde
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Låst for sagen</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("projekt")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    scope === "projekt"
                      ? "border-[#0F382C] bg-white shadow-xs text-[#0F382C] ring-1 ring-[#0F382C]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">Konkret Projekt</span>
                    {scope === "projekt" && <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">VVM-loven §§ 15–25</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("plan")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    scope === "plan"
                      ? "border-[#0F382C] bg-white shadow-xs text-[#0F382C] ring-1 ring-[#0F382C]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">Plan / Program</span>
                    {scope === "plan" && <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">VVM-loven § 8 (SMV)</span>
                </button>
              </div>
            </div>

            {/* 2. Grundmappe: Altid aktiv, låst */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                  2. Grundmappe (Basislovgivning)
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                  <Lock className="w-3 h-3" /> Låst & Aktiv
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-slate-800">
                <div className="flex items-center gap-2 font-semibold text-[#0F382C]">
                  <Scale className="w-4 h-4 text-[#2E8B57]" />
                  <span>Dansk Miljøvurderingsret (2026)</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 leading-normal">
                  Indeholder LBK nr. 4, tilhørende bekendtgørelser, MST standardvejledning og EU VVM/SMV-direktiverne.
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-800 font-medium">
                  <span>1.420 retsafsnit indekseret</span>
                  <span className="text-[#2E8B57] font-semibold">100% ajourført</span>
                </div>
              </div>
            </div>

            {/* 3. Dynamiske Temamapper: Til-/afkrydsning med advarselsloft ved 4+ */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                  3. Dynamiske Temamapper
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isThemeLimitExceeded ? "text-amber-600 font-bold" : "text-slate-500"
                  }`}
                >
                  {selectedThemes.length}/3 aktive
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Aktivér de fagfelter, der er relevante for netop denne afgørelse.
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

              <div className="space-y-2">
                {AVAILABLE_THEMES.map((theme) => {
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
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${isChecked ? "text-[#0F382C]" : "text-slate-700"}`}>
                            {theme.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
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

        {/* PANEL 2: MIDTERPANEL (CHAT & ANALYSE + TO UPLOAD-KNAPPER) */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-white border-r border-slate-200">
          {/* Top Bar: Upload-knapper */}
          <div className="border-b border-slate-200 bg-[#F7FAFA]/60 p-3 px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Sagsmateriale:
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Knap 1: Sagsdokument / Afgørelse (Primært fokus) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleUploadPrimary}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0F382C] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F382C] hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#2E8B57]" />
                    <span>1. Sagsdokument / Afgørelse</span>
                    <span className="rounded bg-[#0F382C] text-white text-[9px] px-1 py-0.2 font-mono">
                      Primært fokus
                    </span>
                  </button>
                </div>

                {/* Knap 2: Supplerende kilder */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleUploadSupplementary}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>2. Supplerende kilder</span>
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
                  <span className="text-[9px] text-emerald-800 font-bold bg-white/70 px-1 rounded">Afgørelse</span>
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
                    <span className={msg.sender === "user" ? "text-slate-300 font-semibold" : "text-[#0F382C] font-bold"}>
                      {msg.sender === "user" ? "Sagsbehandler" : "MVAI Afgørelsesanalyse"}
                    </span>
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
                        Anvendte retskilder (Klik for at inspicere):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src) => (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => setActiveSnippet(src)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border text-left transition-all cursor-pointer ${
                              activeSnippet?.id === src.id
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
                </div>
              </div>
            ))}
          </div>

          {/* Chat input box */}
          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="relative rounded-xl border border-slate-300 bg-white shadow-xs focus-within:border-[#0F382C] focus-within:ring-1 focus-within:ring-[#0F382C]">
                <textarea
                  rows={3}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder={`Stil spørgsmål til ${
                    scope === "projekt" ? "projektets VVM-screening/afgørelse" : "planens miljøvurdering"
                  } (f.eks. 'Hvilke krav stiller Klagenævnet til kumulationsvurdering jf. § 21?')...`}
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
                      <Lock className="w-3 h-3 text-emerald-600" />
                      Fortrolig RAG-søgning uden LLM-træning
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputPrompt.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F382C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#14493a] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span>Analysér</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* PANEL 3: HØJRE PANEL (KILDELÆSER / PREVIEW MED PDF DOWNLOAD) */}
        <aside className="w-96 shrink-0 border-l border-slate-200 bg-[#F7FAFA] flex flex-col justify-between overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0F382C]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Kildelæser & Verifikation
                </h3>
              </div>
              {activeSnippet && (
                <span className="rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5">
                  {activeSnippet.relevanceScore}% Match
                </span>
              )}
            </div>

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
                    Uddraget er hentet direkte fra den officielle kildetekst og indekseret uden fortolkende omskrivning.
                  </p>
                </div>

                {/* PDF Download Button (Direkte originalkilde) */}
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
                    onClick={() => {
                      alert(`Downloader original PDF: ${activeSnippet.pdfFileName}`);
                    }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F382C] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#14493a] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download original PDF</span>
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-slate-500">
                    Klar til vedhæftning som bilag i sagsbehandlingen.
                  </p>
                </div>
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

          <div className="p-3 border-t border-slate-200 bg-white text-[10px] text-slate-400 text-center">
            MVAI Kildeverifikationsmotor • Ingen AI-genererede referencer
          </div>
        </aside>
      </div>
    </div>
  );
}
