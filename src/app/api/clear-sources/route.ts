import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Kunne ikke forbinde til Supabase. Tjek SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    // Slet alle rækker fra legal_sources
    const { error } = await supabase
      .from("legal_sources")
      .delete()
      .neq("title", "___never_matches___"); // Sletter alle rækker

    if (error) {
      return NextResponse.json(
        { error: "Fejl ved sletning af kilder i Supabase.", details: error.message },
        { status: 500 }
      );
    }

    // Verificér tælleren efter sletning
    const { count, error: countErr } = await supabase
      .from("legal_sources")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      message: "Alle kilder er nu slettet fra Supabase legal_sources. Databasen er helt tom og klar til egne uploads.",
      remainingCount: countErr ? 0 : count,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Uventet fejl ved nulstilling.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
