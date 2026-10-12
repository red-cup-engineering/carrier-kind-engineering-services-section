"""Rewrite a body markdown link from one target to another.

Replaces ``[text](old_target_raw)`` with ``[text](new_target_raw)`` —
literal text replacement on the exact target path the original link
declared. Doesn't try to be clever about path-resolution: the caller
hands in the new target path string verbatim.
"""

from __future__ import annotations

from pathlib import Path


def render(text: str, old_target_raw: str, new_target_raw: str) -> tuple[str, int]:
    needle = f"]({old_target_raw})"
    count = text.count(needle)
    if count == 0:
        return text, 0
    return text.replace(needle, f"]({new_target_raw})"), count


def rewrite(path: Path, old_target_raw: str, new_target_raw: str) -> int:
    text = path.read_text(encoding="utf-8")
    new_text, count = render(text, old_target_raw, new_target_raw)
    if count:
        path.write_text(new_text, encoding="utf-8")
    return count
