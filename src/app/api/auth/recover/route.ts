import { NextResponse } from "next/server";
import { AUTH_SETUP_HINT, publicSiteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { danishAuthError } from "@/lib/session";

const SENT =
  "Hvis der findes en konto med den e-mail, er der sendt et link til en ny adgangskode fra kontakt@mvai.dk. Kig i indbakken og i spam.";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Skriv en gyldig e-mail." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: AUTH_SETUP_HINT }, { status: 500 });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${publicSiteUrl(req)}/auth/confirm`,
  });

  if (error) {
    const text = error.message.toLowerCase();
    if (text.includes("not found") || text.includes("user not")) {
      return NextResponse.json({ message: SENT });
    }
    const detail = [error.message, error.code, error.status]
      .filter((part) => part != null && part !== "")
      .join(" | ")
      .slice(0, 300);
    console.error("Password recovery error:", detail);
    return NextResponse.json({ error: danishAuthError(error.message), detail }, { status: 400 });
  }

  return NextResponse.json({ message: SENT });
}
