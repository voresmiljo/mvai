export interface CaseItem {
  id: string;
  title: string;
  caseNumber: string;
  scope: "projekt" | "plan";
  scopeLabel: string;
  lawReference: string;
  authority: string;
  updatedAt: string;
  status: "active" | "draft" | "archived";
  primaryDocument?: string;
  themesCount: number;
  sourcesCount: number;
  previewSummary: string;
}

export const INITIAL_CASES: CaseItem[] = [
  {
    id: "sag-biogas-2026",
    title: "Udvidelse af Biogasanlæg (18.000 t/år)",
    caseNumber: "2026-BIO-0914",
    scope: "projekt",
    scopeLabel: "Konkret Projekt",
    lawReference: "VVM-lovens §§ 15–25 (Screening § 21)",
    authority: "Miljø & Teknik, Vesthimmerland",
    updatedAt: "I dag, 10:14",
    status: "active",
    primaryDocument: "Udkast_Afgørelse_Biogas_VVM_Screening_rev3.pdf",
    themesCount: 2,
    sourcesCount: 3,
    previewSummary:
      "Vurdering af kumulativ transportbelastning og afbødende foranstaltninger for Bilag IV-arter (markfirben).",
  },
  {
    id: "sag-kommuneplan-2026",
    title: "Kommuneplantillæg 14 for Solcellepark Ådalen",
    caseNumber: "2026-PLAN-0312",
    scope: "plan",
    scopeLabel: "Plan / Program",
    lawReference: "Miljøvurderingslovens § 8 (SMV)",
    authority: "Plan & Udvikling, Viborg Kommune",
    updatedAt: "9. okt. 2026",
    status: "active",
    primaryDocument: "Planudkast_og_Miljoevurdering_Solceller.pdf",
    themesCount: 3,
    sourcesCount: 5,
    previewSummary:
      "Strategisk miljøvurdering af planrammer med fokus på grundvand (BNBO), landskabskarakter og visuelle kumulationer.",
  },
  {
    id: "sag-boligomraade-2026",
    title: "Lokalplan for Blandet Byområde Havnepromenaden",
    caseNumber: "2026-LOK-1102",
    scope: "plan",
    scopeLabel: "Plan / Program",
    lawReference: "Miljøvurderingslovens § 8, stk. 2",
    authority: "By & Kultur, Odense",
    updatedAt: "4. okt. 2026",
    status: "draft",
    primaryDocument: "Miljoescreening_Lokalplan_Havnen.pdf",
    themesCount: 2,
    sourcesCount: 4,
    previewSummary:
      "Screening for støj- og lugtgener fra nærliggende erhvervshavn samt klimatilpasning og oversvømmelsesrisiko.",
  },
  {
    id: "sag-grundvand-2026",
    title: "Nedsivningsanlæg og udledning i sårbart indvindingsopland",
    caseNumber: "2026-VAND-0441",
    scope: "projekt",
    scopeLabel: "Konkret Projekt",
    lawReference: "VVM-lovens bilag 2 & Miljøbeskyttelsesloven",
    authority: "Vandmiljøafdelingen",
    updatedAt: "28. sep. 2026",
    status: "active",
    primaryDocument: "Hydrologisk_Vurdering_Opland_2026.pdf",
    themesCount: 2,
    sourcesCount: 2,
    previewSummary:
      "Screening af risiko for grundvandsforurening i boringsnære beskyttelsesområder (BNBO).",
  },
];
