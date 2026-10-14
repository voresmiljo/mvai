# MVAI.dk — sådan er hjemmesiden sat op

Dette dokument beskriver den nuværende brugerflade på mvai.dk, skærm for skærm, med de ord der står på knapper, faner og tomme tilstande. Det er en beskrivelse af siden, som den er bygget. Det er ikke et ønske om en ny opsætning, og det er ikke en bestilling på at ændre database, ingest eller søgning.

Sprog på hele siden: dansk. Adressen er mvai.dk.

## Sådan skal dokumentet læses

MVAI ligner NotebookLM i opbygningen: kilder til venstre, samtale i midten, et panel til højre. Det er ikke NotebookLM. Forslag skal passe til den side, der er beskrevet herunder, ikke til NotebookLMs egne vinduer.

Det, der allerede findes, og som ikke skal foreslås som nyt:

- Databasen er Supabase (Postgres). Der er ikke Qdrant, og der skal ikke vælges en ny database.
- Kildebanken og temamapperne er i brug. De skal ikke bygges om ud fra dette dokument.
- Der er ingen pop-up ved et kildetal. Der er ingen klikbare tal inde i svaret.
- Højre panel har to faner, Kildeviser og Output. Kildeviser er ikke et tomt område, der venter på en modal.

Det, siden gør anderledes end NotebookLM:

- Venstre kolonne er ikke en liste over uploadede filer. Det er faste temamapper med afkrydsning, plus sagens egne dokumenter under dem. Grundmappen er altid med og kan ikke slås fra.
- En sag er enten en plan eller et projekt. Det vælges, når sagen oprettes, og kan ikke byttes inde i sagen.
- Kilderne ligger som knapper under hele svaret. Knappen viser titel og en procent. Et tryk åbner kilden i fanen Kildeviser, med titel, henvisning, afsnit, et tekstuddrag og, når filen findes, «Download original».
- Output er de svar, brugeren selv gemmer fra chatten. Det er ikke noter, NotebookLM selv skriver. Et gemt svar kan krydses til, så det indgår i næste svar.
- Samtale, temamapper, dokumentnavne og output gemmes ikke. Næste gang sagen åbnes, starter chatten forfra. Kun titel, plantype og tidspunkter bliver på sagen.

Brug dokumentet til at se, hvor et forslag rammer en knap, en fane eller en tom tilstand, der allerede har en tekst. Forslå ikke en ny kildebank, et nyt ingest-script eller en ny søgning. De dele er ikke beskrevet her, fordi de ikke er det, siden skal bygges videre på ud fra denne fil.

---

## 1. Hvad siden er

MVAI (Miljøvurderingsvejen) er et arbejdsrum til miljøvurdering af planer og konkrete projekter.

Brugeren opretter en sag, slår temamapper til, skriver et spørgsmål i en chat og får et svar. Under svaret ligger de kilder, svaret bygger på. Til højre kan kilden åbnes, og svaret kan gemmes som output.

Siden har fire steder:

1. Forsiden, som hedder Dine sager.
2. Login, som hedder Log ind eller Opret konto.
3. Om-siden, som hedder Om MVAI.
4. Selve sagen, som er et arbejdsrum med tre kolonner.

Browserfanens titel på forsiden er: «MVAI.dk — Afgørelsesklar AI for miljøvurderinger».

---

## 2. Udseende, som går igen

Baggrund: lys grågrøn, `#F7FAFA`.
Mørk grøn, brugt på knapper, logo og aktiv tilstand: `#0F382C`.
Knapper bliver lidt lysere grønne ved hover: `#14493a`.
Accentgrøn på ikoner og plan-mærker: `#2E8B57`.
Brugerens egne chatbobler: mørk blågrå, `#2A3B47`, hvid tekst.
AI-svar: lys baggrund, tynd grå kant.
Brødtekst: mørk, `#1A202C`.
Skrifttype: Geist.

Logoet er en mørkegrøn afrundet boks med teksten «mv» og et paragraftegn «§» i lysegrøn. Ved siden af står «MVAI.dk» (».dk» i grøn) og under det, med små bogstaver i versaler: «Miljøvurderingsvejen».

Logoet på forsiden, login og Om fører til forsiden. Hvis man allerede står på forsiden og trykker logoet, genindlæses forsiden.

---

## 3. Toppen på forsiden, login og Om

En hvid bjælke, 56 px høj, klæber til toppen.

Venstre side:

- Logoet.
- «Dine sager». Aktivt (grå baggrund) når man er på forsiden.
- «Om MVAI». Aktivt når man er på Om-siden.

Højre side, alt efter login:

- Mens login tjekkes: «Tjekker login...»
- Ikke logget ind: grøn knap «Log ind».
- Logget ind: en rund mørkegrøn cirkel med det første bogstav i e-mailen, derefter e-mailen (skjules på smal skærm), og en pil ned.

Menuen, når man er logget ind:

- «Logget ind»
- e-mailen
- «Dine sager»
- «Log ud» i rød

Log ud sender brugeren tilbage til forsiden.

---

## 4. Forsiden: Dine sager

Forsiden kræver ikke login for at blive vist. Sagslisten gør.

### 4.1 Start ny sag

Hvidt kort. Overskrift i versaler: «Start ny sag». Ved siden af: «— Vælg retsligt procesgrundlag».

To store knapper ved siden af hinanden. På smal skærm ligger de under hinanden. Begge har teksten «Opret sag →» øverst til højre.

Knap 1, plan:

- Grønt mærke: «Afsnit II — Lovens § 8»
- Titel: «Miljøvurdering af planer og programmer»
- Tekst: «Strategisk miljøvurdering (SMV) for kommuneplantillæg, lokalplaner, sektorplaner m.fl. jf. miljøvurderingslovens § 8.»

Knap 2, projekt:

- Gråt mærke: «Afsnit III — Lovens § 15»
- Titel: «Miljøvurdering af projekter»
- Tekst: «Konkrete anlægsprojekter, VVM-screeninger jf. § 21 (bilag 2) eller fulde miljøkonsekvensrapporter jf. § 15 (bilag 1).»

Hvis man ikke er logget ind og trykker en af knapperne, sendes man til login, og bagefter tilbage til forsiden.

Hvis man er logget ind, oprettes sagen med det samme, og man sendes ind i sagen.

Ny plan-sag får titlen «mv plan 01», «mv plan 02» og så videre. Ny projekt-sag får «mv projekt 01», «mv projekt 02» og så videre. Nummeret er det laveste ledige for den bruger og den type. Sagsnummeret er årstal, bindestreg, PLAN eller VVM, bindestreg og fire tegn, for eksempel «2026-PLAN-A1B2». Det sagsnummer vises ikke på sagskortet.

### 4.2 Listen «Dine sager»

Overskrift: «Dine sager». Ved siden af et tal i en cirkel. Tallet er antal sager efter søgning og filter, ikke nødvendigvis alle sager.

Søgefelt, placeholder: «Søg i titel...». Søgningen rammer både titel og sagsnummer. Den skelner ikke mellem store og små bogstaver.

Filter, tre knapper i én gruppe. Den valgte er mørkegrøn med hvid tekst:

- «Alle»
- «Projekter»
- «Planer»

Tilstande i listen:

- Mens login eller listen hentes: «Henter dine sager...»
- Ikke logget ind: «Log ind for at se dine sager». Undertekst: «Efter login vises de sager, du har oprettet, her.» Knap: «Log ind».
- Logget ind, ingen sager: «Du har ingen sager endnu». Undertekst: «Start en plan eller et projekt ovenfor. Sagen bliver stående på denne liste.»
- Søgning eller filter uden træffere: «Ingen sager matcher søgningen». Undertekst: «Prøv at rydde søgefeltet eller skifte filter.»
- Fejl: gul boks med fejlteksten.

### 4.3 Ét sagskort

Kortet er hvidt. Hele kortet kan trykkes og åbner sagen. Undtagelser: menuen med tre prikker, og feltet når titlen redigeres.

På kortet, oppefra:

- Et lille mærke. Plan er grønt og står «plan». Projekt er gråt og står «projekt».
- Titlen, fed.
- «Oprettet» og derefter dato uden klokkeslæt, for eksempel «14. okt. 2026».
- Hvis sagen har et primært dokument gemt på rækken, vises filnavnet med et dokumentikon. I den nuværende brugerflade bliver det felt ikke udfyldt, når man lægger et dokument på inde i sagen. Se afsnit 10.
- Til højre: etiketten «Sidst redigeret» og et tidspunkt med dato, time og minut.
- En knap med tre vandrette prikker. Skærmlæsertekst: «Handlinger for [titel]».
- En chevron til højre. Den er kun et tegn. Selve kortet er linket.

Menuen:

- «Rediger titel»
- «Slet sag»

Rediger titel åbner et felt i kortet, højst 120 tegn, med knapperne «Gem» og «Annuller». Escape lukker uden at gemme. Tom titel gemmes ikke. Enter gemmer.

Slet sag spørger i menuen: «Slet sagen?» og «Det kan ikke fortrydes.» Knapper: «Slet» (rød) og «Annuller».

### 4.4 Rækkefølge og «Sidst redigeret»

Nyeste «Sidst redigeret» ligger øverst.

Klokken er dansk tid (Europa/København), med sommertid og vintertid. Formatet er dag, kort månedsnavn, time og minut, for eksempel «14. okt., 19.25».

Tidspunktet ændres kun i to tilfælde:

1. Brugeren sender en besked i chatten på sagen.
2. Brugeren gemmer en ny titel, enten i sagskortets menu eller i titelfeltet inde i sagen.

At åbne sagen og gå ud igen ændrer ikke tiden og flytter ikke sagen.

### 4.5 Bund på forsiden

«MVAI.dk • Miljøvurderingsvejen»

To links, begge til Om-siden, med teksterne «Metode & Retsgrundlag» og «Datasikkerhed & GDPR».

Til højre: «v2026.4 (EU Frankfurt)».

---

## 5. Login

Siden har to tilstande i samme kort. Overskriften skifter.

Log ind:

- Overskrift: «Log ind»
- Forklaring: «Når du er logget ind i denne browser, åbner mvai.dk direkte på dine sager. Du bliver, indtil du trykker Log ud.»
- Felt: «E-mail»
- Felt: «Adgangskode» (mindst 8 tegn)
- Knap: «Log ind». Mens den arbejder: «Arbejder...»
- Under knappen: «Ny bruger? Opret konto»

Opret konto:

- Overskrift: «Opret konto»
- Samme forklaring.
- Felt: «E-mail»
- Felt: «Adgangskode»
- Felt: «Gentag adgangskode»
- Knap: «Opret konto»
- Under knappen: «Har du allerede en konto? Log ind»

Hvis de to adgangskoder ikke er ens: «Adgangskoderne er ikke ens.»

Efter oprettelse, hvis e-mailen skal bekræftes, skifter kortet tilbage til Log ind og viser en grøn besked. Standardteksten, hvis serveren ikke sender en anden, er: «Bekræft e-mailen, og log derefter ind.»

Hvis bekræftelseslinket fejler: «Bekræftelseslinket kunne ikke åbne kontoen. Brug samme browser som ved oprettelsen, eller opret kontoen igen.»

Andre fejl vises i rød under felterne. Forbindelsesfejl: «Forbindelsen til login fejlede. Prøv igen.»

Mens login-siden selv henter: «Indlæser login...»

---

## 6. Om MVAI

Smal tekstspalte. Fem afsnit, i denne rækkefølge. Der er ingen liste over kilder og ingen optælling af dokumenter på denne side.

### Formål

«Formålet med Miljøvurderingsvejen (MVAI) er at styrke kvaliteten, overblikket og gennemskueligheden i arbejdet med miljøvurderinger. Platformen gør det muligt hurtigt, objektivt og præcist at holde sagsdokumenter op mod det gældende retsgrundlag, officielle vejledninger og relevant klagenævnspraksis. Ved altid at forankre analyserne direkte i et fagligt kurateret kildekorpus sikres det, at besvarelserne er juridisk underbyggede, sporbare og fri for opdigtede antagelser.»

### Brugerflade

Indledning: «Arbejdet på MVAI tilrettelægges i strukturerede sager, hvor brugeren har fuld kontrol over det aktiverede kildegrundlag:»

- «Sagsdokumenter (som bruger selv uploader):» Enhver analyse tager udgangspunkt i et primært dokument, for eksempel et planudkast, en miljørapport, en afgørelse eller en screeningsansøgning. Det kan suppleres af sekundære dokumenter.
- «Grundmappe:» Altid aktiv som det juridiske fundament. Den indeholder miljøvurderingsloven, gældende bekendtgørelser og de overordnede officielle vejledninger. Grundmappen har ingen afkrydsning i sagen. Den kan ikke slås fra.
- «Temamapper:» Fagspecifikke emner, som brugeren selv slår til. Relevante klagenævnsafgørelser ligger i den temamappe, de handler om.
- «Transparens og kildehenvisninger:» Besvarelser bygger på det valgte kildekorpus og får kildehenvisninger. Hvis grundlaget ikke rækker, siger systemet det.

### Kvalitetssikring og datasikkerhed

- «Faglig kuratering:» Dokumenter i det fælles arkiv er udvalgt af fagpersoner. Et dokument kommer først i grundmappen eller en temamappe, når det er gennemlæst og godkendt.
- «Fuld fortrolighed:» Primære og sekundære dokumenter på en sag forbliver på den sag. De blandes ikke ind i det fælles arkiv og bruges ikke til at træne AI-modeller.

### Kildeomfang og præcision

- «Fokuseret kildevalg:» Grundmappen er altid med. Hver temamappe lægger et fagområde til. Flere end tre temamapper ad gangen gør søgningen bredere og kan øge usikkerheden.
- «Inddragelse af egne dokumenter:» Egne dokumenter og producerede notater indgår kun, når de er slået til på sagen.

### Kontakt

«Spørgsmål til kilder, mapper og brug af MVAI kan sendes til postkassen herunder.»

Link: kontakt@mvai.dk

Knap under det hele: «Tilbage til sagerne». Den går til forsiden.

---

## 7. Selve sagen

Adressen er /sag/ efterfulgt af sagens id. Siden fylder hele vinduet og ruller ikke som én side. De tre kolonner ruller hver for sig.

Mens sagen hentes: «Indlæser sagsarbejdsrum...»

### 7.1 Topbjælke inde i sagen

Denne bjælke er ikke den samme som på forsiden. Der er ikke logo og ikke brugermenu.

Fra venstre:

- Knap med pil og teksten «Dine sager». På smal skærm er kun pilen synlig. Mus-over: «Gå tilbage til sagsdashboard». Knappen indlæser forsiden på ny, som et almindeligt link.
- Et mærke: «Plan» (grønt) eller «Projekt» (gråt). Det kan ikke ændres inde i sagen.
- Sagens titel i et felt. Det ligner tekst, indtil man klikker. Højst 120 tegn. Feltet gemmer, når det mister fokus. Enter gemmer. Escape fortryder og gemmer ikke. En tom titel springes over, og den gamle titel kommer tilbage. En ny titel opdaterer «Sidst redigeret».

Til højre: «Om MVAI».

### 7.2 Venstre kolonne

Bredde cirka 320 px. To blokke og en bundlinje.

#### Temamapper

Overskrift i versaler: «Temamapper».

Til højre et tæller: «N/3 aktive». N er antal afkrydsede mapper. Tælleren bliver gul, når N er over 3. Der er ikke et loft, der spærrer. Man kan krydse alle til. Over tre kommer en gul advarsel:

- «Fagligt advarselsloft:»
- «Flere end 3 temamapper øger risikoen for informationsstøj og udvander det retslige præcisionstjek.»

Under overskriften: «Aktivér de fagområder, sagen handler om.»

Mapperne ligger i to grupper. Gruppenavnet er små versaler.

Gruppe «Natur & Miljø (Lovens miljøfaktorer)»:

1. «Artsbeskyttelse & Bilag IV». Undertekst: «Habitatdirektivets art. 12.»
2. «Artsforvaltningsplaner & Artsbiologi». Undertekst: «Forvaltningsplaner og artens biologi.»
3. «Natura 2000 & Habitatområder». Undertekst: «Habitatdirektivets art. 6.»
4. «§ 3-Natur & Beskyttede Naturtyper». Undertekst: «Naturbeskyttelsesloven.»
5. «Støj, Vibrationer & Luft». Undertekst: «Sundhed, befolkning, gener.»
6. «Grundvand, Spildevand & Vandmiljø». Undertekst: «Vandrammedirektiv, overfladevand.»
7. «Landskab, Kyst & Beskyttelseslinjer». Undertekst: «Kystnærhed, landskabsbilleder.»
8. «Kulturarv & Arkæologi». Undertekst: «Kirkeomgivelser, museumslov, fortidsminder.»

Gruppe «Projekter & Proces (Praksis & Sektorlovgivning)»:

9. «VE-anlæg (Vindmøller & Solceller)». Undertekst: «Energianlæg, Bilag 2, pkt. 3.»
10. «Byudvikling & Infrastruktur». Undertekst: «Erhverv, veje, byzoneanlæg, Bilag 2, pkt. 10.»
11. «Sagsbehandling & Procesretlige Mangler». Undertekst: «Inhabilitet, høring, begrundelseskrav, § 40.»

Hver mappe er en række med et afkrydsningsfelt, navn, undertekst og til højre «0 dok.» Tallet 0 står fast i brugerfladen. Det viser ikke, hvor mange dokumenter mappen faktisk indeholder.

En valgt række har grøn kant og hvid baggrund. Navnet bliver mørkegrønt. En fravalgt række er lysere.

Når en ny sag åbnes, er én mappe allerede valgt:

- Plan: «Natura 2000 & Habitatområder»
- Projekt: «Artsbeskyttelse & Bilag IV»

Grundmappen står ikke på listen. Den søges altid med, uden at brugeren kan slå den fra.

Valget af temamapper gemmes ikke. Det nulstilles til standarden, næste gang sagen åbnes.

#### Sagsdokumenter

Overskrift i versaler: «Sagsdokumenter». Til højre: «N fil(er)», hvor N er 1 hvis der er et primært navn, plus antal sekundære.

Primært, grøn boks:

- Filnavnet, eller «Intet primært dokument»
- Lille sort mærke: «Primært»
- Link: «Skift primært dokument →»

Sekundære, hvid boks:

- «Sekundære dokumenter (N)»
- Link: «+ Tilføj»
- Listen af filnavne, eller «Ingen sekundære dokumenter tilføjet»

Et tryk åbner ikke en filvælger. Browseren spørger i et prompt om et filnavn. Foreslået navn for primært: «Miljorapport_Sag_2026.pdf». Foreslået navn for sekundært: «Trafiknotat_Kapacitetsvurdering.pdf». Annullerer man, sker der intet. Skriver man et navn, vises navnet. Filens indhold læses ikke. Navnet bruges som en etiket i analysen.

Et nyt filnavn kan få systemet til at krydse ekstra temamapper til, ud fra navnet. De gamle kryds bliver stående.

#### Bund i venstre kolonne

«RAG Version 2026.4» med et skjold, og til højre «Fortroligt sagsrum».

### 7.3 Midterkolonnen

Tre dele, ovenfra: en bjælke med sagsmateriale, samtalen, og skrivefeltet.

#### Bjælke: Sagsmateriale

Venstre: «Sagsmateriale:»

Højre, to knapper:

1. «1. Primært dokument» med et mærke «Fokus». Tykkere grøn kant. Samme prompt som «Skift primært dokument» i venstre kolonne. Et nyt navn erstatter det gamle.
2. «2. Sekundære dokumenter» med antallet i parentes. Samme prompt som «+ Tilføj». Navnet lægges til. Der er ingen knap til at fjerne et dokument.

Under knapperne vises navnene som små mærker. Det primære har et ekstra mærke «Primært».

#### Samtalen

Samtalen starter altid med én besked fra systemet. Den gemmes ikke, og den er den samme hver gang sagen åbnes. Den tidligere samtale kommer ikke tilbage.

Afsender på den besked: «MVAI Afgørelsesanalyse». Ved siden af et klokkeslæt, time og minut, i browserens egen tidszone.

Teksten, ordret:

«Du kan uploade sagens dokumenter ovenfor, vælge de relevante temamapper til venstre, og stille dine konkrete juridiske eller miljøfaglige spørgsmål i feltet nedenfor. Til højre finder du både kildehenvisninger og de output du selv producerer undervejs.»

Brugerens egne beskeder ligger til højre i en mørk boble. Afsender: «Du». Tidspunkt ved siden af.

Systemets svar ligger til venstre. Ikonet er en mørkegrøn firkant med en stjerne. Afsender: «MVAI Afgørelsesanalyse». Hvis svaret kommer fra modellen, står et lille grønt mærke med modellens navn, typisk «Claude Sonnet».

Svarets tekst vises som almindelig tekst med linjeskift. Der er ingen tal inde i sætningerne. Der er ingen klikbare henvisninger inde i brødteksten. Hakparenteser, som modellen selv skriver, for eksempel [Miljøvurderingsloven § 8, stk. 1], er almindelig tekst. De kan ikke trykkes på.

Hvis svarets tekst indeholder et af ordene risiko, advarsel, ophævelse eller ugyldig, vises en gul boks under teksten:

- «Retslig risikofaktor:»
- «Klagenævnspraksis (MFKN): Prøvelsen af Natura 2000, kumulation og habitatdirektivet er intens. Hvis der er videnskabelig tvivl om fravær af skade på udpegningsgrundlaget, kan tilladelse eller plan ikke vedtages.»

Den tekst er fast. Den er ikke et uddrag af svaret.

#### Kilder under svaret

Hvis svaret har kilder, kommer en blok under teksten, adskilt med en streg.

Overskrift, små versaler:

«Anvendte retskilder (Klik for at inspicere i kildelæser):»

Ordet «kildelæser» i den sætning er den gamle betegnelse. Fanen til højre hedder Kildeviser.

Under overskriften ligger kilderne som knapper i en række, der ombrydes. Hver knap har:

- et lille flueben-dokument
- kildens titel, afkortet hvis den er lang (omkring 220 px)
- et tal i parentes, relevans i procent, for eksempel «(87%)»

Den kilde, der er åben i højre kolonne, er mørkegrøn med hvid tekst. De andre er hvide med grå kant.

Et tryk på knappen åbner kilden i fanen Kildeviser og rydder en eventuel fejl fra et tidligere download.

Den første kilde i svaret åbnes af sig selv i højre kolonne, også før man har trykket.

Der er typisk op til fem retskilder. Gemt output, som er slået til, kan ligge foran dem og tæller med som kilde. De har relevans 100 %.

#### Knapper under hvert AI-svar

På velkomstbeskeden og på alle senere AI-svar, under en streg:

- «Kopier tekst». Efter tryk, i to sekunder: «Kopieret!» Den kopierer kun brødteksten, ikke kildeknapperne.
- «Download PDF». Filen får et navn ud fra sagsnummeret. Indholdet er en tekstfil med PDF-type, ikke et opsat dokument. Øverst står:

```
MVAI.DK — MILJØVURDERINGSVEJEN
Sag: [titel] ([sagsnummer])
Dato: [dato]

==================================================
```

og derefter svarets tekst.

- Til højre, grønt link: «+ Gem i output»

«+ Gem i output» lægger en kopi af svaret i fanen Output og skifter derover. Titlen bliver «Uddrag fra analyse ([tidspunkt])». Over titlen står enten «Miljøvurdering af Plan (§ 8)» eller «Konkret Projekt (§§ 15–25)». Afkrydsningen starter fra. Samme svar kan gemmes flere gange.

#### Mens svaret laves

En boble med en roterende stjerne og en pulserende grøn prik. Teksten er præcis:

«Genererer miljøretlig analyse...»

#### Skrivefeltet

Et felt med tre linjer. Placeholder, både for plan og projekt:

«Tekstfelt»

Under feltet, til venstre, et skjold og teksten:

«Claude 3.5 Sonnet RAG-analyse»

Det mærke står der altid. Det skifter ikke, når svaret bagefter viser et andet modelnavn.

Til højre en mørkegrøn knap: «Analysér». Mens der svares: «Analyserer...». Knappen er slået fra, når feltet er tomt, eller mens der svares.

Enter sender. Shift+Enter laver en ny linje.

Et sendt spørgsmål tømmer feltet med det samme. Beskeden lægges i samtalen, og «Sidst redigeret» opdateres.

Hvis forbindelsen til analysen fejler, lægges dette svar i samtalen, uden kilder. For en plan:

«Der er på nuværende tidspunkt ikke uploadet eller indekseret specifikke retskildedokumenter eller sagsakter i databasen for Plan / Program (§ 8).

Når du uploader et sagsdokument eller tilføjer afgørelser til temamapperne, analyseres spørgsmålet med kildehenvisninger.»

For et projekt er første linje den samme, men slutter med «Konkret Projekt (§§ 15–25)».

#### Hvad analysen får med

Med spørgsmålet sendes:

- teksten
- om sagen er plan eller projekt
- de temamapper, der er krydset til
- sagens titel og sagsnummer
- filnavnet på det primære dokument, hvis det er sat, og navnene på de sekundære
- de seneste beskeder i samtalen som kontekst
- de output, brugeren har krydset til

Filernes indhold sendes ikke med. Kun navnene.

Svaret skal være kort og direkte, derefter gennemgå kilderne, og til sidst sige hvis noget mangler. Modellen er bedt om at sætte henvisninger i hakparenteser i teksten. Brugerfladen gør ikke de parenteser til links. De kilder, søgningen fandt, vises som knapperne under svaret, uanset om parenteserne nævner dem.

### 7.4 Højre kolonne

Bredde cirka 384 px. To faner. Teksten på fanerne er skrevet normalt, men typografien viser dem som versaler, så man læser:

- «KILDEVISER»
- «OUTPUT» med et tal i en cirkel

Kildeviser er valgt, når sagen åbnes, indtil et svar gemmes i output.

#### Fanen Kildeviser, tom

Et søgeikon og teksten:

«Klik på en kildehenvisning i samtalen for at åbne det fulde tekstsnit og hente originalkilden.»

#### Fanen Kildeviser, når en kilde er åben

Øverst til højre et grønt mærke: «87% Match», hvor tallet er kildens relevans. Der er ingen overskrift «Verifikation af retskilder».

Kort 1, hvidt:

- Lille grøn etikette: «Retskilde»
- Titel, fed
- Henvisning, i monospace, for eksempel lovnummer, bekendtgørelse eller klagenævnets journalnummer
- «Afsnit:» og afsnittets navn

Kort 2, hvidt:

- Etikette: «Gældende ordlyd / Citat»
- Til højre: kildens dato, eller «Gældende praksis», hvis datoen mangler
- Selve uddraget i en monospace-blok med linjeskift
- Under uddraget, kursiv: «Teksten er en forhåndsvisning. Knappen henter den originale fil.»

Hvis kilden er gemt output fra sagen, er den kursiv i stedet: «Teksten er gemt output fra denne sag og bruges som kildemateriale i de næste svar.» Henvisningen starter da med «Output:».

Kort 3 vises kun, hvis originalfilen findes:

- «Originalt dokument (PDF)»
- filnavnet
- knap: «Download original». Mens den henter: «Henter...»
- under knappen: «Filen er det originale dokument.»

Hvis hentningen fejler: «Originalen kunne ikke hentes.»

Download er den originale PDF, ikke tekststumpen. Stumpen er kun forhåndsvisningen.

#### Fanen Output

Der er ingen overskrift «Output» under fanen. Fanenavnet er overskriften.

Tom tilstand, med et ikon:

«Intet output endnu. Gem et svar fra chatten med Gem i output.»

Når mindst ét output er krydset til, en gul boks øverst:

- «Output indgår i analysen.»
- «Det afkrydsede output indgår nu i kildematerialet (ligesom temamapperne)»

Hvert gemt svar er et hvidt kort:

- Et afkrydsningsfelt uden egen synlig etiket. Feltet hører sammen med kortets titel. Slået til betyder, at teksten sendes med i næste analyse. Kortet får grøn kant.
- Et mærke med sagstypen, «Miljøvurdering af Plan (§ 8)» eller «Konkret Projekt (§§ 15–25)»
- Titel: «Uddrag fra analyse ([tidspunkt])»
- Tidspunkt under titlen
- Teksten i en lav boks, der kan rulles
- To knapper: «Hent .docx» (hvid) og «Hent .pdf» (mørkegrøn)

De to hent-knapper lægger teksten i en fil med den angivne type. Det er ikke et færdigt Word- eller PDF-layout.

Output gemmes kun i den åbne fane. Lukker man sagen, er output væk.

Et afkrydset output kan også dukke op som en kildeknap under næste svar, med titel, «Output: [titel]», afsnit «Gemt output» og 100 %.

#### Bund i højre kolonne

«MVAI Kildeverifikationsmotor • Ingen AI-genererede referencer»

---

## 8. Hvad der huskes, og hvad der kun findes på skærmen

Huskes på sagen, og kan ses næste gang:

- titel
- om det er plan eller projekt
- sagsnummer
- oprettet-dato
- sidst redigeret, med dansk tid

Findes kun, mens fanen er åben, og er væk næste gang sagen åbnes:

- samtalen, inklusive velkomstteksten, som så vises forfra
- valgte temamapper, som så starter forfra med Natura 2000 på en plan og Artsbeskyttelse på et projekt
- navne på primære og sekundære dokumenter
- alt output, også det der var krydset til
- hvilken kilde der var åben
- teksten i skrivefeltet

Slet sag fjerner sagen fra listen. Det kan ikke fortrydes. Sagen kan kun slettes af den bruger, der ejer den. Listen viser kun egne sager.

---

## 9. Kilder, som brugeren ikke styrer i skærmen

Grundmappen er altid med. Temamapperne er de emner, brugeren slår til. En kilde kan være begrænset til plan, til projekt, eller til begge. En plan-sag ser ikke projekt-kilder, og omvendt.

Kildeknappen viser dokumentets korte titel, ikke et løbenummer. Procenten er hvor tæt uddraget ligger på spørgsmålet. Åbner man knappen, ser man titel, henvisning, afsnit, dato og et tekstuddrag. Originalen, når den findes, hentes med «Download original».

Egne sagsdokumenter er filnavne. Deres tekst indgår ikke i svaret.

---

## 10. Små ting, som skærmen gør, og som er lette at overse

- Fanerne i højre kolonne ser ud som «KILDEVISER» og «OUTPUT», fordi teksten vises med versaler.
- Tælleren på hver temamappe står «0 dok.» uanset indhold.
- «kildelæser» findes kun i sætningen over kildeknapperne. Fanen hedder Kildeviser.
- Placeholder i chatten er «Tekstfelt» for både plan og projekt.
- Mærket under skrivefeltet siger «Claude 3.5 Sonnet RAG-analyse». Mærket på selve svaret siger typisk «Claude Sonnet».
- Klokkeslættet på sagslisten er dansk tid. Klokkeslættet på en chatbesked er browserens tid.
- Tilbage fra sagen til forsiden indlæser forsiden forfra, så listen ikke bliver hængende på «Henter dine sager...»
- At gå ind i en sag og ud igen flytter den ikke op i listen.
- Der er ingen tal 1, 2, 3 inde i svaret, og der er ikke et lille vindue ved et tal med «Se kilde». Kilderne er knapper under hele svaret.
