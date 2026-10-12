"""Run all default lint checks. Returns one combined suggestion list."""
from __future__ import annotations

from pathlib import Path

from pyfars.substrate.index.by_slug import build as build_by_slug
from pyfars.closure.lint.depends_on_completeness import find as find_deps_complete
from pyfars.closure.lint.empty_description import find as find_empty_desc
from pyfars.closure.lint.fm_key_casing import find as find_key_casing
from pyfars.closure.lint.trailing_newline import find as find_trailing_nl
from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.types.suggestion import Suggestion


def run(notes: list[Flatfile], *, root: Path) -> list[Suggestion]:
    by_slug = build_by_slug(notes)
    out: list[Suggestion] = []
    out.extend(find_deps_complete(notes, by_slug=by_slug, root=root))
    out.extend(find_empty_desc(notes, root=root))
    out.extend(find_trailing_nl(notes, root=root))
    out.extend(find_key_casing(notes, root=root))
    return out
