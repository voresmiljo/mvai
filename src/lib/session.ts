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
  if (text.includes("afviste adgangskoden")) {
    return "one.com afviste adgangskoden til kontakt@mvai.dk.";
  }
  if (text.includes("forbindelsen til one.com")) {
    return "Forbindelsen til one.com kunne ikke oprettes.";
  }
  if (text.includes("mailhemmeligheden mangler")) {
    return "Mailhemmeligheden mangler på serveren.";
  }
  if (text.includes("adgangskoden til mailen mangler") || text.includes("mangler på serveren")) {
    return "Adgangskoden til mailen mangler på serveren.";
  }
  if (
    text.includes("signatur") ||
    text.includes("authorization token") ||
    text.includes("no matching signature")
  ) {
    return "Bekræftelsesmailens signatur blev afvist.";
  }
  if (text.includes("failed to reach hook") || text.includes("maximum time")) {
    return "Bekræftelsesmailen nåede ikke frem i tide. Prøv igen om et øjeblik.";
  }
  if (
    text.includes("error sending") ||
    text.includes("smtp") ||
    text.includes("confirmation email") ||
    text.includes("bekræftelsesmailen kunne ikke sendes") ||
    text.includes("unexpected status code") ||
    text.includes("hook")
  ) {
    return "Bekræftelsesmailen kunne ikke sendes fra kontakt@mvai.dk. Prøv igen om et øjeblik.";
  }
  return "Login kunne ikke gennemføres. Prøv igen.";
}
