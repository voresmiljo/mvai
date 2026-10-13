export const THEME_CATEGORIES = [
  { id: "natur", name: "Natur & Artsbeskyttelse" },
  { id: "miljoe", name: "Miljø, gener & sundhed" },
  { id: "areal", name: "Arealanvendelse, landskab & kultur" },
  { id: "anlaeg", name: "Særlige anlægs- og projekttyper" },
  { id: "proces", name: "Proces, jura & forvaltningsret" },
] as const;

export const THEME_FOLDERS = [
  {
    id: "artsbeskyttelse",
    category: "natur",
    name: "Artsbeskyttelse & Bilag IV",
    description: "Beskyttede arter, yngle- og rasteområder, artsvejledninger og nævnspraksis.",
  },
  {
    id: "natura2000",
    category: "natur",
    name: "Natura 2000 & Habitatområder",
    description: "Habitatbekendtgørelsen, konsekvensvurdering, udpegningsgrundlag og kumulation.",
  },
  {
    id: "paragraf_3_natur",
    category: "natur",
    name: "§ 3-Natur & Beskyttede Naturtyper",
    description: "Naturbeskyttelseslovens § 3, dispensation og samspil med planer og VVM.",
  },
  {
    id: "stoej_og_luft",
    category: "miljoe",
    name: "Støj, Vibrationer & Luft",
    description: "Ekstern støj, trafikstøj, vindmøllestøj, lavfrekvent støj og luftkvalitet.",
  },
  {
    id: "grundvand",
    category: "miljoe",
    name: "Grundvand, Spildevand & Vandmiljø",
    description: "Vandrammedirektivet, vandområdeplaner, nedsivning, udledning og grundvandszoner.",
  },
  {
    id: "kyst_og_landskab",
    category: "areal",
    name: "Landskab, Kyst & Beskyttelseslinjer",
    description: "Kystnærhedszonen, beskyttelseslinjer, visuelle gener og bevaringsværdige landskaber.",
  },
  {
    id: "kulturarv",
    category: "areal",
    name: "Kulturarv, Arkæologi & Kirker",
    description: "Museumsloven, fortidsminder, kirkeomgivelser og kulturhistoriske monumenter.",
  },
  {
    id: "ve_anlaeg",
    category: "anlaeg",
    name: "VE-anlæg (Vindmøller & Solceller)",
    description: "Vindmølle- og solcelleplanlægning, afstand, skyggekast, reflekser og nævnspraksis.",
  },
  {
    id: "byudvikling",
    category: "anlaeg",
    name: "Byudvikling, Erhverv & Infrastruktur",
    description: "Veje, råstoffer, parkering, byzone, handel, jordforurening og klimasikring.",
  },
  {
    id: "sagsbehandling",
    category: "proces",
    name: "Sagsbehandling & Procesretlige Mangler",
    description: "Inhabilitet, oplysningsgrundlag, høring, begrundelse, klagefrist og opsættende virkning.",
  },
] as const;

export type ThemeFolderId = (typeof THEME_FOLDERS)[number]["id"];
export type ThemeCategoryId = (typeof THEME_CATEGORIES)[number]["id"];
