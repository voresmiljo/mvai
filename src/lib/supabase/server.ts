import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAuthConfig } from "@/lib/supabase/env";
import { ipv4Fetch } from "@/lib/supabase/ipv4Fetch";

export async function createSupabaseServerClient() {
  const config = getSupabaseAuthConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    global: { fetch: ipv4Fetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Sessionen fornyes i proxy, når der kaldes fra en Server Component.
        }
      },
    },
  });
}
