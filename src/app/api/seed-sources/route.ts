import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ThemeFolderId } from "@/lib/themeFolders";
import OpenAI from "openai";

interface SeedSourceItem {
  title: string;
  citation: string;
  law_section: string;
  content: string;
  source_type: "lov" | "bekendtgoerelse" | "vejledning" | "naevnskendelse" | "eu_dom";
  scope: "plan" | "projekt" | "begge";
  theme: "grund" | ThemeFolderId;
  pdf_file_name: string;
  metadata: {
    date: string;
    authority: string;
    case_number?: string;
  };
}

const SEED_SOURCES: SeedSourceItem[] = [
  // 1. Natura 2000 & Kvælstof (MFKN 21/04322)
  {
    title: "MFKN Kendelse 21/04322 (Kvælstofdeposition og Kystlaguner)",
    citation: "Miljø- og Fødevareklagenævnets afgørelse af 18. november 2021",
    law_section: "Habitatbekendtgørelsens § 6 & Habitatdirektivets art. 6, stk. 3",
    content: `Miljø- og Fødevareklagenævnet ophævede en kommunal screeningsafgørelse/tilladelse for et anlægsprojekt beliggende i nærheden af et udpeget habitatområde. Nævnet fandt, at der ikke forelå den fornødne videnskabelige sikkerhed for, at merdeposition af kvælstof på kystlaguner (habitatnaturtype 1150) ikke ville medføre skade på områdets integritet. Nævnet fastslog under henvisning til EU-Domstolens praksis (Sag C-127/02 Waddenzee), at en myndighed ikke kan henvise til en administrativ tærskelværdi eller bagatelgrænse uden en konkret kumulativ vurdering af den samlede kvælstofbelastning op imod tålegrænserne for de beskyttede naturtyper.`,
    source_type: "naevnskendelse",
    scope: "begge",
    theme: "natura2000",
    pdf_file_name: "mfkn-21-04322-natura2000.pdf",
    metadata: {
      date: "18/11/2021",
      authority: "Miljø- og Fødevareklagenævnet",
      case_number: "21/04322",
    },
  },
  // 2. EU-Domstolen Waddenzee (C-127/02)
  {
    title: "EU-Domstolen Sag C-127/02 (Waddenzee-dommen)",
    citation: "Domstolens dom af 7. september 2004, Sml. I, s. 7405",
    law_section: "Habitatdirektivets artikel 6, stk. 3",
    content: `Artikel 6, stk. 3, i direktiv 92/43/EØF skal fortolkes således, at en plan eller et projekt, der ikke er direkte forbundet med eller nødvendig for et områdes forvaltning, skal underkastes en passende vurdering af virkningerne på lokaliteten, hvis det ud fra et objektivt grundlag ikke kan udelukkes, at det vil påvirke området væsentligt. En plan eller et projekt må kun godkendes, hvis de kompetente nationale myndigheder har opnået vished for, at planen eller projektet ikke har skadelige virkninger for det pågældende områdes integritet. Dette er tilfældet, når det ud fra et videnskabeligt synspunkt uden rimelig tvivl kan fastslås, at der ikke er sådanne virkninger.`,
    source_type: "eu_dom",
    scope: "begge",
    theme: "natura2000",
    pdf_file_name: "eu-domstolen-c127-02-waddenzee.pdf",
    metadata: {
      date: "07/09/2004",
      authority: "EU-Domstolen",
      case_number: "Sag C-127/02",
    },
  },
  // 3. Bilag IV Markfirben & Afværge (MFKN 2024-819)
  {
    title: "MFKN Kendelse 2024-819 (Biogasanlæg Vesthimmerland — Bilag IV & Kumulation)",
    citation: "Miljø- og Fødevareklagenævnets afgørelse af 14. marts 2024",
    law_section: "VVM-lovens § 21 & Habitatdirektivets art. 12",
    content: `Miljø- og Fødevareklagenævnet fandt, at en kommunal screeningsafgørelse efter miljøvurderingslovens § 21 om ikke-VVM-pligt led af væsentlige retlige mangler. For det første havde kommunen ikke godtgjort med tilstrækkelig sikkerhed, at transportkorridorer og terrænændringer ikke ville beskadige yngle- og rasteområder for markfirben (Lacerta agilis) omfattet af habitatdirektivets bilag IV. For det andet fastslog nævnet, at afværgeforanstaltninger kun lovligt kan indgå i en screeningsafgørelse, hvis disse er integreret uigenkaldeligt i selve projektbeskrivelsen forud for afgørelsen. Vilkår om efterfølgende afværgetiltag stillet af kommunen i selve afgørelsen tilsidesættes som ugyldige.`,
    source_type: "naevnskendelse",
    scope: "projekt",
    theme: "artsbeskyttelse",
    pdf_file_name: "mfkn-2024-819-kendelse.pdf",
    metadata: {
      date: "14/03/2024",
      authority: "Miljø- og Fødevareklagenævnet",
      case_number: "2024-819",
    },
  },
  // 4. Miljøvurderingsloven § 8 (Planer & Programmer)
  {
    title: "Miljøvurderingsloven § 8 (Obligatorisk miljøvurdering af planer)",
    citation: "Lovbekendtgørelse nr. 4 af 03/01/2023, § 8",
    law_section: "Miljøvurderingslovens § 8, stk. 1 & 2",
    content: `§ 8. Myndigheden skal gennemføre en miljøvurdering af planer og programmer, hvor planerne eller programmerne: 1) fastlægger rammerne for fremtidige anlægstilladelser til projekter omfattet af bilag 1 og 2, eller 2) kan påvirke et udpeget internationalt naturbeskyttelsesområde væsentligt. Stk. 2. For planer og programmer, som alene fastlægger anvendelsen af mindre områder på lokalt plan, gennemføres kun en miljøvurdering, hvis de må antages at kunne få væsentlig indvirkning på miljøet efter en vurdering i henhold til bilag 3.`,
    source_type: "lov",
    scope: "plan",
    theme: "grund",
    pdf_file_name: "miljoevurderingsloven-lbk-4-2023.pdf",
    metadata: {
      date: "03/01/2023",
      authority: "Folketinget / Miljøministeriet",
      case_number: "LBK nr. 4",
    },
  },
  // 5. Miljøvurderingsloven § 21 (VVM-screening af projekter)
  {
    title: "Miljøvurderingsloven § 21 & Bilag 6 (Screeningspligt for konkrete projekter)",
    citation: "Lovbekendtgørelse nr. 4 af 03/01/2023, § 21",
    law_section: "Miljøvurderingslovens § 21 & Bilag 6",
    content: `§ 21. Projekter omfattet af bilag 2 skal screenes af den kompetente myndighed på grundlag af bygherrens anmeldelse for at vurdere, om projektet kan have væsentlige indvirkninger på miljøet. Stk. 2. Ved vurderingen efter stk. 1 skal myndigheden tage hensyn til de relevante udvælgelseskriterier, der er fastsat i bilag 6, herunder projektets karakteristika, projektets placering samt arten og kendetegnene ved den forventede indvirkning på miljøet (herunder kumulative effekter, støj, emissioner og naturværdier).`,
    source_type: "lov",
    scope: "projekt",
    theme: "grund",
    pdf_file_name: "miljoevurderingsloven-lbk-4-2023.pdf",
    metadata: {
      date: "03/01/2023",
      authority: "Folketinget / Miljøministeriet",
      case_number: "LBK nr. 4",
    },
  },
  // 6. Støj og Kumulation i Nævnspraksis (MFKN 19/08112)
  {
    title: "MFKN Kendelse 19/08112 (Kumulativ støjbelastning og transportveje)",
    citation: "Miljø- og Fødevareklagenævnets afgørelse om støjvurdering",
    law_section: "VVM-lovens bilag 6, pkt. 3 & Industristøjvejledningen",
    content: `Miljø- og Fødevareklagenævnet fastslog, at en miljøscreening af et udvidelsesprojekt var behæftet med en væsentlig retlig mangel, idet kommunen alene havde vurderet støjen fra de faste anlæg på matriklen, men havde udeladt den kumulative støj fra den tilknyttede tunge lastbiltrafik på de offentlige adgangsveje gennem nærliggende boligområder. Nævnet understregede, at samtlige miljøpåvirkninger, som har en direkte og nødvendig sammenhæng med projektets drift, skal inddrages i vurderingen.`,
    source_type: "naevnskendelse",
    scope: "projekt",
    theme: "stoej_og_luft",
    pdf_file_name: "mfkn-19-08112-stoej.pdf",
    metadata: {
      date: "14/05/2020",
      authority: "Miljø- og Fødevareklagenævnet",
      case_number: "19/08112",
    },
  },
  // 7. Grundvand & Drikkevand (BNBO beskyttelse)
  {
    title: "Miljøbeskyttelsesloven § 24 & BNBO-beskyttelse i miljøvurderinger",
    citation: "Vejledning om beskyttelse af boringsnære beskyttelsesområder",
    law_section: "Miljøbeskyttelseslovens § 24 & VVM-lovens bilag 6, pkt. 2",
    content: `Ved miljøvurdering af anlæg eller planer i områder med særlige drikkevandsinteresser (OSD) og boringsnære beskyttelsesområder (BNBO) gælder et skærpet forsigtighedsprincip. Myndigheden skal sikre, at nedsivning eller håndtering af forurenende stoffer ikke indebærer risiko for grundvandsressourcen. Manglende geologiske eller hydrologiske undersøgelser i screeningsgrundlaget medfører ophævelse ved Miljø- og Fødevareklagenævnet.`,
    source_type: "vejledning",
    scope: "begge",
    theme: "grundvand",
    pdf_file_name: "mst-bnbo-vejledning.pdf",
    metadata: {
      date: "2024",
      authority: "Miljøstyrelsen",
      case_number: "BNBO-2024",
    },
  },
];

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_URL) {
      return NextResponse.json(
        { error: "Supabase miljøvariabler mangler i miljøet." },
        { status: 500 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Kunne ikke initialisere Supabase-klienten." },
        { status: 500 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey.trim() }) : null;

    let seededCount = 0;
    const results = [];

    for (const item of SEED_SOURCES) {
      let embedding: number[] | null = null;

      // Hvis OpenAI er konfigureret med aktiv saldo, generér reel vektor
      if (openai) {
        try {
          const embRes = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: `${item.title}. ${item.law_section}. ${item.content}`,
          });
          embedding = embRes.data[0]?.embedding || null;
        } catch (err) {
          console.warn("Embedding generation skipped for item:", item.title, err);
        }
      }

      const insertData = {
        title: item.title,
        citation: item.citation,
        law_section: item.law_section,
        content: item.content,
        source_type: item.source_type,
        scope: item.scope,
        theme: item.theme,
        pdf_file_name: item.pdf_file_name,
        metadata: item.metadata,
        ...(embedding ? { embedding } : {}),
      };

      const { data, error } = await supabase
        .from("legal_sources")
        .upsert(insertData, { onConflict: "title" })
        .select("id, title");

      if (error) {
        // Hvis upsert fejler på title-uniqueness, prøv insert
        const { data: insData, error: insErr } = await supabase
          .from("legal_sources")
          .insert(insertData)
          .select("id, title");

        if (insErr) {
          results.push({ title: item.title, status: "error", error: insErr.message });
        } else {
          seededCount++;
          results.push({ title: item.title, status: "inserted", id: insData?.[0]?.id });
        }
      } else {
        seededCount++;
        results.push({ title: item.title, status: "upserted", id: data?.[0]?.id });
      }
    }

    return NextResponse.json({
      success: true,
      seededCount,
      totalCount: SEED_SOURCES.length,
      results,
    });
  } catch (err) {
    console.error("Seed endpoint error:", err);
    return NextResponse.json(
      { error: "Fejl ved seeding af retskildedatabasen.", details: String(err) },
      { status: 500 }
    );
  }
}
