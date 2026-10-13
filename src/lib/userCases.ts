import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";

export type StoredCase = {
  id: string;
  title: string;
  caseNumber: string;
  scope: "projekt" | "plan";
  scopeLabel: string;
  lawReference: string;
  updatedAt: string;
  previewSummary: string;
  primaryDocument: string | null;
};

type CaseRow = {
  id: string;
  title: string;
  case_number: string;
  scope: "projekt" | "plan";
  law_reference: string;
  preview_summary: string | null;
  primary_document: string | null;
  updated_at: string;
};

function mapCase(row: CaseRow): StoredCase {
  const updated = new Date(row.updated_at);
  const updatedAt = Number.isNaN(updated.getTime())
    ? row.updated_at
    : updated.toLocaleString("da-DK", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

  return {
    id: row.id,
    title: row.title,
    caseNumber: row.case_number,
    scope: row.scope,
    scopeLabel: row.scope === "plan" ? "Plan / Program" : "Konkret projekt",
    lawReference: row.law_reference,
    updatedAt,
    previewSummary: row.preview_summary || "Sagen er oprettet og klar til dokumenter.",
    primaryDocument: row.primary_document,
  };
}

export function caseTableError(message: string): string | null {
  const text = message.toLowerCase();
  if (text.includes("cases") && (text.includes("relation") || text.includes("schema cache") || text.includes("does not exist"))) {
    return "Sagstabellen mangler i databasen. Kør src/lib/supabase-auth.sql i Supabase SQL Editor.";
  }
  if (text.includes("row-level security") || text.includes("permission denied")) {
    return "Databasen afviste sagen. Kør src/lib/supabase-auth.sql, så brugeren kun kan se sine egne sager.";
  }
  return null;
}

const LEGACY_PROJECT_TITLE = "ny vvm-sag / miljøvurdering af projekt (§§ 15–25)";

function projectNumber(title: string): number | null {
  const match = title.trim().match(/^mv projekt (\d+)$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function formatProjectTitle(number: number): string {
  return `mv projekt ${String(number).padStart(2, "0")}`;
}

function nextProjectNumber(titles: string[]): number {
  const used = new Set<number>();
  for (const title of titles) {
    const number = projectNumber(title);
    if (number) used.add(number);
  }
  let number = 1;
  while (used.has(number)) number += 1;
  return number;
}

async function assignLegacyProjectTitles(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("cases")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .eq("scope", "projekt")
    .order("created_at", { ascending: true });

  const rows = (data || []) as { id: string; title: string }[];
  const titles = rows.map((row) => row.title);
  for (const row of rows) {
    if (row.title.trim().toLowerCase() !== LEGACY_PROJECT_TITLE) continue;
    const number = nextProjectNumber(titles);
    const title = formatProjectTitle(number);
    titles.push(title);
    await supabase.from("cases").update({ title }).eq("id", row.id).eq("user_id", userId);
  }
}

export async function listOwnCases(): Promise<{ cases: StoredCase[]; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { cases: [], error: "Du er ikke logget ind." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { cases: [], error: "Login er ikke konfigureret." };

  await assignLegacyProjectTitles(supabase, user.id);

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return { cases: [], error: caseTableError(error.message) || "Sagerne kunne ikke hentes." };
  }

  return { cases: ((data || []) as CaseRow[]).map(mapCase) };
}

export async function getOwnCase(id: string): Promise<StoredCase | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  await assignLegacyProjectTitles(supabase, user.id);

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, updated_at")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapCase(data as CaseRow);
}

export async function createOwnCase(scope: "projekt" | "plan"): Promise<{ case?: StoredCase; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Log ind, før du opretter en sag." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  const caseNumber = scope === "plan" ? `${year}-PLAN-${suffix}` : `${year}-VVM-${suffix}`;
  let title = "Ny miljøvurdering af plan / program (§ 8)";
  if (scope === "projekt") {
    await assignLegacyProjectTitles(supabase, user.id);
    const { data: existing } = await supabase
      .from("cases")
      .select("title")
      .eq("user_id", user.id)
      .eq("scope", "projekt");
    const titles = ((existing || []) as { title: string }[]).map((row) => row.title);
    title = formatProjectTitle(nextProjectNumber(titles));
  }
  const lawReference =
    scope === "plan" ? "Miljøvurderingslovens § 8" : "Miljøvurderingslovens §§ 15–25";

  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_id: user.id,
      title,
      case_number: caseNumber,
      scope,
      law_reference: lawReference,
      preview_summary: "",
    })
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, updated_at")
    .single();

  if (error || !data) {
    return { error: caseTableError(error?.message || "") || "Sagen kunne ikke oprettes." };
  }

  return { case: mapCase(data as CaseRow) };
}

export async function updateOwnCaseTitle(
  id: string,
  title: string
): Promise<{ case?: StoredCase; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Log ind, før du retter titlen." };

  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) return { error: "Skriv en titel." };
  if (trimmed.length > 120) return { error: "Titlen må højst være 120 tegn." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const { data, error } = await supabase
    .from("cases")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, updated_at")
    .maybeSingle();

  if (error || !data) {
    return { error: caseTableError(error?.message || "") || "Titlen kunne ikke gemmes." };
  }

  return { case: mapCase(data as CaseRow) };
}
