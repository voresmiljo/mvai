import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/extractPdfText";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const scope = (formData.get("scope") as string) || "projekt";
    const documentCategory = (formData.get("category") as string) || "primary";

    if (!file) {
      return NextResponse.json({ error: "Ingen fil modtaget." }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Kun PDF-filer kan indlæses." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: fullText, pageCount } = await extractPdfText(buffer);

    if (!fullText) {
      return NextResponse.json(
        {
          error:
            "PDF'en indeholder ingen læsbar tekst. Scannede dokumenter uden tekstlag kan ikke analyseres.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      textLength: fullText.length,
      textSnippet: fullText.slice(0, 4000),
      fullText,
      documentCategory,
      scope,
    });
  } catch (err: unknown) {
    console.error("PDF upload error:", err);
    return NextResponse.json(
      { error: "Kunne ikke udtrække tekst fra PDF.", details: String(err) },
      { status: 500 }
    );
  }
}
