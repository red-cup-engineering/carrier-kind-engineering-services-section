"""Sheaf cohomology, settling-style: ``H⁰`` global sections and the ``H¹`` obstruction.

``H⁰`` — the global sections — is read off the settled assignment: settling
computes the maximal section consistent with the input, and the section is a
genuine global section exactly when no conflict was produced. ``H¹`` is, to
first order, the *obstruction*: the located set of conflicts that prevents the
assignment from extending to a clean global section. (A full derived ``H¹`` over
the ``C``-naturality value category is the corpus' open program; this coarse
obstruction is its degree-1 shadow — present and located, which is what a
practitioner needs.)
"""

from __future__ import annotations

from collections.abc import Hashable
from dataclasses import dataclass

from pymetrologic import BL
from pymetrologic.site import Cell

from .consistency import conflict_map, is_consistent
from .sections import settle_assignment
from .sheaf import Assignment, PredicationSheaf

__all__ = ["GlobalSection", "h0", "h1_obstruction"]


@dataclass(frozen=True)
class GlobalSection:
    """The ``H⁰`` result of settling an assignment."""

    section: dict[Cell, dict[Hashable, BL[object]]]
    consistent: bool
    iterations: int

    def __bool__(self) -> bool:
        """Truthy iff a clean global section was found."""
        return self.consistent


def h0(sheaf: PredicationSheaf, assignment: Assignment[Hashable, object]) -> GlobalSection:
    """Compute ``H⁰``: settle the assignment and report whether it is a section."""
    settled, iterations = settle_assignment(sheaf, assignment)
    return GlobalSection(
        section=settled,
        consistent=is_consistent(sheaf, settled),
        iterations=iterations,
    )


def h0_designated_count(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> int:
    """``H⁰`` as RelMath models it: the count of settled-**designated** (= ``t``) entries.

    The settling-cohomology node reads ``H⁰`` of the settling-associated sheaf as
    a *count of the designated (settled-``t``) cells* — the global settled section
    made a number (``h0_is_designated_count``).
    """
    bl = sheaf.bl
    return sum(1 for sec in settled.values() for v in sec.values() if bl.eq(v, bl.true))


def inconsistency_count(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> int:
    """``H⁰`` of the **inconsistency sheaf** ``F_U^{(⊤)}``: the count of ``⊤`` ("told both") cells.

    The paraconsistent-evidence content of a settling, tracked independently of the
    classical ``t`` content (``h0top_is_inconsistency_count``). It is ``0`` exactly
    for a consistent settling (``section_zero_of_consistent``).
    """
    bl = sheaf.bl
    return sum(1 for sec in settled.values() for v in sec.values() if bl.eq(v, bl.conflict))


def knowledge_designated_count(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> int:
    """The knowledge side ``F_U^{(k)}``: cells with positive evidence (``pro`` present).

    The short exact sequence ``0 → F_U^{(t)} → F_U^{(k)} → F_U^{(⊤)} → 0`` splits the
    knowledge content disjointly into the truth side and the inconsistency side, so
    ``knowledge_designated_count = h0_designated_count + inconsistency_count``.
    """
    top = sheaf.bl.L.top
    return sum(1 for sec in settled.values() for v in sec.values() if v.pro == top)


def h1_obstruction(
    sheaf: PredicationSheaf,
    assignment: Assignment[Hashable, object],
) -> dict[Cell, dict[Hashable, object]]:
    """The located degree-1 obstruction: where (cell, key) a section fails to glue.

    Empty iff the assignment glues to a clean global section — i.e. ``H¹`` vanishes.
    """
    settled, _ = settle_assignment(sheaf, assignment)
    return conflict_map(sheaf, settled)


def h1_vanishes(
    sheaf: PredicationSheaf,
    assignment: Assignment[Hashable, object],
) -> bool:
    """``H¹ = 0`` ⟺ the local sections **glue** into one global section.

    RelMath's load-bearing fact (``settling_cohomology_h1_vanishes``): vanishing
    ``H¹`` is exactly cascade settling — the assignment settles to a conflict-free
    global section. The obstruction (when nonzero) is :func:`h1_obstruction`.
    """
    settled, _ = settle_assignment(sheaf, assignment)
    return is_consistent(sheaf, settled)


def hn_trivial_above_one(n: int) -> bool:
    """Cohomology vanishes above degree 1: ``Hⁿ`` is a point for ``n ≥ 2``.

    All content of the settling cohomology sits in ``H⁰`` and ``H¹``
    (``hn_vanishes_above_one``); higher degrees are trivial.

    This is Obsmetrologia's own scope decision — it *defines* ``Hⁿ := Unit``
    for ``n ≥ 2`` on the settling site, it does not prove higher cohomology
    vanishes there. For an actual computed ``Hⁿ`` (betti number and torsion,
    via Smith Normal Form, in arbitrary degree) on a general simplicial
    complex — an extension beyond the Lean corpus, with no claim that it
    vanishes above degree 1 — see
    ``pymetrologic.calculus.integral_cohomology.integral_cohomology``.
    """
    return n >= 2
