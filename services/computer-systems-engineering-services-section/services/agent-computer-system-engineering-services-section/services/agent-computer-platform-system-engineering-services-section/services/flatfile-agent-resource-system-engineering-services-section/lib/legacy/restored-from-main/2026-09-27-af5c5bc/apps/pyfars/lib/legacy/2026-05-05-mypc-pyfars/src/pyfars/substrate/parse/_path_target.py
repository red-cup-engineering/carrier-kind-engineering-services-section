"""Path-aware reference resolution.

A reference (markdown link target or frontmatter relation value) names
a record by some *suffix* of that record's substrate-relative path.
The bare slug is the shortest such suffix; longer suffixes (more path
context) disambiguate when multiple records share a tail.

This is the substrate's namespacing model: path is the namespace, the
slug is just the path tail, tails are not required to be unique, and
disambiguation is the writer's job — they lengthen the reference until
exactly one record matches.

``target_components`` parses a reference into its component list (e.g.
``"../personnel/cassia-lorne.md"`` → ``["personnel", "cassia-lorne"]``).
``record_components`` does the same for a record's substrate path.
A reference matches a record when the record's tail components, taken
to the length of the reference, equal the reference components.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable


def target_components(target: str, *, require_md: bool = False) -> list[str] | None:
    s = target.split("#", 1)[0].split("?", 1)[0].strip()
    if not s:
        return None
    has_md = s.endswith(".md")
    is_dir_link = (not has_md) and s.endswith("/")
    if require_md and not (has_md or is_dir_link):
        return None
    parts = [p for p in s.split("/") if p and p not in (".", "..")]
    if not parts:
        return None
    if is_dir_link:
        # Directory link → that section's _index.md.
        return parts + ["_index"]
    last = parts[-1]
    stem = last[:-3] if last.endswith(".md") else last
    if stem == "README":
        return None
    return parts[:-1] + [stem] if stem else None


def record_components(path: Path | str) -> list[str]:
    p = str(path)
    if p.endswith(".md"):
        p = p[:-3]
    return [x for x in p.split("/") if x]


def matches(target: list[str], record: list[str]) -> bool:
    n = len(target)
    return n > 0 and len(record) >= n and record[-n:] == target


def resolve(target: list[str], records: Iterable[tuple[list[str], object]]) -> list[object]:
    return [r for comps, r in records if matches(target, comps)]
