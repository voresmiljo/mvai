#!/usr/bin/env python3
"""Læg tre temavejledninger i de mapper, de er tildelt.

Hvert afsnit lægges i hver af dokumentets mapper, så det kan findes, når
mappen er slået til. Scope er begge. Ordlyden følger filen.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

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


def is_heading(line: str, kind: str) -> bool:
    if kind == "wildlife":
        return bool(re.fullmatch(r"Section\s+\d+(?:\.\d+)?", line))
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
    if len(unique) == 1 or unique[0] == unique[-1]:
        return str(unique[0])
    return f"{unique[0]}–{unique[-1]}"


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
        if len(text) < 180:
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


def build(folder: Path) -> list[dict]:
    chunks: list[dict] = []
    for spec in DOCUMENTS:
        rows = merge_wraps(read_rows(folder / spec["file"], spec["kind"]), spec["kind"])
        sections = split_wildlife(rows) if spec["kind"] == "wildlife" else split_numbered(rows, spec["kind"])
        for heading, section_rows in sections:
            for label, part in pack(heading, section_rows):
                text = "\n".join(line for line, _page in part).strip()
                if len(text) < 80:
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
                base = {
                    "title": title,
                    "citation": f"{spec['citation_base']}, {label}",
                    "law_section": label,
                    "content": text,
                    "source_type": "vejledning",
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
    chunks = build(folder)
    summary: dict[str, dict[str, int]] = {}
    for chunk in chunks:
        slot = summary.setdefault(chunk["pdf_file_name"], {})
        slot[chunk["theme"]] = slot.get(chunk["theme"], 0) + 1
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
