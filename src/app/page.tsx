"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import {
  FilePlus2,
  FolderKanban,
  FileText,
  Layers,
  Scale,
  Search,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

type DashboardCase = {
  id: string;
  title: string;
  caseNumber: string;
  scope: "projekt" | "plan";
  scopeLabel: string;
  lawReference: string;
  updatedAt: string;
  createdAt: string;
  previewSummary: string;
  primaryDocument?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState("");
  const [creating, setCreating] = useState<"plan" | "projekt" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  useLayoutEffect(() => {
    return () => {
      setCreating(null);
      setOpenMenuId(null);
      setConfirmDeleteId(null);
      setEditingId(null);
    };
  }, []);
  const [selectedFilter, setSelectedFilter] = useState<"alle" | "projekt" | "plan">("alle");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCases([]);
      setCasesError("");
      return;
    }

    let cancelled = false;
    setCasesLoading(true);
    fetch("/api/cases")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Sagerne kunne ikke hentes.");
        if (!cancelled) setCases(data.cases || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCasesError(err instanceof Error ? err.message : "Sagerne kunne ikke hentes.");
      })
      .finally(() => {
        if (!cancelled) setCasesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!openMenuId) return;
    const close = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-case-menu]")) return;
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenuId]);

  const saveCaseTitle = async (id: string) => {
    const next = titleDraft.trim().replace(/\s+/g, " ");
    const current = cases.find((item) => item.id === id);
    if (!next || next === current?.title) {
      setEditingId(null);
      return;
    }
    setCasesError("");
    const res = await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.case) {
      setCasesError(data.error || "Titlen kunne ikke gemmes.");
      return;
    }
    setCases((prev) => prev.map((item) => (item.id === id ? data.case : item)));
    setEditingId(null);
  };

  const removeCase = async (id: string) => {
    setCasesError("");
    const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCasesError(data.error || "Sagen kunne ikke slettes.");
      return;
    }
    setCases((prev) => prev.filter((item) => item.id !== id));
    setOpenMenuId(null);
    setConfirmDeleteId(null);
  };

  const filteredCases = cases.filter((c) => {
    const matchesFilter =
      selectedFilter === "alle" || c.scope === selectedFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleStartCase = async (scope: "plan" | "projekt") => {
    if (!user) {
      router.push("/login?next=/");
      return;
    }

    setCreating(scope);
    setCasesError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.case?.id) {
        throw new Error(data.error || "Sagen kunne ikke oprettes.");
      }
      router.push(`/sag/${data.case.id}?scope=${scope}`);
    } catch (err) {
      setCasesError(err instanceof Error ? err.message : "Sagen kunne ikke oprettes.");
      setCreating(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      <AppHeader />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="space-y-4">
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
                {/* Knap 1: Miljøvurdering af planer og programmer (§ 8) */}
                <button
                  type="button"
                  onClick={() => handleStartCase("plan")}
                  disabled={creating !== null || authLoading}
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
                        Miljøvurdering af planer og programmer
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        Strategisk miljøvurdering (SMV) for kommuneplantillæg, lokalplaner, sektorplaner m.fl. jf. miljøvurderingslovens § 8.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Knap 2: Miljøvurdering af projekter (§§ 15–25) */}
                <button
                  type="button"
                  onClick={() => handleStartCase("projekt")}
                  disabled={creating !== null || authLoading}
                  className="group relative flex flex-col justify-between rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white to-[#F7FAFA] p-6 text-left transition-all hover:border-[#0F382C] hover:bg-emerald-50/20 hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#2A3B47] border border-slate-200">
                        <Scale className="w-3.5 h-3.5 text-[#2A3B47]" />
                        <span>Afsnit III — Lovens § 15</span>
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
                    placeholder="Søg i titel..."
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
            {casesError && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                {casesError}
              </p>
            )}

            {authLoading || (user && casesLoading) ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
                Henter dine sager...
              </div>
            ) : !user ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                <FolderKanban className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Log ind for at se dine sager</p>
                <p className="text-xs text-slate-400 mt-1">
                  Efter login vises de sager, du har oprettet, her.
                </p>
                <Link
                  href="/login?next=/"
                  className="mt-4 inline-flex rounded-lg bg-[#0F382C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#14493a]"
                >
                  Log ind
                </Link>
              </div>
            ) : filteredCases.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredCases.map((c) => {
                  const isEditing = editingId === c.id;
                  const menuOpen = openMenuId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-[#0F382C] hover:shadow-xs hover:bg-[#FDFEFE] ${
                        menuOpen ? "z-20" : ""
                      }`}
                    >
                      {!isEditing && (
                        <Link
                          href={`/sag/${c.id}?scope=${c.scope}`}
                          aria-label={`Åbn ${c.title}`}
                          className="absolute inset-0 rounded-xl"
                        />
                      )}

                      <div className={`space-y-1.5 flex-1 min-w-0 ${isEditing ? "" : "pointer-events-none"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              c.scope === "projekt"
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {c.scopeLabel}
                          </span>
                        </div>

                        {isEditing ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveCaseTitle(c.id);
                            }}
                            className="relative z-10 flex flex-wrap items-center gap-2"
                          >
                            <input
                              aria-label={`Titel for ${c.title}`}
                              autoFocus
                              value={titleDraft}
                              maxLength={120}
                              onChange={(event) => setTitleDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setEditingId(null);
                                }
                              }}
                              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-[#0F382C]"
                            />
                            <button
                              type="submit"
                              className="rounded-md bg-[#0F382C] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#14493a]"
                            >
                              Gem
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Annuller
                            </button>
                          </form>
                        ) : (
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0F382C] transition-colors truncate">
                            {c.title}
                          </h3>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-1">
                          Oprettet {c.createdAt}
                        </p>

                        {c.primaryDocument && (
                          <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate max-w-xs">
                              <FileText className="w-3 h-3 text-[#2E8B57]" />
                              {c.primaryDocument}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pointer-events-none relative z-10 flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-xs">
                        <div className="pointer-events-none text-left md:text-right">
                          <p className="text-[11px] text-slate-400">Sidst redigeret</p>
                          <p className="font-medium text-slate-700">{c.updatedAt}</p>
                        </div>

                        <div className="pointer-events-auto relative" data-case-menu={c.id}>
                          <button
                            type="button"
                            aria-label={`Handlinger for ${c.title}`}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={() => {
                              setEditingId(null);
                              setConfirmDeleteId(null);
                              setOpenMenuId(menuOpen ? null : c.id);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#0F382C] hover:text-[#0F382C]"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpen && (
                            <div
                              role="menu"
                              className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg"
                            >
                              {confirmDeleteId === c.id ? (
                                <div className="p-2">
                                  <p className="font-semibold text-slate-800">Slet sagen?</p>
                                  <p className="mt-1 text-[11px] text-slate-500">Det kan ikke fortrydes.</p>
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void removeCase(c.id)}
                                      className="rounded-md bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800"
                                    >
                                      Slet
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded-md border border-slate-300 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Annuller
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setTitleDraft(c.title);
                                      setEditingId(c.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full rounded-md px-2.5 py-2 text-left font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Rediger titel
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => setConfirmDeleteId(c.id)}
                                    className="flex w-full rounded-md px-2.5 py-2 text-left font-medium text-red-700 hover:bg-red-50"
                                  >
                                    Slet sag
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pointer-events-none flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 group-hover:border-[#0F382C] group-hover:bg-[#0F382C] group-hover:text-white transition-all text-slate-400">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                <FolderKanban className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">
                  {cases.length === 0 ? "Du har ingen sager endnu" : "Ingen sager matcher søgningen"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {cases.length === 0
                    ? "Start en plan eller et projekt ovenfor. Sagen bliver stående på denne liste."
                    : "Prøv at rydde søgefeltet eller skifte filter."}
                </p>
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
