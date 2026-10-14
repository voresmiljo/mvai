#!/usr/bin/env python3
"""Læg vejledninger, notater, love, direktiver og forvaltningsplaner i de mapper, de er tildelt.

Hvert afsnit lægges i hver af dokumentets mapper, så det kan findes, når
mappen er slået til. Tema null er grundmappen. Scope er begge.
Ordlyden følger filen.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import pymupdf
from pypdf import PdfReader

DEFAULT_DIR = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
MAX_CHARS = 4500

DOCUMENTS = [
    {
        "file": "Vejledning_om_beskyttelse_af_habitatdirektivets_bilag_IV-arter_ved_VE-projekter_75c8.pdf",
        "pdf": "vejledning-bilag-iv-arter-ve-projekter-2026.pdf",
        "short": "Bilag IV-arter ved VE-projekter",
        "citation_base": "Vejledning om beskyttelse af habitatdirektivets bilag IV-arter ved VE-projekter på land, Styrelsen for Grøn Arealomlægning og Vandmiljø, august 2026",
        "date": "august 2026",
        "authority": "Styrelsen for Grøn Arealomlægning og Vandmiljø",
        "journal": "ISBN 978-87-85311-77-1",
        "themes": ["artsbeskyttelse", "ve_anlaeg"],
        "note": "",
        "kind": "sgav",
    },
    {
        "file": "vejledende_dokument_om_vindenergianl_g_og_eus_naturlovgivning__0000.pdf",
        "pdf": "vejledende-dokument-vindenergi-eu-natur-2020.pdf",
        "short": "Vindenergianlæg og EU's naturlovgivning",
        "citation_base": "Vejledende dokument om vindenergianlæg og EU's naturlovgivning, Kommissionens meddelelse C(2020) 7730 final af 18. november 2020",
        "date": "18. november 2020",
        "authority": "Europa-Kommissionen",
        "journal": "C(2020) 7730 final",
        "themes": ["ve_anlaeg", "natura2000", "artsbeskyttelse"],
        "note": "",
        "kind": "vind",
    },
    {
        "file": "the_wildlife_sensitivity_mapping_manual_dd62.pdf",
        "pdf": "wildlife-sensitivity-mapping-manual-2020.pdf",
        "short": "Wildlife sensitivity mapping manual",
        "citation_base": "The Wildlife Sensitivity Mapping Manual: Practical guidance for renewable energy planning in the European Union, European Commission, 2020",
        "date": "2020",
        "authority": "European Commission",
        "journal": "ISBN 978-92-76-22777-9",
        "themes": ["ve_anlaeg", "byudvikling"],
        "note": "Primært til planlægning.",
        "kind": "wildlife",
    },
    {
        "file": "Notat_om_de_juridiske_rammer_for_vurdering_af_p_virkning_af_bilag_IV_-_arters_levesteder_558d.pdf",
        "pdf": "notat-bilag-iv-arters-levesteder-2024.pdf",
        "short": "Notat om bilag IV-arters levesteder",
        "citation_base": "Notat om de juridiske rammer for vurdering af påvirkning af bilag IV-arters levesteder, Styrelsen for Grøn Arealomlægning og Vandmiljø, 25. oktober 2024, j.nr. 2024-63244",
        "date": "25. oktober 2024",
        "authority": "Styrelsen for Grøn Arealomlægning og Vandmiljø",
        "journal": "j.nr. 2024-63244",
        "themes": ["artsbeskyttelse"],
        "note": "",
        "kind": "notat",
        "source_type": "notat",
    },
    {
        "file": "Officialprincippet_i_miljoevurderingskontekst_17._december_2025_819c.pdf",
        "pdf": "notat-officialprincippet-miljoevurdering-2024.pdf",
        "short": "Officialprincippet i miljøvurderingskontekst",
        "citation_base": "Notat om officialprincippet i miljøvurderingskontekst, Styrelsen for Grøn Arealomlægning og Vandmiljø, 17. december 2024, j.nr. 2024-63244",
        "date": "17. december 2024",
        "authority": "Styrelsen for Grøn Arealomlægning og Vandmiljø",
        "journal": "j.nr. 2024-63244",
        "themes": [None, "sagsbehandling", "artsbeskyttelse"],
        "note": "",
        "kind": "notat",
        "source_type": "notat",
    },
    {
        "file": "Habitatvejledningen_3f51.pdf",
        "pdf": "habitatvejledningen-vej-48-2020.pdf",
        "short": "Habitatvejledningen",
        "citation_base": "Habitatvejledningen, vejledning nr. 48, december 2020, til bekendtgørelse nr. 1595 af 6. december 2018, Miljøstyrelsen",
        "date": "december 2020",
        "authority": "Miljøstyrelsen",
        "journal": "ISBN 978-87-7038-248-9",
        "themes": ["natura2000", "artsbeskyttelse"],
        "note": "",
        "kind": "habitatvej",
    },
    {
        "file": "Naturbeskyttelsesloven_22be.pdf",
        "pdf": "naturbeskyttelsesloven-lbk-927-2024.pdf",
        "short": "Naturbeskyttelsesloven",
        "citation_base": "Bekendtgørelse af lov om naturbeskyttelse, LBK nr 927 af 28. juni 2024",
        "date": "28. juni 2024",
        "authority": "Ministeriet for Natur og Dyrevelfærd",
        "journal": "Miljømin., j.nr. 2022-10402",
        "themes": ["artsbeskyttelse", "paragraf_3_natur", "kyst_og_landskab"],
        "note": "LOV nr 1467 af 10/12/2024 § 1. LOV nr 695 af 20/06/2025 § 1. LOV nr 1761 af 29/12/2025 § 12. LOV nr 263 af 11/02/2026 § 4. LOV nr 355 af 03/03/2026 § 4.",
        "kind": "retsinfo",
        "source_type": "lov",
        "min_chars": 15,
    },
    {
        "file": "Artsfredningsbekendtg_relsen_cb55.pdf",
        "pdf": "artsfredningsbekendtgoerelsen-bek-521-2021.pdf",
        "short": "Artsfredningsbekendtgørelsen",
        "citation_base": "Bekendtgørelse om fredning af visse dyre- og plantearter og pleje af tilskadekommet vildt, BEK nr 521 af 25. marts 2021",
        "date": "25. marts 2021",
        "authority": "Ministeriet for Natur og Dyrevelfærd",
        "journal": "Miljømin., j.nr. 2019-11434",
        "themes": ["artsbeskyttelse"],
        "note": "BEK nr 1005 af 02/07/2025.",
        "kind": "retsinfo",
        "source_type": "bekendtgoerelse",
        "min_chars": 15,
    },
    {
        "file": "Habitatbekendtg_relsen_uden_bliag_8_9cde.pdf",
        "pdf": "Habitatbekendtgørelse uden kortbilag.pdf",
        "short": "Habitatbekendtgørelsen",
        "citation_base": "Bekendtgørelse om udpegning og administration af internationale naturbeskyttelsesområder samt beskyttelse af visse arter, BEK nr 1098 af 21. august 2023",
        "date": "21. august 2023",
        "authority": "Ministeriet for Natur og Dyrevelfærd",
        "journal": "Miljømin., j.nr. 2022-4079",
        "themes": ["natura2000", "artsbeskyttelse"],
        "note": "BEK nr 1058 af 22/08/2025.",
        "kind": "retsinfo",
        "source_type": "bekendtgoerelse",
        "min_chars": 15,
    },
    {
        "file": "Vejledning_om_streng_beskyttelse_af_dyrearter_af_f_llesskabsbetydning_i_henhold_til_habitatdirektivet_de5a.pdf",
        "pdf": "vejledning-streng-beskyttelse-bilag-iv-2021-c-496.pdf",
        "short": "Vejledning om streng beskyttelse af bilag IV-arter",
        "citation_base": "Europa-Kommissionens vejledning om streng beskyttelse af dyrearter af fællesskabsbetydning i henhold til habitatdirektivet, 2021/C 496/01, EUT C 496 af 9. december 2021",
        "date": "9. december 2021",
        "authority": "Europa-Kommissionen",
        "journal": "2021/C 496/01",
        "themes": ["artsbeskyttelse"],
        "note": "",
        "kind": "kommission",
    },
    {
        "file": "EU_direktiv_for_bevaring_af_naturtyper_samt_vilde_dyr_og_planter_7e60.pdf",
        "pdf": "habitatdirektiv-92-43-eoef.pdf",
        "short": "Habitatdirektivet",
        "citation_base": "Rådets direktiv 92/43/EØF af 21. maj 1992 om bevaring af naturtyper samt vilde dyr og planter, EFT L 206 af 22. juli 1992",
        "date": "21. maj 1992",
        "authority": "Rådet for De Europæiske Fællesskaber",
        "journal": "EFT L 206 af 22. juli 1992",
        "themes": ["artsbeskyttelse", "natura2000"],
        "note": "Filen er direktivet fra 1992. Senere ændringer er ikke indarbejdet i teksten.",
        "kind": "habitatdir",
        "source_type": "direktiv",
    },
    {
        "file": "Forvaltningsplan_for_strandtudse__2015__e5df.pdf",
        "pdf": "forvaltningsplan-strandtudse-2015.pdf",
        "short": "Forvaltningsplan for strandtudsen",
        "citation_base": "Forvaltningsplan for strandtudsen, Naturstyrelsen, Miljø- og Fødevareministeriet, 2015",
        "date": "2015",
        "authority": "Naturstyrelsen, Miljø- og Fødevareministeriet",
        "journal": "ISBN 978-87-7279-692-5",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_gr_nbroget_tudse__2015__0321.pdf",
        "pdf": "forvaltningsplan-groenbroget-tudse-2015.pdf",
        "short": "Forvaltningsplan for grønbroget tudse",
        "citation_base": "Forvaltningsplan for grønbroget tudse, Naturstyrelsen, Miljø- og Fødevareministeriet, 2015",
        "date": "2015",
        "authority": "Naturstyrelsen, Miljø- og Fødevareministeriet",
        "journal": "ISBN 978-87-7279-694-9",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_markfirben__2015__f73b.pdf",
        "pdf": "forvaltningsplan-markfirben-2015.pdf",
        "short": "Forvaltningsplan for markfirben",
        "citation_base": "Forvaltningsplan for markfirben, Naturstyrelsen, Miljø- og Fødevareministeriet, 2015",
        "date": "2015",
        "authority": "Naturstyrelsen, Miljø- og Fødevareministeriet",
        "journal": "ISBN 978-87-7279-693-2",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_sn_bel__2003__7d70.pdf",
        "pdf": "forvaltningsplan-snaebel-2003.pdf",
        "short": "National forvaltningsplan for snæbel",
        "citation_base": "National forvaltningsplan for snæbel, Miljøministeriet, Skov- og Naturstyrelsen, Sønderjyllands Amt og Ribe Amt, april 2003",
        "date": "april 2003",
        "authority": "Miljøministeriet, Skov- og Naturstyrelsen, Sønderjyllands Amt og Ribe Amt",
        "journal": "ISBN 87-7941-248-3",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_birkemus__2012__e6a4.pdf",
        "pdf": "forvaltningsplan-birkemus-2012.pdf",
        "short": "Forvaltningsplan for birkemusen",
        "citation_base": "Forvaltningsplan for birkemusen, Naturstyrelsen, Miljøministeriet, 2012",
        "date": "2012",
        "authority": "Naturstyrelsen, Miljøministeriet",
        "journal": "ISBN 978-87-7279-304-7",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_hasselmus__2011__af51.pdf",
        "pdf": "forvaltningsplan-hasselmus-2011.pdf",
        "short": "Forvaltningsplan for hasselmusen",
        "citation_base": "Forvaltningsplan for hasselmusen, Naturstyrelsen, Miljøministeriet, 2011",
        "date": "2011",
        "authority": "Naturstyrelsen, Miljøministeriet",
        "journal": "ISBN 978-87-7279-092-3",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_flagermus__2017__fc55.pdf",
        "pdf": "forvaltningsplan-flagermus-2013.pdf",
        "short": "Forvaltningsplan for flagermus",
        "citation_base": "Forvaltningsplan for flagermus, Naturstyrelsen, Miljøministeriet, 2013",
        "date": "2013",
        "authority": "Naturstyrelsen, Miljøministeriet",
        "journal": "ISBN 978-87-7279-407-5",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "forvaltningsplan",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_odder__1996__9188.pdf",
        "pdf": "forvaltningsplan-odder-1996.pdf",
        "short": "Forvaltningsplan for odder",
        "citation_base": "Forvaltningsplan for odder (Lutra lutra) i Danmark, Miljø- og Energiministeriet, Skov- og Naturstyrelsen, 1996",
        "date": "1996",
        "authority": "Miljø- og Energiministeriet, Skov- og Naturstyrelsen",
        "journal": "ISBN 87-7279-006-7",
        "themes": ["artsforvaltning"],
        "note": "Teksten er læst fra en scanning.",
        "kind": "odder",
        "source_type": "forvaltningsplan",
    },
    {
        "file": "Forvaltningsplan_for_ulv__2014__5c4c.pdf",
        "pdf": "forvaltningsplan-ulv-2014.pdf",
        "short": "Forvaltningsplan for ulv",
        "citation_base": "Forvaltningsplan for ulv i Danmark, Naturstyrelsen, Miljøministeriet, 2014",
        "date": "2014",
        "authority": "Naturstyrelsen, Miljøministeriet",
        "journal": "",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "ulv",
        "source_type": "forvaltningsplan",
        "original_path": "sources/forvaltningsplan-ulv-2014.pdf",
    },
    {
        "file": "H_ndbog_om_dyrearter_p__habitatdirektivets_bilag_IV_kap_1-9_8c79.pdf",
        "files": [
            "H_ndbog_om_dyrearter_p__habitatdirektivets_bilag_IV_kap_1-9_8c79.pdf",
            "H_ndbog_om_dyrearter_p__habitatdirektivets_bilag_IV_kap_10_-_23_med_bilag_8dcc.pdf",
        ],
        "pdf": "Håndbog om dyrearter på habitatdirektivets bilag IV.pdf",
        "short": "Håndbog om bilag IV-arter",
        "citation_base": "Opdatering af: Håndbog om dyrearter på habitatdirektivets bilag IV, Christian Kjær (red.), Lars Christian Adrados, Mikkel Boel, Lars Briggs, Per Klit Christensen, Niels Damm, John Frisenvænge, Kåre Fog, Rikke Reisner Hansen, Martin Hesselsøe, Rasmus Mohr Mortensen, Peer Ravn, Sabine Stosiek, Morten Strandberg, Ole Roland Therkildsen og Peter Wiberg-Larsen, Aarhus Universitet, DCE – Nationalt Center for Miljø og Energi, videnskabelig rapport nr. 520, 2023",
        "date": "4. maj 2023",
        "authority": "Aarhus Universitet, DCE – Nationalt Center for Miljø og Energi",
        "journal": "ISBN 978-87-7156-730-4",
        "themes": ["artsforvaltning"],
        "note": "Rapporten medtager kun en del af de danske bilag IV-arter.",
        "kind": "haandbog",
        "source_type": "haandbog",
        "min_chars": 40,
    },
    {
        "file": "H_ndbog_om_dyrearter_p__habitatdirektivets_bilag_IV_del_2_kap_1_-_9_c0f8.pdf",
        "files": [
            "H_ndbog_om_dyrearter_p__habitatdirektivets_bilag_IV_del_2_kap_1_-_9_c0f8.pdf",
            "H_ndbog_om_dyrearter_p__habitatdirektivets_bilag_IV_del_2_kap_10_-_21_dd52.pdf",
        ],
        "pdf": "Håndbog om dyrearter på habitatdirektivets bilag IV del 2.pdf",
        "short": "Håndbog om bilag IV-arter, del 2",
        "citation_base": "Opdatering af: Håndbog om dyrearter på habitatdirektivets bilag IV. Del 2 – Odder og flagermus, Morten Elmeros, Esben Terp Fjederholt, Julie Dahl Møller, Hans J. Baagøe, Jesper Bladt og Christian Kjær, Aarhus Universitet, DCE – Nationalt Center for Miljø og Energi, videnskabelig rapport nr. 603, 2024",
        "date": "29. april 2024",
        "authority": "Aarhus Universitet, DCE – Nationalt Center for Miljø og Energi",
        "journal": "ISBN 978-87-7156-869-1",
        "themes": ["artsforvaltning"],
        "note": "",
        "kind": "haandbog",
        "source_type": "haandbog",
        "chapters": "del2",
        "min_chars": 40,
    },
]

WILDLIFE_BANNERS = {
    "Examples of wildlife sensitivity mapping",
    "Overview of wildlife sensitivity mapping",
    "Wildlife sensitivity map development",
    "Spatial data",
    "GIS resources and mapping formats",
    "Glossary, references and acknowledgements",
}


def supabase_base() -> str:
    raw = os.environ["SUPABASE_URL"].strip().rstrip("/")
    if raw.startswith("https://") or raw.startswith("http://"):
        return raw
    return f"https://{raw}.supabase.co"


def is_hyphen_break(raw: str) -> bool:
    if re.search(r"-\s+$", raw):
        return False
    stripped = raw.rstrip()
    return stripped.endswith("-") or stripped.endswith("\u00ad")


def join_break(previous: str, nxt: str) -> str | None:
    if not re.match(r"^[a-zæøå]", nxt):
        return None
    raw = previous.rstrip()
    if raw.endswith("\u00ad"):
        return raw[:-1].rstrip() + nxt
    if not raw.endswith("-"):
        return None
    before = raw[:-1]
    if before.endswith(" "):
        return before.rstrip() + nxt
    previous_char = before[-1] if before else ""
    if previous_char.isupper() or previous_char.isdigit():
        return before + "-" + nxt
    return before + nxt


def header_page(line: str, kind: str) -> int | None:
    if kind == "sgav":
        match = re.search(r"/\s*202\s*6\s+(\d+)\s*$", line)
    elif kind == "vind":
        match = re.search(r"^(\d{1,3})\s+Vejledende dokument", line) or re.search(
            r"naturlovgivning\s+(\d{1,3})\s*$", line
        )
    else:
        match = re.search(r"EU(\d{1,3})\s*$", line)
    return int(match.group(1)) if match else None


def is_running_header(line: str, kind: str) -> bool:
    if kind == "sgav":
        return line.startswith("Styrelsen for Grøn Arealomlægning og Vandmiljø /")
    if kind == "vind":
        return "Vejledende dokument om vindenergianlæg" in line and len(line) < 100
    if line.startswith("The Wildlife Sensitivity Mapping Manual"):
        return True
    if re.fullmatch(r"[1-7][1-7\s]{2,12}", line):
        return True
    return False


def clean_wildlife_line(line: str) -> str:
    line = line.replace("\uf076", "•")
    return re.sub(r"^[\d\s]+(?=Section\b)", "", line)


def read_rows(path: Path, kind: str) -> list[tuple[str, int]]:
    reader = PdfReader(str(path))
    marked: list[tuple[str, int, bool]] = []
    for index, page in enumerate(reader.pages):
        raw_text = page.extract_text() or ""
        page_no = index + 1
        for raw in raw_text.splitlines():
            found = header_page(" ".join(raw.replace("\xa0", " ").split()), kind)
            if found:
                page_no = found
                break
        for raw in raw_text.splitlines():
            collapsed = " ".join(raw.replace("\xa0", " ").split())
            if not collapsed:
                continue
            if kind == "wildlife":
                collapsed = clean_wildlife_line(collapsed)
            if is_running_header(collapsed, kind):
                continue
            marked.append((collapsed.replace("\u00ad", ""), page_no, is_hyphen_break(raw)))
    rows: list[tuple[str, int]] = []
    index = 0
    while index < len(marked):
        line, page, broken = marked[index]
        if broken and index + 1 < len(marked):
            joined = join_break(line, marked[index + 1][0])
            if joined:
                marked[index + 1] = (joined, page, marked[index + 1][2])
                index += 1
                continue
        rows.append((line, page))
        index += 1
    return rows


def is_letterhead(line: str) -> bool:
    if line == "NOTAT" or line.startswith("NOTAT ") or line in {"Vandmiljø", "Miljøvurdering og Plan"} or re.fullmatch(r"20(?:24|25)", line):
        return True
    prefixes = (
        "Styrelsen for Grøn Arealomlægning",
        "og Vandmiljø",
        "Tlf.",
        "J.nr.",
        "Ref.",
        "Den 25. oktober",
        "Den 17. december",
    )
    return any(line.startswith(prefix) for prefix in prefixes)


def read_notat(path: Path) -> list[tuple[str, int]]:
    reader = PdfReader(str(path))
    marked: list[tuple[str, int, bool]] = []
    for index, page in enumerate(reader.pages):
        raw_text = page.extract_text(extraction_mode="layout") or ""
        collapsed: list[tuple[str, bool]] = []
        for raw in raw_text.splitlines():
            line = " ".join(raw.replace("\xa0", " ").split())
            if line:
                collapsed.append((line, is_hyphen_break(raw)))
        page_no = next((int(line) for line, _broken in collapsed if re.fullmatch(r"\d{1,2}", line)), index + 1)
        for line, broken in collapsed:
            if is_letterhead(line) or re.fullmatch(r"\d{1,2}", line):
                continue
            marked.append((line, page_no, broken))
    rows: list[tuple[str, int]] = []
    index = 0
    while index < len(marked):
        line, page, broken = marked[index]
        if broken and index + 1 < len(marked):
            nxt = marked[index + 1][0]
            first = re.split(r"[\s,.;:]", nxt, maxsplit=1)[0].lower()
            if line.rstrip().endswith("-") and first in {"eller", "og", "samt"}:
                joined = line.rstrip()[:-1].rstrip() + "- " + nxt
            else:
                joined = join_break(line, nxt)
            if joined:
                marked[index + 1] = (joined, page, marked[index + 1][2])
                index += 1
                continue
        rows.append((repair_notat_line(line), page))
        index += 1
    return rows


def repair_notat_line(line: str) -> str:
    line = re.sub(r"\b([A-E]\.\d+)\.\s+(\d+)\.", r"\1.\2.", line)
    for old, new in (
        ("yngleeller", "yngle- eller"),
        ("a rters", "arters"),
        ("p rojektets", "projektets"),
        ("grundlæggend e ", "grundlæggende "),
        ("gør e ", "gøre "),
        ("screenin g ", "screening "),
        ("se s bort", "ses bort"),
        ("de t areal", "det areal"),
        ("f andtes", "fandtes"),
        ("t ilgang", "tilgang"),
        ("fasts ætter", "fastsætter"),
        ("IV -art", "IV-art"),
    ):
        line = line.replace(old, new)
    return line


def is_notat_heading(line: str) -> bool:
    if re.match(r"^Del\s+[A-C]\.", line) or re.match(r"^Trin\s+\d", line) or re.match(r"^[A-E]\.\d", line):
        return True
    if not re.match(r"^[A-E]\.\s+[A-ZÆØÅ]", line):
        return False
    letters = [char for char in line if char.isalpha()]
    upper = sum(1 for char in letters if char.isupper())
    return bool(letters) and upper >= max(8, int(len(letters) * 0.6))


def is_heading(line: str, kind: str) -> bool:
    if kind == "wildlife":
        return bool(re.fullmatch(r"Section\s+\d+(?:\.\d+)?", line))
    if kind == "notat":
        return is_notat_heading(line)
    if kind == "sgav" and (line in {"Forord", "Læsevejledning"} or re.fullmatch(r"Bilag\s+\d+", line)):
        return True
    if kind == "vind" and re.match(r"^TILLÆG\s+[A-Z]\b", line) and len(line) < 160:
        return True
    if re.search(r"\s\d{1,3}$", line) and not re.search(r"(?:stk\.|nr\.)\s*\d+$", line):
        return False
    if kind == "sgav":
        if not re.match(r"^(?:[1-9]|1[0-2])\.\s+[A-ZÆØÅ]", line):
            return False
        if len(line) > 110 or "," in line or "(" in line or line.endswith(".") or ";" in line:
            return False
        if re.search(r"\b(kan|skal|er|har|ikke|hvor|at|der|artikel)\b", line, re.IGNORECASE):
            return False
        return True
    if line == "OM DETTE DOKUMENT":
        return True
    if re.match(r"^[1-9](?:\.\d+)+\.\s+\S", line) and len(line) < 160:
        return True
    return bool(re.match(r"^[1-9]\.\s+[A-ZÆØÅ]", line) and len(line) < 140)


def continuation(line: str, nxt: str, kind: str) -> bool:
    if kind == "notat":
        if is_heading(nxt, kind) or len(nxt) > 140:
            return False
        return bool(re.match(r"^[a-zæøå]", nxt) or (nxt.isupper() and len(nxt) < 90))
    if kind == "wildlife" or is_heading(nxt, kind):
        return False
    if len(nxt) > 70 or nxt.endswith(".") or nxt.endswith("?"):
        return False
    if re.match(r"^[a-zæøå]", nxt):
        return True
    if nxt.startswith("(") and not re.match(r"^\(\d+\)", nxt):
        return True
    return kind == "vind" and nxt.isupper() and len(nxt) < 50 and not nxt.startswith("TILLÆG")


def merge_wraps(rows: list[tuple[str, int]], kind: str) -> list[tuple[str, int]]:
    merged: list[tuple[str, int]] = []
    index = 0
    while index < len(rows):
        line, page = rows[index]
        while index + 1 < len(rows) and is_heading(line, kind) and continuation(line, rows[index + 1][0], kind):
            line = f"{line.rstrip()} {rows[index + 1][0]}"
            index += 1
        merged.append((line, page))
        index += 1
    return merged


def page_label(pages: list[int]) -> str:
    unique: list[int] = []
    for page in pages:
        if page not in unique:
            unique.append(page)
    if not unique:
        return ""
    if len(unique) == 1 or min(unique) == max(unique):
        return str(unique[0])
    return f"{min(unique)}–{max(unique)}"


def split_numbered(rows: list[tuple[str, int]], kind: str) -> list[tuple[str, list[tuple[str, int]]]]:
    start_line = "Forord" if kind == "sgav" else "OM DETTE DOKUMENT"
    start = next((index for index, (line, _) in enumerate(rows) if line == start_line), None)
    if start is None:
        start = next((index for index, (line, _) in enumerate(rows) if is_heading(line, kind)), 0)
    rows = rows[start:]
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    heading = rows[0][0] if rows else "Indledning"
    current: list[tuple[str, int]] = []
    for line, page in rows:
        if is_heading(line, kind) and current:
            sections.append((heading, current))
            heading = line
            current = [(line, page)]
        else:
            if is_heading(line, kind):
                heading = line
            current.append((line, page))
    if current:
        sections.append((heading, current))
    return glue_short(sections)


def glue_short(sections: list[tuple[str, list[tuple[str, int]]]]) -> list[tuple[str, list[tuple[str, int]]]]:
    """Læg en overskrift uden brødtekst foran det følgende afsnit."""
    glued: list[tuple[str, list[tuple[str, int]]]] = []
    pending: list[tuple[str, int]] = []
    for heading, section_rows in sections:
        text = "\n".join(line for line, _page in section_rows).strip()
        if len(text) < 100:
            pending.extend(section_rows)
            continue
        if pending:
            section_rows = pending + section_rows
            pending = []
        glued.append((heading, section_rows))
    if pending and glued:
        heading, section_rows = glued[-1]
        glued[-1] = (heading, section_rows + pending)
    elif pending:
        glued.append(("Indledning", pending))
    return glued


def part_number(line: str) -> tuple[int, int] | None:
    match = re.search(r"\((\d+)/(\d+)\)\s*$", line)
    if not match or len(line) > 180:
        return None
    return int(match.group(1)), int(match.group(2))


def title_fragment(line: str) -> bool:
    if line in WILDLIFE_BANNERS or line.startswith("•") or len(line) > 110:
        return False
    if re.search(r"[.!?]$", line):
        return False
    if re.search(r"\b(is|are|was|were|should|must)\b", line):
        return False
    return True


def strip_part_label(line: str) -> str:
    return re.sub(r"\s*\(\d+/\d+\)\s*$", "", line).strip()


def split_wildlife(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    start = next((index for index, (line, _) in enumerate(rows) if line == "Section 1.0"), 0)
    rows = rows[start:]
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    heading = "Section 1.0"
    current: list[tuple[str, int]] = []
    section_id = ""
    seen_banner = False
    expecting_title = False
    after_banner: list[tuple[str, int]] = []
    banner_open = False

    def flush() -> None:
        nonlocal current
        if current:
            sections.append((heading, current))
            current = []

    def close_banner(line: str, page: int) -> bool:
        """True when the lines after a repeated banner start a new example."""
        nonlocal heading, current, expecting_title, after_banner, banner_open, seen_banner
        parts = part_number(line)
        if parts and parts[0] > 1:
            after_banner = []
            banner_open = False
            return True
        if title_fragment(line) and len(after_banner) < 3:
            after_banner.append((line, page))
            if parts and parts[0] == 1:
                flush()
                title = " ".join(strip_part_label(item) for item, _page in after_banner)
                heading = f"Section {section_id} {title}".strip()
                current = list(after_banner)
                after_banner = []
                banner_open = False
                expecting_title = False
                seen_banner = True
            return True
        current.extend(after_banner)
        after_banner = []
        banner_open = False
        return False

    for line, page in rows:
        marker = re.fullmatch(r"Section\s+(\d+(?:\.\d+)?)", line)
        if marker:
            if banner_open:
                current.extend(after_banner)
                after_banner = []
                banner_open = False
            if marker.group(1) != section_id:
                flush()
                section_id = marker.group(1)
                heading = f"Section {section_id}"
                seen_banner = False
                expecting_title = True
            continue
        if line in WILDLIFE_BANNERS:
            if not seen_banner:
                seen_banner = True
                current.append((line, page))
            else:
                if banner_open:
                    current.extend(after_banner)
                after_banner = []
                banner_open = True
            continue
        if banner_open and close_banner(line, page):
            continue
        parts = part_number(line)
        if parts and parts[0] > 1:
            continue
        if expecting_title and title_fragment(line):
            heading = f"Section {section_id} {strip_part_label(line)}".strip()
            expecting_title = False
        current.append((line, page))
    if after_banner:
        current.extend(after_banner)
    flush()
    return glue_short(sections)


def pack(heading: str, rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    pieces: list[tuple[str, list[tuple[str, int]]]] = []
    bucket: list[tuple[str, int]] = []
    size = 0
    part = 1
    for row in rows:
        line, _page = row
        if bucket and size + len(line) > MAX_CHARS:
            label = heading if part == 1 else f"{heading} ({part})"
            pieces.append((label, bucket))
            part += 1
            bucket = []
            size = 0
        bucket.append(row)
        size += len(line) + 1
    if bucket:
        label = heading if part == 1 else f"{heading} ({part})"
        pieces.append((label, bucket))
    return pieces


def split_notat(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    heading = "Indledning"
    current: list[tuple[str, int]] = []
    for line, page in rows:
        if is_notat_heading(line) and current:
            sections.append((heading, current))
            heading = line
            current = [(line, page)]
        else:
            if is_notat_heading(line):
                heading = line
            current.append((line, page))
    if current:
        sections.append((heading, current))
    return glue_short(sections)


RETSINFO_FOOTER = re.compile(r"^(LBK|BEK|VEJ|LOV)\s+nr\s+.+\s(\d+)\s*$")
RETSINFO_SECTION = re.compile(r"^§\s*(\d+)(?:\s+([a-z]))?\.\s+\S")
RETSINFO_ANNEX = re.compile(r"^Bilag\s+(\d+)\b")
RETSINFO_CHAPTER = re.compile(r"^Kapitel\s+\d+")
RETSINFO_AMENDMENT = re.compile(r"^Lov nr\.\s+\d+\b")
HABITAT_CHAPTER = re.compile(r"^(10|[1-9])\.\s+[A-ZÆØÅ]")
HABITAT_NUMBER_ONLY = re.compile(r"^\d+(?:\.\d+){1,6}\.?$")
HABITAT_NUMBER_TITLE = re.compile(r"^\d+(?:\.\d+){1,6}\s+[A-ZÆØÅ]")
COMMISSION_NUMBER = re.compile(r"^\d+(?:\.\d+)*\.$")
COMMISSION_DATE = re.compile(r"^\d{1,2}\.\d{1,2}\.\d{4}$")
DIRECTIVE_ARTICLE = re.compile(r"^Artikel\s+(\d+)$")
DIRECTIVE_ANNEX = re.compile(r"^BILAG\s+([IVX]+)$")
DIRECTIVE_FOOTNOTE = re.compile(r"^\(\s*[\d»«>\*][^)]{0,3}\)")
DIRECTIVE_GLUE = (
    ("bevaringssstatus", "bevaringsstatus"),
    ("arteraffællesskabsbetydning", "arter af fællesskabsbetydning"),
    ("affællesskabsbetydning", "af fællesskabsbetydning"),
    ("^rtikel", "Artikel"),
    ("herafer", "heraf er"),
    ("afdem", "af dem"),
    ("derer", "der er"),
)


def join_hyphen_rows(rows: list[tuple[str, int]]) -> list[tuple[str, int]]:
    joined: list[tuple[str, int]] = []
    for line, page in rows:
        if joined:
            merged = join_break(joined[-1][0], line)
            if merged:
                joined[-1] = (merged, joined[-1][1])
                continue
        joined.append((line, page))
    return joined


def read_retsinfo(path: Path) -> list[tuple[str, int]]:
    reader = PdfReader(str(path))
    rows: list[tuple[str, int]] = []
    for page in reader.pages:
        raw = (page.extract_text() or "").replace("\xa0", " ")
        if "Udskriftsdato" in raw and "Senere ændringer" in raw:
            continue
        printed = None
        kept: list[str] = []
        for line in raw.splitlines():
            compact = " ".join(line.replace("\u00ad", "").split())
            if not compact:
                continue
            footer = RETSINFO_FOOTER.match(compact)
            if footer:
                printed = int(footer.group(2))
                continue
            kept.append(re.sub(r"([a-zæøå])(\d+\))", r"\1 \2", compact))
        label = printed or 0
        for line in kept:
            if rows and rows[-1][0].endswith("-") and re.match(r"^[a-zæøå]", line):
                rows[-1] = (rows[-1][0][:-1] + line, rows[-1][1])
            else:
                rows.append((line, label))
    return rows


def split_retsinfo(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    preamble: list[tuple[str, int]] = []
    chapter: list[tuple[str, int]] = []
    current_key = ""
    current: list[tuple[str, int]] = []
    amendment: list[tuple[str, int]] = []
    in_amendment = False
    seen_annex = False

    def flush() -> None:
        nonlocal current_key, current
        if current_key and current:
            sections.append((current_key, current))
        current_key = ""
        current = []

    for line, page in rows:
        if in_amendment:
            if RETSINFO_ANNEX.match(line):
                if amendment:
                    sections.append(("Overgangsbestemmelser", amendment))
                in_amendment = False
                amendment = []
                seen_annex = True
                current_key = f"Bilag {RETSINFO_ANNEX.match(line).group(1)}"
                current = [(line, page)]
                continue
            amendment.append((line, page))
            continue

        annex = RETSINFO_ANNEX.match(line)
        section = RETSINFO_SECTION.match(line)
        if not current_key and not chapter and not annex and not section and not RETSINFO_CHAPTER.match(line):
            preamble.append((line, page))
            continue

        if RETSINFO_CHAPTER.match(line):
            flush()
            chapter = [(line, page)]
            continue
        if chapter and not annex and not section:
            chapter.append((line, page))
            continue
        if not seen_annex and not annex and RETSINFO_AMENDMENT.match(line):
            flush()
            in_amendment = True
            amendment = [(line, page)]
            chapter = []
            continue
        if annex or section:
            flush()
            if annex:
                seen_annex = True
                current_key = f"Bilag {annex.group(1)}"
            else:
                number, letter = section.group(1), section.group(2)
                current_key = f"§ {number} {letter}" if letter else f"§ {number}"
            current = chapter + [(line, page)]
            chapter = []
            continue
        if current_key:
            current.append((line, page))

    flush()
    if amendment:
        sections.append(("Overgangsbestemmelser", amendment))
    if preamble and len("\n".join(line for line, _ in preamble)) > 40:
        sections.insert(0, ("Indledning", preamble))
    return sections


def habitatvej_page(text: str, fallback: int) -> int:
    match = re.search(r"(\d{1,3})\s+Miljøstyrelsen\s*/\s*Habitatvejledningen", text)
    if not match:
        match = re.search(r"Habitatvejledningen\s*/\s*2020\s+(\d{1,3})", text)
    return int(match.group(1)) if match else fallback


def title_continuation(previous: str, nxt: str) -> bool:
    if not nxt or HABITAT_CHAPTER.match(nxt) or HABITAT_NUMBER_ONLY.match(nxt) or HABITAT_NUMBER_TITLE.match(nxt):
        return False
    if re.match(r"^[a-zæøå]", nxt):
        return True
    if previous.rstrip().endswith("(") or previous.rstrip().endswith("bilag"):
        return True
    return len(nxt) <= 30 and not re.search(r"\b(skal|kan|må|er|har)\b", nxt)


def short_title(line: str) -> bool:
    if not line or len(line) > 120 or not re.match(r"^[A-ZÆØÅ]", line):
        return False
    if line.endswith("-") or line.endswith(","):
        return False
    return not ("," in line and re.search(r"\b(at|når|hvis|som|der)\b", line))


def read_habitatvej(path: Path) -> list[tuple[str, int]]:
    document = pymupdf.open(path)
    rows: list[tuple[str, int]] = []
    skipping_toc = False
    for index, page in enumerate(document):
        raw = page.get_text("text") or ""
        label = habitatvej_page(raw, index + 1)
        lines = [" ".join(line.split()) for line in raw.splitlines()]
        lines = [line for line in lines if line and "Miljøstyrelsen / Habitatvejledningen" not in line]
        kept: list[str] = []
        for line_index, line in enumerate(lines):
            if line == "Indholdsfortegnelse":
                skipping_toc = True
                continue
            if skipping_toc:
                following = lines[line_index + 1] if line_index + 1 < len(lines) else ""
                if line == "1. Indledning" and not re.fullmatch(r"\d{1,3}", following):
                    skipping_toc = False
                else:
                    continue
            if re.fullmatch(r"\d{1,3}", line):
                continue
            line = re.sub(r"([a-zæøå]{3,})(\d{1,3})\b", r"\1 \2", line)
            kept.append(line)
        for line in kept:
            rows.append((line, label))
    return join_hyphen_rows(rows)


def split_habitatvej(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    heading = ""
    current: list[tuple[str, int]] = []

    def flush() -> None:
        nonlocal heading, current
        if heading and current:
            sections.append((heading, current))
        heading = ""
        current = []

    index = 0
    while index < len(rows):
        line, page = rows[index]
        number_only = HABITAT_NUMBER_ONLY.match(line)
        chapter = HABITAT_CHAPTER.match(line) and " kan " not in line and not re.search(r"\.\d{2,}$", line)
        numbered = HABITAT_NUMBER_TITLE.match(line)
        start = line == "Forord" or chapter or numbered or number_only
        if number_only:
            nxt = rows[index + 1][0] if index + 1 < len(rows) else ""
            start = short_title(nxt)
        if start and (current or line == "Forord"):
            flush()
            parts = [line]
            index += 1
            if number_only and index < len(rows):
                parts.append(rows[index][0])
                page = rows[index][1]
                index += 1
            while index < len(rows) and title_continuation(parts[-1], rows[index][0]):
                parts.append(rows[index][0])
                index += 1
            heading = " ".join(parts).strip()
            current = [(heading, page)]
            continue
        if not heading and line == "Forord":
            heading = line
        if heading or line == "Forord":
            if not heading:
                heading = "Forord"
            current.append((line, page))
        index += 1
    flush()
    return glue_short(sections)


def commission_page(text: str, fallback: int) -> int:
    match = re.search(r"C\s*496/(\d+)", text)
    return int(match.group(1)) if match else fallback


def read_kommission(path: Path) -> list[tuple[str, int]]:
    document = pymupdf.open(path)
    rows: list[tuple[str, int]] = []
    started = False
    for index, page in enumerate(document):
        raw = page.get_text("text") or ""
        label = commission_page(raw, index + 1)
        for raw_line in raw.splitlines():
            line = " ".join(raw_line.split())
            if not line or line == "DA" or line.startswith("Den Europæiske Unions Tidende"):
                continue
            if re.match(r"^C\s*496/", line) or COMMISSION_DATE.match(line):
                continue
            if line == "FORORD":
                started = True
            if started:
                rows.append((line, label))
    return join_hyphen_rows(rows)


def split_kommission(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    heading = ""
    current: list[tuple[str, int]] = []
    annex_name = ""

    def flush() -> None:
        nonlocal heading, current
        if heading and current:
            sections.append((heading, current))
        heading = ""
        current = []

    index = 0
    while index < len(rows):
        line, page = rows[index]
        annex = re.match(r"^BILAG\s+[IVX]+$", line)
        number = COMMISSION_NUMBER.match(line) and not COMMISSION_DATE.match(line)
        if annex or number or line == "FORORD":
            nxt = rows[index + 1][0] if index + 1 < len(rows) else ""
            accept = True
            if number:
                multi = "." in line[:-1]
                accept = not nxt.startswith("(") and len(nxt) <= (145 if multi else 100)
            if accept:
                if current:
                    flush()
                if line == "FORORD":
                    heading = line
                    current = [(line, page)]
                    index += 1
                    continue
                title = nxt if nxt and len(nxt) <= 145 and not nxt.startswith("(") else ""
                if annex:
                    annex_name = line
                heading = f"{line} {title}".strip() if title else line
                if number and annex_name == "BILAG III":
                    heading = f"Bilag III, {heading}"
                current = [(heading, page)]
                index += 2 if title else 1
                continue
        if heading:
            current.append((line, page))
        index += 1
    flush()
    return glue_short(sections)


def tidy_directive_line(line: str) -> str:
    line = re.sub(r"\s+([,.;:)])", r"\1", line)
    line = re.sub(r"(\()\s+", r"\1", line)
    line = re.sub(r"(?i)(artikel\s+)(\d)\s+(\d)\b", r"\1\2\3", line)
    for source, target in DIRECTIVE_GLUE:
        line = line.replace(source, target)
    return line


def read_habitatdir(path: Path) -> list[tuple[str, int]]:
    document = pymupdf.open(path)
    rows: list[tuple[str, int]] = []
    for index, page in enumerate(document):
        raw = page.get_text("text") or ""
        match = re.search(r"L\s*206\s*/\s*(\d+)", raw)
        label = int(match.group(1)) if match else index + 1
        collected: list[tuple[float, float, str]] = []
        for block in (page.get_text("dict").get("blocks") or []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines") or []:
                x0, y0, _x1, _y1 = line["bbox"]
                if y0 < 82:
                    continue
                text = tidy_directive_line(" ".join("".join(span["text"] for span in line["spans"]).split()))
                if not text or ("Tidende" in text and len(text) < 70):
                    continue
                collected.append((y0, x0, text))
        leftish = [item for item in collected if item[1] < 100]
        rightish = [item for item in collected if item[1] > 280]
        two = len(leftish) >= 3 and len(rightish) >= 3
        if not two:
            ordered = [item[2] for item in sorted(collected, key=lambda item: (item[0], item[1]))]
        else:
            body_y = min(item[0] for item in leftish + rightish)
            pre = [item for item in collected if item[0] < body_y - 2]
            left = [item for item in collected if item[0] >= body_y - 2 and item[1] < 270]
            right = [item for item in collected if item[0] >= body_y - 2 and item[1] >= 270]
            ordered = [item[2] for item in sorted(pre, key=lambda item: item[0])]
            body_lines: list[str] = []
            note_lines: list[str] = []
            for item in sorted(left, key=lambda item: item[0]) + sorted(right, key=lambda item: item[0]):
                if DIRECTIVE_FOOTNOTE.match(item[2]):
                    note_lines.append(item[2])
                else:
                    body_lines.append(item[2])
            ordered.extend(body_lines)
            ordered.extend(note_lines)
        for line in ordered:
            rows.append((line, label))
    return repair_directive_breaks(rows)


def repair_directive_breaks(rows: list[tuple[str, int]]) -> list[tuple[str, int]]:
    marker = re.compile(r"^(?:\d+\.|\d+\)|\d+\.\d+(?:\s+x\s+\d+\.\d+)?)$")
    current = rows
    for _ in range(6):
        joined: list[tuple[str, int]] = []
        index = 0
        changed = False
        while index < len(current):
            line, page = current[index]
            broken = line.endswith("-") or line.endswith("\u00ad")
            if broken and index + 2 < len(current) and marker.match(current[index + 1][0]) and re.match(r"^[a-zæøå]", current[index + 2][0]):
                merged = join_break(line, current[index + 2][0])
                if merged:
                    joined.append(current[index + 1])
                    joined.append((merged, page))
                    index += 3
                    changed = True
                    continue
            if broken and index + 1 < len(current) and re.match(r"^\d{4}\b", current[index + 1][0]):
                joined.append((line[:-1] + "-" + current[index + 1][0], page))
                index += 2
                changed = True
                continue
            if broken and index + 1 < len(current):
                merged = join_break(line, current[index + 1][0])
                if merged:
                    joined.append((merged, page))
                    index += 2
                    changed = True
                    continue
            joined.append((line, page))
            index += 1
        current = joined
        if not changed:
            break
    return current


def split_habitatdir(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    cuts = [index for index, (line, _page) in enumerate(rows) if DIRECTIVE_ARTICLE.match(line) or DIRECTIVE_ANNEX.match(line)]
    if len(cuts) < 10:
        raise RuntimeError(f"Fandt for få artikler i habitatdirektivet ({len(cuts)})")
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    if cuts[0] > 0:
        sections.append(("Betragtninger", rows[: cuts[0]]))
    for offset, start in enumerate(cuts):
        end = cuts[offset + 1] if offset + 1 < len(cuts) else len(rows)
        line = rows[start][0]
        article = DIRECTIVE_ARTICLE.match(line)
        annex = DIRECTIVE_ANNEX.match(line)
        heading = f"Artikel {article.group(1)}" if article else f"Bilag {annex.group(1)}"
        sections.append((heading, rows[start:end]))
    return sections


PLAN_TOC = re.compile(r"^(?:indhold|indholdsfortegnelse)\b", re.IGNORECASE)
PLAN_PAGE = re.compile(r"^(?:\d{1,3}|\d(?:\s+\d){1,2})$")
ODDER_TOC = re.compile(r"^(\d+(?:\.\d+)*)\s*[-–.]?\s+(.+?)\s+\d{1,3}\s*\.?$")
ODDER_HEAD = re.compile(r"^(\d+(?:\.\d+)*)\s*[-–.]?\s+(.+?)\s*\.?$")


def plan_tidy(text: str) -> str:
    return " ".join(text.replace("\xa0", " ").split())


def plan_title(text: str) -> str:
    cleaned = plan_tidy(text.replace("\u00ad", ""))
    cleaned = re.sub(r"(?:\.{2,}|…+)", " ", cleaned)
    cleaned = re.sub(r"\s+\d(?:\s+\d){1,2}$", "", cleaned)
    cleaned = re.sub(r"\s+\d{1,3}$", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip(" .-–—")


def closed_toc_line(line: str) -> bool:
    compact = plan_tidy(line)
    if ".." in compact or "…" in compact:
        return True
    if re.search(r"\s\d(?:\s+\d){1,2}$", compact):
        return True
    return bool(re.search(r"\s\d{1,3}$", compact))


def plan_page_value(text: str) -> int | None:
    compact = text.strip()
    if re.fullmatch(r"\d{1,3}", compact):
        return int(compact)
    if re.fullmatch(r"\d(?:\s+\d){1,2}", compact):
        return int(compact.replace(" ", ""))
    return None


def plan_page_lines(page: pymupdf.Page, balanced_columns: bool = False) -> list[tuple[str, int]]:
    """Linjer i læserækkefølge. Spalter læses færdige, før næste spalte begynder."""
    matrix = page.rotation_matrix
    height = page.rect.height
    raw: list[tuple[float, float, float, str]] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            text = plan_tidy("".join(span["text"] for span in line["spans"]))
            if not text:
                continue
            box = pymupdf.Rect(line["bbox"]) * matrix
            raw.append((box.y0, box.x0, box.x1, text))
    margin: list[tuple[float, int]] = []
    body: list[tuple[float, float, float, str]] = []
    for y0, x0, x1, text in raw:
        in_margin = y0 < 40 or y0 > height - 38
        if in_margin:
            number = plan_page_value(text) if re.fullmatch(r"\d{1,3}", text.strip()) else None
            if number is None:
                match = re.match(r"^(\d{1,3})\s+Forvaltningsplan", text)
                if match:
                    number = int(match.group(1))
            if number is not None:
                margin.append((x0, number))
            continue
        if text.startswith("Beskyttelse og forvaltning af hasselmusen OG DENS"):
            continue
        if re.match(r"^\d{1,3}\s+Forvaltningsplan", text) and len(text) < 90:
            continue
        if re.match(r"^Forvaltningsplan(?:en)? for \S.+\d{1,3}$", text) and len(text) < 90:
            continue
        body.append((y0, x0, x1, text))
    fallback = page.number + 1

    def printed(x0: float) -> int:
        if not margin:
            return fallback
        return min(margin, key=lambda item: abs(item[0] - x0))[1]

    long = [item for item in body if len(item[3]) > 25]
    split_at = None
    if len(long) >= 8:
        starts = sorted(item[1] for item in long)
        if balanced_columns:
            candidates: list[tuple[float, float]] = []
            for left, right in zip(starts, starts[1:]):
                gap = right - left
                if gap <= 40:
                    continue
                at = (left + right) / 2
                left_count = sum(1 for item in long if item[1] < at)
                right_count = sum(1 for item in long if item[1] >= at)
                smaller = min(left_count, right_count)
                if smaller >= 8 and smaller >= len(long) * 0.2:
                    candidates.append((gap, at))
            if candidates:
                split_at = max(candidates)[1]
        else:
            gap = 0.0
            at = None
            for left, right in zip(starts, starts[1:]):
                if right - left > gap:
                    gap = right - left
                    at = (left + right) / 2
            if at is not None and gap > 40:
                left_count = sum(1 for item in long if item[1] < at)
                right_count = sum(1 for item in long if item[1] >= at)
                if left_count >= 4 and right_count >= 4:
                    split_at = at

    def emit(rows: list[tuple[float, float, float, str]]) -> list[tuple[str, int]]:
        ordered = sorted(rows, key=lambda item: (item[0], item[1]))
        emitted: list[tuple[str, int]] = []
        deferred: list[tuple[float, float, str]] = []
        index = 0
        while index < len(ordered):
            y0 = ordered[index][0]
            parts = [ordered[index]]
            index += 1
            while index < len(ordered) and abs(ordered[index][0] - y0) < 3:
                parts.append(ordered[index])
                index += 1
            parts.sort(key=lambda item: item[1])
            main = [part for part in parts if not (balanced_columns and part[1] > 440)]
            side = [part for part in parts if balanced_columns and part[1] > 440]
            if main:
                text = plan_tidy(" ".join(part[3] for part in main))
                if text:
                    emitted.append((text, printed(main[0][1])))
            if side:
                side_text = plan_tidy(" ".join(part[3] for part in side))
                if side_text:
                    deferred.append((side[0][0], side[0][1], side_text))
        for _y0, x0, text in sorted(deferred):
            emitted.append((text, printed(x0)))
        return emitted

    if split_at is None:
        return emit(body)
    left = [item for item in body if item[1] < split_at]
    right = [item for item in body if item[1] >= split_at]
    return emit(left) + emit(right)


def read_forvaltningsplan(path: Path) -> list[tuple[str, int]]:
    document = pymupdf.open(path)
    rows: list[tuple[str, int]] = []
    for page in document:
        rows.extend(plan_page_lines(page))
    return join_hyphen_rows(rows)


def repair_plan_ligature(text: str) -> str:
    text = re.sub(r"([A-Za-zÆØÅæøå])\ufb00\s+([a-zæøå])", r"\1ff\2", text)
    text = re.sub(r"([A-Za-zÆØÅæøå])\ufb01\s+([a-zæøå])", r"\1fi\2", text)
    text = re.sub(r"([A-Za-zÆØÅæøå])\ufb02\s+([a-zæøå])", r"\1fl\2", text)
    return (
        text.replace("\ufb00", "ff")
        .replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\ufb03", "ffi")
        .replace("\ufb04", "ffl")
    )


def read_ulv(path: Path) -> list[tuple[str, int]]:
    document = pymupdf.open(path)
    rows: list[tuple[str, int]] = []
    for page in document:
        rows.extend(plan_page_lines(page, balanced_columns=True))
    return join_hyphen_rows([(repair_plan_ligature(line), page) for line, page in rows])


def collect_plan_titles(rows: list[tuple[str, int]], toc_at: int) -> list[str]:
    """Overskrifter fra indholdsfortegnelsen. En post slutter med sidetal eller prikker."""
    titles: list[str] = []
    index = toc_at + 1
    while index < len(rows):
        line = rows[index][0]
        if PLAN_PAGE.match(line.strip()) or plan_title(line).casefold() in {"side", "indhold", "indholdsfortegnelse"}:
            index += 1
            continue
        nxt = rows[index + 1][0] if index + 1 < len(rows) else ""
        wrapped = (
            not closed_toc_line(line)
            and (nxt[:1].islower() or nxt.startswith("("))
            and (closed_toc_line(nxt) or bool(PLAN_PAGE.match(nxt.strip())))
        )
        if wrapped:
            title = plan_title(f"{line} {nxt}")
            if 3 <= len(title) <= 180 and not re.fullmatch(r"[\d\s.]+", title):
                titles.append(title)
            index += 2
            continue
        if closed_toc_line(line):
            title = plan_title(line)
            if title and 3 <= len(title) <= 180 and not re.fullmatch(r"[\d\s.]+", title):
                if not titles or titles[-1].casefold() != title.casefold():
                    titles.append(title)
            index += 1
            continue
        if closed_toc_line(nxt) and nxt[:1].isupper() and len(line) < 160:
            title = plan_title(line)
            if title and 3 <= len(title) <= 180:
                titles.append(title)
            index += 1
            continue
        if len(titles) >= 3:
            break
        index += 1
    return titles


def fold_plan_heading(text: str) -> str:
    folded = (
        text.replace("\ufb00", "ff")
        .replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\ufb03", "ffi")
        .replace("\ufb04", "ffl")
    )
    return re.sub(r"[^a-z0-9æøå]", "", folded.casefold())


def heading_number(text: str) -> str:
    match = re.match(r"^(\d+(?:\.\d+)*)", text)
    return match.group(1) if match else ""


def split_forvaltningsplan(
    rows: list[tuple[str, int]], loose: bool = False
) -> list[tuple[str, list[tuple[str, int]]]]:
    toc_at = next((index for index, (line, _page) in enumerate(rows) if PLAN_TOC.match(plan_title(line))), None)
    if toc_at is None:
        raise RuntimeError("Fandt ikke indholdsfortegnelsen")
    toc_page = rows[toc_at][1]
    titles = collect_plan_titles(rows, toc_at)
    if len(titles) < 4:
        raise RuntimeError(f"Fandt for få afsnit i forvaltningsplanen ({titles})")
    known = {title.casefold() for title in titles}

    def follower_is_toc(index: int) -> bool:
        for line, _page in rows[index + 1 : index + 4]:
            if PLAN_PAGE.match(line.strip()):
                return True
            if plan_title(line).casefold() in known or PLAN_TOC.match(plan_title(line)):
                return True
            if len(line) > 40:
                return False
        return True

    body_at = None
    for index in range(toc_at + 1, len(rows)):
        line, page = rows[index]
        if page == toc_page or plan_title(line).casefold() not in known:
            continue
        if not follower_is_toc(index):
            body_at = index
            break
    if body_at is None:
        raise RuntimeError("Fandt ikke brødteksten efter indholdsfortegnelsen")
    sections: list[tuple[str, list[tuple[str, int]]]] = []

    def loose_heading(title: str) -> str | None:
        if not loose or not re.match(r"^\d", title) or not 8 <= len(title) <= 140:
            return None
        folded = fold_plan_heading(title)
        number = heading_number(title)
        found = [
            item
            for item in titles
            if heading_number(item) == number
            and (folded.startswith(fold_plan_heading(item)) or fold_plan_heading(item).startswith(folded))
            and min(len(folded), len(fold_plan_heading(item))) >= 10
        ]
        if len(found) == 1:
            return found[0]
        return None

    def plan_heading(line: str, nxt: str) -> str | None:
        if not line or line[:1].islower() or len(line) > 180:
            return None
        title = plan_title(line)
        exact = next((item for item in titles if item.casefold() == title.casefold()), None)
        if exact is None:
            folded = re.sub(r"(.)\1+", r"\1", title.casefold())
            exact = next(
                (
                    item
                    for item in titles
                    if abs(len(item) - len(title)) <= 2 and re.sub(r"(.)\1+", r"\1", item.casefold()) == folded
                ),
                None,
            )
        if exact:
            return exact
        if len(title) < 8:
            return None
        matches = [item for item in titles if item.casefold().startswith(title.casefold() + " ")]
        if len(matches) != 1:
            return loose_heading(title)
        rest = matches[0][len(title) :].strip()
        if title.endswith(("og", "med", "for", "af", "til", "i", "en", "et", ",")):
            word = rest.split()[0].casefold().strip(".,;:()")
            if plan_title(nxt).casefold().startswith(word):
                return matches[0]
            return loose_heading(title)
        if len(line) < 80:
            return matches[0]
        return loose_heading(title)

    preface = [(line, page) for line, page in rows[:toc_at] if not PLAN_PAGE.match(line.strip())]
    if loose and preface:
        cover: list[tuple[str, int]] = []
        started = False
        heading = ""
        current = []
        for index, (line, page) in enumerate(preface):
            nxt = preface[index + 1][0] if index + 1 < len(preface) else ""
            label = plan_heading(line, nxt)
            if label:
                if current and started:
                    sections.append((heading, current))
                elif current:
                    cover.extend(current)
                started = True
                heading = label
                current = [(line, page)]
            else:
                current.append((line, page))
        if current and started:
            sections.append((heading, current))
        elif current:
            cover.extend(current)
        if cover:
            sections.insert(0, ("Kolofon", cover))
    elif preface:
        sections.append(("Kolofon", preface))

    heading = plan_heading(rows[body_at][0], rows[body_at + 1][0] if body_at + 1 < len(rows) else "") or plan_title(rows[body_at][0])
    current: list[tuple[str, int]] = []
    body = rows[body_at:]
    for index, (line, page) in enumerate(body):
        if PLAN_PAGE.match(line.strip()):
            continue
        nxt = body[index + 1][0] if index + 1 < len(body) else ""
        label = plan_heading(line, nxt)
        if label and current:
            sections.append((heading, current))
            heading = label
            current = [(line, page)]
        else:
            current.append((line, page))
    if current:
        sections.append((heading, current))
    return glue_short(sections)


ODDER_CACHE = Path("/tmp/odder-ocr")


def read_odder(path: Path) -> list[tuple[str, int]]:
    ODDER_CACHE.mkdir(parents=True, exist_ok=True)
    document = pymupdf.open(path)
    rows: list[tuple[str, int]] = []
    for index, page in enumerate(document, start=1):
        cached = ODDER_CACHE / f"p{index}.txt"
        if not cached.exists() or cached.stat().st_size == 0:
            image = ODDER_CACHE / f"p{index}.png"
            page.get_pixmap(dpi=180).save(image)
            subprocess.run(
                ["tesseract", str(image), str(cached.with_suffix("")), "-l", "dan", "--psm", "6"],
                check=True,
                capture_output=True,
            )
        printed = index
        for raw_line in cached.read_text(encoding="utf-8", errors="replace").splitlines():
            line = plan_tidy(raw_line.replace("\u00ad", ""))
            if not line:
                continue
            if not rows or rows[-1][1] != printed:
                if re.fullmatch(r"\d{1,3}", line) and printed == index:
                    printed = int(line)
                    continue
            line = re.sub(r"^41\s+Åleruser", "4.1 Åleruser", line)
            line = re.sub(r"^5,3\s+", "5.3 ", line)
            line = re.sub(r"^[.·]+\s+(?=\d)", "", line)
            if ODDER_TOC.match(line):
                pass
            elif re.match(r"^9\s*[=»].*Øvrige", line):
                line = "9. Øvrige områder med odder"
            elif re.match(r"^1\s*O\b.*Fremtidig", line):
                line = "10. Fremtidig overvågning og forskning"
            elif re.match(r"^1\s*1\b.*Genudsætning af odder", line):
                line = "11. Genudsætning af odder"
            elif re.match(r"^13\b.*Resumé", line):
                line = "13. Resumé"
            elif re.match(r"^1\s*d\..*English", line):
                line = "14. English Summary"
            elif re.match(r"^1\s*5\b.*Referencer", line):
                line = "15. Referencer"
            elif re.match(r"^5\s*=\s*National", line):
                line = "5. National og international beskyttelse"
            elif re.match(r"^2\s+Odderens biologi$", line):
                line = "2. Odderens biologi"
            elif re.match(r"^3\s*[»=].*Undersøgelser", line):
                line = "3. Undersøgelser og forskning"
            elif re.match(r"^6\s*[»=].*Forvaltningsmæssige", line):
                line = "6. Forvaltningsmæssige overvejelser"
            letters = len(re.findall(r"[A-Za-zÆØÅæøå]", line))
            if len(line) >= 8 and letters / len(line) < 0.35 and not ODDER_HEAD.match(line):
                continue
            if rows and rows[-1][0].endswith("-") and re.match(r"^[a-zæøå]", line):
                rows[-1] = (rows[-1][0][:-1] + line, rows[-1][1])
            else:
                rows.append((line, printed))
    return rows


def odder_key(number: str, title: str) -> str:
    return f"{number} {plan_title(title)}".casefold()


def odder_heading(line: str, known: dict[str, str]) -> str | None:
    if ODDER_TOC.match(line.strip()):
        return None
    match = ODDER_HEAD.match(line.strip())
    if not match or len(line) > 120:
        return None
    key = odder_key(match.group(1), match.group(2))
    if key in known:
        return known[key]
    for known_key, label in known.items():
        if key.startswith(known_key) and (len(key) == len(known_key) or key[len(known_key)] == " "):
            return label
    return None


def split_odder(rows: list[tuple[str, int]]) -> list[tuple[str, list[tuple[str, int]]]]:
    toc_at = next((index for index, (line, _page) in enumerate(rows) if plan_title(line).casefold() == "indhold"), None)
    if toc_at is None:
        raise RuntimeError("Fandt ikke odderplanens indhold")
    known: dict[str, str] = {}
    toc_end = toc_at
    for index in range(toc_at + 1, len(rows)):
        line = rows[index][0]
        match = ODDER_TOC.match(line.strip())
        if match:
            number, title = match.group(1), match.group(2)
            known[odder_key(number, title)] = f"{number} {plan_title(title)}"
            toc_end = index
            continue
        if known and len(line) > 40:
            break
    if len(known) < 15:
        raise RuntimeError(f"Fandt for få afsnit i odderplanen ({len(known)})")
    forord_at = next((index for index, (line, _page) in enumerate(rows[:toc_at]) if plan_title(line).casefold() == "forord"), None)
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    if forord_at is None:
        preface = rows[:toc_at]
        if preface:
            sections.append(("Kolofon", preface))
    else:
        preface = rows[:forord_at]
        if preface:
            sections.append(("Kolofon", preface))
        sections.append(("Forord", rows[forord_at:toc_at]))
    heading = ""
    current: list[tuple[str, int]] = []
    for line, page in rows[toc_end + 1 :]:
        label = odder_heading(line, known)
        if label:
            if current and heading:
                sections.append((heading, current))
            heading = label
            current = [(line, page)]
            continue
        if heading:
            current.append((line, page))
    if current and heading:
        sections.append((heading, current))
    return glue_short(sections)


HAANDBOG_CHAPTERS = {
    "1": "Introduktion",
    "2": "Bæver",
    "3": "Hasselmus",
    "4": "Birkemus",
    "5": "Markfirben",
    "6": "Klokkefrø",
    "7": "Stor vandsalamander",
    "8": "Løgfrø",
    "9": "Løvfrø",
    "10": "Spidssnudet frø",
    "11": "Springfrø",
    "12": "Strandtudse",
    "13": "Grønbroget tudse eller fløjtetudse",
    "14": "Snæbel",
    "15": "Bred vandkalv",
    "16": "Lys skivevandkalv",
    "17": "Eremit",
    "18": "Sortplettet blåfugl",
    "19": "Grøn mosaikguldsmed",
    "20": "Stor kærguldsmed",
    "21": "Grøn kølleguldsmed",
    "22": "Natlyssværmer",
    "23": "Tykskallet malermusling",
}
HAANDBOG_DEL2_CHAPTERS = {
    "1": "Introduktion",
    "2": "Odder",
    "3": "Generelt om danske flagermus",
    "4": "Bechsteins flagermus",
    "5": "Brandts flagermus",
    "6": "Skægflagermus",
    "7": "Damflagermus",
    "8": "Vandflagermus",
    "9": "Stor museøre",
    "10": "Frynseflagermus",
    "11": "Troldflagermus",
    "12": "Dværgflagermus",
    "13": "Pipistrelflagermus",
    "14": "Leislers flagermus",
    "15": "Brunflagermus",
    "16": "Nordflagermus",
    "17": "Sydflagermus",
    "18": "Skimmelflagermus",
    "19": "Bredøret flagermus",
    "20": "Brun langøre",
    "21": "Flagermusreferencer",
}
HAANDBOG_SUBS = (
    "status",
    "levevis",
    "udbredelse",
    "registrerings",
    "overvågning",
    "trusler",
    "generelle og specifikke",
    "andre forhold",
    "referencer",
)


def haandbog_norm(line: str) -> str:
    return " ".join(line.replace("\u00ad", "").split()).casefold().rstrip(".")


def haandbog_lines(paths: list[Path]) -> list[tuple[str, int]]:
    rows: list[tuple[str, int]] = []
    for path in paths:
        document = pymupdf.open(path)
        for page in document:
            lines = [" ".join(line.split()) for line in (page.get_text("text") or "").splitlines()]
            lines = [line for line in lines if line]
            label = 0
            if lines and re.fullmatch(r"\d{1,3}", lines[0]) and int(lines[0]) <= 280:
                label = int(lines[0])
                lines = lines[1:]
            elif lines and re.fullmatch(r"\d{1,3}", lines[-1]) and int(lines[-1]) <= 280:
                label = int(lines[-1])
                lines = lines[:-1]
            if label == 0:
                continue
            for line in lines:
                if rows:
                    previous, page_no = rows[-1]
                    joined = join_break(previous, line)
                    if joined:
                        rows[-1] = (joined, page_no)
                        continue
                rows.append((line, label))
    return rows


def haandbog_heading(title: str) -> bool:
    cleaned = title.rstrip(".").strip()
    if any(haandbog_norm(cleaned).startswith(name) for name in HAANDBOG_SUBS):
        return len(cleaned) < 120
    if not re.match(r"^[A-ZÆØÅ]", cleaned) or len(cleaned) > 110:
        return False
    return len(cleaned.split()) <= 14 and ". " not in cleaned


def haandbog_chapter(
    rows: list[tuple[str, int]], index: int, chapters: dict[str, str]
) -> tuple[str, str, int] | None:
    line = rows[index][0]
    number = re.fullmatch(r"(\d{1,2})", line)
    if number and number.group(1) in chapters and index + 1 < len(rows):
        title = chapters[number.group(1)]
        if haandbog_norm(rows[index + 1][0]) == haandbog_norm(title):
            return number.group(1), title, 2
    numbered = re.match(r"^(\d{1,2})\s+(.+)$", line)
    if numbered and numbered.group(1) in chapters:
        title = chapters[numbered.group(1)]
        if haandbog_norm(numbered.group(2)) == haandbog_norm(title):
            return numbered.group(1), title, 1
    return None


def haandbog_sub(
    rows: list[tuple[str, int]], index: int, chapter_number: str
) -> tuple[str, int] | None:
    line = rows[index][0]
    if haandbog_norm(line) == "bilag 1":
        return "Bilag 1", 1

    def same_chapter(number: str) -> bool:
        return bool(chapter_number) and number.split(".")[0] == chapter_number

    bare = re.fullmatch(r"(\d{1,2}\.\d{1,2})", line)
    if bare and same_chapter(bare.group(1)) and index + 1 < len(rows):
        title = rows[index + 1][0].strip()
        if title.endswith(".") and not title.endswith("m.v."):
            title = title[:-1].strip()
        if haandbog_heading(title):
            return f"{bare.group(1)} {title}", 2
    inline = re.match(r"^(\d{1,2}\.\d{1,2})\s+(.+)$", line)
    if inline and same_chapter(inline.group(1)) and len(line) < 120:
        title = inline.group(2).strip()
        if title.endswith(".") and not title.endswith("m.v."):
            title = title[:-1].strip()
        if haandbog_heading(title):
            return f"{inline.group(1)} {title}", 1
    return None


def split_haandbog(
    rows: list[tuple[str, int]], chapters: dict[str, str] | None = None
) -> list[tuple[str, list[tuple[str, int]]]]:
    chapters = chapters or HAANDBOG_CHAPTERS
    start = 0
    for index in range(len(rows) - 2):
        chapter = haandbog_chapter(rows, index, chapters)
        if not chapter or chapter[0] != "1":
            continue
        follower = rows[index + chapter[2]][0]
        if not re.fullmatch(r"\d{1,3}", follower):
            start = index
            break
    rows = rows[start:]
    sections: list[tuple[str, list[tuple[str, int]]]] = []
    heading = ""
    chapter_label = ""
    chapter_number = ""
    current: list[tuple[str, int]] = []
    index = 0
    while index < len(rows):
        chapter = haandbog_chapter(rows, index, chapters)
        subsection = None if chapter else haandbog_sub(rows, index, chapter_number)
        if chapter or subsection:
            if current and heading:
                sections.append((heading, current))
            current = []
            if chapter:
                chapter_number = chapter[0]
                chapter_label = f"{chapter[0]} {chapter[1]}"
                heading = chapter_label
                index += chapter[2]
                continue
            if subsection and subsection[0] == "Bilag 1":
                chapter_label = "Bilag 1"
                heading = "Bilag 1"
            else:
                heading = f"{chapter_label}, {subsection[0]}" if chapter_label else subsection[0]
            index += subsection[1]
            continue
        if heading:
            current.append(rows[index])
        index += 1
    if current and heading:
        sections.append((heading, current))
    folded: list[tuple[str, list[tuple[str, int]]]] = []
    for label, part in sections:
        if folded and "," not in folded[-1][0] and label.startswith(folded[-1][0]):
            previous = folded.pop()
            part = previous[1] + part
        folded.append((label, part))
    return folded


def build(folder: Path, only: set[str] | None = None) -> list[dict]:
    chunks: list[dict] = []
    for spec in DOCUMENTS:
        if only and spec["pdf"] not in only:
            continue
        kind = spec["kind"]
        if kind == "notat":
            rows = merge_wraps(read_notat(folder / spec["file"]), "notat")
            sections = split_notat(rows)
        elif kind == "retsinfo":
            sections = split_retsinfo(read_retsinfo(folder / spec["file"]))
        elif kind == "habitatvej":
            sections = split_habitatvej(read_habitatvej(folder / spec["file"]))
        elif kind == "kommission":
            sections = split_kommission(read_kommission(folder / spec["file"]))
        elif kind == "habitatdir":
            sections = split_habitatdir(read_habitatdir(folder / spec["file"]))
        elif kind == "forvaltningsplan":
            sections = split_forvaltningsplan(read_forvaltningsplan(folder / spec["file"]))
        elif kind == "ulv":
            sections = split_forvaltningsplan(read_ulv(folder / spec["file"]), loose=True)
        elif kind == "odder":
            sections = split_odder(read_odder(folder / spec["file"]))
        elif kind == "haandbog":
            paths = [folder / name for name in spec.get("files", [spec["file"]])]
            chapters = HAANDBOG_DEL2_CHAPTERS if spec.get("chapters") == "del2" else HAANDBOG_CHAPTERS
            sections = split_haandbog(haandbog_lines(paths), chapters)
        else:
            rows = merge_wraps(read_rows(folder / spec["file"], kind), kind)
            sections = split_wildlife(rows) if kind == "wildlife" else split_numbered(rows, kind)
        minimum = spec.get("min_chars", 80)
        for heading, section_rows in sections:
            for label, part in pack(heading, section_rows):
                text = "\n".join(line for line, _page in part).replace("\x00", "").strip()
                if len(text) < minimum:
                    continue
                title = f"{spec['short']} {label}"
                if len(title) > 140:
                    title = title[:137].rstrip() + "..."
                metadata = {
                    "date": spec["date"],
                    "page": page_label([page for _line, page in part]),
                    "authority": spec["authority"],
                    "journal": spec["journal"],
                }
                if spec["note"]:
                    metadata["later_changes"] = spec["note"]
                if spec.get("original_path"):
                    metadata["original_path"] = spec["original_path"]
                base = {
                    "title": title,
                    "citation": f"{spec['citation_base']}, {label}",
                    "law_section": label,
                    "content": text,
                    "source_type": spec.get("source_type", "vejledning"),
                    "scope": "begge",
                    "pdf_file_name": spec["pdf"],
                    "metadata": metadata,
                }
                for theme in spec["themes"]:
                    chunks.append({**base, "theme": theme})
    return chunks


def supabase_request(method: str, path: str, body: object | None = None, prefer: str = "") -> tuple[int, str]:
    data = None if body is None else json.dumps(body).encode()
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    request = urllib.request.Request(supabase_base() + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()


def embed(texts: list[str]) -> list[list[float]]:
    payload = json.dumps({"model": "text-embedding-3-small", "input": texts}).encode()
    request = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=payload,
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                data = json.loads(response.read().decode())
            ordered = sorted(data["data"], key=lambda item: item["index"])
            return [item["embedding"] for item in ordered]
        except urllib.error.HTTPError as error:
            detail = error.read().decode()[:300]
            if attempt == 3 or error.code < 500 and error.code != 429:
                raise RuntimeError(f"Embedding fejlede: {error.code} {detail}") from error
            time.sleep(2 ** attempt)
    raise RuntimeError("Embedding fejlede")


def upload(chunks: list[dict]) -> None:
    names = sorted({chunk["pdf_file_name"] for chunk in chunks})
    for name in names:
        status, body = supabase_request(
            "DELETE",
            "/rest/v1/legal_sources?pdf_file_name=eq." + urllib.parse.quote(name),
            prefer="return=minimal",
        )
        if status >= 300:
            raise RuntimeError(f"Kunne ikke rydde {name}: {status} {body[:400]}")
    inserted = 0
    batch_size = 16
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start : start + batch_size]
        vectors = embed([f"{item['title']}. {item['law_section']}. {item['content']}" for item in batch])
        rows = [{**item, "embedding": vector} for item, vector in zip(batch, vectors)]
        status, body = supabase_request("POST", "/rest/v1/legal_sources", rows, "return=minimal")
        if status >= 300:
            raise RuntimeError(f"Indsættelse fejlede ved {batch[0]['title']}: {status} {body[:500]}")
        inserted += len(rows)
        print(f"indsat {inserted}/{len(chunks)}", file=sys.stderr)
    print(json.dumps({"inserted": inserted}, ensure_ascii=False))


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else DEFAULT_DIR
    only = None
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only = {part.strip() for part in arg.split("=", 1)[1].split(",") if part.strip()}
    chunks = build(folder, only)
    summary: dict[str, dict[str, int]] = {}
    for chunk in chunks:
        slot = summary.setdefault(chunk["pdf_file_name"], {})
        theme = chunk["theme"] or "grundmappe"
        slot[theme] = slot.get(theme, 0) + 1
    lengths = [len(chunk["content"]) for chunk in chunks]
    print(json.dumps({
        "rows": len(chunks),
        "by_file": summary,
        "min": min(lengths) if lengths else 0,
        "max": max(lengths) if lengths else 0,
    }, ensure_ascii=False, indent=2))
    review = [
        {
            "pdf": chunk["pdf_file_name"],
            "section": chunk["law_section"],
            "chars": len(chunk["content"]),
            "page": chunk["metadata"].get("page", ""),
        }
        for chunk in chunks
    ]
    seen = set()
    unique = []
    for item in review:
        key = (item["pdf"], item["section"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    Path("/tmp/temavejledninger-review.json").write_text(json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8")
    if "--upload" in sys.argv:
        missing = [name for name in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY") if not os.environ.get(name)]
        if missing:
            raise SystemExit("Mangler " + ", ".join(missing))
        upload(chunks)


if __name__ == "__main__":
    main()
