import { NextResponse } from "next/server";
import { contentDisposition, isSourceId, readSourceOriginal } from "@/lib/sourceOriginals";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Log ind for at hente originalen." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isSourceId(id)) {
    return NextResponse.json({ error: "Kilden blev ikke fundet." }, { status: 404 });
  }

  const file = await readSourceOriginal(id);
  if (!file) {
    return NextResponse.json({ error: "Originalen ligger ikke i arkivet." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": contentDisposition(file.fileName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
