import { NextResponse } from "next/server";
import { AUTH_SETUP_HINT } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { danishAuthError } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = String(body?.password || "");
  const passwordConfirm = String(body?.passwordConfirm || "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Adgangskoden skal være mindst 8 tegn." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "Adgangskoderne er ikke ens." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: AUTH_SETUP_HINT }, { status: 500 });
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.json(
      { error: "Linket er udløbet. Bed om et nyt fra login-siden." },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Password update error:", error.message);
    return NextResponse.json({ error: danishAuthError(error.message) }, { status: 400 });
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
}
