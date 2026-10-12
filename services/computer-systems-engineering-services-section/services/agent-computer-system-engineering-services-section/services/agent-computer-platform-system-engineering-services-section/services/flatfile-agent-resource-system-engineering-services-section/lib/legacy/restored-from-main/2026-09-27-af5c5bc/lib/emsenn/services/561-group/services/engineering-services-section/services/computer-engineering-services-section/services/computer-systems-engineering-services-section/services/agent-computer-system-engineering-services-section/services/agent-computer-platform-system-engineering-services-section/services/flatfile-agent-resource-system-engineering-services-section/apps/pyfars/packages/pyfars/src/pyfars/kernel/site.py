"""A ``pymetrologic.site.Site`` over the corpus directory structure.

Realizes ``institution.md``'s git-file-system grounding: every note is a
face of the directory that contains it (``slug ◁ dir``), the same
"vertex is a face of its coface" shape ``Site.graph`` uses for an
undirected graph's edges.
"""

from __future__ import annotations

from collections.abc import Iterable

from pymetrologic.site import Site

from pyfars.substrate.flatfile import Flatfile


def build_site(notes: Iterable[Flatfile]) -> Site:
    cells: list[str] = []
    faces: list[tuple[str, str]] = []
    seen: set[str] = set()
    for note in notes:
        if note.dir not in seen:
            seen.add(note.dir)
            cells.append(note.dir)
        if note.slug not in seen:
            seen.add(note.slug)
            cells.append(note.slug)
        faces.append((note.slug, note.dir))
    return Site(tuple(cells), tuple(faces))


__all__ = ["build_site"]
