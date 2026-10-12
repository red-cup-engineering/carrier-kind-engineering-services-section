"""readouts — the bilingual layer for a stranger's first ten minutes.

This module is a **naming layer only**. It re-exports and thinly wraps the
existing corpus machinery (``pymetrologic.quartet``, ``pymetrologic.bilattice``,
``pymetrologic.calculus``, ``pymetrologic.coordination``) under names a stranger
can read without first learning "corner," "knowledge join," or "Cech H1." The
corpus names are canonical and stay the source of truth; where a readout name
and a corpus name appear to diverge, the corpus wins — every function below
either calls straight through to a corpus function or is a documented, load-
bearing-free reduction of one (a dataclass bundling a few corpus calls, never
new mathematics).

Honesty constraints this module holds itself to (see the product brief):

* **No bare "H1"/"h1".** The corpus contains at least four differently-scoped
  H1 theories: the settling-cohomology degree-1 obstruction
  (``pymetrologic.calculus.cohomology.h1_obstruction``), the cover-nerve Cech
  H1 / cycle rank (``pymetrologic.coordination.CoverNerve.H1rank``), the
  Anderson-Putnam aperiodic H1 (``pymetrologic.classification.H1Class``), and
  the general integer-coefficient Hn in any degree
  (``pymetrologic.calculus.integral_cohomology``). Exposing any one of them
  under a bare "H1" name would silently pick a winner among four incompatible
  theories. Every name below is disambiguated instead: :func:`coordination_cost`
  reports a **cover-nerve cycle rank**, :func:`conflicts` reports a **located
  obstruction**, and neither claims to be *the* H1.
* **The CALM biconditional stays open where the corpus leaves it open.** Two
  genuine, closed ``H1 = 0 <=> X`` biconditionals exist in the corpus: the
  forest/tree case (``h1_vanishes_iff_forest``, wrapped honestly inside
  :func:`coordination_cost`) and the CRDT order-independent-merge case
  (``pymetrologic.crdt``, not wrapped here). Everywhere else — in particular
  the general ``PredicationSheaf``/settling-cohomology path :func:`settle` and
  :func:`conflicts` run over — the corpus itself proves only a coarse degree-1
  *shadow* of a full derived H1 (see ``h1_obstruction``'s own docstring: "the
  corpus' open program"). So :func:`settle` never reports "provably
  coordination-free"; :meth:`Settled.verdict` reports "no obstruction found
  under this model," with the model named.
* **Extensions are labeled.** :func:`allocate_under_budget` is the one
  function here that is not a restated corpus theorem — see its own
  docstring for exactly which lemmas are proven and which are not.

## Bilingual mapping

readouts name -> corpus name(s) -> plain-language gloss:

* ``FourValued`` -> ``quartet.Corner`` -> the four articulation phases /
  bilattice corners.
* ``told_none``/``told_true``/``told_false``/``told_both`` ->
  ``Corner.ABSURD``/``.POTENTIAL``/``.ACTIVE``/``.STABLE`` -> constructors,
  the evidence reading (``docs/history/corner-naming-convention.md``).
* ``is_told_none``/``is_told_true``/``is_told_false``/``is_told_both`` ->
  corner identity checks -> predicates.
* ``describe`` -> (none — new) -> a readable one-line gloss of a corner.
* ``settle`` -> ``sections.settle_assignment`` + ``consistency.is_consistent``
  -> resolve local claims to the least stable global state.
* ``Settled.verdict`` -> (none — new) -> an honestly-hedged one-line verdict.
* ``conflicts`` -> ``consistency.conflict_map`` / ``consistency_radius`` /
  ``conflicted_cells`` -> where and how badly sources disagree.
* ``severity_filtration`` -> ``consistency.filtration`` -> the nested
  "consistent enough at grade g" sweep.
* ``coordination_cost`` -> ``coordination.CoverNerve`` (``H1rank``,
  ``CoordinationFree``, ``components``) -> the cover-nerve cycle rank: gluing
  obstructions beyond a spanning forest.
* ``coordination_cost_from_edges`` -> ``coordination.cover_nerve_from_edges``
  + the above -> the same, straight from a source-stance graph.
* ``allocate_under_budget`` -> *extension* — ``Cohomology.AttentionAllocation``
  (monotone-budget lemmas only, no optimality proof) -> a feasible selection
  of obstructions to reconcile under budget.
"""

from __future__ import annotations

from collections.abc import Hashable, Iterable, Sequence
from dataclasses import dataclass

from .bilattice import BL
from .calculus.consistency import (
    conflict_map,
    conflicted_cells,
    consistency_radius,
    is_consistent,
)
from .calculus.consistency import (
    filtration as _filtration,
)
from .calculus.sections import settle_assignment
from .calculus.sheaf import Assignment, PredicationSheaf
from .coordination import CoverNerve, cover_nerve_from_edges
from .quartet import Corner
from .site import Cell

__all__ = [
    "Allocation",
    "Conflicts",
    "CoordinationCost",
    "FourValued",
    "Obstruction",
    "Settled",
    "allocate_under_budget",
    "conflicts",
    "coordination_cost",
    "coordination_cost_from_edges",
    "describe",
    "is_feasible",
    "is_told_both",
    "is_told_false",
    "is_told_none",
    "is_told_true",
    "residual",
    "settle",
    "severity_filtration",
    "told_both",
    "told_false",
    "told_none",
    "told_true",
    "total_benefit",
    "total_cost",
]

# --------------------------------------------------------------------------- #
# FourValued — a bare alias over Corner, plus outsider-legible names
# --------------------------------------------------------------------------- #
FourValued = Corner
"""The four-valued readout type — a bare alias for :class:`pymetrologic.quartet.Corner`.

Not a new class: every :class:`Corner` operation in the corpus already works
on a ``FourValued`` value, so wrapper agreement with the underlying corpus
call is definitional, not merely tested. The corpus vocabulary (the ruled
evidence reading — ``docs/history/corner-naming-convention.md`` in
``lib/obsmetrologia``) is: ``absurd`` = told-none, the initial no-evidence
cell; ``potential`` = told-true; ``active`` = told-false; ``stable`` =
told-both — the ``<=k``-absorbing point that a contradiction settles *into*,
not an explosion out of (this bilattice is paraconsistent: ``stable`` is the
most evidentially loaded corner, not the least).
"""


def told_none() -> FourValued:
    """Told none: no evidence either way — the initial cell (``Corner.ABSURD``)."""
    return Corner.ABSURD


def told_true() -> FourValued:
    """Told true: evidence for only, none against (``Corner.POTENTIAL``)."""
    return Corner.POTENTIAL


def told_false() -> FourValued:
    """Told false: evidence against only, none for (``Corner.ACTIVE``)."""
    return Corner.ACTIVE


def told_both() -> FourValued:
    """Told both: evidence for and against at once — the knowledge-absorbing
    corner (``Corner.STABLE``). Contradiction does not explode here; it is
    the ``<=k``-greatest, most evidentially loaded corner."""
    return Corner.STABLE


def is_told_none(value: FourValued) -> bool:
    """Whether ``value`` carries no evidence either way."""
    return value is Corner.ABSURD


def is_told_true(value: FourValued) -> bool:
    """Whether ``value`` carries evidence for, and only for."""
    return value is Corner.POTENTIAL


def is_told_false(value: FourValued) -> bool:
    """Whether ``value`` carries evidence against, and only against."""
    return value is Corner.ACTIVE


def is_told_both(value: FourValued) -> bool:
    """Whether ``value`` carries evidence for and against at once."""
    return value is Corner.STABLE


_DESCRIPTIONS: dict[Corner, str] = {
    Corner.ABSURD: "told-none — no evidence either way (the initial state)",
    Corner.POTENTIAL: "told-true — evidence for, none against",
    Corner.ACTIVE: "told-false — evidence against, none for",
    Corner.STABLE: (
        "told-both — evidence for and against at once (contradiction is stable here, not explosive)"
    ),
}


def describe(value: FourValued) -> str:
    """A readable one-line gloss of a corner, for a stranger's first ten minutes."""
    return f"{value.value}: {_DESCRIPTIONS[value]}"


# --------------------------------------------------------------------------- #
# settle — resolve local claims to the least stable global state
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Settled:
    """The result of :func:`settle`: a resolved global state, plus how it got there."""

    sections: dict[Cell, dict[Hashable, BL[object]]]
    iterations: int
    consistent: bool

    def verdict(self, model: str = "this model") -> str:
        """An honestly-hedged one-line verdict.

        Never a proof of coordination-freedom — the general settling path
        this wraps only carries the corpus' coarse degree-1 obstruction
        shadow, not a full derived H1 (see the module docstring). A clean
        settle is reported as "no obstruction found," not as "provably
        coordination-free."
        """
        if self.consistent:
            return f"no obstruction found under {model} (settled with no located conflict)"
        return f"an obstruction was located under {model} — see conflicts()"


def settle(sheaf: PredicationSheaf, assignment: Assignment[Hashable, object]) -> Settled:
    """Resolve local claims to the least stable global state.

    Wraps ``pymetrologic.calculus.sections.settle_assignment``: every cell's
    posited section is pushed along the site's face relations by the
    knowledge-order join (``vk``) until nothing more can be learned — the
    least ``<=k`` fixed point above what was posited. Also reports whether
    the result is a clean global section (``calculus.consistency.is_consistent``);
    see :meth:`Settled.verdict` for how to report that honestly.
    """
    sections, iterations = settle_assignment(sheaf, assignment)
    return Settled(
        sections=sections,
        iterations=iterations,
        consistent=is_consistent(sheaf, sections),
    )


# --------------------------------------------------------------------------- #
# conflicts — where and how badly do sources disagree
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Conflicts:
    """Where and how badly sources disagree, after a settle."""

    located: dict[Cell, dict[Hashable, object]]
    radius: object
    cells: tuple[Cell, ...]

    def __bool__(self) -> bool:
        """Truthy iff any conflict was located."""
        return bool(self.located)


def conflicts(
    sheaf: PredicationSheaf,
    settled: Settled | dict[Cell, dict[Hashable, BL[object]]],
) -> Conflicts:
    """Where and how badly do sources disagree, after settling.

    Wraps ``calculus.consistency.conflict_map`` (the located per-cell,
    per-key conflict degree), ``consistency_radius`` (the single worst
    conflict — PySheaf's style scalar, recovered as a special case, never the
    whole story), and ``conflicted_cells``. Accepts either a :class:`Settled`
    result from :func:`settle` or a raw settled-assignment dict (the corpus's
    own ``settled`` shape), so it composes either with :func:`settle` or
    directly with ``settle_assignment``.
    """
    sections = settled.sections if isinstance(settled, Settled) else settled
    return Conflicts(
        located=conflict_map(sheaf, sections),
        radius=consistency_radius(sheaf, sections),
        cells=conflicted_cells(sheaf, sections),
    )


def severity_filtration(
    sheaf: PredicationSheaf,
    settled: Settled | dict[Cell, dict[Hashable, BL[object]]],
    grades: Sequence[object] | None = None,
) -> dict[object, tuple[Cell, ...]]:
    """The nested sweep of "which cells are consistent enough" as the tolerance rises.

    Wraps ``calculus.consistency.filtration``: at each grade in the fiber's
    own base lattice, the cells whose worst local conflict is at or below
    that grade. Monotone non-decreasing in the grade; the top grade always
    admits every cell.
    """
    sections = settled.sections if isinstance(settled, Settled) else settled
    return _filtration(sheaf, sections, grades)


# --------------------------------------------------------------------------- #
# coordination_cost — the cover-nerve cycle rank (never called "h1" here)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class CoordinationCost:
    """A cover nerve's coordination cost, named without a bare "H1".

    Distinct from the settling-cohomology obstruction :func:`conflicts`
    reports and from the Anderson-Putnam aperiodic H1 — see the module
    docstring's disambiguation table. ``cycle_rank`` counts the independent
    cycles a spanning forest of the cover would still need an imposed order
    to resolve.
    """

    cycle_rank: int
    is_forest: bool
    components: int


def coordination_cost(nerve: CoverNerve) -> CoordinationCost:
    """Where and how much federated coordination a cover needs.

    Wraps ``pymetrologic.coordination.CoverNerve``. ``cycle_rank`` is
    ``nerve.H1rank`` — proven equal to the corpus's own ``coordination_cost``
    (cells in excess of a spanning forest) by ``h1rank_is_coordination_cost``.
    ``is_forest`` is ``nerve.CoordinationFree`` — proven equivalent to the
    literal graph-theoretic forest property by ``h1_vanishes_iff_forest``, one
    of the corpus's genuinely *closed* H1-vanishing biconditionals (contrast
    the open settling-cohomology case :func:`settle` and :func:`conflicts`
    run over).
    """
    return CoordinationCost(
        cycle_rank=nerve.H1rank,
        is_forest=nerve.CoordinationFree,
        components=nerve.components,
    )


def coordination_cost_from_edges(
    entities: Iterable[str], edges: Iterable[frozenset[str]]
) -> CoordinationCost:
    """:func:`coordination_cost`, straight from a source-stance graph.

    Wraps ``pymetrologic.coordination.cover_nerve_from_edges`` then
    :func:`coordination_cost`.
    """
    return coordination_cost(cover_nerve_from_edges(entities, edges))


# --------------------------------------------------------------------------- #
# allocate_under_budget — extension, honestly labeled
# --------------------------------------------------------------------------- #
@dataclass(frozen=True, slots=True)
class Obstruction:
    """A reconciliation demand: a cost to resolve it, a benefit if resolved.

    Mirrors ``Obsmetrologia.Cohomology.AttentionAllocation.Obstruction``
    (``cost``/``benefit`` fields, ``Nat`` there; kept as plain non-negative
    ``int`` here).
    """

    name: str
    cost: int
    benefit: int

    def __post_init__(self) -> None:
        if self.cost < 0 or self.benefit < 0:
            msg = "obstruction cost and benefit must be non-negative"
            raise ValueError(msg)


def total_cost(selection: Sequence[Obstruction]) -> int:
    """Total attention cost of a selection (``AttentionAllocation.totalCost``)."""
    return sum(o.cost for o in selection)


def total_benefit(selection: Sequence[Obstruction]) -> int:
    """Total benefit captured by a selection (``AttentionAllocation.totalBenefit``)."""
    return sum(o.benefit for o in selection)


def is_feasible(budget: int, selection: Sequence[Obstruction]) -> bool:
    """Whether a selection fits under ``budget`` (``AttentionAllocation.Feasible``)."""
    return total_cost(selection) <= budget


def residual(universe: Sequence[Obstruction], selection: Sequence[Obstruction]) -> int:
    """Benefit left uncaptured by ``selection`` out of the whole ``universe``
    (``AttentionAllocation.residual``)."""
    return total_benefit(universe) - total_benefit(selection)


@dataclass(frozen=True)
class Allocation:
    """The result of :func:`allocate_under_budget`."""

    selected: tuple[Obstruction, ...]
    total_cost: int
    total_benefit: int
    residual: int
    budget: int


def allocate_under_budget(universe: Sequence[Obstruction], budget: int) -> Allocation:
    """A greedy, budget-feasible selection of obstructions to reconcile.

    **Extension, honestly labeled — not an optimality theorem.**
    ``Obsmetrologia.Cohomology.AttentionAllocation`` proves five lemmas about
    *any* selection built by extending one obstruction at a time within
    budget: ``empty_feasible`` (reconciling nothing is free), ``cost_monotone_cons``
    (cost never drops when an obstruction is added — the light-cone
    irreversibility of a committed spend), ``feasible_of_cons`` (feasibility is
    downward closed), ``feasible_extend`` (extending within remaining budget
    stays feasible and adds exactly that obstruction's benefit), and
    ``residual_antitone`` (more captured benefit never raises residual). It
    does **not** prove that any particular selection order is globally
    optimal: 0/1-knapsack optimality is a strictly stronger claim the Lean
    file never makes, and greedy-by-benefit selection is a textbook
    non-optimal heuristic for knapsack in general (a classic counterexample:
    one cheap-but-mediocre item can dominate two greedily-preferred
    high-ratio items that together overflow the budget).

    So this function builds a selection using a benefit-per-cost-descending
    order — each step is a real ``feasible_extend`` instance, so the result
    is genuinely feasible and residual genuinely does not rise as items are
    added — but the result is a feasible selection, not a certified-optimal
    one. Do not read :attr:`Allocation.residual` as a minimum.
    """
    ordered = sorted(
        universe,
        key=lambda o: o.benefit / o.cost if o.cost else float("inf"),
        reverse=True,
    )
    selected: list[Obstruction] = []
    spent = 0
    for obstruction in ordered:
        if spent + obstruction.cost <= budget:
            selected.append(obstruction)
            spent += obstruction.cost
    chosen = tuple(selected)
    return Allocation(
        selected=chosen,
        total_cost=total_cost(chosen),
        total_benefit=total_benefit(chosen),
        residual=residual(universe, chosen),
        budget=budget,
    )
