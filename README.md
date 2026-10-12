# MVAI.dk — Miljøvurderingsvejen

> Afgørelsesklar AI for miljøvurderinger, VVM og retslig sagsbehandling.

Dette projekt er opbygget som en moderne Next.js (App Router) + TypeScript + Tailwind CSS SaaS-platform.

## Struktur

- `/` — **Hovedside / Sagsdashboard (NotebookLM-stil):**
  - Top-sektion: 'Start ny sag'-blok med to store knapper:
    - *Miljøvurdering af planer* (Afsnit II / § 8)
    - *Miljøvurdering af projekter* (Afsnit III / §§ 15–25)
  - Bund-sektion: 'Dine sager' oversigt med søgning og filtrering.
  - Header: Diskret topmenu med MVAI-logo, link til 'Dine sager', 'Om MVAI' og brugerprofil.

- `/sag/[id]` & `/app` — **Arbejdsinterface (3-panels NotebookLM layout):**
  - **Venstre Panel:** 
    - Kilde- og temastyring: Retsligt arbejdsområde (§ 8 vs. §§ 15–25).
    - Grundmappe (altid aktiv og låst til gældende lov og bekendtgørelser).
    - Dynamiske temamapper (Artsbeskyttelse, Klagenævnspraksis, Natura 2000 m.fl. med advarselsloft ved 4+).
  - **Midterpanel:**
    - To adskilte upload-knapper: *"1. Hoveddokument"* og *"2. Supplerende kilder"*.
    - Besvarelsesvindue med strukturerede analyser, risikofaktorer og klikbare kildereferencer.
    - Chat-input med kildekontrol.
  - **Højre Panel:**
    - Kildelæser & verifikation med ordlyd/citat fra gældende lov eller nævnsafgørelse.
    - Direkte knap til download af original PDF.

- `/om` — **Om MVAI:**
  - Grundig gennemgang af metodik, 2-spors procesadskillelse, RAG-arkitektur, kildekontrol, dataintegritet, GDPR, EU-hosting (Frankfurt) og kontaktinformation.

## AI Sprogmodeller & Konfiguration

Projektet er bygget med en opdelt model-arkitektur:
1. **Chat & Retslig Sagsanalyse:** **Claude 3.5 Sonnet** (`@anthropic-ai/sdk`) som standardmodel til præcis, hallucination-fri lovfortolkning og klagenævnspraksis.
   - Kræver `ANTHROPIC_API_KEY` i miljøvariabler.
   - Kan falde tilbage til `OPENAI_API_KEY` (GPT-4o) eller den indbyggede retskildematrix.
2. **Dokumentindeksering & Tagging:** **GPT-4o-mini** (eller Gemini Flash via OpenAI/Google API) til lynhurtig klassificering og parsing af uploadede sagsakter (`/api/tag-document`).
   - Kræver `OPENAI_API_KEY` (eller `GEMINI_API_KEY`).

## Kom i gang lokalt

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) for forsiden eller [http://localhost:3000/app](http://localhost:3000/app) for selve arbejdsområdet.

## Build

```bash
npm run build
npm run start
```
