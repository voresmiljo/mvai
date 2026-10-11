import Link from "next/link";
import { MvLogo } from "@/components/MvLogo";
import {
  ShieldCheck,
  Scale,
  FileCheck2,
  FolderLock,
  ArrowRight,
  Database,
  Building2,
  Briefcase,
  GraduationCap,
  Lock,
  FileText,
  Layers,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/">
            <MvLogo size="md" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex text-sm font-semibold text-slate-700">
            <a href="#vaerditilbud" className="transition-colors hover:text-[#0F382C]">
              Hvorfor MVAI?
            </a>
            <a href="#funktioner" className="transition-colors hover:text-[#0F382C]">
              Funktioner
            </a>
            <a href="#maalgrupper" className="transition-colors hover:text-[#0F382C]">
              Målgrupper
            </a>
            <a href="#sikkerhed" className="transition-colors hover:text-[#0F382C]">
              Datasikkerhed & GDPR
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 shadow-xs"
            >
              Log ind
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F382C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#14493a] shadow-sm hover:shadow"
            >
              <span>Prøv demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-b from-white via-[#F7FAFA] to-[#F1F5F3] py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(#0F382C_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
        
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-[#0F382C] mb-6">
              <span className="flex h-2 w-2 rounded-full bg-[#2E8B57] animate-pulse" />
              <span>Specialiseret LegalTech for dansk miljøret & VVM</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl sm:leading-[1.15]">
              Afgørelsesklar AI for{" "}
              <span className="text-[#0F382C] underline decoration-[#2E8B57]/40 decoration-4 underline-offset-4">
                miljøvurderinger
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-600 font-normal">
              Objektiv, kildeforankret RAG-analyse af planer og konkrete projekter. 
              Bygget specifikt til sagsbehandlere, rådgivere og forskere — med nul gætterier 
              og direkte henvisninger til gældende lov og praksis.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#0F382C] px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#14493a] hover:shadow-lg"
              >
                <span>Åbn arbejdsmiljø (/app)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#kontakt"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
              >
                Book en fagpræsentation
              </a>
            </div>

            {/* Quick credibility bullet points */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E8B57]" />
                <span>Nul hallucinationer (RAG-krav)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E8B57]" />
                <span>Opdelt efter Plan (§ 8) vs Projekt (§ 15–25)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E8B57]" />
                <span>100% GDPR & EU-dataopbevaring</span>
              </div>
            </div>
          </div>

          {/* Interface Preview Teaser */}
          <div className="mt-16 rounded-2xl border border-slate-300/80 bg-white p-3 shadow-xl lg:p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#0F382C] px-4 py-3 text-xs text-white">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 font-mono font-medium text-slate-200">mvai.dk/app — Arbejdsrum for sagsbehandler</span>
                </div>
                <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-[11px] font-mono text-emerald-300 border border-emerald-700/50">
                  Grundmappe: VVM-loven 2026 aktiv
                </span>
              </div>
              <div className="grid grid-cols-12 bg-white text-slate-800 min-h-[340px]">
                {/* Mock sidebar */}
                <div className="col-span-3 border-r border-slate-200 bg-[#F7FAFA] p-4 hidden md:block">
                  <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Område</p>
                  <div className="mt-2 space-y-1.5 text-xs font-medium">
                    <div className="rounded bg-[#0F382C] text-white p-2 flex items-center justify-between">
                      <span>Konkret Projekt (§ 15-25)</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="rounded bg-white border border-slate-200 text-slate-600 p-2">
                      Plan / Program (§ 8)
                    </div>
                  </div>

                  <p className="mt-5 text-[11px] font-bold tracking-wider uppercase text-slate-500">Aktive temamapper (2/3)</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="rounded border border-emerald-600/30 bg-emerald-50 text-emerald-900 p-1.5 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />
                      <span>Bilag IV-arter & Habitats</span>
                    </div>
                    <div className="rounded border border-emerald-600/30 bg-emerald-50 text-emerald-900 p-1.5 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />
                      <span>Klagenævnspraksis (MFKN)</span>
                    </div>
                  </div>
                </div>

                {/* Mock chat */}
                <div className="col-span-12 md:col-span-6 p-5 flex flex-col justify-between border-r border-slate-200">
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Spørgsmål fra sagsbehandler:</span>
                      <p className="mt-1">
                        Er der krav om fuld miljøkonsekvensvurdering for udvidelse af biogasanlæg med 18.000 ton/år jf. VVM-lovens bilag 2?
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-[#F7FAFA] p-3 text-xs text-slate-800">
                      <div className="flex items-center gap-1.5 text-[#0F382C] font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-[#2E8B57]" />
                        <span>MVAI Afgørelsesanalyse:</span>
                      </div>
                      <p className="mt-1.5 leading-relaxed text-slate-700">
                        Projektet er omfattet af <strong>VVM-lovens bilag 2, punkt 11 b</strong>. Udvidelsen udløser <em>screeningpligt efter § 21</em>. 
                        Der skal foretages en konkret væsentlighedsvurdering under hensyn til kriterierne i bilag 6...
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-[#0F382C]/10 px-2 py-0.5 text-[11px] font-medium text-[#0F382C]">
                          <FileText className="w-3 h-3" /> Lovbekendtgørelse nr. 4 (§ 21, stk. 1)
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                          MFKN-2025-4122
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>2 verificerede kilder benyttet</span>
                    <span className="text-emerald-700 font-semibold">Kildekontrol: 100% matchet</span>
                  </div>
                </div>

                {/* Mock source preview */}
                <div className="col-span-3 p-4 bg-slate-50 hidden md:block text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800 pb-2 border-b border-slate-200">
                    <span>Kildelæser</span>
                    <span className="text-[10px] text-slate-500 font-mono">PDF-udsnit</span>
                  </div>
                  <div className="mt-3 rounded border border-slate-200 bg-white p-2.5 shadow-xs">
                    <p className="text-[11px] font-bold text-[#0F382C]">Miljøvurderingsloven § 21</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      &quot;Projekter omfattet af bilag 2 skal screenes af den kompetente myndighed med henblik på at vurdere, om projektet kan have væsentlige indvirkninger på miljøet...&quot;
                    </p>
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/app"
                      className="text-[11px] text-[#2E8B57] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Åbn hele arbejdsfladen</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Værditilbud: Hvorfor MVAI? */}
      <section id="vaerditilbud" className="py-20 lg:py-28 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#2E8B57]">Værditilbud</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Hvorfor generiske AI-chatbots fejler i miljøsager
            </p>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Generelle sprogmodeller gætter og sammenblander ofte proceskrav mellem planer og konkrete projekter. 
              MVAI.dk er bundet stringent til den danske miljøretskildematrix.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Generic AI card */}
            <div className="rounded-2xl border border-red-200/80 bg-red-50/30 p-8">
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="w-6 h-6" />
                <h3 className="text-xl font-bold">Generiske AI-værktøjer (f.eks. alm. ChatGPT)</h3>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="font-bold text-red-600 mt-0.5">✕</span>
                  <span><strong>Risiko for hallucinationer:</strong> Opdigter paragraffer eller overfører svensk/tysk praksis til Danmark.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-red-600 mt-0.5">✕</span>
                  <span><strong>Uklar retskildeblanding:</strong> Skelner ikke konsekvent mellem miljøvurdering af planer (§ 8) og VVM af projekter (§ 15).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-red-600 mt-0.5">✕</span>
                  <span><strong>Ingen dokumentérbar kildeadgang:</strong> Giver svar uden verificerbare PDF-udsnit, som kan vedlægges en klagesag eller et høringssvar.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-red-600 mt-0.5">✕</span>
                  <span><strong>Datasikkerhedsusikkerhed:</strong> Risiko for at fortrolige sagsakter anvendes til modeltræning.</span>
                </li>
              </ul>
            </div>

            {/* MVAI.dk card */}
            <div className="rounded-2xl border-2 border-[#0F382C] bg-[#F7FAFA] p-8 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#0F382C] text-white text-[11px] font-bold px-3 py-1 rounded-bl-lg">
                Faglig standard
              </div>
              <div className="flex items-center gap-3 text-[#0F382C]">
                <CheckCircle2 className="w-6 h-6 text-[#2E8B57]" />
                <h3 className="text-xl font-bold">MVAI.dk Platformen</h3>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#2E8B57] mt-0.5 shrink-0" />
                  <span><strong>100% Forankret RAG:</strong> Svar genereres udelukkende på baggrund af autoriserede retskilder og uploaded sagsmateriale.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#2E8B57] mt-0.5 shrink-0" />
                  <span><strong>Opstartsguiding (§ 8 vs. §§ 15–25):</strong> Tvinger processuel stringens og forebygger formelle sagsbehandlingsfejl.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#2E8B57] mt-0.5 shrink-0" />
                  <span><strong>Live kildelæser & download:</strong> Klik på enhver reference og se præcis tekstbid og download original PDF med ét klik.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#2E8B57] mt-0.5 shrink-0" />
                  <span><strong>Lukket & fortroligt miljø:</strong> Ingen sagsakter gemmes til modeltræning. GDPR-compliant med databehandleraftale.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Funktioner */}
      <section id="funktioner" className="py-20 lg:py-28 bg-[#F7FAFA] border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#2E8B57]">Platformens kerne</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Bygget til virkelighedens miljøsagsbehandling
            </p>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Kombinationen af altid-opdaterede grundkilder og modulære temamapper giver præcis det faglige dybdegående overblik, en afgørelse kræver.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100/70 text-[#0F382C]">
                <Layers className="w-6 h-6 text-[#0F382C]" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Grundmappe + Dynamiske Temamapper
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Grundmappen indeholder altid gældende lov, bekendtgørelser og vejledninger. 
                Suppler med specifikke temamapper (Artsbeskyttelse, Støj, Natura 2000, Grundvand) for fokuseret analyse uden støj.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100/70 text-[#0F382C]">
                <Scale className="w-6 h-6 text-[#0F382C]" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Skarp Procesadskillelse
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Vælg om analysen gælder <strong>Planer/Programmer (§ 8)</strong> eller <strong>Konkrete Projekter (§§ 15–25)</strong>. 
                Systemet afviser ugyldige proceshenvisninger automatisk.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100/70 text-[#0F382C]">
                <FileCheck2 className="w-6 h-6 text-[#0F382C]" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Kildevisning & PDF-Download
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Hvert svar ledsages af klikbare kildekort med sidetal og citater. 
                Download den bagvedliggende kendelse, dom eller vejledning med ét klik som bilag til sagen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Målgrupper */}
      <section id="maalgrupper" className="py-20 lg:py-28 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#2E8B57]">Målgrupper</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Hvem skaber MVAI.dk værdi for?
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-7 hover:border-slate-300 transition-colors bg-[#F7FAFA]">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0F382C] text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Myndigheder & Kommuner</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Hurtig og kvalitetssikret udarbejdelse af screeningsafgørelser, kontrol af bygherres miljøkonsekvensrapporter og minimering af klagerisiko ved Miljø- og Fødevareklagenævnet.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-7 hover:border-slate-300 transition-colors bg-[#F7FAFA]">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#2A3B47] text-white">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Miljørådgivere & Ingeniører</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Struktureret afdækning af afværgeforanstaltninger, hurtig identifikation af relevante nævnsafgørelser samt konsistent kvalitetssikring af kunders ansøgningsmateriale.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-7 hover:border-slate-300 transition-colors bg-[#F7FAFA]">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#2E8B57] text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Forskere & Jurister</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Kortlægning af praksisudvikling på tværs af hundredvis af nævnsafgørelser, EU-domstolsafgørelser og nationale retningslinjer med fuld kildetroværdighed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Datasikkerhed & GDPR */}
      <section id="sikkerhed" className="py-20 lg:py-24 bg-[#0F382C] text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-700/60">
                <Lock className="w-3.5 h-3.5" />
                <span>GovTech & Myndighedssikkerhed</span>
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Ukompromitteret datasikkerhed & fortrolighed
              </h2>
              <p className="mt-4 text-base leading-relaxed text-emerald-100/90 font-light">
                Miljøsager omfatter ofte følsomme arealer, forretningshemmeligheder og fortroligt sagsmateriale. 
                MVAI er designet til at leve op til offentlige krav for informationssikkerhed.
              </p>

              <div className="mt-8 space-y-4 text-sm text-emerald-50">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Ingen træning på brugerdata:</strong> Dit indsendte materiale bliver aldrig brugt til generel træning af sprogmodeller.</span>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Data hostet i EU:</strong> Alle data og RAG-vektorer opbevares på sikrede europæiske servere jf. GDPR.</span>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Databehandleraftale (DPA):</strong> Myndighedsstandard DPA tilbydes alle abonnenter.</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-800 bg-[#14493a]/80 p-8 shadow-xl">
              <h3 className="text-xl font-bold text-white">Bestil adgang eller demo</h3>
              <p className="mt-2 text-sm text-emerald-100">
                Ønsker du at teste MVAI.dk med dit teams egne temamapper eller sagsakter?
              </p>

              <form id="kontakt" className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200">Organisation / Kommune / Virksomhed</label>
                  <input
                    type="text"
                    placeholder="F.eks. Miljøstyrelsen el. Cowi"
                    className="mt-1 w-full rounded-lg border border-emerald-700 bg-emerald-950/60 px-3.5 py-2.5 text-sm text-white placeholder-emerald-400/60 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200">Arbejds-e-mail</label>
                  <input
                    type="email"
                    placeholder="navn@kommune.dk"
                    className="mt-1 w-full rounded-lg border border-emerald-700 bg-emerald-950/60 px-3.5 py-2.5 text-sm text-white placeholder-emerald-400/60 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <Link
                  href="/app"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2E8B57] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition-colors"
                >
                  <span>Gå direkte til app-demo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-sm text-slate-500">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <MvLogo size="sm" />
          <p className="text-xs">
            © 2026 MVAI.dk — Miljøvurderingsvejen. Alle rettigheder forbeholdes.
          </p>
          <div className="flex gap-6 text-xs font-medium text-slate-600">
            <a href="#sikkerhed" className="hover:text-slate-900">GDPR & Fortrolighed</a>
            <a href="#kontakt" className="hover:text-slate-900">Kontakt</a>
            <Link href="/app" className="hover:text-slate-900 font-semibold text-[#0F382C]">Åbn Web-App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
