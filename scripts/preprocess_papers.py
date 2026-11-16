#!/usr/bin/env python3
"""
preprocess_papers.py — Transform the raw XUQ data into a clean JSON for the website.

Reads:
  - data/df_struc_copy.csv   (53 papers × 99 binary-flag columns)
  - data/included_papers.bib (bibliographic metadata, keyed by paperID)

Writes:
  - site/src/data/papers.json (one object per paper, grouped by taxonomy category)

The CSV is one-hot encoded; this script converts the flags into readable lists of
category labels (e.g. uncertainty_type: ["predictive", "epistemic"]) and merges in
the bibliographic fields (title, authors, year, doi, venue) from the BibTeX.
"""

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "df_struc_copy.csv"
BIB_PATH = ROOT / "data" / "included_papers.bib"
OUT_PATH = ROOT / "site" / "src" / "data" / "papers.json"


# ---------------------------------------------------------------------------
# BibTeX parsing (lightweight, sufficient for this file)
# ---------------------------------------------------------------------------
def parse_bibtex(text: str) -> dict[str, dict]:
    """Parse a BibTeX file into {paperID: {field: value}}.

    Keys are normalized to the bare numeric ID (e.g. 'ID43' -> '43') so they
    match the CSV's `Paper ID` column.
    """
    entries: dict[str, dict] = {}
    # Find each @type{key, ...} block, matching braces properly.
    entry_pattern = re.compile(r"@(\w+)\s*\{\s*([^,]+),")
    pos = 0
    for m in entry_pattern.finditer(text):
        entry_type = m.group(1)
        key = m.group(2).strip()
        # Find the matching closing brace for this entry.
        start = m.end()
        depth = 1
        i = start
        while i < len(text) and depth > 0:
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
            i += 1
        body = text[start : i - 1]

        fields: dict[str, str] = {"_type": entry_type}
        # Match field = {value} or field = "value", handling nested braces.
        field_pattern = re.compile(r"(\w+)\s*=\s*([{\"])")
        for fm in field_pattern.finditer(body):
            name = fm.group(1).lower()
            quote = fm.group(2)
            value_start = fm.end()
            if quote == "{":
                # Brace-matched value.
                depth = 1
                j = value_start
                while j < len(body) and depth > 0:
                    if body[j] == "{":
                        depth += 1
                    elif body[j] == "}":
                        depth -= 1
                    j += 1
                value = body[value_start : j - 1]
            else:
                # Quoted value: up to the next unescaped quote.
                j = body.find('"', value_start)
                value = body[value_start:j] if j != -1 else body[value_start:]
            fields[name] = value.strip()
        # paperID is the join key; normalize 'ID43' -> '43'
        pid = normalize_paper_id(fields.get("paperid") or key)
        entries[pid] = fields
    return entries


def normalize_paper_id(raw: str) -> str:
    """Normalize a paper identifier to the bare numeric ID used by the CSV.

    Handles several formats seen in the BibTeX:
      - 'ID43'                  -> '43'
      - 'ID2_antoran_getting_2020' -> '2'   (key with a descriptive suffix)
      - 'ID51_mu_explainable_nodate' -> '51'
      - '43'                    -> '43'
      - 'ID'                    -> ''      (no number; caller keeps raw)

    Strategy: prefer an explicit `paperID` field (already passed in), otherwise
    extract the first run of digits from the bib key. If no digits are found,
    fall back to the raw value so the entry is still keyed (and simply won't
    match a CSV row).
    """
    raw = (raw or "").strip()
    if not raw:
        return raw
    # If it's already a bare number, keep it.
    if raw.isdigit():
        return raw
    # Extract the first contiguous run of digits (e.g. 'ID2_antoran...' -> '2').
    m = re.search(r"\d+", raw)
    if m:
        return m.group(0)
    return raw


def fix_mojibake(value: str) -> str:
    """Fix UTF-8 bytes that were mis-decoded as Latin-1 or CP1252.

    Examples:
      'JosÃ©'  -> 'José'   (UTF-8 decoded as Latin-1)
      'â€™'    -> '\u2019' (UTF-8 decoded as CP1252)
      'Â©'     -> '©'      (UTF-8 decoded as Latin-1)
    """
    if not value or not any(ord(c) > 127 for c in value):
        return value

    # Try re-encoding the whole string as Latin-1 and decoding as UTF-8.
    # This works when the string is entirely mojibake.
    try:
        return value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass

    # Mixed content: fix known mojibake sequences with targeted replacements.
    replacements = {
        # CP1252 mis-decode of UTF-8 punctuation
        "â€™": "\u2019",  # '
        "â€˜": "\u2018",  # '
        "â€œ": "\u201c",  # "
        "â€\x9d": "\u201d",  # "
        "â€\x9c": "\u201c",
        "â€\x9e": "\u201e",
        "â€¦": "\u2026",  # …
        "â€“": "\u2013",  # –
        "â€”": "\u2014",  # —
        # Latin-1 mis-decode of UTF-8
        "Â©": "\u00a9",  # ©
        "Â°": "\u00b0",  # °
        "Â±": "\u00b1",  # ±
        "Ã©": "\u00e9",  # é
        "Ã¨": "\u00e8",  # è
        "Ã¶": "\u00f6",  # ö
        "Ã¼": "\u00fc",  # ü
        "Ã¤": "\u00e4",  # ä
        "Ã¡": "\u00e1",  # á
        "Ã­": "\u00ed",  # í
        "Ã³": "\u00f3",  # ó
        "Ã±": "\u00f1",  # ñ
        "Ã§": "\u00e7",  # ç
        "Ã¼": "\u00fc",  # ü
        "Ã¶": "\u00f6",  # ö
        "Ã¤": "\u00e4",  # ä
        "Ã¥": "\u00e5",  # å
        "Ã¸": "\u00f8",  # ø
        "Ã¦": "\u00e6",  # æ
        "Ã": "\u00c3",  # Ã (fallback, unlikely)
        # Greek letters (Latin-1 mis-decode)
        "Î±": "\u03b1",  # α
        "Î²": "\u03b2",  # β
        "Î³": "\u03b3",  # γ
        "Î»": "\u03bb",  # λ
        "Î¼": "\u03bc",  # μ
        "âˆ’": "\u2212",  # − (minus)
        "âˆš": "\u221a",  # √
        "âˆž": "\u221e",  # ∞
    }
    for bad, good in replacements.items():
        value = value.replace(bad, good)
    return value


# LaTeX accent commands -> Unicode. Keys are the command name (without backslash)
# concatenated with the base letter (no space), e.g. "'e" for {\'e}, '"o' for {\"o}.
# Covers the accents seen in the bibliography.
LATEX_ACCENTS = {
    # acute
    "'a": "á", "'e": "é", "'i": "í", "'o": "ó", "'u": "ú", "'y": "ý",
    "'A": "Á", "'E": "É", "'I": "Í", "'O": "Ó", "'U": "Ú", "'Y": "Ý",
    # grave
    "`a": "à", "`e": "è", "`i": "ì", "`o": "ò", "`u": "ù",
    "`A": "À", "`E": "È", "`I": "Ì", "`O": "Ò", "`U": "Ù",
    # circumflex
    "^a": "â", "^e": "ê", "^i": "î", "^o": "ô", "^u": "û",
    "^A": "Â", "^E": "Ê", "^I": "Î", "^O": "Ô", "^U": "Û",
    # tilde
    "~a": "ã", "~n": "ñ", "~o": "õ", "~u": "ũ",
    "~A": "Ã", "~N": "Ñ", "~O": "Õ",
    # diaeresis / umlaut
    '"a': "ä", '"e': "ë", '"i': "ï", '"o': "ö", '"u': "ü", '"y': "ÿ",
    '"A': "Ä", '"E': "Ë", '"I': "Ï", '"O': "Ö", '"U': "Ü",
    # cedilla
    "cc": "ç", "cC": "Ç",
    # caron / hacek
    "vs": "š", "vz": "ž", "vc": "č", "vr": "ř", "vd": "ď", "vt": "ť", "vn": "ň",
    "vS": "Š", "vZ": "Ž", "vC": "Č", "vR": "Ř", "vD": "Ď", "vT": "Ť", "vN": "Ň",
    # ring
    "ra": "å", "rA": "Å",
    # ogonek
    "ka": "ą", "ke": "ę", "kA": "Ą", "kE": "Ę",
    # special letters (standalone commands, no base letter)
    "o": "ø", "O": "Ø", "l": "ł", "L": "Ł",
    "i": "ı", "j": "ȷ",
    "aa": "å", "AA": "Å",
}


def fix_latex_accents(value: str) -> str:
    """Convert LaTeX accent commands (e.g. {\\'e}, {\\"o}) to Unicode.

    Handles the forms `{\\X c}` and `\\X c` (with or without surrounding braces),
    where X is the accent command (a punctuation char like `'`, `"`, `^`, `~`,
    or a letter like `c`, `v`, `r`, `k`) and c is the base letter. Must run
    BEFORE braces are stripped so the command is still intact.
    """
    if not value or "\\" not in value:
        return value

    # Accent command: a punctuation accent (' " ^ ~ `) OR a letter command (c v r k o l i j ...).
    # Match {\'e}, {\"o}, {\c c}, {\v s}, etc. — command + optional space + letter.
    pattern = re.compile(r"\{\\(['\"^~`]|[a-zA-Z]+)\s*([a-zA-Z])\}")
    value = pattern.sub(
        lambda m: LATEX_ACCENTS.get(f"{m.group(1)}{m.group(2)}", m.group(2)), value
    )

    # Also handle the bare form \'e (no braces) for robustness.
    pattern2 = re.compile(r"\\(['\"^~`]|[a-zA-Z]+)\s*([a-zA-Z])")
    value = pattern2.sub(
        lambda m: LATEX_ACCENTS.get(f"{m.group(1)}{m.group(2)}", m.group(2)), value
    )

    return value


def clean_bib_value(value: str) -> str:
    """Strip LaTeX braces and common escapes from a BibTeX value."""
    if not value:
        return value
    value = fix_latex_accents(value)
    value = value.replace("{", "").replace("}", "")
    value = value.replace("\\&", "&").replace("\\%", "%").replace("\\_", "_")
    value = value.replace("--", "–")
    value = fix_mojibake(value)
    return value.strip()


def parse_authors(author_field: str) -> list[str]:
    """Parse a BibTeX author list into a list of 'First Last' names."""
    if not author_field:
        return []
    names = []
    for part in author_field.split(" and "):
        part = clean_bib_value(part).strip()
        if not part:
            continue
        if "," in part:
            last, first = part.split(",", 1)
            names.append(f"{first.strip()} {last.strip()}")
        else:
            names.append(part)
    return names


# ---------------------------------------------------------------------------
# CSV → structured paper
# ---------------------------------------------------------------------------
def group_columns(header: list[str]) -> dict[str, list[tuple[str, str]]]:
    """Group column names by their category prefix (e.g. 'uncertainty_type')."""
    groups: dict[str, list[tuple[str, str]]] = {}
    for col in header:
        if "." in col:
            prefix, label = col.split(".", 1)
            groups.setdefault(prefix, []).append((col, label))
    return groups


def collect_true(columns: list[tuple[str, str]], row: dict[str, str]) -> list[str]:
    """Return the labels of columns whose value is truthy (1)."""
    return [label for col, label in columns if row.get(col, "").strip() not in ("", "0")]


# Map the fine-grained CSV UQ methods to the paper's taxonomy categories.
DICT_UQ_METHODS = {
    "Ensemble / Stochastic Methods": ["MC Dropout", "Deep Ensembles", "Random Forest / Tree-based", "stochastic"],
    "Probabilistic / Bayesian Methods": ["Bayesian NN (BNN)", "Gaussian Process", "Variance_neuron", "probabilistic", "Evidential Deep Learning"],
    "Softmax-based Methods": ["Entropy / Softmax-based", "output"],
    "Distribution-free Methods": ["Conformal Prediction", "Quantile Regression"],
    "Representation / Distance-based Methods": ["Prototype / Distance-based", "Variational Autoencoder (VAE)"],
    "Other": ["Other/Unspecified", "Fuzzy Logic / Systems"],
}


def map_uq_methods(fine_grained: list[str]) -> list[str]:
    """Map fine-grained CSV UQ methods to the paper's taxonomy categories."""
    mapped: list[str] = []
    for category, members in DICT_UQ_METHODS.items():
        if any(m in fine_grained for m in members):
            mapped.append(category)
    return mapped


def build_paper(row: dict[str, str], groups: dict[str, list[tuple[str, str]]]) -> dict:
    """Convert one CSV row into a structured paper object."""
    paper_id = re.sub(r"^ID", "", row.get("Paper ID", "").strip())

    # General
    year = row.get("year", "").strip()
    general_type = collect_true(groups.get("general_type", []), row)
    application_domain = collect_true(groups.get("application_domain", []), row)
    data_modality = collect_true(groups.get("data_modality", []), row)
    ml_problem_class = collect_true(groups.get("ml_problem_class", []), row)
    audience = collect_true(groups.get("audience", []), row)

    # XUQ methods
    uncertainty_type = collect_true(groups.get("uncertainty_type", []), row)
    uq_method = map_uq_methods(collect_true(groups.get("uq_method_category", []), row))
    uncertainty_estimate = collect_true(groups.get("uncertainty_estimate", []), row)
    integration_type = collect_true(groups.get("integration_type", []), row)
    portability = collect_true(groups.get("portability", []), row)
    locality = collect_true(groups.get("locality", []), row)
    explanation_output_type = collect_true(groups.get("explanation_output_type", []), row)

    # XUQ evaluation
    evaluated = collect_true(groups.get("evaluated", []), row)
    evaluation_type = collect_true(groups.get("evaluation_type", []), row)
    co12 = collect_true(groups.get("Co-12", []), row)
    benchmarked = collect_true(groups.get("benchmarked", []), row)
    shap = collect_true(groups.get("SHAP", []), row)

    return {
        "id": paper_id,
        "year": int(year) if year.isdigit() else None,
        "general": {
            "research_type": general_type,
            "application_domain": application_domain,
            "data_modality": data_modality,
            "ml_task": ml_problem_class,
            "audience": audience,
        },
        "xuq_method": {
            "uncertainty_type": uncertainty_type,
            "uq_method": uq_method,
            "uncertainty_estimate": uncertainty_estimate,
            "integration_type": integration_type,
            "portability": portability,
            "locality": locality,
            "explanation_output_type": explanation_output_type,
        },
        "xuq_evaluation": {
            "evaluated": evaluated,
            "evaluation_type": evaluation_type,
            "co12": co12,
            "benchmarked": benchmarked,
            "shap": shap,
        },
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    # Read CSV
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        header = reader.fieldnames or []
        rows = list(reader)

    groups = group_columns(header)

    # Read BibTeX
    bib_entries = parse_bibtex(BIB_PATH.read_text(encoding="utf-8"))

    papers = []
    for row in rows:
        paper = build_paper(row, groups)
        pid = paper["id"]

        bib = bib_entries.get(pid, {})
        paper["title"] = clean_bib_value(bib.get("title", ""))
        paper["authors"] = parse_authors(bib.get("author", ""))
        paper["doi"] = clean_bib_value(bib.get("doi", ""))
        paper["url"] = clean_bib_value(bib.get("url", ""))
        # Venue: journal for articles, booktitle for inproceedings
        venue = bib.get("journal") or bib.get("booktitle") or ""
        paper["venue"] = clean_bib_value(venue)
        paper["abstract"] = clean_bib_value(bib.get("abstract", ""))

        papers.append(paper)

    # Sort by year then id for stable output
    papers.sort(key=lambda p: (p["year"] or 0, p["id"]))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(papers, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(papers)} papers to {OUT_PATH}")


if __name__ == "__main__":
    main()