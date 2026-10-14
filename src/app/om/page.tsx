import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getLibraryCounts, type LibraryCounts } from "@/lib/libraryCounts";
import { THEME_CATEGORIES } from "@/lib/themeFolders";
import { Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Om MVAI.dk",
  description:
    "Formålet med Miljøvurderingsvejen, brugerfladen, kvalitetssikringen og hvordan kildevalget påvirker præcisionen.",
};

function LibraryFigures({ library }: { library: LibraryCounts }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-900">
        {library.totalDocuments === 0
          ? "Arkivet er tomt lige nu."
          : `Arkivet indeholder ${library.totalDocuments} dokument${library.totalDocuments === 1 ? "" : "er"}.`}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {library.totalDocuments === 0
          ? "Dokumenterne kommer ind, når de er udvalgt og lagt i en mappe. Tallet opdateres derfra."
          : "Tallet er antallet af dokumenter i databasen, ikke antallet af tekststykker."}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        <li className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
          <span>Grundmappe</span>
          <span className="font-mono text-xs text-slate-500">{library.groundDocuments}</span>
        </li>
        {THEME_CATEGORIES.map((category) => (
          <li key={category.id} className="space-y-2 border-b border-slate-100 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{category.name}</p>
            <ul className="space-y-2">
              {library.themes
                .filter((folder) => folder.category === category.id)
                .map((folder) => (
                  <li key={folder.id} className="flex items-center justify-between gap-4">
                    <span>{folder.name}</span>
                    <span className="font-mono text-xs text-slate-500">{folder.documents}</span>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {library.decisionDocuments === 0
          ? "Klagenævnsafgørelser tælles med i den temamappe, de handler om. Der ligger ingen afgørelser i arkivet endnu."
          : `${library.decisionDocuments} af dokumenterne er klagenævnsafgørelser. De tælles med i den temamappe, de handler om, og står ikke i en mappe for sig.`}
      </p>
    </div>
  );
}

async function LibraryCount() {
  await connection();
  const library = await getLibraryCounts();
  return <LibraryFigures library={library} />;
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      <AppHeader />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-10">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Formål</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Formålet med Miljøvurderingsvejen (MVAI) er at styrke kvaliteten, overblikket og gennemskueligheden i arbejdet med miljøvurderinger. Platformen gør det muligt hurtigt, objektivt og præcist at holde sagsdokumenter op mod det gældende retsgrundlag, officielle vejledninger og relevant klagenævnspraksis. Ved altid at forankre analyserne direkte i et fagligt kurateret kildekorpus sikres det, at besvarelserne er juridisk underbyggede, sporbare og fri for opdigtede antagelser.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Brugerflade</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Arbejdet på MVAI tilrettelægges i strukturerede sager, hvor brugeren har fuld kontrol over det aktiverede kildegrundlag:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              <li>
                <span className="font-semibold text-slate-900">Sagsdokumenter:</span> Enhver analyse tager udgangspunkt i et <span className="font-semibold text-slate-900">primært dokument</span> — f.eks. et planudkast, en miljørapport, en afgørelse eller en screeningsansøgning. Dette kan suppleres af <span className="font-semibold text-slate-900">sekundære dokumenter</span>, som giver ekstra kontekst eller skal sammenholdes med primærdokumentet.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Grundmappe:</span> Er altid aktiv som det juridiske fundament. Den indeholder miljøvurderingsloven, gældende bekendtgørelser og de overordnede officielle vejledninger.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Temamapper:</span> Gør det muligt at tilkoble de fagområder, sagen handler om. De er delt i Natur & Miljø og Projekter & Proces. Relevante klagenævnsafgørelser ligger i den temamappe, de handler om.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Transparens og kildehenvisninger:</span> Alle besvarelser bygger på det valgte kildekorpus og forsynes med præcise kildehenvisninger. Hvis kildegrundlaget ikke indeholder tilstrækkelige oplysninger til at besvare et spørgsmål, oplyser systemet direkte om dette.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Kvalitetssikring og datasikkerhed</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              <li>
                <span className="font-semibold text-slate-900">Faglig kuratering:</span> Alle dokumenter i det fælles arkiv er udvalgt og kvalitetssikret af fagpersoner med specialistuddannelse inden for miljøvurdering. Et dokument inkluderes først i grundmappen eller temamapperne, når det er gennemlæst og godkendt.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Fuld fortrolighed:</span> Primære og sekundære dokumenter, som brugeren lægger på en specifik sag, forbliver fortrolige og tilknyttet den enkelte sag. De blandes aldrig ind i det fælles arkiv og anvendes <span className="font-semibold text-slate-900">ikke</span> til at træne AI-modellerne.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Kildeomfang og præcision</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              <li>
                <span className="font-semibold text-slate-900">Fokuseret kildevalg:</span> Analysens præcision er højest, når kildegrundlaget er skarpt afgrænset. Grundmappen udgør altid det faste fundament, mens hver tilvalgt temamappe tilføjer et specifikt fagområde. Aktivering af mere end tre temamapper ad gangen gør søgningen bredere, hvilket kan øge usikkerheden, da kilderne berører mange forskellige faglige emner.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Inddragelse af egne dokumenter:</span> Brugerens egne oprettede dokumenter og notater indgår kun i analysen, når de aktivt er slået til på sagen. Da egne dokumenter har en anden karakter end de officielle retskilder i arkivet, anbefales det at holde kildevalget så præcist som muligt for at opnå de mest entydige analyser.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Kilder i arkivet</h2>
            <Suspense fallback={<p className="text-sm text-slate-500">Henter antallet af kilder...</p>}>
              <LibraryCount />
            </Suspense>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Kontakt</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Spørgsmål til kilder, mapper og brug af MVAI kan sendes til postkassen herunder.
            </p>
            <a href="mailto:kontakt@mvai.dk" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F382C]">
              <Mail className="w-4 h-4 text-[#2E8B57]" />
              kontakt@mvai.dk
            </a>
          </section>

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F382C] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#14493a]"
            >
              <span>Tilbage til sagerne</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
