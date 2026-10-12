"""Non-Scott-continuous firing witnesses from ``Flow.NonScottContinuousFiring``."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import combinations
from typing import TypeVar

from .closure import FiniteLattice, is_closure
from .regimes import ClosureRegime, cohomology_vanishes, is_curved_regime

E = TypeVar("E")

__all__ = [
    "NSCFiringWitness",
    "all_directed_families",
    "directed_sup",
    "forall_antecedent_is_nsc",
    "forall_antecedent_operator",
    "has_nsc_firing",
    "is_directed_family",
    "is_nsc_firing",
    "no_nsc_firing_for_closure",
    "nsc_firing_source_witness",
    "nsc_regime",
    "nsc_stage_prefix",
]


@dataclass(frozen=True)
class NSCFiringWitness:
    """A bundled executable witness for the Lean NSC firing source theorem."""

    source_is_nsc: bool
    regime: ClosureRegime
    cohomology_nonvanishing: bool
    regime_is_curved: bool


def directed_sup(lat: FiniteLattice[E], values: Sequence[E]) -> E:
    """Return ``sup values`` by folding the lattice join from bottom."""

    acc = lat.bot
    for value in values:
        acc = lat.join(acc, value)
    return acc


def is_directed_family(lat: FiniteLattice[E], values: Sequence[E]) -> bool:
    """Check that a finite stage-prefix is nonempty and directed."""

    if not values:
        return False
    return all(
        any(lat.leq(left, upper) and lat.leq(right, upper) for upper in values)
        for left in values
        for right in values
    )


def is_nsc_firing(lat: FiniteLattice[E], operator: Callable[[E], E], values: Sequence[E]) -> bool:
    """Check ``op(sup S) != sup(map op S)`` for a directed stage-prefix."""

    if not is_directed_family(lat, values):
        msg = "NSC firing requires a nonempty directed family"
        raise ValueError(msg)
    return not lat.eq(
        operator(directed_sup(lat, values)), directed_sup(lat, [operator(v) for v in values])
    )


def nsc_stage_prefix(lat: FiniteLattice[E]) -> tuple[E, E]:
    """Return the concrete Lean prefix ``[bottom, top]``."""

    return (lat.bot, lat.top)


def forall_antecedent_operator(lat: FiniteLattice[E]) -> Callable[[E], E]:
    """Return Lean's ``forallAnteOp``: top retracts to bottom, all sub-top stages fire to top."""

    return lambda value: lat.bot if lat.eq(value, lat.top) else lat.top


def forall_antecedent_is_nsc(lat: FiniteLattice[E]) -> bool:
    """Check that ``forallAnteOp`` witnesses an NSC firing on ``[bottom, top]``."""

    return is_nsc_firing(lat, forall_antecedent_operator(lat), nsc_stage_prefix(lat))


def all_directed_families(lat: FiniteLattice[E]) -> tuple[tuple[E, ...], ...]:
    """Enumerate all nonempty directed families over the finite carrier."""

    families: list[tuple[E, ...]] = []
    elements = lat.elements
    for size in range(1, len(elements) + 1):
        for values in combinations(elements, size):
            if is_directed_family(lat, values):
                families.append(values)
    return tuple(families)


def has_nsc_firing(lat: FiniteLattice[E], operator: Callable[[E], E]) -> bool:
    """Return whether any finite directed family witnesses an NSC firing for ``operator``."""

    return any(is_nsc_firing(lat, operator, values) for values in all_directed_families(lat))


def no_nsc_firing_for_closure(lat: FiniteLattice[E], closure: Callable[[E], E]) -> bool:
    """Check the finite-carrier theorem: a genuine closure has no NSC firing."""

    if not is_closure(lat, closure):
        msg = "operator must be a closure"
        raise ValueError(msg)
    return not has_nsc_firing(lat, closure)


def nsc_regime() -> ClosureRegime:
    """Return the Lean ``nscRegimeData`` classification: transfinite-bounded."""

    return ClosureRegime.transfinite_bounded


def nsc_firing_source_witness(lat: FiniteLattice[E]) -> NSCFiringWitness:
    """Bundle the concrete NSC firing and its non-Scott cohomology-bearing regime."""

    regime = nsc_regime()
    return NSCFiringWitness(
        source_is_nsc=forall_antecedent_is_nsc(lat),
        regime=regime,
        cohomology_nonvanishing=not cohomology_vanishes(regime),
        regime_is_curved=is_curved_regime(regime),
    )
