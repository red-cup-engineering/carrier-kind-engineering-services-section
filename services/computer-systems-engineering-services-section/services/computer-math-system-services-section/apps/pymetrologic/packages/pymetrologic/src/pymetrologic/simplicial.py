"""General n-dimensional finite simplicial complexes.

**Extension beyond the Lean corpus.** Obsmetrologia's cohomology material
(realized on the settling side in ``pymetrologic.calculus.sheaf`` /
``pymetrologic.calculus.cohomology``) works over the predication site's cell
complex, and Obsmetrologia does not formalize simplicial complexes of
arbitrary dimension at all. Nothing in this module realizes a Lean theorem.
Its provenance is the ancestor Python package ``pypredcalc``
(``governance/assets/computing/pypredcalc/src/pypredcalc/combinatorics/
simplicial_complex.py``, under the ``561-group/lib/legacy/2026-05-15-mypc-561``
checkout), ported here as the carrier ``pymetrologic.calculus.integral_cohomology``
needs to compute genuine ``Hⁿ`` in arbitrary degree; see that module's
docstring for why.

A :class:`Simplex` is a tuple of hashable vertices; a
:class:`SimplicialComplex` is a ``frozenset`` of simplices closed under the
face relation (every simplex's codimension-1 faces are themselves members).
Cohomology is a derived construction and deliberately does not live here —
it belongs to ``pymetrologic.calculus.integral_cohomology``, matching the
carrier/derived-construction split the ancestor package also drew between
its ``combinatorics`` and ``sheaf`` packages.
"""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass

__all__ = ["Simplex", "SimplicialComplex"]


@dataclass(frozen=True)
class Simplex:
    """A simplex: a tuple of vertices, with dimension ``len(vertices) - 1``."""

    vertices: tuple[Hashable, ...]

    @property
    def dim(self) -> int:
        return len(self.vertices) - 1

    def faces(self) -> list[Simplex]:
        """The codimension-1 faces: simplices obtained by omitting one vertex."""
        if self.dim < 1:
            return []
        return [
            Simplex(tuple(self.vertices[:i] + self.vertices[i + 1 :]))
            for i in range(len(self.vertices))
        ]


@dataclass(frozen=True)
class SimplicialComplex:
    """A finite simplicial complex: a set of :class:`Simplex` closed under faces."""

    simplices: frozenset[Simplex]

    def __post_init__(self) -> None:
        for s in self.simplices:
            for face in s.faces():
                if face not in self.simplices:
                    raise ValueError(f"complex not closed under faces: {s} has face {face} missing")

    def cells(self, dim: int) -> list[Simplex]:
        """All ``dim``-dimensional cells, in deterministic (vertex-tuple-sorted) order."""
        return sorted((s for s in self.simplices if s.dim == dim), key=lambda s: s.vertices)

    def dimension(self) -> int:
        """The complex's top dimension, or ``-1`` if it is empty."""
        return max((s.dim for s in self.simplices), default=-1)
