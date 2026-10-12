"""Read one ``.md`` file as a ``Flatfile``.

Returns ``None`` if the file has no frontmatter — that's a non-note markdown
file, silently skipped. Raises ``FrontmatterError`` on malformed YAML so the
caller can decide whether to skip or surface as a Diagnostic.

The note's ``slug`` is the file stem, except for sentinel filenames whose
stem is the same in every directory: ``_index.md`` (Hugo section index) and
``SKILL.md`` (per-skill marker). For those, the slug is ``<parent>-<stem>``
(e.g. ``skills/_index.md`` → ``skills-index``, ``skills/persona/draft-from-
framework/SKILL.md`` → ``draft-from-framework-skill``) so each occurrence
gets a unique, path-derived slug without editorial overrides.

``kind`` falls back to the parent directory name singularized when
frontmatter doesn't declare it.
"""
from __future__ import annotations

from pathlib import Path

from pyfars.substrate.load._singularize import singularize
from pyfars.substrate.parse.frontmatter import parse as parse_frontmatter
from pyfars.substrate.flatfile import Flatfile


def load(path: Path, *, root: Path) -> Flatfile | None:
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body = parse_frontmatter(text)
    if fm is None:
        return None
    parent = path.parent.name
    if path.name == "_index.md":
        slug = f"{parent}-index"
    elif path.name == "SKILL.md":
        slug = f"{parent}-skill"
    else:
        slug = path.stem
    kind = fm.get("kind") or singularize(parent)
    return Flatfile(
        slug=slug,
        dir=parent,
        kind=str(kind),
        fm=fm,
        body=body,
        path=path.relative_to(root),
        mtime=path.stat().st_mtime,
    )
