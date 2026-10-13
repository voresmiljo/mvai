import { NextResponse } from "next/server";
import { THEME_FOLDERS } from "@/lib/themeFolders";
import OpenAI from "openai";

interface TaggingRequest {
  fileName: string;
  fileTextSnippet?: string;
  scope?: "projekt" | "plan";
}

export async function POST(req: Request) {
  try {
    const body: TaggingRequest = await req.json();
    const { fileName, fileTextSnippet = "", scope = "projekt" } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "Filnavn mangler." },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Hvis OpenAI API-nøgle er til stede: Kør lynhurtig tagging med GPT-4o-mini
    if (openaiApiKey) {
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const prompt = `Analysér følgende miljøretlige dokument for sagsbehandlingen i Danmark:
Filnavn: "${fileName}"
Uddrag: "${fileTextSnippet.slice(0, 1500)}"
Scope: ${scope === "plan" ? "Plan / Program (§ 8)" : "Konkret Projekt (§§ 15–25)"}

Returnér KUN et JSON-objekt med:
{
  "documentType": "Screeningsudkast" | "VVM-rapport" | "Feltundersøgelse" | "Høringssvar" | "Teknisk notat" | "Andet",
  "recommendedThemes": [${THEME_FOLDERS.map((folder) => `"${folder.id}"`).join(" | ")}],
  "keyLegalParagraphs": ["f.eks. § 21", "Bilag 6", "Art. 12"],
  "summary": "1-2 korte sætninger på dansk om dokumentets indhold",
  "potentialRiskPoints": ["1 kort opmærksomhedspunkt vedr. klagerisiko"]
}`;

      const completion = await openai.chat.completions.create({
        model: process.env.TAGGING_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const parsed = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      return NextResponse.json({
        ...parsed,
        taggedBy: "GPT-4o-mini",
      });
    }

    // Heuristisk hurtig-tagging hvis API-nøgle ikke er aktiv
    const lowerName = fileName.toLowerCase();
    const recommendedThemes: string[] = [];

    if (lowerName.includes("art") || lowerName.includes("bilag") || lowerName.includes("firben") || lowerName.includes("flagermus")) {
      recommendedThemes.push("artsbeskyttelse");
    }
    if (lowerName.includes("natura") || lowerName.includes("habitat") || lowerName.includes("fugle")) {
      recommendedThemes.push("natura2000");
    }
    if (lowerName.includes("støj") || lowerName.includes("lugt") || lowerName.includes("luft") || lowerName.includes("trafik") || lowerName.includes("vibration")) {
      recommendedThemes.push("stoej_og_luft");
    }
    if (lowerName.includes("vand") || lowerName.includes("grundvand") || lowerName.includes("bnbo") || lowerName.includes("spildevand")) {
      recommendedThemes.push("grundvand");
    }
    if (lowerName.includes("§ 3") || lowerName.includes("naturtype") || lowerName.includes("mose") || lowerName.includes("overdrev")) {
      recommendedThemes.push("paragraf_3_natur");
    }
    if (lowerName.includes("kyst") || lowerName.includes("landskab")) {
      recommendedThemes.push("kyst_og_landskab");
    }
    if (lowerName.includes("kirke") || lowerName.includes("fortidsminde") || lowerName.includes("arkæolog") || lowerName.includes("museum")) {
      recommendedThemes.push("kulturarv");
    }
    if (lowerName.includes("vind") || lowerName.includes("solcelle")) {
      recommendedThemes.push("ve_anlaeg");
    }
    if (lowerName.includes("råstof") || lowerName.includes("infrastruktur") || lowerName.includes("jordforurening")) {
      recommendedThemes.push("byudvikling");
    }
    if (lowerName.includes("inhabilitet") || lowerName.includes("partshøring") || lowerName.includes("klagefrist")) {
      recommendedThemes.push("sagsbehandling");
    }
    return NextResponse.json({
      documentType: lowerName.includes("screening") ? "Screeningsudkast" : "Teknisk notat",
      recommendedThemes,
      keyLegalParagraphs: scope === "plan" ? ["§ 8", "Bilag 3"] : ["§ 21", "Bilag 6"],
      summary: `Automatisk indekseret dokument '${fileName}' til sagsrummet.`,
      potentialRiskPoints: ["Kontrollér om dokumentets forudsætninger er ajourført med seneste nævnspraksis."],
      taggedBy: "Regelbaseret klassificering (Fallback for GPT-4o-mini)",
    });
  } catch (err: unknown) {
    console.error("Tagging error:", err);
    return NextResponse.json(
      { error: "Fejl ved baggrundstagging af dokument." },
      { status: 500 }
    );
  }
}
