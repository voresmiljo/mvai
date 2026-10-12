import { connection, NextResponse } from "next/server";
import { getSupabaseAuthConfig } from "@/lib/supabase/env";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  await connection();

  if (!getSupabaseAuthConfig()) {
    return NextResponse.json({ configured: false, user: null });
  }

  const user = await getSessionUser();
  return NextResponse.json({ configured: true, user });
}
