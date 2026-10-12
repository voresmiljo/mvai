export const THEME_FOLDERS = [
  {
    id: "artsbeskyttelse",
    name: "Artsbeskyttelse & Bilag IV",
    description: "Markfirben, flagermus, padder og yngle- og rasteområder.",
  },
  {
    id: "natura2000",
    name: "Natura 2000 & Habitatvurdering",
    description: "Habitatområder, kumulation og væsentlighedsvurdering.",
  },
  {
    id: "stoej_og_luft",
    name: "Støj, Luft & Lugt",
    description: "Støj, emissioner og lugt fra anlæg og trafik.",
  },
  {
    id: "grundvand",
    name: "Drikkevand & Grundvand",
    description: "Boringsnære beskyttelsesområder, sårbar indvinding og nedsivning.",
  },
  {
    id: "kyst_og_landskab",
    name: "Kystnærhed & Landskab",
    description: "Kystnærhedszonen og beskyttelseslinjer i landskabet.",
  },
] as const;

export type ThemeFolderId = (typeof THEME_FOLDERS)[number]["id"];
