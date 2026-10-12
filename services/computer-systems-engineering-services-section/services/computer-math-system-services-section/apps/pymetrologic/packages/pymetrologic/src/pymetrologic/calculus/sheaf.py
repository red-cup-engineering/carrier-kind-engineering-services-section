"""Predication sheaves over a site.

A :class:`PredicationSheaf` attaches to each cell of a :class:`~pymetrologic.site` a
*fiber* — a bilattice-valued stalk indexed by a finite key set — and to each
face ``a ◁ b`` a **restriction map** ``r_{a,b}`` that carries a section of
``a``'s stalk to a section of ``b``'s stalk. Restriction maps are bilattice
homomorphisms (the corpus' fiber-functor action; see :mod:`pymetrologic.fiber`), but
the engine only needs them to be knowledge-monotone.

An *assignment* gives each cell a section of its own stalk. The central
operation is **settling** the assignment along the site (see
:mod:`pymetrologic.calculus.sections`).
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping
from dataclasses import dataclass
from typing import Any, TypeVar

from pymetrologic import BL, Bilattice
from pymetrologic.site import Cell, Face, Site

K = TypeVar("K", bound=Hashable)
T = TypeVar("T")

# A section of one cell's stalk, and a whole-sheaf assignment.
Section = Mapping[K, BL[T]]
Assignment = Mapping[Cell, Section[K, T]]
RestrictionMap = Callable[[Section[K, T]], dict[K, BL[T]]]

__all__ = ["Assignment", "PredicationSheaf", "RestrictionMap", "Section"]


@dataclass
class PredicationSheaf:
    """A bilattice-valued sheaf on a finite site.

    ``stalk_index[c]`` is the key set of cell ``c``'s fiber; ``restriction[a, b]``
    maps a section over ``stalk_index[a]`` to a section over ``stalk_index[b]``
    for each face ``(a, b)`` of ``site``.
    """

    site: Site
    bl: Bilattice[Any]
    stalk_index: dict[Cell, tuple[Hashable, ...]]
    restriction: dict[Face, RestrictionMap[Hashable, Any]]

    def __post_init__(self) -> None:
        for c in self.site.cells:
            if c not in self.stalk_index:
                raise ValueError(f"cell {c!r} has no stalk index")
        for face in self.site.faces:
            if face not in self.restriction:
                raise ValueError(f"face {face} has no restriction map")

    def zero_assignment(self) -> dict[Cell, dict[Hashable, BL[object]]]:
        """The ``⊥``-everywhere assignment (nothing known on any cell)."""
        return {c: dict.fromkeys(self.stalk_index[c], self.bl.none) for c in self.site.cells}

    def restrict(
        self, a: Cell, b: Cell, section: Section[Hashable, object]
    ) -> dict[Hashable, BL[object]]:
        """Push ``section`` on cell ``a`` along the face to cell ``b``."""
        return self.restriction[(a, b)](section)
