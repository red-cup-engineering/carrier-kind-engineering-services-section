"""Apply a new frontmatter dict to a markdown file in place.

Reads the file, replaces the existing frontmatter block (or prepends a
new one if absent), and writes back. The body is preserved verbatim.

Returns ``(old_text, new_text)`` for callers that want to diff or stage.
"""
from __future__ import annotations

from pathlib import Path

from pyfars.substrate.parse.frontmatter import parse as parse_fm
from pyfars.render.fm_dump import dump


def render(old_text: str, new_fm: dict) -> str:
    _, body = parse_fm(old_text)
    fm_yaml = dump(new_fm).rstrip() + "\n"
    return f"---\n{fm_yaml}---\n{body}"


def apply(path: Path, new_fm: dict) -> tuple[str, str]:
    old_text = path.read_text(encoding="utf-8")
    new_text = render(old_text, new_fm)
    path.write_text(new_text, encoding="utf-8")
    return old_text, new_text
