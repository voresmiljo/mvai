import React, { Suspense } from "react";
import { CaseWorkspace } from "@/components/CaseWorkspace";
import { getOwnCase } from "@/lib/userCases";

export const metadata = {
  title: "Sagsbehandling — MVAI.dk",
  description: "Retsligt 3-panels arbejdsinterface for miljøvurdering og sagsbehandling.",
};

async function CaseRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const storedCase = await getOwnCase(id);

  return (
    <CaseWorkspace
      forcedCaseId={id}
      forcedScope={storedCase?.scope}
      forcedTitle={storedCase?.title}
      forcedCaseNumber={storedCase?.caseNumber}
    />
  );
}

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-xs text-slate-500">Indlæser sagsarbejdsrum...</div>}>
      <CaseRoom params={params} />
    </Suspense>
  );
}
