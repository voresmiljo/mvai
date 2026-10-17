import { parseCaseRoom, sanitizeCaseRoom, type CaseRoom } from "@/lib/caseRoom";
import { isPlaceholderTitle, normalizeCaseTitle, topicFromQuestion, uniqueCaseTitle } from "@/lib/caseTitles";
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
  createdAt: string;
  previewSummary: string;
  primaryDocument: string | null;
  room: CaseRoom | null;
};

type CaseRow = {
  id: string;
  title: string;
  case_number: string;
  scope: "projekt" | "plan";
  law_reference: string;
  preview_summary?: string | null;
  primary_document: string | null;
  created_at: string;
  updated_at: string;
};

function formatDanishStamp(value: string, withTime: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const zone = { timeZone: "Europe/Copenhagen" };
  return withTime
    ? date.toLocaleString("da-DK", {
        ...zone,
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("da-DK", {
        ...zone,
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function mapCase(row: CaseRow): StoredCase {
  return {
    id: row.id,
    title: row.title,
    caseNumber: row.case_number,
    scope: row.scope,
    scopeLabel: row.scope === "plan" ? "plan" : "projekt",
    lawReference: row.law_reference,
    updatedAt: formatDanishStamp(row.updated_at, true),
    createdAt: formatDanishStamp(row.created_at, false),
    previewSummary: row.preview_summary && !row.preview_summary.startsWith("{")
      ? row.preview_summary
      : "Sagen er oprettet og klar til dokumenter.",
    primaryDocument: row.primary_document,
    room: parseCaseRoom(row.preview_summary),
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

const LEGACY_TITLE: Record<"projekt" | "plan", string> = {
  projekt: "ny vvm-sag / miljøvurdering af projekt (§§ 15–25)",
  plan: "ny miljøvurdering af plan / program (§ 8)",
};

function titleNumber(scope: "projekt" | "plan", title: string): number | null {
  const label = scope === "plan" ? "plan" : "projekt";
  const match = title.trim().match(new RegExp(`^mv ${label} (\\d+)$`, "i"));
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function formatScopedTitle(scope: "projekt" | "plan", number: number): string {
  const label = scope === "plan" ? "plan" : "projekt";
  return `mv ${label} ${String(number).padStart(2, "0")}`;
}

export function formatProjectTitle(number: number): string {
  return formatScopedTitle("projekt", number);
}

function nextScopedNumber(scope: "projekt" | "plan", titles: string[]): number {
  const used = new Set<number>();
  for (const title of titles) {
    const number = titleNumber(scope, title);
    if (number) used.add(number);
  }
  let number = 1;
  while (used.has(number)) number += 1;
  return number;
}

async function assignLegacyTitles(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  scope: "projekt" | "plan"
): Promise<void> {
  const { data } = await supabase
    .from("cases")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .eq("scope", scope)
    .order("created_at", { ascending: true });

  const rows = (data || []) as { id: string; title: string }[];
  const titles = rows.map((row) => row.title);
  for (const row of rows) {
    if (row.title.trim().toLowerCase() !== LEGACY_TITLE[scope]) continue;
    const title = formatScopedTitle(scope, nextScopedNumber(scope, titles));
    titles.push(title);
    await supabase.from("cases").update({ title }).eq("id", row.id).eq("user_id", userId);
  }
}

async function assignLegacyCaseTitles(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string
): Promise<void> {
  await assignLegacyTitles(supabase, userId, "projekt");
  await assignLegacyTitles(supabase, userId, "plan");
}

export async function listOwnCases(): Promise<{ cases: StoredCase[]; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { cases: [], error: "Du er ikke logget ind." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { cases: [], error: "Login er ikke konfigureret." };

  await assignLegacyCaseTitles(supabase, user.id);

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, case_number, scope, law_reference, primary_document, created_at, updated_at")
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

  await assignLegacyCaseTitles(supabase, user.id);

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapCase(data as CaseRow);
}

export async function saveOwnCaseRoom(
  id: string,
  room: unknown,
  primaryDocument: string | null
): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Du er ikke logget ind." };

  const clean = sanitizeCaseRoom(room);
  if (!clean) return { error: "Samtalen kunne ikke gemmes." };
  const payload = JSON.stringify(clean);
  if (payload.length > 350000) return { error: "Samtalen er for lang til at gemme." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const name = primaryDocument?.trim().slice(0, 180) || null;
  const { error } = await supabase
    .from("cases")
    .update({ preview_summary: payload, primary_document: name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: caseTableError(error.message) || "Samtalen kunne ikke gemmes." };
  return {};
}

async function titlesForUser(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  exceptId?: string
): Promise<string[]> {
  const { data } = await supabase.from("cases").select("id, title").eq("user_id", userId);
  return ((data || []) as { id: string; title: string }[])
    .filter((row) => row.id !== exceptId)
    .map((row) => row.title);
}

export async function createOwnCase(
  scope: "projekt" | "plan",
  question?: string,
  requestedTitle?: string
): Promise<{ case?: StoredCase; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Log ind, før du opretter en sag." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const year = new Date().getFullYear();
  const caseNumber = scope === "plan" ? `${year}-PLAN-${suffix}` : `${year}-VVM-${suffix}`;
  await assignLegacyCaseTitles(supabase, user.id);
  const titles = await titlesForUser(supabase, user.id);
  const composed = requestedTitle ? normalizeCaseTitle(requestedTitle) : null;
  const fromQuestion = question?.trim() ? topicFromQuestion(question) : "";
  const title = composed
    ? uniqueCaseTitle(composed, titles)
    : fromQuestion && !isPlaceholderTitle(fromQuestion)
      ? uniqueCaseTitle(fromQuestion, titles)
      : formatScopedTitle(scope, nextScopedNumber(scope, titles));
  const lawReference =
    scope === "plan" ? "Miljøvurderingslovens afsnit II, §§ 8–14" : "Miljøvurderingslovens afsnit III, §§ 15–25";

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
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, created_at, updated_at")
    .single();

  if (error || !data) {
    return { error: caseTableError(error?.message || "") || "Sagen kunne ikke oprettes." };
  }

  return { case: mapCase(data as CaseRow) };
}

export async function touchOwnCase(id: string): Promise<{ case?: StoredCase; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Du er ikke logget ind." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const { data, error } = await supabase
    .from("cases")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    return { error: caseTableError(error?.message || "") || "Sagen kunne ikke opdateres." };
  }

  return { case: mapCase(data as CaseRow) };
}

export async function retitleOwnCaseFromQuestion(
  id: string,
  question: string
): Promise<{ case?: StoredCase; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Log ind, før du retter titlen." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const titles = await titlesForUser(supabase, user.id, id);
  return updateOwnCaseTitle(id, uniqueCaseTitle(topicFromQuestion(question), titles));
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

  const titles = await titlesForUser(supabase, user.id, id);
  const unique = uniqueCaseTitle(trimmed, titles);

  const { data, error } = await supabase
    .from("cases")
    .update({ title: unique, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, case_number, scope, law_reference, preview_summary, primary_document, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    return { error: caseTableError(error?.message || "") || "Titlen kunne ikke gemmes." };
  }

  return { case: mapCase(data as CaseRow) };
}

export async function deleteOwnCase(id: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Log ind, før du sletter sagen." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Login er ikke konfigureret." };

  const { data, error } = await supabase
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: caseTableError(error.message) || "Sagen kunne ikke slettes." };
  }
  if (!data || data.length === 0) return { error: "Sagen blev ikke fundet." };
  return {};
}
