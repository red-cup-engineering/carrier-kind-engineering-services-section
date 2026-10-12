"""Consistency as a localized conflict map, and its filtration.

PySheaf's *consistency radius* is one scalar: the largest disagreement between
restrictions over the whole sheaf. In a bilattice we can do strictly better.
Each settled value ``⟨pro, con⟩`` carries its own conflict degree
``pro ∧_L con`` (:meth:`pymetrologic.Bilattice.conflict_degree`) — how much it asserts
*for and against at once*. The :func:`conflict_map` reports that per cell and per
key, so an inconsistency is *located*; :func:`consistency_radius` recovers the
single PySheaf-style scalar as the maximum over the map.

PySheaf also builds a *consistency filtration*: as a tolerance threshold rises
from none to everything, more of the complex is admitted as "consistent
enough," giving a nested sequence of sub-sheaves rather than one scalar
verdict. :func:`filtration` is that feature here, generalized: the threshold is
a **grade in the fiber's own base lattice** ``L`` (``sheaf.bl.L``) rather than a
bolted-on numeric radius — the sanctioned generalization point for a graded
threshold is quantale-graded equivalence (``Site/Enriched.lean``'s
``QFuzzyEquiv`` in the corpus), of which a real-valued radius (``UnitInterval``)
is one instance and PySheaf's own discrete ``{0, 1}`` radius (``BooleanLattice``)
is another. :func:`consistent_at` is one level of the sweep; :func:`filtration`
is the whole nested sequence.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Sequence
from functools import cmp_to_key

from pymetrologic import BL
from pymetrologic.site import Cell

from .sheaf import PredicationSheaf

__all__ = [
    "cell_conflict_grade",
    "conflict_map",
    "conflicted_cells",
    "consistency_radius",
    "consistent_at",
    "filtration",
    "is_consistent",
]


def conflict_map(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> dict[Cell, dict[Hashable, object]]:
    """Per-cell, per-key conflict degree — only the nonzero entries.

    An empty map means a clean global section; any entry localizes an
    obstruction to the exact cell and key where evidence collides.
    """
    bl = sheaf.bl
    out: dict[Cell, dict[Hashable, object]] = {}
    for cell, section in settled.items():
        located: dict[Hashable, object] = {}
        for key, value in section.items():
            degree = bl.conflict_degree(value)
            if degree != bl.L.bot:
                located[key] = degree
        if located:
            out[cell] = located
    return out


def consistency_radius(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> object:
    """The single worst conflict degree — the PySheaf-style scalar radius.

    ``bl.L.bot`` (e.g. ``0``) iff the settled state is a clean global section.
    """
    bl = sheaf.bl
    worst: object = bl.L.bot
    for section in settled.values():
        for value in section.values():
            worst = bl.L.join(worst, bl.conflict_degree(value))
    return worst


def is_consistent(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> bool:
    """``True`` iff the settled state has no conflict anywhere."""
    return bool(consistency_radius(sheaf, settled) == sheaf.bl.L.bot)


def conflicted_cells(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
) -> tuple[Cell, ...]:
    """The cells carrying any conflict (the support of the obstruction)."""
    return tuple(conflict_map(sheaf, settled))


def cell_conflict_grade(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
    cell: Cell,
) -> object:
    """One cell's worst conflict degree — ``sheaf.bl.L.bot`` iff that cell is clean.

    :func:`consistency_radius` is this maximized over every cell;
    :func:`cell_conflict_grade` is the same measure kept local, the value each
    level of :func:`filtration` tests against a threshold grade.
    """
    bl = sheaf.bl
    worst: object = bl.L.bot
    for value in settled.get(cell, {}).values():
        worst = bl.L.join(worst, bl.conflict_degree(value))
    return worst


def consistent_at(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
    grade: object,
) -> tuple[Cell, ...]:
    """The sub-sheaf admitted at tolerance ``grade``: cells whose conflict is ``≤_L grade``.

    One level of the consistency filtration. ``grade = sheaf.bl.L.bot`` recovers
    exactly the clean cells (``sheaf.site.cells`` minus :func:`conflicted_cells`);
    ``grade = sheaf.bl.L.top`` always admits every cell, since
    :meth:`pymetrologic.Bilattice.conflict_degree` never exceeds ``L``'s top.
    """
    bl = sheaf.bl
    return tuple(
        cell
        for cell in sheaf.site.cells
        if bl.L.leq(cell_conflict_grade(sheaf, settled, cell), grade)
    )


def filtration(
    sheaf: PredicationSheaf,
    settled: dict[Cell, dict[Hashable, BL[object]]],
    grades: Sequence[object] | None = None,
) -> dict[object, tuple[Cell, ...]]:
    """The consistency filtration: ``{grade: cells admitted at that grade}``.

    Where PySheaf collapses the whole sweep to one scalar (the radius at which
    *everything* first becomes admitted, recovered here as
    :func:`consistency_radius`), this keeps every intermediate level, located
    cell-by-cell (:func:`consistent_at`) — the sweepable analogue of
    :func:`conflict_map`'s locate-everything philosophy.

    ``grades`` defaults to ``sheaf.bl.L``'s own sample spread (four points),
    ascending; every base lattice this package ships (``BooleanLattice``,
    ``Chain``, ``UnitInterval``) is a chain, so the sweep is a genuine nested
    filtration: ``consistent_at(g)`` is monotone non-decreasing as ``g`` rises,
    and the top grade always admits every cell of the site.
    """
    bl = sheaf.bl
    if grades is None:
        grades = bl.L.sample(4)
    ordered = sorted(grades, key=cmp_to_key(_leq_comparator(bl.L.leq)))
    return {grade: consistent_at(sheaf, settled, grade) for grade in ordered}


def _leq_comparator(leq: Callable[[object, object], bool]) -> Callable[[object, object], int]:
    """Build a two-argument comparator from a chain's ``≤`` for :func:`sorted`.

    Only meaningful when the underlying order is total (every base lattice
    shipped here — ``BooleanLattice``, ``Chain``, ``UnitInterval`` — is a
    chain), which is exactly what makes ``filtration`` a genuine nested
    sequence rather than an arbitrary walk over an unordered set of grades.
    """

    def cmp(a: object, b: object) -> int:
        a_le_b = leq(a, b)
        b_le_a = leq(b, a)
        if a_le_b and not b_le_a:
            return -1
        if b_le_a and not a_le_b:
            return 1
        return 0

    return cmp
