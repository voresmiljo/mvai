# MVAI.dk — Miljøvurderingsvejen

> Afgørelsesklar AI for miljøvurderinger, VVM og retslig sagsbehandling.

Dette projekt er opbygget som en moderne Next.js (App Router) + TypeScript + Tailwind CSS SaaS-platform.

## Struktur

- `/` — **Public Landing Page:**
  - Hero med værdibudskab og opfordring til handling.
  - Værditilbud: Hvorfor specialiseret RAG vs. generiske AI-chatbots.
  - Platformens funktioner: Grundmappe + Dynamiske Temamapper, Procesadskillelse (§ 8 vs. §§ 15–25) og Kildevisning/PDF-download.
  - Målgrupper: Myndigheder/Kommuner, Miljørådgivere og Forskere.
  - Datasikkerhed & GDPR (GovTech-krav, ingen træning på sagsakter, EU-hosting).
  - Demotilmelding / kontakt.

- `/app` — **Web-App Interface (3 Paneler):**
  - **Venstre Panel:** 
    - Retsligt arbejdsområde (Konkret Projekt jf. §§ 15–25 vs. Plan/Program jf. § 8).
    - Grundmappe (altid aktiv og låst til gældende lov og bekendtgørelser).
    - Dynamiske temamapper (Artsbeskyttelse, Klagenævnspraksis, Natura 2000 m.fl. med advarselsloft ved 4+).
  - **Midterpanel:**
    - To adskilte upload-knapper: *"1. Sagsdokument / Afgørelse (Primært fokus)"* og *"2. Supplerende kilder"*.
    - Besvarelsesvindue med strukturerede analyser, risikofaktorer og klikbare kildereferencer.
    - Chat-input til sagsbehandleren med kildekontrol.
  - **Højre Panel:**
    - Kildelæser & verifikation med ordlyd/citat fra gældende lov eller nævnsafgørelse.
    - Direkte knap til download af original PDF.

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
