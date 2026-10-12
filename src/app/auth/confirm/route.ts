import { connection, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const supabase = await createSupabaseServerClient();
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "confirm");

  if (!supabase) {
    return NextResponse.redirect(loginUrl);
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next");
  const destination = new URL(next && next.startsWith("/") && !next.startsWith("//") ? next : "/", url.origin);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(loginUrl);
}
