import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  return { id: data.user.id, email: data.user.email };
}

export function danishAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login")) return "E-mail eller adgangskode er forkert.";
  if (text.includes("email not confirmed")) return "Bekræft e-mailen, før du logger ind.";
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "Der findes allerede en konto med den e-mail. Log ind.";
  }
  if (text.includes("password")) return "Adgangskoden skal være mindst 8 tegn.";
  if (text.includes("rate limit")) return "Der er forsøgt for mange gange. Vent et øjeblik og prøv igen.";
  if (text.includes("error sending") || text.includes("smtp") || text.includes("confirmation email")) {
    return "Bekræftelsesmailen kunne ikke sendes. Tjek SMTP i Supabase: send.one.com, port 587, og adgangskoden til kontakt@mvai.dk.";
  }
  return "Login kunne ikke gennemføres. Prøv igen.";
}
