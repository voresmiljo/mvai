import React, { Suspense } from "react";
import { CaseWorkspace } from "@/components/CaseWorkspace";

export const metadata = {
  title: "Arbejdsrum — MVAI.dk",
  description: "Retsligt 3-panels arbejdsinterface for miljøvurdering og sagsbehandling.",
};

export default function AppPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-xs text-slate-500">Indlæser sagsarbejdsrum...</div>}>
      <CaseWorkspace forcedCaseId="sag-biogas-2026" />
    </Suspense>
  );
}
