"""``System`` — the kernel's query handle over predication cells built from
Tier A fm/body edges. The same call-site contract gen-2's
``kernel/store.py`` exposed (``value``/``holds``/``cells_at``/
``subjects_with``/``in_edges``/``out_edges``/``relation_map``), none of its
code: this ``System`` is built on PyMetroLogic's predicating/site algebra
(:mod:`pyfars.kernel.cells`, :mod:`pyfars.kernel.site`, :mod:`pyfars.kernel.four`),
never on ``pypredcalc``.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from pathlib import Path

from pymetrologic.site import Site

from pyfars.kernel.cells import build_cells
from pyfars.kernel.four import NEITHER, TRUE, Four, join_knowledge
from pyfars.kernel.site import build_site
from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.index.edges import build as build_edges
from pyfars.substrate.load.notes import load as load_notes
from pyfars.substrate.predication import Predication
from pyfars.substrate.types.diagnostic import Diagnostic

CellKey = tuple[str, str, str]


@dataclass(frozen=True)
class System:
    """A query handle over one corpus: notes and edges loaded once, folded
    into a FOUR-valued cell store keyed by ``(subject, predicate, object)``,
    alongside a directory-structure :class:`~pymetrologic.site.Site`."""

    root: Path
    notes: tuple[Flatfile, ...]
    edges: tuple[Predication, ...]
    diagnostics: tuple[Diagnostic, ...]
    site: Site
    cells: dict[CellKey, Four] = field(default_factory=dict)

    @classmethod
    def load(cls, root: Path | str) -> System:
        root = Path(root)
        notes, diagnostics = load_notes(root)
        edges = build_edges(notes)
        cells: dict[CellKey, Four] = {}
        for cell in build_cells(edges):
            key = (cell.subject.surface, cell.predicate.surface, cell.object.surface)
            cells[key] = join_knowledge(cells.get(key, NEITHER), TRUE)
        return cls(
            root=root,
            notes=tuple(notes),
            edges=tuple(edges),
            diagnostics=tuple(diagnostics),
            site=build_site(notes),
            cells=cells,
        )

    def value(self, subject: str, predicate: str, obj: str) -> Four:
        return self.cells.get((subject, predicate, obj), NEITHER)

    def holds(self, subject: str, predicate: str, obj: str) -> bool:
        return self.value(subject, predicate, obj) == TRUE

    def cells_at(self, subject: str) -> Iterator[CellKey]:
        for (s, p, o), val in self.cells.items():
            if s == subject and val == TRUE:
                yield (s, p, o)

    def subjects_with(self, predicate: str, obj: str) -> set[str]:
        return {
            s
            for (s, p, o), val in self.cells.items()
            if p == predicate and o == obj and val == TRUE
        }

    def in_edges(
        self, slug: str, *, predicates: Iterable[str] | None = None
    ) -> Iterator[CellKey]:
        pred_set = None if predicates is None else set(predicates)
        for (s, p, o), val in self.cells.items():
            if o != slug or val != TRUE:
                continue
            if pred_set is not None and p not in pred_set:
                continue
            yield (s, p, o)

    def out_edges(
        self, slug: str, *, predicates: Iterable[str] | None = None
    ) -> Iterator[CellKey]:
        pred_set = None if predicates is None else set(predicates)
        for (s, p, o), val in self.cells.items():
            if s != slug or val != TRUE:
                continue
            if pred_set is not None and p not in pred_set:
                continue
            yield (s, p, o)

    def relation_map(
        self, predicate: str, *, direction: str = "subject-keyed"
    ) -> dict[str, list[str]]:
        if direction not in ("subject-keyed", "object-keyed"):
            raise ValueError(
                "direction must be 'subject-keyed' or 'object-keyed'; "
                f"got {direction!r}"
            )
        out: dict[str, list[str]] = {}
        for (s, p, o), val in self.cells.items():
            if p != predicate or val != TRUE:
                continue
            key, item = (s, o) if direction == "subject-keyed" else (o, s)
            out.setdefault(key, []).append(item)
        return out


__all__ = ["CellKey", "System"]
