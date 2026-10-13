import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getLibraryCounts, type LibraryCounts } from "@/lib/libraryCounts";
import { Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Om MVAI.dk",
  description:
    "Hvorfor MVAI bruges til miljøvurdering, hvordan grundmappen og temamapperne virker, og hvor mange kilder der ligger i arkivet.",
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
        {library.themes.map((folder) => (
          <li key={folder.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
            <span>{folder.name}</span>
            <span className="font-mono text-xs text-slate-500">{folder.documents}</span>
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
          <header className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Om MVAI</h1>
            <p className="text-base leading-relaxed text-slate-700">
              MVAI er et arbejdsrum til miljøvurdering af planer og projekter i Danmark.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Hvorfor bruge det til arbejdet</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              En miljøvurdering skal kunne holde det primære dokument op mod loven, vejledningerne og de klagenævnsafgørelser, der ligner sagen.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              Man arbejder i en sag. Det primære dokument er det dokument, sagen handler om. Det kan være et udkast, en miljørapport, en afgørelse eller et andet dokument, der skal vurderes.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              Sekundære dokumenter er materiale, der supplerer eller skal sammenholdes med det primære dokument. Grundmappen og de valgte temamapper indeholder et fagligt kurateret kildekorpus, som MVAI baserer sine svar på. Kildehenvisninger gør arbejdet transparent. Hvis kildekorpuset ikke dækker spørgsmålet, vil svaret sige det.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Grundmappe og temamapper</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Grundmappen er altid med. Den indeholder lov, bekendtgørelser og vejledninger, som gælder for alle sager.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              Temamapperne er fagområder, man selv slår til, for eksempel Natura 2000, artsbeskyttelse, støj og luft, grundvand eller kyst og landskab. Analysen bruger grundmappen sammen med de mapper, der er valgt på sagen. Flere end tre mapper ad gangen gør søgningen bredere.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              Klagenævnsafgørelser ligger i de temamapper, de handler om.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Sådan vælges kilderne</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Dokumenterne i arkivet er udvalgt af fagpersoner med uddannelse i miljøvurdering. Et dokument kommer først ind, når det er læst, godkendt og lagt i grundmappen eller i den temamappe, det handler om.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              Primære og sekundære dokumenter, som en bruger selv lægger på en sag, bliver på den sag. De blandes ikke ind i det fælles arkiv og bruges ikke til at træne modellerne.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Brug af kilder</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Analysen bliver mere usikker, når den skal holde mange forskellige kilder sammen. Grundmappen er altid med. Hver temamappe, der slås til, lægger et andet fagområde til. Flere kilder med forskellige temaer øger usikkerheden, fordi materialet ikke længere peger samme vej.
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              Det gælder også brugerens egne dokumenter. Primære og sekundære dokumenter, som er lagt på sagen, indgår i analysen. Output, som brugeren selv har oprettet, indgår kun, når det er slået til. Egne dokumenter og tilvalgt output har et andet indhold end retskilderne i arkivet. Jo flere af dem der er med, jo større er usikkerheden i svaret.
            </p>
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
