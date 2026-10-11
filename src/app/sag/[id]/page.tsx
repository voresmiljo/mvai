import React, { Suspense } from "react";
import { CaseWorkspace } from "@/components/CaseWorkspace";

export const metadata = {
  title: "Sagsbehandling — MVAI.dk",
  description: "Retsligt 3-panels arbejdsinterface for miljøvurdering og sagsbehandling.",
};

export default function CasePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-xs text-slate-500">Indlæser sagsarbejdsrum...</div>}>
      <CaseWorkspace />
    </Suspense>
  );
}
