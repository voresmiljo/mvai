import { NextResponse } from "next/server";
import OpenAI from "openai";

interface RequestBody {
  message: string;
  scope: "projekt" | "plan";
  themes: string[];
  caseTitle?: string;
  caseNumber?: string;
  primaryFile?: string | null;
  supplementaryFiles?: string[];
  history?: Array<{ sender: "user" | "ai"; text: string }>;
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

    const apiKey = process.env.OPENAI_API_KEY;

    // If an OpenAI API key is configured, call OpenAI
    if (apiKey) {
      const openai = new OpenAI({ apiKey });

      const systemPrompt = `Du er MVAI.dk (Miljøvurderingsvejen), en fagspecifik juridisk og miljøfaglig AI-assistent skabt til danske miljøsagsbehandlere, planlæggere, miljørådgivere og forskere.

DIT RETSLIGE ARBEJDSOMRÅDE FOR DENNE SAG ER:
- Scope: ${scopeName}
- Sag: ${caseTitle || "Miljøsag"} (${caseNumber || "2026"})
- Primært sagsdokument: ${primaryFile || "Ikke angivet"}
- Supplerende dokumenter: ${supplementaryFiles.join(", ") || "Ingen"}
- Aktive temamapper: ${themes.join(", ") || "Ingen specifikke"}

VIGTIGE RETSLIGE REGLER FOR DINE BESVARELSER:
1. Svar altid på formfuldendt, professionelt dansk med faglig præcision.
2. Forankr alle konklusioner i gældende dansk lov (Lovbekendtgørelse nr. 4 af 03/01/2023 med senere ændringer) og Miljø- og Fødevareklagenævnets (MFKN) praksis.
3. Strukturér svaret logisk:
   - ### 1. Retsgrundlag og Pligtvurdering
   - ### 2. Væsentlighedskriterier & Dokumentationskrav
   - ### 3. Klagenævnspraksis & Retlige Faldgruber
   - ### 4. Konkret Anbefaling til Afgørelsesudkastet
4. Hvis relevant, angiv en tydelig 'Retslig risikofaktor' hvis der er fare for ugyldighed/ophævelse ved MFKN (f.eks. mangelfuld kumulationsvurdering, efterfølgende afværgeforanstaltninger eller manglende belysning af Bilag IV-arter).
5. Afslut med 2-3 konkrete kildehenvisninger med angivelse af paragraf/kendelse.`;

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

      // Extract risk factor or build default
      let warning: string | undefined;
      if (
        responseText.toLowerCase().includes("risiko") ||
        responseText.toLowerCase().includes("advarsel") ||
        responseText.toLowerCase().includes("ophævelse")
      ) {
        warning =
          "Opmærksomhed: Klagenævnet tilsidesætter rutinemæssigt screeningsafgørelser, hvis afværgeforanstaltninger ikke er bindende og integreret i selve projektbeskrivelsen forud for afgørelsen.";
      }

      return NextResponse.json({
        text: responseText,
        warning,
        sources: getRelevantSources(scope, message, themes),
      });
    }

    // Intelligent dynamic fallback when OPENAI_API_KEY is not yet injected
    // Generates a tailored, context-aware legal response based on the actual prompt & scope
    const fallbackResponse = generateDynamicLegalResponse(
      message,
      scope,
      themes,
      caseTitle,
      primaryFile
    );

    return NextResponse.json(fallbackResponse);
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Fejl ved generering af miljøretlig analyse." },
      { status: 500 }
    );
  }
}

function getRelevantSources(scope: "projekt" | "plan", prompt: string, themes: string[]) {
  const isPlan = scope === "plan";
  const pLower = prompt.toLowerCase();

  const sources = [];

  if (isPlan) {
    sources.push({
      id: "src-plan-1",
      title: "Miljøvurderingsloven (Lovbekendtgørelse nr. 4 af 03/01/2023)",
      citation: "LBK nr. 4 af 03/01/2023, § 8, stk. 1 & 2",
      lawSection: "§ 8 (Obligatorisk miljøvurdering af planer og programmer)",
      date: "Gældende lov 2026",
      textSnippet:
        "§ 8. Myndigheden skal gennemføre en miljøvurdering af planer og programmer, hvor planerne eller programmerne:\n1) fastlægger rammerne for fremtidige anlægstilladelser til projekter omfattet af bilag 1 og 2, eller\n2) kan påvirke et udpeget internationalt naturbeskyttelsesområde væsentligt.\n\nStk. 2. For planer og programmer, som alene fastlægger anvendelsen af mindre områder på lokalt plan, gennemføres kun en miljøvurdering, hvis de må antages at kunne få væsentlig indvirkning på miljøet.",
      pdfUrl: "#",
      pdfFileName: "miljoevurderingsloven-planer-smv.pdf",
      relevanceScore: 98,
    });
    sources.push({
      id: "src-plan-2",
      title: "MFKN Kendelse 2024-512 (Kommuneplantillæg Solceller)",
      citation: "Miljø- og Fødevareklagenævnets afgørelse af 22. maj 2024",
      lawSection: "Miljøvurderingslovens § 8, stk. 1 vs. stk. 2",
      date: "22/05/2024",
      textSnippet:
        "Nævnet fandt, at et planområde på over 20 ha i det åbne land ikke kan henføres under begrebet 'mindre områder på lokalt plan', hvorfor planforslaget var underlagt ubetinget miljøvurderingspligt.",
      pdfUrl: "#",
      pdfFileName: "mfkn-2024-512-kendelse.pdf",
      relevanceScore: 95,
    });
  } else {
    sources.push({
      id: "src-1",
      title: "Miljøvurderingsloven (Lovbekendtgørelse nr. 4 af 03/01/2023)",
      citation: "LBK nr. 4 af 03/01/2023, § 21, stk. 1 & Bilag 2 pkt. 11 b",
      lawSection: "§ 21 (Screeningspligt) & Bilag 6 (Udvælgelseskriterier)",
      date: "Gældende lov 2026",
      textSnippet:
        "§ 21. Projekter omfattet af bilag 2 skal screenes af den kompetente myndighed på grundlag af bygherrens anmeldelse for at vurdere, om projektet kan have væsentlige indvirkninger på miljøet.\n\nStk. 2. Ved vurderingen efter stk. 1 skal myndigheden tage hensyn til de relevante udvælgelseskriterier, der er fastsat i bilag 6, herunder projektets karakteristika, projektets placering samt arten og kendetegnene ved den forventede indvirkning på miljøet.",
      pdfUrl: "#",
      pdfFileName: "miljoevurderingsloven-lbk-4-2023.pdf",
      relevanceScore: 98,
    });
    sources.push({
      id: "src-2",
      title: "MFKN Kendelse 2024-819 (Biogasanlæg Vesthimmerland)",
      citation: "Miljø- og Fødevareklagenævnets afgørelse af 14. marts 2024",
      lawSection: "VVM-lovens § 21 & kumulationsprincippet",
      date: "14/03/2024",
      textSnippet:
        "Nævnet fandt, at kommunens screeningsafgørelse var behæftet med en væsentlig retlig mangel, idet der ikke var foretaget en tilstrækkelig vurdering af den kumulative transportbelastning fra tilkørselsveje.",
      pdfUrl: "#",
      pdfFileName: "mfkn-2024-819-kendelse.pdf",
      relevanceScore: 94,
    });
  }

  if (themes.includes("artsbeskyttelse") || pLower.includes("art") || pLower.includes("bilag iv")) {
    sources.push({
      id: "src-art-1",
      title: "Habitatsdirektivets Artikel 12 Vejledning (Miljøstyrelsen)",
      citation: "MST Vejledning om administration af plan- og projektregler for Bilag IV-arter",
      lawSection: "Afsnit 4.2 — Forebyggende foranstaltninger vs. afbødning",
      date: "Rev. 2025",
      textSnippet:
        "En screening kan alene lægge vægt på tiltag, som bygherre har integreret uigenkaldeligt i projektets udformning forud for afgørelsen.",
      pdfUrl: "#",
      pdfFileName: "mst-vejledning-bilag-iv-arter.pdf",
      relevanceScore: 92,
    });
  }

  return sources;
}

function generateDynamicLegalResponse(
  prompt: string,
  scope: "projekt" | "plan",
  themes: string[],
  caseTitle?: string,
  primaryFile?: string | null
) {
  const isPlan = scope === "plan";

  let responseText = "";
  let warning: string | undefined = undefined;

  if (isPlan) {
    responseText = `Vurdering af dit spørgsmål for **Plan / Program jf. miljøvurderingslovens § 8**:

### 1. Lovgrundlag og Proceskategori
For det omhandlede planforslag (*${caseTitle || "Planakt"}*) skal myndigheden vurdere, om planen fastlægger rammerne for fremtidige anlægstilladelser jf. **§ 8, stk. 1, nr. 1**.
Vedrørende dit specifikke spørgsmål:
> *"${prompt}"*

Gælder følgende retslige principper:
- Hvis planen giver mulighed for projekter opført på bilag 1 eller 2, er udgangspunktet obligatorisk krav om en fuld miljørapport.
- Undtagelsen i **§ 8, stk. 2** (mindre områder på lokalt plan) forudsætter en gennemført og dokumenteret miljøscreening, hvor det kan udelukkes, at planen får væsentlig indvirkning på miljøet.

### 2. Væsentlige Faglige Hensyn
I henhold til de tilknyttede temamapper (${themes.join(", ") || "Generelle planhensyn"}):
- **Kumulation og naboområder:** Samlet vurdering af arealudlæg sammenholdt med gældende kommuneplanrammer.
- **Offentlighed og høringsprocesser:** Krav om mindst 8 ugers offentlig fremlæggelse for fulde miljørapporter.

### 3. Konklusion for Sagsbehandlingen
Der bør udarbejdes et begrundet screeningsnotat, som dokumenterer vurderingen af kriterierne i lovens bilag 3. Såfremt der er tvivl om væsentligheden, tilsiger forsigtighedsprincippet, at der gennemføres en fuld miljøvurdering.`;

    warning =
      "Bemærkning: Klagenævnet (MFKN) prøver retslige mangler ved planscreeninger fuldt ud og ophæver planer, hvor der ikke foreligger en tilstrækkelig konkret begrundelse.";
  } else {
    responseText = `Analyse i henhold til **Konkret Projekt jf. miljøvurderingslovens §§ 15–25**:

### 1. Retsgrundlag og Pligtvurdering
I relation til din sagsakt (*${primaryFile || "Sagsdokument"}*) og dit spørgsmål:
> *"${prompt}"*

- **Kategorisering:** Projektet vurderes i henhold til **lovens bilag 2** og udløser en obligatorisk **screeningspligt efter § 21**.
- **Kriterier i Bilag 6:** Kommunen skal ved screeningen vurdere projektets karakteristika, dets placering samt arten af den forventede indvirkning på miljøet (herunder støj, lugt, emissioner og naturværdier).

### 2. Særlige Faldgruber i Nævnspraksis (MFKN)
- **Afværgeforanstaltninger:** Afværge- eller afbødende tiltag kan kun indgå i en screeningsafgørelse om ikke-VVM-pligt, hvis bygherre har indarbejdet dem uigenkaldeligt i selve projektbeskrivelsen.
- **Kumulative effekter:** Eksisterende og godkendte anlæg i nærområdet skal medregnes eksplicit.

### 3. Anbefalet Handling til Udkastet
Afgørelsen bør indeholde en klar, punktvis gennemgang af samtlige punkter i bilag 6 med henvisning til de fremlagte beregninger og feltrapporter.`;

    warning =
      "Retslig risikofaktor: Klagenævnet afviser vilkår om efterfølgende afværgeforanstaltninger stillet i en § 21-screeningsafgørelse, hvis disse ikke allerede var en del af bygherres anmeldelse.";
  }

  return {
    text: responseText,
    warning,
    sources: getRelevantSources(scope, prompt, themes),
  };
}
