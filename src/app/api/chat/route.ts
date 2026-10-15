import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { searchSupabaseLegalSources } from "@/lib/vectorSearch";

export function renumberCitations<T>(text: string, sources: T[]): { text: string; sources: T[] } {
  const order: number[] = [];
  const seen = new Set<number>();
  for (const match of text.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(match[1]);
    if (n < 1 || n > sources.length || seen.has(n)) continue;
    seen.add(n);
    order.push(n);
  }
  if (order.length === 0) return { text, sources };

  const map = new Map(order.map((n, index) => [n, index + 1]));
  const cited = order.map((n) => sources[n - 1]);
  const rest = sources.filter((_, index) => !seen.has(index + 1));
  const nextText = text.replace(/\[(\d{1,2})\]/g, (full, digits: string) => {
    const mapped = map.get(Number(digits));
    return mapped ? `[${mapped}]` : full;
  });
  return { text: nextText, sources: [...cited, ...rest] };
}

export function splitLegalRisk(text: string): { text: string; warning?: string } {
  const match = text.match(/(?:^|\n)\s*(?:\*\*)?\s*Retslig risikofaktor:\s*(?:\*\*)?\s*([\s\S]+?)\s*$/i);
  if (!match || match.index === undefined) return { text };
  const warning = match[1].replace(/\*\*/g, "").trim();
  if (!warning) return { text };
  const body = text.slice(0, match.index).replace(/\s+$/, "");
  return { text: body || warning, warning };
}

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
      : `Der er ikke uploadet et primært dokument. Besvar ud fra retskilderne. Nævn ikke det manglende dokument, medmindre brugeren spørger til sagens dokumenter.`;

    // Hent retskilder via semantisk vektorsøgning i Supabase
    // Når databasen er tom, er retrievedSources tom, og Claude svarer ud fra de reelle forhold jf. prompten
    const retrievedSources = (await searchSupabaseLegalSources(message, scope, themes)).slice(0, 5);
    const outputSlots = Math.max(0, 8 - retrievedSources.length);
    const savedOutput = (Array.isArray(output) ? output : [])
      .filter((item) => item && typeof item.title === "string" && typeof item.content === "string" && item.content.trim())
      .slice(0, outputSlots)
      .map((item, index) => ({
        id: item.id || `output-${index}`,
        title: item.title!.trim(),
        citation: `Output: ${item.title!.trim()}`,
        lawSection: "Gemt output",
        date: item.date || "",
        textSnippet: item.content!.trim().slice(0, 8000),
        pdfUrl: "",
        pdfFileName: "",
        hasOriginal: false,
        relevanceScore: 100,
      }));
    const sources = [...savedOutput, ...retrievedSources];

    const sourceNumber = (item: (typeof sources)[number]) => sources.indexOf(item) + 1;
    const formatSource = (item: (typeof sources)[number]) => {
      const kind = item.citation.startsWith("Output:") ? "GEMT OUTPUT" : "RETSKILDE";
      return `[${sourceNumber(item)}] ${item.title}\nAfsnit: ${item.lawSection || "Ikke angivet"}\n${kind}\nHenvisning: ${item.citation}\nDato: ${item.date || "Ikke angivet"}\nUddrag:\n"${item.textSnippet}"`;
    };

    const sourcesContext = retrievedSources.length > 0
      ? retrievedSources.map((item) => formatSource(item)).join("\n\n")
      : "Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter i databasen for de valgte temamapper.";

    const outputContext = savedOutput.length > 0
      ? savedOutput.map((item) => formatSource(item)).join("\n\n")
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

DIN ROLLE:
Du er en erfaren ekspert i den danske miljøvurderingslov, habitatdirektivet, forvaltningsretten og klagenævnspraksis. Din opgave er at syntetisere kilderne til ét sammenhængende svar. Du remser ikke kilderne op én for én.

1. SYNTESE:
Væv oplysningerne fra kilderne sammen om brugerens spørgsmål. Skriv ikke "Kilde 1 siger ... Kilde 2 siger ...". Underbyg løbende med kildens nummer.

2. KILDEFORANKRING:
Forankr svaret i de medfølgende retskilder, gemt output fra sagen, grundlovgivningen (Lovbekendtgørelse nr. 4 af 03/01/2023 med senere ændringer, bekendtgørelser, habitatdirektivet og EU-retlig præcedens som Waddenzee C-127/02) samt eventuelle uploadede sagsakter. Gemt output er kildemateriale i denne sag. Det er ikke en almindelig retskilde og lægges ikke i temamapperne. Opdigt ikke antagelser, og supplér ikke med uverificerede påstande.
Brug miljøvurderingsloven, bekendtgørelsen og vejledningen frem for direktivet. Brug kun et direktiv, når der ikke findes en dansk lov eller bekendtgørelse, som gennemfører det.
Retskildehierarki: Konklusionen skal bygge på det højeste tilgængelige niveau. Niveau 1 er lovbekendtgørelser og bekendtgørelser. Et direktiv er kun niveau 1, når der ikke findes en dansk lov eller bekendtgørelse, som gennemfører det. Niveau 2 er vejledninger, håndbøger, artsforvaltningsplaner og styrelsesnotater. Niveau 3 er klagenævnsafgørelser. Niveau 2 og 3 må kun bruges som supplerende fortolkning af niveau 1, ikke som selvstændigt grundlag for konklusionen.

3. USIKKERHED OG FORBEHOLD:
Et afsnit om usikkerhed må kun med i to tilfælde: enten handler spørgsmålet om den konkrete sag, og der mangler sagsakter eller oplysninger for at vurdere den, eller kilderne er modstridende eller uafklarede om selve spørgsmålet. Ved et generelt eller entydigt spørgsmål skal afsnittet udelades. Skriv ikke "Der er ikke uploadet sagsakter..." på et generelt spørgsmål. Når der er reel tvivl, så skriv hellere: "Det fremgår ikke entydigt af det aktiverede kildegrundlag..." end at gætte.

4. UVILDIGHED:
Du skal forholde dig neutralt og juridisk objektivt. Du repræsenterer hverken bygherrers, klageres eller organisationers særinteresser.

5. PLANER OG PROJEKTER:
Brug kun plan- eller projektsprog, når spørgsmålet handler om sagen.
- Planer og programmer (Afsnit II / § 8): "miljørapport", "afgrænsning" og "planens indvirkning på miljøet".
- Konkrete projekter (Afsnit III / §§ 15–25): "VVM-screening", "miljøkonsekvensrapport", "bygherre" og "projektafgørelse".
Ved et generelt spørgsmål skal du svare på reglen. Nævn ikke sagens titel, sagsnummer eller et konkret projekt.

6. KILDEHENVISNINGER:
Kilderne ovenfor er nummereret [1], [2], [3]. Henvis med det nummer, kilden har i listen, og kun nummeret. Samme kilde beholder samme nummer, hver gang den bruges.
Skriv ikke titel, paragraf eller journalnummer i hakparenteserne. Skriv ikke markdown-links. Brug kun numre, der findes i listen. Sæt ikke et nummer på en påstand, kilderne ikke støtter.

7. LÆNGDE:
Svar kun på det, der spørges om. Hold svaret kort, direkte og sammenhængende. Et generelt spørgsmål klares i ét til tre korte afsnit.

8. RETSLIG RISIKOFAKTOR:
Skriv kun en risikolinje, hvis analysen viser en direkte procesrisiko, en ophævelsesrisiko ved klagenævnet eller manglende overholdelse af officialprincippet eller forsigtighedsprincippet. Afslut i så fald svaret med en linje, der begynder præcis sådan:
Retslig risikofaktor: 
og derefter den konkrete risiko. Skriv den ikke, hvis der ikke er en sådan risiko. Brug ikke stjerner eller fed skrift.

STRUKTUR:
Skriv ét sammenhængende svar om spørgsmålet. Ikke en opremsning af kilder. Usikkerhedsafsnit kun efter punkt 3. Risikolinjen kun efter punkt 8, og kun til sidst.`;

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
          temperature: 0.2,
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

        const cited = renumberCitations(responseText, sources);
        const risk = splitLegalRisk(cited.text);

        return NextResponse.json({
          text: risk.text,
          warning: risk.warning,
          sources: cited.sources,
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

        const cited = renumberCitations(responseText, sources);
        const risk = splitLegalRisk(cited.text);

        return NextResponse.json({
          text: risk.text,
          warning: risk.warning,
          sources: cited.sources,
          modelUsed: "GPT-4o",
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
      ? "\n\nGemt output\n" +
        savedOutput.map((item) => "- " + item.citation + "\n" + item.textSnippet).join("\n")
      : "";

    const cited = renumberCitations(`${dynamicResponse.text}${outputNote}`, sources);

    return NextResponse.json({
      ...dynamicResponse,
      text: cited.text,
      sources: cited.sources,
      modelUsed: "",
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
  const fileMention = primaryFile ? ` i relation til ${primaryFile}` : "";

  return {
    text: `1. Konklusion
Vedrørende dit spørgsmål: "${prompt}" for ${
      scope === "plan" ? "Plan / Program (§ 8)" : "Konkret Projekt (§§ 15–25)"
    }:
Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter eller afgørelser i databasen for de valgte temamapper (${themes.join(", ") || "ingen valgt"}).

2. Gennemgang af kildegrundlag og gældende ret
- Det fremgår ikke entydigt af det aktiverede kildegrundlag, hvilke konkrete bestemmelser eller kendelser der skal lægges til grund, idet kildedatabasen er tom og afventer upload af sagsakter og afgørelser.
- Generelt gælder for ${scope === "plan" ? "planer og programmer [Miljøvurderingsloven § 8]" : "konkrete anlægsprojekter [Miljøvurderingsloven § 21]"}, at vurderinger skal baseres på dokumenteret materiale forud for afgørelsen.

3. Usikkerheder, forbehold eller manglende oplysninger i sagsakterne${fileMention}
- Kildedatabasen er helt nulstillet. Når du uploader sagsakter (f.eks. via 'Primært dokument' eller 'Sekundære dokumenter') eller tilføjer kendelser til temamapperne, vil analysen tage direkte udgangspunkt i de fremlagte dokumenter.`,
    warning: undefined,
    sources: [],
  };
}
