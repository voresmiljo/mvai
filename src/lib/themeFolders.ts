export const THEME_CATEGORIES = [
  { id: "natur_miljoe", name: "Natur & Miljø (Lovens miljøfaktorer)" },
  { id: "projekter_proces", name: "Projekter & Proces (Praksis & Sektorlovgivning)" },
] as const;

export const THEME_FOLDERS = [
  {
    id: "artsbeskyttelse",
    category: "natur_miljoe",
    name: "Artsbeskyttelse & Bilag IV",
    description: "Habitatdirektivets art. 12.",
  },
  {
    id: "natura2000",
    category: "natur_miljoe",
    name: "Natura 2000 & Habitatområder",
    description: "Habitatdirektivets art. 6.",
  },
  {
    id: "paragraf_3_natur",
    category: "natur_miljoe",
    name: "§ 3-Natur & Beskyttede Naturtyper",
    description: "Naturbeskyttelsesloven.",
  },
  {
    id: "stoej_og_luft",
    category: "natur_miljoe",
    name: "Støj, Vibrationer & Luft",
    description: "Sundhed, befolkning, gener.",
  },
  {
    id: "grundvand",
    category: "natur_miljoe",
    name: "Grundvand, Spildevand & Vandmiljø",
    description: "Vandrammedirektiv, overfladevand.",
  },
  {
    id: "kyst_og_landskab",
    category: "natur_miljoe",
    name: "Landskab, Kyst & Beskyttelseslinjer",
    description: "Kystnærhed, landskabsbilleder.",
  },
  {
    id: "kulturarv",
    category: "natur_miljoe",
    name: "Kulturarv & Arkæologi",
    description: "Kirkeomgivelser, museumslov, fortidsminder.",
  },
  {
    id: "ve_anlaeg",
    category: "projekter_proces",
    name: "VE-anlæg (Vindmøller & Solceller)",
    description: "Energianlæg, Bilag 2, pkt. 3.",
  },
  {
    id: "byudvikling",
    category: "projekter_proces",
    name: "Byudvikling & Infrastruktur",
    description: "Erhverv, veje, byzoneanlæg, Bilag 2, pkt. 10.",
  },
  {
    id: "sagsbehandling",
    category: "projekter_proces",
    name: "Sagsbehandling & Procesretlige Mangler",
    description: "Inhabilitet, høring, begrundelseskrav, § 40.",
  },
] as const;

export type ThemeFolderId = (typeof THEME_FOLDERS)[number]["id"];
export type ThemeCategoryId = (typeof THEME_CATEGORIES)[number]["id"];
