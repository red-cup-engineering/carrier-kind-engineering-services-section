"""``PredicationCell`` values built from Tier A fm/body edges.

``PredicationCell`` (``pymetrologic.predicating``) is a bare oriented
``(subject, predicate, object)`` triple, not a store class of its own; this
module is the only place a Tier A :class:`~pyfars.substrate.predication.Predication`
edge is lifted into one.
"""

from __future__ import annotations

from collections.abc import Iterable

from pymetrologic.predicating import Entity, Predicate, PredicationCell

from pyfars.substrate.predication import Predication


def cell_of(edge: Predication) -> PredicationCell:
    return PredicationCell(Entity(edge.src), Predicate(edge.kind), Entity(edge.dst))


def build_cells(edges: Iterable[Predication]) -> tuple[PredicationCell, ...]:
    return tuple(cell_of(edge) for edge in edges)


__all__ = ["build_cells", "cell_of"]
