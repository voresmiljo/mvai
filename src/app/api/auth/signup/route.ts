import { NextResponse } from "next/server";
import { AUTH_SETUP_HINT, publicSiteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { danishAuthError } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const passwordConfirm = String(body?.passwordConfirm || "");

  if (!email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Skriv en gyldig e-mail og en adgangskode på mindst 8 tegn." },
      { status: 400 }
    );
  }

  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "Adgangskoderne er ikke ens." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: AUTH_SETUP_HINT }, { status: 500 });
  }

  const redirectTo = `${publicSiteUrl(req)}/auth/confirm`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error("Signup error:", error.message);
    return NextResponse.json({ error: danishAuthError(error.message) }, { status: 400 });
  }

  const alreadyExists = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
  if (alreadyExists) {
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (resendError) {
      console.error("Resend confirmation error:", resendError.message);
      const text = resendError.message.toLowerCase();
      if (text.includes("already") && text.includes("confirm")) {
        return NextResponse.json(
          { error: "Der findes allerede en konto med den e-mail. Log ind." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: danishAuthError(resendError.message) }, { status: 400 });
    }

    return NextResponse.json({
      needsConfirmation: true,
      message:
        "Der fandtes allerede en oprettelse med den e-mail. En ny bekræftelsesmail er sendt fra kontakt@mvai.dk. Kig i indbakken og i spam.",
    });
  }

  if (!data.session) {
    return NextResponse.json({
      needsConfirmation: true,
      message:
        "Kontoen er oprettet. En bekræftelsesmail er sendt fra kontakt@mvai.dk. Kig i indbakken og i spam, og log derefter ind.",
    });
  }

  return NextResponse.json({
    user: { id: data.user?.id, email: data.user?.email },
  });
}
