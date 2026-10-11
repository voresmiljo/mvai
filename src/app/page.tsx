"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { INITIAL_CASES } from "@/lib/casesData";
import {
  FilePlus2,
  FolderKanban,
  FileText,
  Layers,
  Scale,
  Search,
  ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const cases = INITIAL_CASES;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"alle" | "projekt" | "plan">("alle");

  const filteredCases = cases.filter((c) => {
    const matchesFilter =
      selectedFilter === "alle" || c.scope === selectedFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.authority.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleStartCase = (scope: "plan" | "projekt") => {
    const timestamp = Date.now().toString().slice(-4);
    const newCaseId =
      scope === "plan" ? `ny-plan-${timestamp}` : `ny-projekt-${timestamp}`;
    router.push(`/sag/${newCaseId}?scope=${scope}&new=1`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      <AppHeader />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          {/* Top Banner: Retslig sagsopstart */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Arbejdsrum for Miljøsagsbehandling
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Start en ny analyse eller genoptag en igangværende sag. Alle analyser er kildeforankret i gældende ret.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>RAG-indeks ajourført (LBK nr. 4 / 2026)</span>
              </div>
            </div>

            {/* Sektion 1: 'Start ny sag'-blok med to store knapper */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <FilePlus2 className="w-4 h-4 text-[#0F382C]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Start ny sag
                </h2>
                <span className="text-[11px] text-slate-400 font-normal">
                  — Vælg retsligt procesgrundlag
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Knap 1: Miljøvurdering af planer (§ 8) */}
                <button
                  type="button"
                  onClick={() => handleStartCase("plan")}
                  className="group relative flex flex-col justify-between rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white to-[#F7FAFA] p-6 text-left transition-all hover:border-[#0F382C] hover:bg-emerald-50/20 hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#0F382C] border border-emerald-200/80">
                        <Layers className="w-3.5 h-3.5 text-[#2E8B57]" />
                        <span>Afsnit II — Lovens § 8</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 group-hover:text-[#0F382C] transition-colors">
                        Opret sag &rarr;
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0F382C] transition-colors">
                        Miljøvurdering af planer
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        Strategisk miljøvurdering (SMV) for kommuneplantillæg, lokalplaner, affalds- og vandplaner jf. miljøvurderingslovens § 8.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Låser til: SMV-direktivet & § 8</span>
                    <span className="font-semibold text-emerald-800">Klik for at starte</span>
                  </div>
                </button>

                {/* Knap 2: Miljøvurdering af projekter (§§ 15–25) */}
                <button
                  type="button"
                  onClick={() => handleStartCase("projekt")}
                  className="group relative flex flex-col justify-between rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white to-[#F7FAFA] p-6 text-left transition-all hover:border-[#0F382C] hover:bg-emerald-50/20 hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#2A3B47] border border-slate-200">
                        <Scale className="w-3.5 h-3.5 text-[#2A3B47]" />
                        <span>Afsnit III — Lovens §§ 15–25</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 group-hover:text-[#0F382C] transition-colors">
                        Opret sag &rarr;
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0F382C] transition-colors">
                        Miljøvurdering af projekter
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        Konkrete anlægsprojekter, VVM-screeninger jf. § 21 (bilag 2) eller fulde miljøkonsekvensrapporter jf. § 15 (bilag 1).
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Låser til: VVM-regler & Bilag 6</span>
                    <span className="font-semibold text-emerald-800">Klik for at starte</span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Sektion 2: Bund-sektion 'Dine sager' */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#0F382C]" />
                <h2 className="text-base font-bold text-slate-900">
                  Dine sager
                </h2>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {filteredCases.length}
                </span>
              </div>

              {/* Filters and search */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Søg i sagsnummer, titel..."
                    className="w-48 sm:w-64 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs placeholder-slate-400 focus:border-[#0F382C] focus:outline-none"
                  />
                </div>

                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("alle")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      selectedFilter === "alle"
                        ? "bg-[#0F382C] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("projekt")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      selectedFilter === "projekt"
                        ? "bg-[#0F382C] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Projekter
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("plan")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      selectedFilter === "plan"
                        ? "bg-[#0F382C] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Planer
                  </button>
                </div>
              </div>
            </div>

            {/* Case List */}
            {filteredCases.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/sag/${c.id}`}
                    className="group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-[#0F382C] hover:shadow-xs hover:bg-[#FDFEFE]"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {c.caseNumber}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            c.scope === "projekt"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {c.scopeLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          • {c.lawReference}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0F382C] transition-colors truncate">
                        {c.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-1">
                        {c.previewSummary}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-400">
                        {c.primaryDocument && (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate max-w-xs">
                            <FileText className="w-3 h-3 text-[#2E8B57]" />
                            {c.primaryDocument}
                          </span>
                        )}
                        <span>{c.themesCount} temamapper</span>
                        <span>{c.sourcesCount} anvendte kilder</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-xs">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] text-slate-400">Sidst redigeret</p>
                        <p className="font-medium text-slate-700">{c.updatedAt}</p>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 group-hover:border-[#0F382C] group-hover:bg-[#0F382C] group-hover:text-white transition-all text-slate-400">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                <FolderKanban className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Ingen sager matcher søgningen</p>
                <p className="text-xs text-slate-400 mt-1">Prøv at rydde søgefeltet eller skifte filter.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">MVAI.dk</span>
            <span>•</span>
            <span>Miljøvurderingsvejen</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/om" className="hover:text-slate-800">
              Metode & Retsgrundlag
            </Link>
            <Link href="/om" className="hover:text-slate-800">
              Datasikkerhed & GDPR
            </Link>
            <span>v2026.4 (EU Frankfurt)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
