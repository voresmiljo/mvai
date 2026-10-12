export function getSupabaseAuthConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  if (!url || !key) return null;
  return { url, key };
}

export const AUTH_SETUP_HINT =
  "Login mangler nøgler på serveren. Sæt SUPABASE_URL og den publishable nøgle som SUPABASE_ANON_KEY.";
