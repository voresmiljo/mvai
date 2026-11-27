#!/usr/bin/env python3
"""Del grundmappens love, bekendtgørelse og vejledning i tekststykker.

Uden database-nøgler skrives kun en oversigt. Med SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY og OPENAI_API_KEY lægges stykkerne i legal_sources.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from pypdf import PdfReader

DEFAULT_DIR = Path("/home/ubuntu/.cursor/projects/workspace/uploads")

FOOTER = re.compile(r"^(LBK|BEK|VEJ|LOV)\s+nr\s+.+\s(\d+)\s*$")
SECTION = re.compile(r"^§\s*(\d+)(?:\s+([a-z]))?\.\s+\S")
ANNEX = re.compile(r"^Bilag\s+(\d+)\b\s*(.*)$")
AMENDMENT = re.compile(r"^Lov nr\.\s+\d+\b")
GUIDE_HEADING = re.compile(
    r"^(?:Afsnit\s+\d+:\s+.+|Bilag\s+\d+:\s+.+|\d+(?:\.\d+)+\.\s+\S.+)$"
)
TOC_PAGE = re.compile(r"\s\d{1,3}$")


def danish_date(raw: str) -> str:
    months = {
        "01": "januar",
        "02": "februar",
        "03": "marts",
        "04": "april",
        "05": "maj",
        "06": "juni",
        "07": "juli",
        "08": "august",
        "09": "september",
        "10": "oktober",
        "11": "november",
        "12": "december",
    }
    match = re.search(r"(\d{2})/(\d{2})/(\d{4})", raw)
    if not match:
        return raw
    day, month, year = match.groups()
    return f"{int(day)}. {months[month]} {year}"


def read_pages(path: Path) -> list[dict]:
    reader = PdfReader(str(path))
    pages = []
    for index, page in enumerate(reader.pages):
        raw = (page.extract_text() or "").replace("\u00ad", "").replace("\xa0", " ")
        printed = None
        kept = []
        for line in raw.splitlines():
            compact = " ".join(line.split())
            if not compact or compact.startswith("Udskriftsdato:"):
                continue
            footer = FOOTER.match(compact)
            if footer:
                printed = int(footer.group(2))
                continue
            kept.append(compact)
        pages.append({"pdf": index + 1, "printed": printed, "lines": kept})
    return pages


def lines_with_pages(pages: list[dict]) -> list[tuple[str, int]]:
    rows: list[tuple[str, int]] = []
    for page in pages:
        label = page["printed"] or page["pdf"]
        for line in page["lines"]:
            if rows and rows[-1][0].endswith("-") and re.match(r"^[a-zæøå]", line):
                previous, previous_page = rows[-1]
                rows[-1] = (previous[:-1] + line, previous_page)
            else:
                rows.append((line, label))
    return rows


def page_label(pages: list[int]) -> str:
    unique = []
    for page in pages:
        if page not in unique:
            unique.append(page)
    if not unique:
        return ""
    if len(unique) == 1:
        return str(unique[0])
    return f"{unique[0]}–{unique[-1]}"


def cover_facts(pages: list[dict]) -> dict:
    text = " ".join(pages[0]["lines"]) if pages else ""
    kind = ""
    number = ""
    match = re.search(r"(LBK|BEK|VEJ)\s+nr\s+(\d+)\s+af\s+(\d{2}/\d{2}/\d{4})", text)
    if match:
        kind, number, raw_date = match.groups()
    else:
        raw_date = ""
    journal = ""
    journal_match = re.search(r"j\.?\s*nr\.?\s*([^ ].{0,80})", text)
    if journal_match:
        journal = " ".join(journal_match.group(0).split())
    later = ""
    if "Senere ændringer" in text:
        later = text.split("Senere ændringer", 1)[1].strip(" :")
        later = " ".join(later.split())
    return {
        "kind": kind,
        "number": number,
        "date": danish_date(raw_date) if raw_date else "",
        "raw_date": raw_date,
        "journal": journal,
        "later": later[:300],
    }


def chunk_from_lines(
    title: str,
    citation: str,
    section: str,
    rows: list[tuple[str, int]],
    source_type: str,
    pdf_name: str,
    facts: dict,
    scope: str = "begge",
) -> dict:
    pages = [page for _, page in rows]
    text = "\n".join(line for line, _ in rows).strip()
    return {
        "title": title,
        "citation": citation,
        "law_section": section,
        "content": text,
        "source_type": source_type,
        "scope": scope,
        "theme": None,
        "pdf_file_name": pdf_name,
        "metadata": {
            "date": facts["date"],
            "page": page_label(pages),
            "authority": facts.get("authority", ""),
            "journal": facts["journal"],
            "later_changes": facts["later"],
        },
    }


def split_statute(rows: list[tuple[str, int]], spec: dict, facts: dict) -> list[dict]:
    chunks: list[dict] = []
    current_key = ""
    current_rows: list[tuple[str, int]] = []
    amendment_rows: list[tuple[str, int]] = []
    in_amendment = False
    seen_annex = False

    def flush_section() -> None:
        nonlocal current_key, current_rows
        if not current_key or not current_rows:
            current_key = ""
            current_rows = []
            return
        if current_key.startswith("bilag-"):
            number = current_key.split("-", 1)[1]
            section = f"Bilag {number}"
            title = f"{spec['short']} bilag {number}"
        else:
            section = f"§ {current_key}"
            title = f"{spec['short']} § {current_key}"
        citation = f"{spec['citation_base']}, {section[0].lower() + section[1:]}"
        chunks.append(
            chunk_from_lines(title, citation, section, current_rows, spec["source_type"], spec["pdf"], facts)
        )
        current_key = ""
        current_rows = []

    for line, page in rows:
        if in_amendment:
            if ANNEX.match(line):
                if amendment_rows:
                    chunks.append(
                        chunk_from_lines(
                            f"{spec['short']}, overgangsbestemmelser",
                            f"{spec['citation_base']}, overgangsbestemmelser",
                            "Overgangsbestemmelser",
                            amendment_rows,
                            spec["source_type"],
                            spec["pdf"],
                            facts,
                        )
                    )
                in_amendment = False
                amendment_rows = []
            else:
                amendment_rows.append((line, page))
                continue

        annex = ANNEX.match(line)
        section = SECTION.match(line)
        if annex or section:
            flush_section()
            if annex:
                seen_annex = True
                current_key = f"bilag-{annex.group(1)}"
            else:
                number, letter = section.group(1), section.group(2)
                current_key = f"{number} {letter}" if letter else number
            current_rows = [(line, page)]
            continue

        if current_key and not seen_annex and AMENDMENT.match(line):
            flush_section()
            in_amendment = True
            amendment_rows = [(line, page)]
            continue

        if current_key:
            current_rows.append((line, page))

    flush_section()
    if amendment_rows:
        chunks.append(
            chunk_from_lines(
                f"{spec['short']}, overgangsbestemmelser",
                f"{spec['citation_base']}, overgangsbestemmelser",
                "Overgangsbestemmelser",
                amendment_rows,
                spec["source_type"],
                spec["pdf"],
                facts,
            )
        )
    return explode_annex_articles([chunk for chunk in chunks if len(chunk["content"]) > 40])


def explode_annex_articles(chunks: list[dict]) -> list[dict]:
    result = []
    article = re.compile(r"^Artikel\s+(\d+)$")
    for chunk in chunks:
        lines = chunk["content"].split("\n")
        starts = [index for index, line in enumerate(lines) if article.match(line)]
        if len(starts) < 3:
            result.append(chunk)
            continue
        pieces: list[tuple[str | None, list[str]]] = []
        if starts[0] > 0:
            pieces.append((None, lines[: starts[0]]))
        for offset, start in enumerate(starts):
            end = starts[offset + 1] if offset + 1 < len(starts) else len(lines)
            number = article.match(lines[start]).group(1)
            pieces.append((number, lines[start:end]))
        for number, part in pieces:
            text = "\n".join(part).strip()
            if len(text) < 40:
                continue
            if number is None:
                title = chunk["title"] + ", indledning"
                section = chunk["law_section"]
                citation = chunk["citation"]
            else:
                title = f"{chunk['title']}, artikel {number}"
                section = f"{chunk['law_section']}, artikel {number}"
                citation = f"{chunk['citation']}, artikel {number}"
            result.append({
                **chunk,
                "title": title,
                "citation": citation,
                "law_section": section,
                "content": text,
            })
    return result


def split_guidance(rows: list[tuple[str, int]], spec: dict, facts: dict) -> list[dict]:
    body_start = None
    for index, (line, _) in enumerate(rows):
        if line.startswith("Afsnit 1:") and not TOC_PAGE.search(line):
            body_start = index
            break
    if body_start is None:
        raise RuntimeError("Fandt ikke vejledningens brødtekst")

    intro = []
    for line, page in rows[:body_start]:
        if line == "Indledning" or intro:
            if line.startswith("Afsnit 1:") and TOC_PAGE.search(line):
                break
            intro.append((line, page))

    chunks = []
    if intro:
        chunks.append(
            chunk_from_lines(
                spec["short"] + " indledning",
                f"{spec['citation_base']}, indledning",
                "Indledning",
                intro,
                spec["source_type"],
                spec["pdf"],
                facts,
            )
        )

    current_title = ""
    current_rows: list[tuple[str, int]] = []

    def flush() -> None:
        nonlocal current_title, current_rows
        if not current_title or not current_rows:
            current_title = ""
            current_rows = []
            return
        heading = current_title
        number = heading.split()[0].rstrip(":")
        if heading.startswith("Afsnit"):
            number = heading.split(":", 1)[0].replace("Afsnit ", "afsnit ")
            section = heading.split(":", 1)[0]
        elif heading.startswith("Bilag"):
            section = heading.split(":", 1)[0]
            number = section.lower()
        else:
            section = number
        label = heading
        if len(label) > 90:
            label = label[:87].rstrip() + "..."
        body = "\n".join(line for line, _ in current_rows[1:]).strip()
        if not body:
            current_title = ""
            current_rows = []
            return
        chunks.append(
            chunk_from_lines(
                f"{spec['short']} {label}",
                f"{spec['citation_base']}, {section}",
                section,
                current_rows,
                spec["source_type"],
                spec["pdf"],
                facts,
            )
        )
        current_title = ""
        current_rows = []

    for line, page in rows[body_start:]:
        if GUIDE_HEADING.match(line) and not TOC_PAGE.search(line):
            flush()
            current_title = line
            current_rows = [(line, page)]
        elif current_title:
            current_rows.append((line, page))
    flush()
    return [chunk for chunk in chunks if len(chunk["content"]) > 40]


ARTICLE_LINE = re.compile(r"^Artikel\s+(\d+)$")
ANNEX_LINE = re.compile(r"^BILAG\s+([IVX]+)$")
OJ_HEADER = re.compile(
    r"^(?:DA\s+.*Tidende|\d{1,2}\.\d{1,2}\.\d{4}\s+L\s+\d+/\d+\s+Den Europæiske Unions Tidende)"
)
OJ_PAGE = re.compile(r"L\s+\d+/(\d+)")


def directive_lines(path: Path) -> list[tuple[str, int]]:
    reader = PdfReader(str(path))
    rows: list[tuple[str, int]] = []
    printed = None
    pending: tuple[str, int] | None = None
    for index, page in enumerate(reader.pages):
        raw = (page.extract_text() or "").replace("\xa0", " ")
        lines = [" ".join(line.split()) for line in raw.splitlines()]
        lines = [line for line in lines if line]
        for line in lines:
            if OJ_HEADER.match(line):
                match = OJ_PAGE.search(line)
                if match:
                    printed = int(match.group(1))
        label = printed or (index + 1)
        for compact in lines:
            if OJ_HEADER.match(compact):
                continue
            if pending:
                previous, previous_page = pending
                pending = None
                word = previous.rstrip("\u00ad").rstrip("-").rstrip()
                if re.match(r"^[a-zæøå]", compact):
                    compact = word + compact
                else:
                    rows.append((word.replace("\u00ad", ""), previous_page))
            if compact.endswith("\u00ad") or compact.endswith("-"):
                pending = (compact, label)
                continue
            rows.append((compact.replace("\u00ad", ""), label))
    if pending:
        word, previous_page = pending
        rows.append((word.replace("\u00ad", "").rstrip("-").rstrip(), previous_page))
    return rows


def split_directive(rows: list[tuple[str, int]], spec: dict, facts: dict) -> list[dict]:
    cuts = [index for index, (line, _) in enumerate(rows) if ARTICLE_LINE.match(line) or ANNEX_LINE.match(line)]
    if len(cuts) < 3:
        raise RuntimeError(f"Fandt for få artikler i {spec['file']}")
    chunks: list[dict] = []

    def emit(section: str, title: str, citation: str, part: list[tuple[str, int]]) -> None:
        text = "\n".join(line for line, _ in part).strip()
        if len(text) < 40:
            return
        chunks.append(
            chunk_from_lines(
                title,
                citation,
                section,
                part,
                spec["source_type"],
                spec["pdf"],
                facts,
                spec["scope"],
            )
        )

    if cuts[0] > 0:
        emit(
            "Betragtninger",
            f"{spec['short']} betragtninger",
            f"{spec['citation_base']}, betragtninger",
            rows[: cuts[0]],
        )
    for offset, start in enumerate(cuts):
        end = cuts[offset + 1] if offset + 1 < len(cuts) else len(rows)
        line = rows[start][0]
        article = ARTICLE_LINE.match(line)
        annex = ANNEX_LINE.match(line)
        if article:
            number = article.group(1)
            emit(
                f"Artikel {number}",
                f"{spec['short']} artikel {number}",
                f"{spec['citation_base']}, artikel {number}",
                rows[start:end],
            )
        else:
            number = annex.group(1)
            emit(
                f"Bilag {number}",
                f"{spec['short']} bilag {number}",
                f"{spec['citation_base']}, bilag {number}",
                rows[start:end],
            )
    return chunks


AMENDMENT_POINT = re.compile(r"^(\d+)\)\s+\S")
RECITAL = re.compile(r"^\((\d+)\)\s+\S")


def split_amending_directive(rows: list[tuple[str, int]], spec: dict, facts: dict) -> list[dict]:
    start = next(
        (index for index, (line, _) in enumerate(rows) if line.startswith(spec["start_line"])),
        None,
    )
    if start is None:
        raise RuntimeError(f"Fandt ikke direktivteksten i {spec['file']}")
    end = next(
        (index for index, (line, _) in enumerate(rows) if index > start and line == spec["stop_line"]),
        len(rows),
    )
    rows = rows[start:end]
    article_at = [index for index, (line, _) in enumerate(rows) if ARTICLE_LINE.match(line)]
    if not article_at:
        raise RuntimeError(f"Fandt ingen artikler i {spec['file']}")
    annex_at = next((index for index, (line, _) in enumerate(rows) if line == "BILAG"), None)
    chunks: list[dict] = []

    def emit(section: str, title: str, part: list[tuple[str, int]]) -> None:
        text = "\n".join(line for line, _ in part).strip()
        if len(text) < 40:
            return
        chunks.append(
            chunk_from_lines(
                title,
                f"{spec['citation_base']}, {section[0].lower() + section[1:]}",
                section,
                part,
                spec["source_type"],
                spec["pdf"],
                facts,
                spec["scope"],
            )
        )

    preamble = rows[: article_at[0]]
    recital_starts: list[int] = []
    last_recital = 0
    for index, (line, _) in enumerate(preamble):
        match = RECITAL.match(line)
        if not match or int(match.group(1)) != last_recital + 1:
            continue
        following = next(
            (
                later
                for later in range(index + 1, len(preamble))
                if RECITAL.match(preamble[later][0])
            ),
            len(preamble),
        )
        span = " ".join(item for item, _ in preamble[index:following])
        if len(span) < 350 and ("EUT" in span or "EFT" in span):
            continue
        recital_starts.append(index)
        last_recital = int(match.group(1))
    if not recital_starts:
        emit("Betragtninger", f"{spec['short']} betragtninger", preamble)
    else:
        if recital_starts[0] > 0:
            emit(
                "Indledning",
                f"{spec['short']} indledning",
                preamble[: recital_starts[0]],
            )
        for offset, recital_start in enumerate(recital_starts):
            recital_end = recital_starts[offset + 1] if offset + 1 < len(recital_starts) else len(preamble)
            number = offset + 1
            emit(
                f"Betragtning {number}",
                f"{spec['short']} betragtning {number}",
                preamble[recital_start:recital_end],
            )
    body_end = annex_at if annex_at is not None else len(rows)
    points = [
        index
        for index, (line, _) in enumerate(rows)
        if article_at[0] < index < body_end and AMENDMENT_POINT.match(line)
    ]
    first_later_article = next((index for index in article_at[1:] if index < body_end), body_end)
    points = [index for index in points if index < first_later_article]
    if points:
        for offset, point_start in enumerate(points):
            point_end = points[offset + 1] if offset + 1 < len(points) else first_later_article
            number = AMENDMENT_POINT.match(rows[point_start][0]).group(1)
            emit(
                f"Artikel 1, nr. {number}",
                f"{spec['short']} artikel 1, nr. {number}",
                rows[point_start:point_end],
            )
    for offset, index in enumerate(article for article in article_at if article >= first_later_article and article < body_end):
        number = ARTICLE_LINE.match(rows[index][0]).group(1)
        following = [item for item in article_at if item > index and item < body_end]
        stop = following[0] if following else body_end
        emit(
            f"Artikel {number}",
            f"{spec['short']} artikel {number}",
            rows[index:stop],
        )
    if annex_at is not None:
        annex_rows = rows[annex_at:]
        cuts = [0]
        for index, (line, _) in enumerate(annex_rows):
            if index > 0 and (line.startswith("»BILAG ") or line == "BILAG IV"):
                cuts.append(index)
        for offset, cut in enumerate(cuts):
            stop = cuts[offset + 1] if offset + 1 < len(cuts) else len(annex_rows)
            heading = annex_rows[cut][0]
            if heading.startswith("»BILAG "):
                name = heading.removeprefix("»").split()[0] + " " + heading.removeprefix("»").split()[1]
                name = name.replace("BILAG", "Bilag")
            elif heading == "BILAG IV":
                name = "Bilag IV"
            else:
                name = "Bilag"
            emit(name, f"{spec['short']} {name[0].lower() + name[1:]}", annex_rows[cut:stop])
    return chunks


DOCUMENTS = [
    {
        "file": "Lov_om_milj_vurdering_c17a.pdf",
        "pdf": "miljoevurderingsloven-lbk-4-2023.pdf",
        "short": "Miljøvurderingsloven",
        "citation_base": "Lovbekendtgørelse nr. 4 af 3. januar 2023",
        "source_type": "lov",
        "authority": "Ministeriet for Natur og Dyrevelfærd",
        "kind": "statute",
    },
    {
        "file": "Milj_oplysningsloven_3b9c.pdf",
        "pdf": "miljoeoplysningsloven-lbk-980-2017.pdf",
        "short": "Miljøoplysningsloven",
        "citation_base": "Lovbekendtgørelse nr. 980 af 16. august 2017",
        "source_type": "lov",
        "authority": "Miljø- og Ligestillingsministeriet",
        "kind": "statute",
    },
    {
        "file": "Forvaltningsloven_1fdd.pdf",
        "pdf": "forvaltningsloven-lbk-433-2014.pdf",
        "short": "Forvaltningsloven",
        "citation_base": "Lovbekendtgørelse nr. 433 af 22. april 2014",
        "source_type": "lov",
        "authority": "Justitsministeriet",
        "kind": "statute",
    },
    {
        "file": "Bekendtg_relse_om_milj_vurdering_350d.pdf",
        "pdf": "miljoevurderingsbekendtgoerelsen-bek-1608-2024.pdf",
        "short": "Miljøvurderingsbekendtgørelsen",
        "citation_base": "Bekendtgørelse nr. 1608 af 9. december 2024",
        "source_type": "bekendtgoerelse",
        "authority": "Ministeriet for Natur og Dyrevelfærd",
        "kind": "statute",
    },
    {
        "file": "Vejledning_til_lov_om_milj_vurdering_2ce8.pdf",
        "pdf": "vejledning-9094-2024-planer-og-programmer.pdf",
        "short": "Vejledning om miljøvurdering af planer",
        "citation_base": "Vejledning nr. 9094 af 21. februar 2024",
        "source_type": "vejledning",
        "authority": "Ministeriet for Natur og Dyrevelfærd",
        "kind": "guidance",
    },
    {
        "file": "EU_VVM-direktivet_5c83.pdf",
        "pdf": "vvm-direktiv-2011-92-eu.pdf",
        "short": "VVM-direktivet",
        "citation_base": "Europa-Parlamentets og Rådets direktiv 2011/92/EU af 13. december 2011",
        "source_type": "direktiv",
        "authority": "Europa-Parlamentet og Rådet",
        "kind": "directive",
        "scope": "projekt",
        "date": "13. december 2011",
        "journal": "EUT L 26 af 28. januar 2012",
        "later": "Filen er kodifikationen 2011/92/EU. Ændringsdirektiv 2014/52/EU indgår ikke i teksten.",
    },
    {
        "file": "SMV_EU_direktivet_374c.pdf",
        "pdf": "smv-direktiv-2001-42-ef.pdf",
        "short": "SMV-direktivet",
        "citation_base": "Europa-Parlamentets og Rådets direktiv 2001/42/EF af 27. juni 2001",
        "source_type": "direktiv",
        "authority": "Europa-Parlamentet og Rådet",
        "kind": "directive",
        "scope": "plan",
        "date": "27. juni 2001",
        "journal": "EFT L 197 af 21. juli 2001",
        "later": "",
    },
    {
        "file": "EU_VVM__ndringsdirektiv_a273.pdf",
        "pdf": "vvm-aendringsdirektiv-2014-52-eu.pdf",
        "short": "VVM-ændringsdirektivet",
        "citation_base": "Europa-Parlamentets og Rådets direktiv 2014/52/EU af 16. april 2014",
        "source_type": "direktiv",
        "authority": "Europa-Parlamentet og Rådet",
        "kind": "amending",
        "scope": "projekt",
        "date": "16. april 2014",
        "journal": "EUT L 124 af 25. april 2014",
        "later": "Ændrer direktiv 2011/92/EU. Tidende L 124 indeholder også andre retsakter, som ikke er taget med.",
        "start_line": "EUROPA-PARLAMENTETS OG RÅDETS DIREKTIV 2014/52/EU",
        "stop_line": "II",
    },
]


def build(folder: Path) -> list[dict]:
    chunks: list[dict] = []
    for spec in DOCUMENTS:
        path = folder / spec["file"]
        pages = read_pages(path)
        facts = cover_facts(pages)
        facts["authority"] = spec["authority"]
        if spec["kind"] in ("directive", "amending"):
            facts = {
                "date": spec["date"],
                "journal": spec["journal"],
                "later": spec.get("later", ""),
                "authority": spec["authority"],
            }
            rows = directive_lines(path)
            if spec["kind"] == "amending":
                part = split_amending_directive(rows, spec, facts)
            else:
                part = split_directive(rows, spec, facts)
        else:
            rows = lines_with_pages(pages)
            if spec["kind"] == "guidance":
                part = split_guidance(rows, spec, facts)
            else:
                part = split_statute(rows, spec, facts)
        chunks.extend(part)
    return chunks


def supabase_base() -> str:
    raw = os.environ["SUPABASE_URL"].strip().rstrip("/")
    if raw.startswith("https://") or raw.startswith("http://"):
        return raw
    return f"https://{raw}.supabase.co"


def supabase_request(method: str, path: str, body: object | None = None, prefer: str = "") -> tuple[int, str]:
    url = supabase_base() + path
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    data = None if body is None else json.dumps(body).encode()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()


def embed(texts: list[str]) -> list[list[float]]:
    key = os.environ["OPENAI_API_KEY"]
    payload = json.dumps({"model": "text-embedding-3-small", "input": texts}).encode()
    request = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        data = json.loads(response.read().decode())
    ordered = sorted(data["data"], key=lambda item: item["index"])
    return [item["embedding"] for item in ordered]


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

    batch_size = 16
    inserted = 0
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start : start + batch_size]
        vectors = embed([f"{item['title']}. {item['law_section']}. {item['content']}" for item in batch])
        rows = []
        for item, vector in zip(batch, vectors):
            rows.append({**item, "embedding": vector})
        status, body = supabase_request("POST", "/rest/v1/legal_sources", rows, "return=minimal")
        if status >= 300:
            raise RuntimeError(f"Indsættelse fejlede ved {batch[0]['title']}: {status} {body[:500]}")
        inserted += len(rows)
        print(f"indsat {inserted}/{len(chunks)}", file=sys.stderr)
    print(json.dumps({"inserted": inserted}, ensure_ascii=False))


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else DEFAULT_DIR
    do_upload = "--upload" in sys.argv
    only: set[str] = set()
    for arg in sys.argv:
        if arg.startswith("--only="):
            only.update(part for part in arg.split("=", 1)[1].split(",") if part)
    chunks = build(folder)
    if only:
        chunks = [chunk for chunk in chunks if chunk["pdf_file_name"] in only]
    by_file: dict[str, int] = {}
    for chunk in chunks:
        by_file[chunk["pdf_file_name"]] = by_file.get(chunk["pdf_file_name"], 0) + 1
    print(json.dumps({"chunks": len(chunks), "by_file": by_file}, ensure_ascii=False, indent=2))
    review = Path("/tmp/grundmappe-review.json")
    review.write_text(
        json.dumps(
            [
                {
                    "title": chunk["title"],
                    "citation": chunk["citation"],
                    "law_section": chunk["law_section"],
                    "page": chunk["metadata"]["page"],
                    "chars": len(chunk["content"]),
                    "start": chunk["content"][:180],
                }
                for chunk in chunks
            ],
            ensure_ascii=False,
            indent=2,
        )
    )
    if do_upload:
        missing = [name for name in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY") if not os.environ.get(name)]
        if missing:
            raise SystemExit("Mangler " + ", ".join(missing))
        upload(chunks)


if __name__ == "__main__":
    main()
