import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { searchSupabaseLegalSources } from "@/lib/vectorSearch";

interface RequestBody {
  message: string;
  scope: "projekt" | "plan";
  themes: string[];
  caseTitle?: string;
  caseNumber?: string;
  primaryFile?: string | null;
  supplementaryFiles?: string[];
  history?: Array<{ sender: "user" | "ai"; text: string }>;
  output?: Array<{ id?: string; title?: string; content?: string; date?: string }>;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const {
      message,
      scope,
      themes = [],
      caseTitle,
      caseNumber,
      primaryFile,
      supplementaryFiles = [],
      history = [],
      output = [],
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Et gyldigt spørgsmål skal angives." },
        { status: 400 }
      );
    }

    const scopeName =
      scope === "plan"
        ? "Plan / Program (Afsnit II / § 8 - Strategisk Miljøvurdering)"
        : "Konkret Projekt (Afsnit III / §§ 15–25 - VVM-screening & tilladelse)";

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const fileContext = primaryFile
      ? `Primært dokument: ${primaryFile}. Sekundære dokumenter: ${supplementaryFiles.join(", ") || "Ingen"}. Det primære dokument er det dokument, sagen handler om. Det kan være et udkast, en miljørapport, en afgørelse eller et andet dokument, der skal vurderes, også når formålet er at skrive en klage. Sekundære dokumenter er materiale, det primære dokument skal sammenholdes med.`
      : `Brugeren har ikke uploadet et primært dokument endnu. Besvar ud fra generel gældende dansk miljøret og klagenævnspraksis for det valgte emne.`;

    // Hent retskilder via semantisk vektorsøgning i Supabase
    // Når databasen er tom, er retrievedSources tom, og Claude svarer ud fra de reelle forhold jf. prompten
    const retrievedSources = await searchSupabaseLegalSources(message, scope, themes);
    const savedOutput = (Array.isArray(output) ? output : [])
      .filter((item) => item && typeof item.title === "string" && typeof item.content === "string" && item.content.trim())
      .slice(0, 8)
      .map((item, index) => ({
        id: item.id || `output-${index}`,
        title: item.title!.trim(),
        citation: `Output: ${item.title!.trim()}`,
        lawSection: "Gemt output",
        date: item.date || "",
        textSnippet: item.content!.trim().slice(0, 8000),
        pdfUrl: "",
        pdfFileName: "",
        relevanceScore: 100,
      }));
    const sources = [...savedOutput, ...retrievedSources];

    const sourcesContext = retrievedSources.length > 0
      ? retrievedSources
          .map(
            (s) =>
              `[RETSKILDE: ${s.title}]\nHenvisning: ${s.citation}\nAfsnit: ${s.lawSection}\nDato: ${s.date}\nUddrag:\n"${s.textSnippet}"`
          )
          .join("\n\n")
      : "Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter i databasen for de valgte temamapper.";

    const outputContext = savedOutput.length > 0
      ? savedOutput
          .map(
            (item) =>
              `[OUTPUT: ${item.title}]\nHenvisning: ${item.citation}\nDato: ${item.date || "Ikke angivet"}\nTekst:\n"${item.textSnippet}"`
          )
          .join("\n\n")
      : "Der er ikke gemt output i sagen endnu.";

    const systemPrompt = `Du er MVAI – en specialiseret, objektiv og fagligt funderet digital assistent til miljøvurdering af planer, programmer og konkrete projekter i Danmark. Du betjener myndigheder, rådgivere, forskere og miljøorganisationer.

DIT RETSLIGE ARBEJDSOMRÅDE FOR DENNE SAG ER:
- Proceskategori: ${scopeName}
- Sag: ${caseTitle || "Miljøsag"} (${caseNumber || "2026"})
- Sagsakter: ${fileContext}
- Aktive Temamapper: ${themes.join(", ") || "Ingen specifikke (kun grundlovgivning)"}

MEDFØLGENDE RETSKILDER OG NÆVNSPRAKSIS FRA SYSTEMETS KILDEMATRIX:
${sourcesContext}

GEMT OUTPUT FRA DENNE SAG:
${outputContext}

DINE PRIMÆRE PRINCIPPER:

1. STRICT KILDEFORANKRING (NUL HALLUCINATIONER):
Du skal forankre dine svar i ovenstående medfølgende retskilder, gemt output fra sagen, grundlovgivningen (Lovbekendtgørelse nr. 4 af 03/01/2023 med senere ændringer, bekendtgørelser, habitatdirektivet og EU-retlig præcedens som Waddenzee C-127/02) samt eventuelle uploadede sagsakter. Gemt output bruges som kildemateriale i denne sag og henvises som [Output: titel]. Det er ikke en almindelig retskilde og lægges ikke i temamapperne. Du må ALDRIG opdigte antagelser eller supplere med uverificerede påstande.

2. HÅNDTERING AF TVIVL OG MANGLER:
Hvis kildematerialet ikke indeholder tilstrækkelig information til at besvare spørgsmålet fuldstændigt, eller hvis der er modstrid i kilderne, SKAL du eksplicit gøre opmærksom på dette. Du skal hellere svare: "Det fremgår ikke entydigt af det aktiverede kildegrundlag..." end at gætte.

3. UVILDIGHED OG OBJEKTIVITET:
Du skal altid forholde dig 100 % neutralt, fagligt nøgternt og juridisk objektivt. Du repræsenterer hverken bygherrers, klageres eller specifikke organisationers særinteresser.

4. PRÆCIS SKELNEN MELLEM PLANER OG PROJEKTER:
- Når sagen vedrører PLANER OG PROGRAMMER (Afsnit II / § 8): Anvend terminologi for strategisk miljøvurdering (SMV), f.eks. "miljørapport", "afgrænsning" og "planens indvirkning på miljøet".
- Når sagen vedrører KONKRETE PROJEKTER (Afsnit III / §§ 15–25): Anvend VVM-begreber, f.eks. "VVM-screening", "miljøkonsekvensrapport", "bygherre" og "projektafgørelse".

5. PRÆCISE KILDEHENVISNINGER:
Enhver faglig påstand eller konklusion i dit svar SKAL følges af en præcis kildehenvisning i hakparenteser, f.eks.:
- [Miljøvurderingsloven § 8, stk. 1]
- [BEK nr. 1608 af 09/12/2024 § 4]
- [Vejledning om miljøvurderingsloven kap. 3]
- [MFKN j.nr. 21/04322]
- [EU-Domstolen Sag C-127/02 Waddenzee]

STRUKTUR PÅ DINE SVAR:
1. Kort og direkte konklusion/svar på brugerens spørgsmål.
2. Gennemgang af det relevante kildegrundlag og gældende ret.
3. Eventuelle usikkerheder, forbehold eller manglende oplysninger i sagsakterne.`;

    // 1. STANDARDMODEL: Claude Sonnet / Anthropic (hvis ANTHROPIC_API_KEY er konfigureret)
    if (anthropicApiKey) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicApiKey.trim() });

        const conversationHistory = history.slice(-6).map((h) => ({
          role: (h.sender === "user" ? "user" : "assistant") as "user" | "assistant",
          content: h.text,
        }));

        const retiredModels = new Set([
          "claude-3-sonnet-20240229",
          "claude-3-5-sonnet-20240620",
          "claude-3-5-sonnet-20241022",
          "claude-3-7-sonnet-20250219",
        ]);
        const configuredModel = process.env.ANTHROPIC_MODEL?.trim();
        const model =
          configuredModel && !retiredModels.has(configuredModel)
            ? configuredModel
            : "claude-sonnet-5-5";

        const anthropicResponse = await anthropic.messages.create({
          model,
          max_tokens: 2500,
          system: systemPrompt,
          output_config: { effort: "medium" },
          messages: [
            ...conversationHistory,
            { role: "user", content: message },
          ],
        });
        const usedModel = model.includes("opus") ? "Claude Opus" : "Claude Sonnet";

        const responseText =
          anthropicResponse?.content
            ? anthropicResponse.content
                .filter((block) => block.type === "text" || "text" in block)
                .map((block) => (block as { text?: string }).text || "")
                .join("\n")
                .trim() || "Ingen analyse kunne genereres."
            : "Ingen analyse kunne genereres.";

        let warning: string | undefined;
        if (
          responseText.toLowerCase().includes("risiko") ||
          responseText.toLowerCase().includes("advarsel") ||
          responseText.toLowerCase().includes("ophævelse") ||
          responseText.toLowerCase().includes("ugyldig")
        ) {
          warning =
            "Klagenævnspraksis (MFKN): Prøvelsen af Natura 2000, kumulation og habitatdirektivet er intens. Hvis der er videnskabelig tvivl om fravær af skade på udpegningsgrundlaget, kan tilladelse eller plan ikke vedtages.";
        }

        return NextResponse.json({
          text: responseText,
          warning,
          sources,
          modelUsed: usedModel,
          isLiveLLM: true,
        });
      } catch (anthropicErr) {
        console.error("Anthropic API error, falling back:", anthropicErr);
        // Fall through to secondary model or intelligent legal matrix if Anthropic fails
      }
    }

    // 2. SEKUNDÆR MODEL: OpenAI (f.eks. hvis OPENAI_API_KEY er konfigureret)
    if (openaiApiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiApiKey.trim() });

        const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          ...history.slice(-4).map((h) => ({
            role: h.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: h.text,
          })),
          { role: "user", content: message },
        ];

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          messages: formattedMessages,
          temperature: 0.2,
        });

        const responseText =
          completion.choices[0]?.message?.content ||
          "Ingen analyse kunne genereres.";

        let warning: string | undefined;
        if (
          responseText.toLowerCase().includes("risiko") ||
          responseText.toLowerCase().includes("advarsel") ||
          responseText.toLowerCase().includes("ophævelse") ||
          responseText.toLowerCase().includes("ugyldig")
        ) {
          warning =
            "Klagenævnspraksis (MFKN): Prøvelsen af Natura 2000 og habitatdirektivets art. 6, stk. 3 er intens. Hvis der er videnskabelig tvivl om fravær af skade på udpegningsgrundlaget, kan tilladelse eller plan ikke vedtages.";
        }

        return NextResponse.json({
          text: responseText,
          warning,
          sources,
          modelUsed: "GPT-4o (Fallback)",
          isLiveLLM: true,
        });
      } catch (openAiErr) {
        console.error("OpenAI API error, falling back to matrix:", openAiErr);
        // Fall through to offline retskildematrix if OpenAI quota is exhausted
      }
    }

    // 3. INTELLIGENT DOMÆNE-SPECIFIK DATABASE (Når der endnu ikke er indsat API-nøgler)
    const dynamicResponse = generateIntelligentLegalResponse(
      message,
      scope,
      themes,
      caseTitle,
      primaryFile
    );

    const outputNote = savedOutput.length
      ? `\n\n### Gemt output\n${savedOutput
          .map((item) => `- [${item.citation}] ${item.textSnippet}`)
          .join("\n")}`
      : "";

    return NextResponse.json({
      ...dynamicResponse,
      text: `${dynamicResponse.text}${outputNote}`,
      sources,
      modelUsed: "Offline Retskildematrix",
      isLiveLLM: false,
    });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Fejl ved generering af miljøretlig analyse.", details: errMsg },
      { status: 500 }
    );
  }
}

function generateIntelligentLegalResponse(
  prompt: string,
  scope: "projekt" | "plan",
  themes: string[],
  _caseTitle?: string,
  primaryFile?: string | null
) {
  const fileMention = primaryFile ? ` i relation til *${primaryFile}*` : "";

  return {
    text: `### 1. Konklusion
Vedrørende dit spørgsmål: "${prompt}" for ${
      scope === "plan" ? "Plan / Program (§ 8)" : "Konkret Projekt (§§ 15–25)"
    }:
Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter eller afgørelser i databasen for de valgte temamapper (${themes.join(", ") || "ingen valgt"}).

### 2. Gennemgang af kildegrundlag og gældende ret
- Det fremgår ikke entydigt af det aktiverede kildegrundlag, hvilke konkrete bestemmelser eller kendelser der skal lægges til grund, idet kildedatabasen er tom og afventer upload af sagsakter og afgørelser.
- Generelt gælder for ${scope === "plan" ? "planer og programmer [Miljøvurderingsloven § 8]" : "konkrete anlægsprojekter [Miljøvurderingsloven § 21]"}, at vurderinger skal baseres på dokumenteret materiale forud for afgørelsen.

### 3. Usikkerheder, forbehold eller manglende oplysninger i sagsakterne${fileMention}
- Kildedatabasen er helt nulstillet. Når du uploader sagsakter (f.eks. via 'Primært dokument' eller 'Sekundære dokumenter') eller tilføjer kendelser til temamapperne, vil analysen tage direkte udgangspunkt i de fremlagte dokumenter.`,
    warning: undefined,
    sources: [],
  };
}
