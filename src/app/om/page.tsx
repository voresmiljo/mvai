import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  ShieldCheck,
  Scale,
  FileCheck2,
  FolderLock,
  Lock,
  Building2,
  Layers,
  Server,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Om MVAI.dk — Metodik, RAG-arkitektur og Sikkerhed",
  description:
    "Information om den faglige metodik, retskildematrix, RAG-arkitektur, GDPR og myndighedssikkerhed bag MVAI.dk.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      <AppHeader />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Header intro */}
          <div className="border-b border-slate-200 pb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0F382C] mb-3">
              <Scale className="w-3.5 h-3.5 text-[#2E8B57]" />
              <span>Faglig dokumentation & myndighedsstandard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Om MVAI.dk — Miljøvurderingsvejen
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              MVAI.dk er et specialiseret sagsbehandler- og analyseværktøj designet til dansk miljøvurderingsret. 
              Platformen anvender en stringent RAG-arkitektur (Retrieval-Augmented Generation), der forankrer ethvert 
              svar i gældende lov, bekendtgørelser og klagenævnspraksis — med nul hallucinationer og fuld kildesporbarhed.
            </p>
          </div>

          {/* Retslig arkitektur & procesadskillelse */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                <Layers className="w-4.5 h-4.5 text-emerald-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                1. Retslig arkitektur: To adskilte processpor
              </h2>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              En af de hyppigste kilder til fejl i generiske AI-modeller er sammenblandingen af proceskrav. I dansk miljøret 
              er der afgørende forskel på, om en sag vedrører en <strong>plan/program</strong> eller et <strong>konkret anlægsprojekt</strong>. 
              MVAI.dk håndhæver denne adskillelse på kode- og systemniveau:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#0F382C] border border-emerald-200">
                  <span>Afsnit II — Planer & Programmer</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Strategisk Miljøvurdering (SMV jf. § 8)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fokuserer på overordnede planrammer, kommuneplantillæg, lokalplaner og sektorplaner. RAG-indekset prioriterer 
                  vurderinger af alternativer, kumulation med naboplaner, og krav om offentlighed i henhold til SMV-direktivet.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Retsgrundlag: Lovbekendtgørelse nr. 4 af 03/01/2023, § 8 m.fl.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#2A3B47] border border-slate-200">
                  <span>Afsnit III — Konkrete Projekter</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  VVM-screening & Tilladelse (§§ 15–25)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fokuserer på konkrete bygge- og anlægsprojekter omfattet af bilag 1 eller 2. Indekset låser sig fast på bilag 6-kriterierne 
                  for væsentlighed, dokumentation af afbødende foranstaltninger og Klagenævnets stringente prøvelse af § 21-screeninger.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Retsgrundlag: Lovbekendtgørelse nr. 4 af 03/01/2023, §§ 15–25 & bilag 6
                </div>
              </div>
            </div>
          </section>

          {/* NotebookLM-metoden: Låst grundmappe & Temamapper */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                <FolderLock className="w-4.5 h-4.5 text-emerald-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                2. Kildekontrol: Grundmappe + Dynamiske Temamapper
              </h2>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              MVAI arbejder efter et kildestyringsprincip inspireret af forskningsværktøjet NotebookLM:
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0F382C]">
                  <Scale className="w-4 h-4 text-[#2E8B57]" />
                  <span>Låst Grundmappe (Dansk Miljøvurderingsret)</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                  Er <strong>altid aktiv</strong> for alle sager. Indeholder fuldtekstindeksering af miljøvurderingsloven, 
                  tilhørende bekendtgørelser, Miljøstyrelsens officielle vejledninger og relevante EU-direktiver. 
                  Denne mappe kan ikke fravælges og danner det ufravigelige retlige fundament.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900">
                    Dynamiske Temamapper & Fagligt Advarselsloft
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Maks. 3 anbefalet
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sagsbehandleren kan tilkoble specialiserede temamapper som f.eks. <em>Artsbeskyttelse & Bilag IV</em>, 
                  <em>Klagenævnspraksis (MFKN)</em>, <em>Natura 2000</em> eller <em>Grundvand/BNBO</em>.
                  Hvis der aktiveres flere end 3 temamapper, udløser systemet et fagligt advarselsloft, fordi for brede 
                  kilderammer øger risikoen for informationsstøj og forringer præcisionen i det konkrete lovtjek.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
                <div className="font-bold text-sm text-slate-900">
                  Adskilt sagsmateriale (Primært fokus vs. Supplerende kilder)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  I arbejdsinterfacet adskilles selve afgørelsesudkastet eller bygherres anmeldelse (som udgør det primære 
                  analysetarget) strengt fra supplerende rapporter (f.eks. geotekniske målinger, trafiknotater eller 
                  feltundersøgelser). Dette sikrer, at analysen altid evaluerer afgørelsen op imod retskilderne.
                </p>
              </div>
            </div>
          </section>

          {/* Sikkerhed, Fortrolighed & GDPR */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                3. Datasikkerhed, GDPR & GovTech-krav
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#0F382C] mb-3">
                  <Lock className="w-4 h-4 text-[#2E8B57]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Ingen modeltræning</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Sagsakter, kladder og interne notater anvendes <strong>aldrig</strong> til træning eller forbedring 
                  af underliggende LLM-modeller. Data forbliver isoleret i organisationens sagsrum.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#0F382C] mb-3">
                  <Server className="w-4 h-4 text-[#2E8B57]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">EU Data Hosting (Frankfurt)</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Al databehandling og vektorlagring er konfigureret til datacentre i EU (Frankfurt / `fra1`). 
                  Dette overholder EU-GDPR og danske krav til offentlig digital forvaltning.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#0F382C] mb-3">
                  <FileCheck2 className="w-4 h-4 text-[#2E8B57]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Databehandleraftale (DPA)</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Vi leverer standardiseret myndigheds-DPA og overholder kravene til revisionsspor, kryptering ved overførsel 
                  (TLS 1.3) og kryptering i hvile (AES-256).
                </p>
              </div>
            </div>
          </section>

          {/* Sprogmodeller & AI-Arkitektur */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                <Sparkles className="w-4.5 h-4.5 text-emerald-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Sprogmodeller & Ræsonneringsarkitektur
              </h2>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              MVAI.dk anvender en differentieret model-arkitektur, der balancerer juridisk ræsonneringsdybde med lynhurtig dokumentindeksering:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#0F382C] border border-emerald-200">
                  <span>Standardmodel for sagsanalyse</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Claude 3.5 Sonnet (Anthropic)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Står for den dybdegående juridiske vurdering, kobling til Miljø- og Fødevareklagenævnets præmisser, 
                  vurdering af kumulationsprincippet og formulering af afgørelsesnotater uden hallucinationer.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Anvendes til: Chat, kildekrydstjek og genererede notater
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900 border border-blue-200">
                  <span>Baggrundsmotor for indeksering</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  GPT-4o-mini / Gemini Flash
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lynhurtig klassificering og automatisk tagging af uploadede PDF-dokumenter, ekstraktion af metadata, 
                  identifikation af berørte paragraffer samt anbefaling af relevante temamapper.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Anvendes til: /api/tag-document og baggrunds-ingestion
                </div>
              </div>
            </div>
          </section>

          {/* Målgrupper */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F382C] text-white">
                <Building2 className="w-4.5 h-4.5 text-emerald-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                4. Hvem anvender MVAI?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
                <div className="font-bold text-sm text-slate-900">Kommuner & Myndigheder</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kvalitetssikring af screeningsafgørelser jf. § 21, vurdering af klagerisiko ved Miljø- og Fødevareklagenævnet 
                  og udarbejdelse af præcise redegørelsestekster.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
                <div className="font-bold text-sm text-slate-900">Miljørådgivere & Ingeniører</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Struktureret afdækning af afværgeforanstaltninger for bygherrer, overholdelse af bilag 6-kriterier og 
                  validering af ansøgningsmateriale før indsendelse.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
                <div className="font-bold text-sm text-slate-900">Forskere & Jurister</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Systematisk analyse af praksisudvikling, prøvelse af Klagenævnets fortolkning af habitatdirektivets art. 12 
                  og historisk præcedensforskning.
                </p>
              </div>
            </div>
          </section>

          {/* Kontakt & Support */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Kontakt & Faglig Dialog</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              MVAI.dk udvikles i tæt dialog med miljøsagsbehandlere og planlæggere. Har du spørgsmål til dataintegration, 
              ønsker du at tilføje jeres egne lokale temamapper, eller vil I etablere en pilot i jeres forvaltning?
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#2E8B57]" />
                <span className="font-semibold">kontakt@voresmiljo.dk</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2E8B57]" />
                <span>Vores Miljø ApS / MVAI</span>
              </div>
            </div>
          </section>

          {/* Back to dashboard button */}
          <div className="pt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F382C] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#14493a] transition-colors"
            >
              <span>Tilbage til sagsdashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © 2026 MVAI.dk — Miljøvurderingsvejen • Fortroligt fagværktøj
      </footer>
    </div>
  );
}
