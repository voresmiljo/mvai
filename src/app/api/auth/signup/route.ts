import { NextResponse } from "next/server";
import { AUTH_SETUP_HINT, publicSiteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { danishAuthError } from "@/lib/session";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: AUTH_SETUP_HINT }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Skriv en gyldig e-mail og en adgangskode på mindst 8 tegn." },
      { status: 400 }
    );
  }

  const redirectTo = `${publicSiteUrl(req)}/auth/confirm`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    return NextResponse.json({ error: danishAuthError(error.message) }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json({
      needsConfirmation: true,
      message: "Kontoen er oprettet. Bekræft e-mailen, og log derefter ind.",
    });
  }

  return NextResponse.json({
    user: { id: data.user?.id, email: data.user?.email },
  });
}
