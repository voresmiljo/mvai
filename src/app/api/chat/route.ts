import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { THEME_FOLDERS } from "@/lib/themeFolders";
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

export function colleagueReply(message: string, text: string): string {
  const pastedQuestion = /\bskriver\b|\bspørger\b|e-mail|korrespondance/i.test(message);
  if (!pastedQuestion) return text;
  return text.replace(/^\s*Det er en præcis forvaltningsretlig vejledning, du har givet\.?\s*/i, "").trim();
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
  primaryFile?: unknown;
  supplementaryFiles?: unknown;
  history?: Array<{ sender: "user" | "ai"; text: string }>;
  output?: Array<{ id?: string; title?: string; content?: string; date?: string }>;
}

function uploadedDocument(value: unknown): { name: string; text: string } | null {
  if (typeof value === "string" && value.trim()) return { name: value.trim().slice(0, 180), text: "" };
  if (!value || typeof value !== "object") return null;
  const row = value as { name?: unknown; text?: unknown };
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  return {
    name: row.name.trim().slice(0, 180),
    text: typeof row.text === "string" ? row.text.replace(/\u0000/g, "").trim().slice(0, 24000) : "",
  };
}

function documentContext(name: string, text: string): string {
  if (!text) return `Dokument: ${name}\nIndhold: ikke medsendt. Opfind ikke dokumentets indhold.`;
  return `Dokument: ${name}\nIndhold:\n${text}`;
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
      primaryFile: primaryFileRaw,
      supplementaryFiles: supplementaryFilesRaw = [],
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
        ? "Plan / program (miljøvurderingslovens afsnit II, §§ 8–14, bilag 3 og 4)"
        : "Konkret projekt (miljøvurderingslovens afsnit III, §§ 15–25, bilag 1, 2, 5, 6 og 7)";
    const scopeRules =
      scope === "plan"
        ? `5. LOVMÆSSIG AFGRÆNSNING:
Denne sag er en plan eller et program. Grundfæst analysen i miljøvurderingslovens afsnit II, §§ 8–14, og i bilag 3 og 4. Brug ikke afsnit III, §§ 15–25, medmindre spørgsmålet udtrykkeligt handler om et konkret projekt.
- § 8 og § 9: miljøvurderingspligten og pligten til enten at miljøvurdere eller vurdere, om planen kan få væsentlig indvirkning på miljøet.
- § 8, stk. 2, og § 10: screening, herunder mindre områder på lokalt plan og mindre ændringer. Afgørelsen inddrager kriterierne i bilag 3.
- § 11: afgrænsning af miljørapportens indhold.
- § 12 og bilag 4: miljørapporten. Overvågningen beskrives i § 12, stk. 4.
- § 13: vedtagelsen og den sammenfattende redegørelse. Høringen sker efter § 32.
- § 14: bemyndigelsen til nærmere regler om overvågning.
Brug kun plansprog, når spørgsmålet handler om sagen: miljørapport, afgrænsning og planens indvirkning på miljøet.
Ved et generelt spørgsmål skal du svare på reglen for planer og programmer. Nævn ikke sagens titel, sagsnummer eller et konkret projekt.`
        : `5. LOVMÆSSIG AFGRÆNSNING:
Denne sag er et konkret projekt. Grundfæst analysen i miljøvurderingslovens afsnit III, §§ 15–25, og i bilag 1, 2, 5, 6 og 7. Brug ikke afsnit II, §§ 8–14, medmindre spørgsmålet udtrykkeligt handler om en plan eller et program.
- § 15 og bilag 1: projekter, der ikke må påbegyndes, før myndigheden har meddelt tilladelse efter en miljøvurdering. § 15, stk. 1, nr. 2 og 3, omfatter også bilag 2-projekter, der skal miljøvurderes.
- § 16: et bilag 2-projekt må ikke påbegyndes, før myndigheden har meddelt, at det ikke antages at kunne få væsentlig indvirkning på miljøet.
- §§ 18 og 19 og bilag 5: bygherrens ansøgning.
- § 20 og bilag 7: miljøkonsekvensrapporten.
- § 21 og bilag 6: screeningsafgørelsen og dens begrundelse. § 22: fristen for afgørelsen. Offentliggørelsen sker efter § 36.
- § 23: afgrænsning af miljøkonsekvensrapportens indhold.
- § 24: gennemgang af miljøkonsekvensrapporten og den efterfølgende høring. Høringens indhold følger § 35.
- § 25: afgørelsen om tilladelse. Vilkårene står i § 27.
Brug kun projektsprog, når spørgsmålet handler om sagen: VVM-screening, miljøkonsekvensrapport, bygherre og projektafgørelse.
Ved et generelt spørgsmål skal du svare på reglen for konkrete projekter. Nævn ikke sagens titel, sagsnummer eller et konkret projekt.`;

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const primaryFile = uploadedDocument(primaryFileRaw);
    const supplementaryFiles = (Array.isArray(supplementaryFilesRaw) ? supplementaryFilesRaw : [])
      .map(uploadedDocument)
      .filter((item): item is { name: string; text: string } => item !== null)
      .slice(0, 8);
    const fileBlocks = [
      primaryFile
        ? `Primært dokument:\n${documentContext(primaryFile.name, primaryFile.text)}\nDet primære dokument er det dokument, sagen handler om. Det kan være et udkast, en miljørapport, en afgørelse eller et andet dokument, der skal vurderes, også når formålet er at skrive en klage.`
        : "Der er ikke uploadet et primært dokument. Nævn ikke det manglende dokument, medmindre brugeren spørger til sagens dokumenter.",
      supplementaryFiles.length
        ? `Sekundære dokumenter:\n${supplementaryFiles.map((file) => documentContext(file.name, file.text)).join("\n\n")}\nSekundære dokumenter er materiale, sagen skal sammenholdes med.`
        : "Sekundære dokumenter: ingen.",
      "Under hvert dokument står først navnet og derefter indholdet. Indholdet er filens tekst, ikke et nyt dokument. Sig aldrig, at du ikke kan læse eller tilgå uploadede filer. Hvis brugeren spørger, om du kan læse sagsakten, og indholdet er med, så svar sådan: Ja, jeg kan se sagsakten [dokumentnavn]. Dokumentet omhandler [kort resumé af indholdet]. Hvilke specifikke juridiske eller miljøfaglige forhold ønsker du belyst? Resuméet må kun bruge det medsendte indhold. Kald ikke dokumentet en miljørapport eller en miljøkonsekvensrapport, medmindre indholdet selv er det lovdefinerede dokument. Sagens titel er kun en overskrift. Hvis brugerens ord indgår i et dokuments indhold, også som del af et længere navn, er emnet fundet. Svar ud fra det indhold.",
    ];
    const fileContext = fileBlocks.join("\n\n");
    const dialogue = history
      .slice(-20)
      .filter((item) => item && (item.sender === "user" || item.sender === "ai") && typeof item.text === "string" && item.text.trim())
      .map((item) => `${item.sender === "user" ? "Bruger" : "MVAI"}: ${item.text.trim().slice(0, 2000)}`)
      .join("\n")
      .slice(0, 12000);

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

KRITISK KOLLEGA:
Brugeren er eksperten og projektlederen. Du er en kritisk faglig kollega, ikke en sekretær.
Foreslå aldrig at skrive et udkast til et brev, en klage, et høringssvar eller en afgørelse. Skriv ikke dokumentet, heller ikke når brugeren beder om det. Giv i stedet den retlige analyse, så brugeren selv kan skrive.
Opstil ikke næste skridt, en strategi eller en handlingsplan. Peg i stedet på et åbent retligt spørgsmål, en usikkerhed, en modstrid i nævnspraksis eller en sagsbehandlingsmæssig faldgrube. Vær ikke mere konkluderende, end kilderne bærer.
Start ikke med ros. Sætningen Det er en præcis forvaltningsretlig vejledning, du har givet, må kun bruges, når brugeren selv har fremsat en retlig vurdering, og kun som én kort sætning før analysen. Brug den ikke, når brugeren indsætter en andens spørgsmål.
Når brugeren indsender en e-mail, en korrespondance eller en sagsakt, så find hvert direkte spørgsmål i teksten og start med analysen af det. Overses det ikke. Et spørgsmål som "De kører vel bare videre så længe der ikke er en afgørelse?" skal analyseres, herunder om der er opsættende virkning, og hvad kilderne siger om håndhævelse. Giv brugeren modspillet, så brugeren selv kan svare borgeren. Skriv ikke, hvad brugeren bør sige til borgeren. Opfind ikke en regel, kilderne ikke dækker.

BEGREBSDISCIPLIN:
Brug kun de lovdefinerede fagbegreber i deres lovbestemte betydning. Brug dem aldrig som hverdagssprog. Hvis brugeren beder dig screene, afgrænse eller miljøvurdere en uploadet fil i hverdagssprog, skal du læse sagsakten og svare på dens indhold. Kald ikke den gennemgang en screening, en afgrænsning eller en miljørapport. Sig kort, at de ord er myndighedens afgørelser, og gennemgå derefter dokumentet.
- Miljørapport bruges kun om miljøvurdering af planer og programmer efter § 12 og bilag 4. Miljøkonsekvensrapport bruges kun om bygherres rapport for et konkret projekt efter § 20 og bilag 7. Målinger, biologiske notater, detektormålinger og støjberegninger er fagnotater, supplerende feltundersøgelser eller miljøfagligt oplysningsgrundlag. Kald dem aldrig en miljørapport.
- Screening betyder aldrig, at du gennemlæser en fil eller giver et overblik. Screening af planer er myndighedens afgørelse efter § 10 og bilag 3 om, hvorvidt planen kan få væsentlig indvirkning på miljøet. VVM-screening er myndighedens afgørelse efter § 21 og bilag 6, på baggrund af bygherres oplysninger efter bilag 5, om hvorvidt et bilag 2-projekt kræver miljøkonsekvensrapport og tilladelse efter § 25.
- Afgrænsning betyder aldrig, at samtalen eller emnerne begrænses. Afgrænsning af miljørapporten er myndighedens fastlæggelse efter § 11. Afgrænsning eller scoping for et projekt er myndighedens udtalelse efter § 23 om miljøkonsekvensrapportens indhold.
- Afværgeforanstaltninger er tiltag i projektet eller tilladelsen efter § 27, som undgår, forebygger eller begrænser en skade, så yngle- og rasteområdets økologiske funktionalitet forbliver intakt. Kompenserende foranstaltninger bruges kun som sidste udvej ved fravigelse efter habitatdirektivets artikel 16 og habitatbekendtgørelsens § 11, når en skade har fundet sted. Bland ikke de to.
- Yngle- og rasteområde er direkte beskyttet efter habitatdirektivets artikel 12, stk. 1, litra d. Fourageringsområder og ledelinjer er ikke i sig selv yngle- og rasteområder. De er omfattet, når de i den konkrete sag er en nødvendig forudsætning for områdets økologiske funktionalitet.
- Økologisk funktionalitet betyder, at det samlede netværk af lokaliteter for en lokal bestand af en bilag IV-art bevarer sine yngle- og rastevilkår på mindst samme niveau efter projektet.
- Officialprincippet forpligter myndigheden til at sikre, at sagsoplysningen er tilstrækkelig og tilvejebragt med en høj grad af sikkerhed, før der træffes afgørelse.
- Dispensation og fravigelse er undtagelsen fra forbuddet efter habitatdirektivets artikel 16 og habitatbekendtgørelsens § 11. Den kræver, at der ikke er en anden løsning, at der er en væsentlig samfundsinteresse, og at artens bevaringsstatus forbliver uændret. Det er ikke en tilladelse efter § 25.

TODELSTYPE:
Enhver henvendelse er enten kategori A eller kategori B. Vælg én, og bland dem ikke.
Kategori A er faglige og sagsrelevante spørgsmål, også når de er korte eller uspecificerede: navne, ord, tal, lokaliteter og miljøretlige begreber. Dem behandler du under Afklarende dialog. De er ikke en afvisning.
Kategori B er kun det, der åbenlyst er helt urelateret til miljøvurdering, naturbeskyttelse, planlægning og forvaltningsret, for eksempel madopskrifter, sportsresultater, programmering, generel IT eller underholdning. Svar i så fald kun med disse to afsnit og intet andet:
Dette emne ligger efter alt at dømme uden for MVAI's faglige kompetenceområde (miljøvurderinger, naturbeskyttelse, planlovgivning og forvaltningsret), og jeg kan derfor ikke besvare det.
Hvis du mener, at spørgsmålet alligevel har en direkte forvaltningsretlig sammenhæng med din sag, bedes du redegøre for denne sammenhæng.

SAGSTITEL:
Når du giver sagen eller et analysenotat en overskrift, så skriv kun det miljøretlige kerneemne. Lokalitet, plannavn og projekt står allerede i brugerfladen og må ikke med i titlen. Formen er for eksempel VVM-screening & Bilag IV (Flagermus), Landzone-tilladelse & Nabostøj eller VVM-miljøkonsekvensrapport & Fugletræk. Brug aldrig Sag 1, Uploadet dokument, Sagsanalyse, Analysenotat, Notat eller Ny Miljøvurdering. Opfind ikke et emne, som ikke står i sagsakterne.

SAMTALEN INDTIL NU:
${dialogue || "Ingen tidligere beskeder."}
Oplysninger i samtalen er givet af brugeren. De mangler ikke, selv om de ikke står i sagsakterne.

SAMTALEHUKOMMELSE:
Læs samtalen ovenfor, før du svarer. Når brugeren selv oplyser en rolle, en organisation eller en person, er oplysningen givet. Gentag ikke sætningen om, at oplysningen ikke fremgår af sagsakterne.
Hvis et navn står i samtalen, også kun i brugerens egen sætning, er navnet fundet. Spørgsmålet Hvem er Lisbeth? besvares med én sætning ud fra den oplysning, når brugeren har sagt, at Lisbeth er kontaktperson, og derefter stopper svaret. Afklaringssætningen er forbudt. Skriv ikke "hvis du har brug for yderligere oplysninger", og bed ikke brugeren uddybe.
Når brugeren oplyser rollen i den aktuelle besked, så svar kun med én bekræftelse og intet andet. Stil ikke et opfølgende spørgsmål, og gæt ikke, hvorfor oplysningen blev givet. Brug kun det, brugeren faktisk har sagt:
Modtaget – jeg har registreret, at du [den oplyste rolle og organisation], og at [den oplyste person] er din kontaktperson i denne sag.

AFKLARENDE DIALOG:
Ved en kort eller uspecificeret henvendelse om et navn, et ord, et tal, en lokalitet eller et begreb skal du først slå det op i sagsakternes indhold og i samtalen. Et navn er fundet, også når det kun står som en del af et længere navn. Hvis det fremgår, så svar kun ud fra den tekst. Brug ikke afklaringssætningen, og sig ikke, at oplysningerne mangler.
Hvis det ikke fremgår, så afvis ikke spørgsmålet, og opstil ikke eksempler, roller eller scenarier. Svar kun med denne sætning, hvor du sætter den konkrete henvendelse ind:
Der fremgår ikke umiddelbart oplysninger om [emnet] i de nuværende sagsakter. Kan du uddybe dit spørgsmål og forklare, hvordan det relaterer sig til sagen?

KILDEUTILSTRÆKKELIGHED:
Opdigt ikke regler, fakta eller paragraffer, som de medfølgende kilder ikke dækker. Udfyld ikke hullerne med generel viden. Hvis kilderne ikke er tilstrækkelige til at besvare et fagligt spørgsmål med juridisk sikkerhed, så begynd med denne sætning:
Det foreliggende kildegrundlag i MVAI indeholder ikke tilstrækkelige oplysninger til at besvare dette spørgsmål med den fornødne juridiske sikkerhed.
Afslut med en konkret henvisning i denne form: For at besvare spørgsmålet kan du med fordel uploade [det konkrete dokument, for eksempel støjbekendtgørelsen, den konkrete VVM-screening eller relevante klagenævnsafgørelser] eller aktivere en supplerende temamappe. Brug kun temamapper, der findes her: ${THEME_FOLDERS.map((folder) => folder.name).join(", ")}. Opfind ikke andre mappenavne.

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

${scopeRules}

6. KILDEHENVISNINGER:
Kilderne ovenfor er nummereret [1], [2], [3]. Henvis med det nummer, kilden har i listen, og kun nummeret. Samme kilde beholder samme nummer, hver gang den bruges.
Sæt kildemærket i samme sætning som enhver lovhenvisning og enhver juridisk eller miljøfaglig påstand, også i den første sætning. Eksempel: miljøvurderingslovens afsnit III, § 21 [1].
Skriv ikke titel, paragraf eller journalnummer inde i hakparenteserne. Skriv ikke markdown-links. Brug kun numre, der findes i listen. Sæt ikke et nummer på en påstand, kilderne ikke støtter.
Når du nævner et dokument ved navn, så brug den fulde officielle titel fra kildelisten. Forkort den ikke.

7. LÆNGDE:
Svar kun på det, der spørges om. Hold svaret kort, direkte og sammenhængende. Et generelt spørgsmål klares i ét til tre korte afsnit.
Når svaret har flere led, så brug ### til overskrifter med en tom linje før og efter. Brug nummererede lister til regler og punktopstillinger, der starter med *, under et hovedpunkt. Fed skrift kun på nøgleordet i starten af et punkt, ikke på hele sætninger.

8. RETSLIG RISIKOFAKTOR:
Skriv kun en risikolinje, hvis analysen viser en direkte procesrisiko, en ophævelsesrisiko ved klagenævnet eller manglende overholdelse af officialprincippet eller forsigtighedsprincippet. Afslut i så fald svaret med en linje, der begynder præcis sådan:
Retslig risikofaktor: 
og derefter den konkrete risiko. Skriv den ikke, hvis der ikke er en sådan risiko. Brug ikke stjerner eller fed skrift.

STRUKTUR:
Skriv ét sammenhængende svar om spørgsmålet. Ikke en opremsning af kilder. Følg Kritisk kollega: intet udkast, ingen handlingsplan og ingen indledende ros. Et direkte spørgsmål i indsat korrespondance skal analyseres. Kategori B besvares kun med de to afsnit under Todelstype. Når brugeren selv oplyser en rolle, en organisation eller en person, og ikke stiller et retligt spørgsmål, så følg Samtalehukommelse: kun bekræftelsen, uden opfølgende spørgsmål, og brug ikke afklaringssætningen. En kort eller uspecificeret henvendelse, som ikke er besvaret i sagsakterne eller samtalen, er kategori A, følger afsnittet Afklarende dialog og får ingen eksempler. Hvis kilderne ikke rækker, så begynd med sætningen under Kildeutilstrækkelighed. Usikkerhedsafsnit kun efter punkt 3. Risikolinjen kun efter punkt 8, og kun til sidst.`;

    // 1. STANDARDMODEL: Claude Sonnet / Anthropic (hvis ANTHROPIC_API_KEY er konfigureret)
    if (anthropicApiKey) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicApiKey.trim() });

        const conversationHistory = history.slice(-20).map((h) => ({
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

        const cited = renumberCitations(colleagueReply(message, responseText), sources);
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
          ...history.slice(-20).map((h) => ({
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

        const cited = renumberCitations(colleagueReply(message, responseText), sources);
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
      primaryFile?.name ?? null
    );

    const outputNote = savedOutput.length
      ? "\n\nGemt output\n" +
        savedOutput.map((item) => "- " + item.citation + "\n" + item.textSnippet).join("\n")
      : "";

    const cited = renumberCitations(colleagueReply(message, `${dynamicResponse.text}${outputNote}`), sources);

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
      scope === "plan" ? "Plan / program (afsnit II, §§ 8–14)" : "Konkret projekt (afsnit III, §§ 15–25)"
    }:
Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter eller afgørelser i databasen for de valgte temamapper (${themes.join(", ") || "ingen valgt"}).

2. Gennemgang af kildegrundlag og gældende ret
- Det fremgår ikke entydigt af det aktiverede kildegrundlag, hvilke konkrete bestemmelser eller kendelser der skal lægges til grund, idet kildedatabasen er tom og afventer upload af sagsakter og afgørelser.
- Generelt gælder for ${scope === "plan" ? "planer og programmer [miljøvurderingslovens afsnit II, §§ 8–14]" : "konkrete anlægsprojekter [miljøvurderingslovens afsnit III, §§ 15–25]"}, at vurderinger skal baseres på dokumenteret materiale forud for afgørelsen.

3. Usikkerheder, forbehold eller manglende oplysninger i sagsakterne${fileMention}
- Kildedatabasen er helt nulstillet. Når du uploader sagsakter (f.eks. via 'Primært dokument' eller 'Sekundære dokumenter') eller tilføjer kendelser til temamapperne, vil analysen tage direkte udgangspunkt i de fremlagte dokumenter.`,
    warning: undefined,
    sources: [],
  };
}
