"""Fiberwise closure-operator families over FOUR valuations.

Executable shadow of ``RelMath.Closure.ClosureOperatorFiber``.  The Lean module
isolates the 1-categorical engine under the closure 2-monad: a pointwise family
``cl_q`` of charge closures, lifted to valuations ``cell -> Charge``.  The laws
are finite here:

* pointwise lift preserves inflationary/monotone/idempotent closure laws;
* the lift is C-natural because reindexing is precomposition;
* closure-merge makes the first saturation redundant under an outer closure;
* no non-trivial periodic orbit can appear;
* the least fixed point above a seed is the settled valuation ``cl(seed)``.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping, Sequence
from dataclasses import dataclass
from itertools import product
from typing import TypeVar

from pymetrologic import BL, four

K = TypeVar("K", bound=Hashable)

FOUR = four()
CHARGES: tuple[BL[int], ...] = (FOUR.none, FOUR.true, FOUR.false, FOUR.conflict)

__all__ = [
    "CHARGES",
    "CNaturalFamilyWitness",
    "ChargeClosure",
    "ClosureOperatorFiberWitness",
    "charge_closure_laws",
    "charge_join_closure",
    "closure_merge",
    "closure_operator_fiber_laws",
    "identity_charge_closure",
    "iter_valuation",
    "lfp_is_settled",
    "lfp_reached_by_three",
    "lift_op",
    "no_periodic_orbits",
    "pointwise_family",
    "reindex",
    "settle_lift",
    "valuation_eq",
    "valuation_join_k",
    "valuation_leq",
    "valuations",
]


@dataclass(frozen=True, slots=True)
class ChargeClosure:
    """A closure operator on Belnap FOUR under the knowledge order."""

    name: str
    op: Callable[[BL[int]], BL[int]]

    def __call__(self, charge: BL[int]) -> BL[int]:
        """Apply the closure to one charge."""
        return self.op(charge)


@dataclass(frozen=True, slots=True)
class CNaturalFamilyWitness:
    """The pointwise closure-family laws on a finite set of cells."""

    inflationary: bool
    monotone: bool
    idempotent: bool
    c_natural: bool

    @property
    def holds(self) -> bool:
        """All C-natural family checks hold."""
        return self.inflationary and self.monotone and self.idempotent and self.c_natural


@dataclass(frozen=True, slots=True)
class ClosureOperatorFiberWitness:
    """The bundled operational-engine laws from ``ClosureOperatorFiber``."""

    pointwise_family: bool
    no_periodic_orbits: bool
    closure_merge: bool
    lfp_is_settled: bool
    reached_by_three: bool

    @property
    def holds(self) -> bool:
        """All closure-operator-fiber checks hold."""
        return (
            self.pointwise_family
            and self.no_periodic_orbits
            and self.closure_merge
            and self.lfp_is_settled
            and self.reached_by_three
        )


def identity_charge_closure() -> ChargeClosure:
    """The identity closure on FOUR."""
    return ChargeClosure("id", lambda charge: charge)


def charge_join_closure(target: BL[int]) -> ChargeClosure:
    """The closure ``x |-> x join_k target``."""
    return ChargeClosure(f"join-{target!r}", lambda charge: FOUR.join_k(charge, target))


def charge_closure_laws(closure: ChargeClosure) -> bool:
    """Check inflationary, monotone, and idempotent laws over FOUR."""
    inflationary = all(FOUR.leq_k(charge, closure(charge)) for charge in CHARGES)
    monotone = all(
        FOUR.leq_k(closure(left), closure(right))
        for left in CHARGES
        for right in CHARGES
        if FOUR.leq_k(left, right)
    )
    idempotent = all(closure(closure(charge)) == closure(charge) for charge in CHARGES)
    return inflationary and monotone and idempotent


def valuations(cells: Sequence[K]) -> tuple[dict[K, BL[int]], ...]:
    """Enumerate all total FOUR-valuations on ``cells``."""
    unique_cells = tuple(dict.fromkeys(cells))
    return tuple(
        dict(zip(unique_cells, charges, strict=True))
        for charges in product(CHARGES, repeat=len(unique_cells))
    )


def valuation_leq(
    left: Mapping[K, BL[int]],
    right: Mapping[K, BL[int]],
    cells: Sequence[K] | None = None,
) -> bool:
    """Pointwise knowledge order on valuations."""
    keys = tuple(left) if cells is None else tuple(cells)
    return all(FOUR.leq_k(left[cell], right[cell]) for cell in keys)


def valuation_eq(
    left: Mapping[K, BL[int]],
    right: Mapping[K, BL[int]],
    cells: Sequence[K] | None = None,
) -> bool:
    """Pointwise equality on valuations."""
    if cells is None and set(left) != set(right):
        return False
    keys = tuple(left) if cells is None else tuple(cells)
    return all(left[cell] == right[cell] for cell in keys)


def valuation_join_k(
    left: Mapping[K, BL[int]],
    right: Mapping[K, BL[int]],
    cells: Sequence[K] | None = None,
) -> dict[K, BL[int]]:
    """Pointwise knowledge join of two total valuations."""
    keys = tuple(left) if cells is None else tuple(cells)
    return {cell: FOUR.join_k(left[cell], right[cell]) for cell in keys}


def lift_op(closure: ChargeClosure, valuation: Mapping[K, BL[int]]) -> dict[K, BL[int]]:
    """Lift a charge closure pointwise to a valuation closure."""
    return {cell: closure(charge) for cell, charge in valuation.items()}


def iter_valuation(
    closure: ChargeClosure,
    valuation: Mapping[K, BL[int]],
    steps: int,
) -> dict[K, BL[int]]:
    """Iterate the pointwise valuation closure ``steps`` times."""
    if steps < 0:
        msg = "steps must be nonnegative"
        raise ValueError(msg)
    current = dict(valuation)
    for _ in range(steps):
        current = lift_op(closure, current)
    return current


def reindex(
    base_map: Mapping[K, K] | Callable[[K], K],
    valuation: Mapping[K, BL[int]],
    cells: Sequence[K],
) -> dict[K, BL[int]]:
    """Pull a valuation back along ``base_map`` by precomposition."""
    if callable(base_map):
        return {cell: valuation[base_map(cell)] for cell in cells}
    return {cell: valuation[base_map[cell]] for cell in cells}


def pointwise_family(
    closure: ChargeClosure,
    cells: Sequence[K],
    base_map: Mapping[K, K] | Callable[[K], K] | None = None,
) -> CNaturalFamilyWitness:
    """Bundle the pointwise closure-family laws on the sampled finite base."""
    all_values = valuations(cells)
    actual_map = {cell: cell for cell in cells} if base_map is None else base_map
    return CNaturalFamilyWitness(
        inflationary=all(
            valuation_leq(value, lift_op(closure, value), cells) for value in all_values
        ),
        monotone=all(
            valuation_leq(lift_op(closure, left), lift_op(closure, right), cells)
            for left in all_values
            for right in all_values
            if valuation_leq(left, right, cells)
        ),
        idempotent=all(
            valuation_eq(lift_op(closure, lift_op(closure, value)), lift_op(closure, value), cells)
            for value in all_values
        ),
        c_natural=all(
            valuation_eq(
                lift_op(closure, reindex(actual_map, value, cells)),
                reindex(actual_map, lift_op(closure, value), cells),
                cells,
            )
            for value in all_values
        ),
    )


def no_periodic_orbits(closure: ChargeClosure, valuation: Mapping[K, BL[int]], period: int) -> bool:
    """If a positive-period orbit returns to start, the valuation is already fixed."""
    if period < 1:
        msg = "period must be positive"
        raise ValueError(msg)
    if not valuation_eq(iter_valuation(closure, valuation, period), valuation):
        return True
    return valuation_eq(lift_op(closure, valuation), valuation)


def closure_merge(
    closure: ChargeClosure,
    left: Mapping[K, BL[int]],
    right: Mapping[K, BL[int]],
    cells: Sequence[K] | None = None,
) -> bool:
    """Check ``cl(join_k(cl(X), Y)) = cl(join_k(X, Y))`` pointwise."""
    keys = tuple(left) if cells is None else tuple(cells)
    saturated_first = lift_op(closure, valuation_join_k(lift_op(closure, left), right, keys))
    saturated_once = lift_op(closure, valuation_join_k(left, right, keys))
    return valuation_eq(saturated_first, saturated_once, keys)


def settle_lift(closure: ChargeClosure, seed: Mapping[K, BL[int]]) -> dict[K, BL[int]]:
    """The settled valuation under a pointwise closure."""
    return lift_op(closure, seed)


def lfp_is_settled(
    closure: ChargeClosure,
    seed: Mapping[K, BL[int]],
    cells: Sequence[K] | None = None,
) -> bool:
    """Check that ``cl(seed)`` is the least fixed point above ``seed``."""
    keys = tuple(seed) if cells is None else tuple(cells)
    settled = settle_lift(closure, seed)
    fixed = valuation_eq(lift_op(closure, settled), settled, keys)
    least = all(
        valuation_leq(settled, candidate, keys)
        for candidate in valuations(keys)
        if valuation_leq(seed, candidate, keys)
        and valuation_eq(lift_op(closure, candidate), candidate, keys)
    )
    return fixed and least


def lfp_reached_by_three(closure: ChargeClosure, valuation: Mapping[K, BL[int]]) -> bool:
    """Check the finite closure-orbit stabilization bound at step three."""
    return valuation_eq(
        iter_valuation(closure, valuation, 3), iter_valuation(closure, valuation, 4)
    )


def closure_operator_fiber_laws(
    closure: ChargeClosure,
    cells: Sequence[K],
    base_map: Mapping[K, K] | Callable[[K], K] | None = None,
) -> ClosureOperatorFiberWitness:
    """Bundle the finite operational-engine laws for a pointwise closure."""
    all_values = valuations(cells)
    return ClosureOperatorFiberWitness(
        pointwise_family=pointwise_family(closure, cells, base_map).holds,
        no_periodic_orbits=all(
            no_periodic_orbits(closure, value, period)
            for value in all_values
            for period in (1, 2, 3, 4)
        ),
        closure_merge=all(
            closure_merge(closure, left, right, cells)
            for left in all_values
            for right in all_values
        ),
        lfp_is_settled=all(lfp_is_settled(closure, value, cells) for value in all_values),
        reached_by_three=all(lfp_reached_by_three(closure, value) for value in all_values),
    )
