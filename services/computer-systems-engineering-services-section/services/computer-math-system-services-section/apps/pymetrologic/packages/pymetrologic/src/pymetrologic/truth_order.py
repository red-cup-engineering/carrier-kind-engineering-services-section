"""Truth-order closure over FOUR (``RelMath.Positing.TruthOrder``).

Lean proves that FOUR's truth order is a bounded lattice, parallel to the
knowledge order, and that truth-order closures settle by raising values with
``∨_t``. This executable shadow keeps that theorem local to the finite charge
surface while reusing the package's bilattice operations.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, four

__all__ = [
    "TClosure",
    "TruthEndomap",
    "TruthOrderWitness",
    "join_t_closure",
    "negation_preserves_knowledge_order",
    "negation_reverses_truth_order",
    "settle_t",
    "settle_t_fixed",
    "settle_t_tbot_holds",
    "t_closure_holds",
    "t_closure_least",
    "truth_bounds_hold",
    "truth_lattice_laws_hold",
    "truth_order_witness",
]

_FOUR = four()
_CHARGES: tuple[BL[int], ...] = (_FOUR.none, _FOUR.true, _FOUR.false, _FOUR.conflict)
TruthEndomap = Callable[[BL[int]], BL[int]]


@dataclass(frozen=True, slots=True)
class TClosure:
    """A truth-order closure operator over FOUR."""

    op: TruthEndomap

    def inflationary(self) -> bool:
        return all(_FOUR.leq_t(charge, self.op(charge)) for charge in _CHARGES)

    def monotone(self) -> bool:
        return all(
            _FOUR.leq_t(self.op(a), self.op(b))
            for a, b in product(_CHARGES, repeat=2)
            if _FOUR.leq_t(a, b)
        )

    def idempotent(self) -> bool:
        return all(self.op(self.op(charge)) == self.op(charge) for charge in _CHARGES)

    @property
    def holds(self) -> bool:
        return self.inflationary() and self.monotone() and self.idempotent()


def truth_lattice_laws_hold() -> bool:
    """The truth order is a bounded lattice with ``f`` bottom and ``t`` top."""
    reflexive = all(_FOUR.leq_t(a, a) for a in _CHARGES)
    transitive = all(
        _FOUR.leq_t(a, c)
        for a, b, c in product(_CHARGES, repeat=3)
        if _FOUR.leq_t(a, b) and _FOUR.leq_t(b, c)
    )
    antisymmetric = all(
        (a == b) for a, b in product(_CHARGES, repeat=2) if _FOUR.leq_t(a, b) and _FOUR.leq_t(b, a)
    )
    join_is_lub = all(
        _FOUR.leq_t(a, _FOUR.join_t(a, b))
        and _FOUR.leq_t(b, _FOUR.join_t(a, b))
        and all(
            _FOUR.leq_t(_FOUR.join_t(a, b), c)
            for c in _CHARGES
            if _FOUR.leq_t(a, c) and _FOUR.leq_t(b, c)
        )
        for a, b in product(_CHARGES, repeat=2)
    )
    meet_is_glb = all(
        _FOUR.leq_t(_FOUR.meet_t(a, b), a)
        and _FOUR.leq_t(_FOUR.meet_t(a, b), b)
        and all(
            _FOUR.leq_t(c, _FOUR.meet_t(a, b))
            for c in _CHARGES
            if _FOUR.leq_t(c, a) and _FOUR.leq_t(c, b)
        )
        for a, b in product(_CHARGES, repeat=2)
    )
    return reflexive and transitive and antisymmetric and join_is_lub and meet_is_glb


def truth_bounds_hold() -> bool:
    """``f`` is truth-bottom and ``t`` is truth-top."""
    return all(_FOUR.leq_t(_FOUR.false, a) and _FOUR.leq_t(a, _FOUR.true) for a in _CHARGES)


def negation_reverses_truth_order(a: BL[int], b: BL[int]) -> bool:
    """Truth negation reverses ``≤_t``."""
    return _FOUR.leq_t(_FOUR.neg(a), _FOUR.neg(b)) == _FOUR.leq_t(b, a)


def negation_preserves_knowledge_order(a: BL[int], b: BL[int]) -> bool:
    """Truth negation preserves ``≤_k``."""
    return _FOUR.leq_k(_FOUR.neg(a), _FOUR.neg(b)) == _FOUR.leq_k(a, b)


def join_t_closure(k: BL[int]) -> TClosure:
    """The canonical truth-order closure ``a ↦ k ∨_t a``."""
    if k not in _CHARGES:
        raise ValueError("truth closure seed must be one of the four charges")
    return TClosure(lambda a: _FOUR.join_t(k, a))


def t_closure_holds(closure: TClosure) -> bool:
    """Whether an endomap is a truth-order closure."""
    return closure.holds


def settle_t(closure: TClosure, seed: BL[int]) -> BL[int]:
    """Truth-order settling: apply the closure once to reach its fixed point."""
    if seed not in _CHARGES:
        raise ValueError("truth settling seed must be one of the four charges")
    return closure.op(seed)


def settle_t_fixed(closure: TClosure, seed: BL[int]) -> bool:
    """The settled truth value is a fixed point."""
    settled = settle_t(closure, seed)
    return closure.op(settled) == settled


def t_closure_least(closure: TClosure, seed: BL[int], candidate: BL[int]) -> bool:
    """If ``candidate`` is fixed above ``seed``, then ``closure(seed) ≤_t candidate``."""
    if seed not in _CHARGES or candidate not in _CHARGES:
        raise ValueError("truth closure comparison uses FOUR charges")
    premises = _FOUR.leq_t(seed, candidate) and closure.op(candidate) == candidate
    return (not premises) or _FOUR.leq_t(closure.op(seed), candidate)


def settle_t_tbot_holds(k: BL[int]) -> bool:
    """Settling truth-bottom ``f`` toward ``k`` lands on ``k``."""
    return settle_t(join_t_closure(k), _FOUR.false) == k


@dataclass(frozen=True, slots=True)
class TruthOrderWitness:
    """Executable witness bundling the finite ``TruthOrder`` theorem surface."""

    truth_lattice: bool
    truth_bounds: bool
    negation_truth_duality: bool
    negation_knowledge_iso: bool
    canonical_closures: bool
    settled_fixed: bool
    settled_least: bool
    truth_bottom_settles_to_bound: bool

    @property
    def holds(self) -> bool:
        return (
            self.truth_lattice
            and self.truth_bounds
            and self.negation_truth_duality
            and self.negation_knowledge_iso
            and self.canonical_closures
            and self.settled_fixed
            and self.settled_least
            and self.truth_bottom_settles_to_bound
        )


def truth_order_witness() -> TruthOrderWitness:
    """Check every finite leg of ``RelMath.Positing.TruthOrder`` over FOUR."""
    closures = tuple(join_t_closure(k) for k in _CHARGES)
    return TruthOrderWitness(
        truth_lattice=truth_lattice_laws_hold(),
        truth_bounds=truth_bounds_hold(),
        negation_truth_duality=all(
            negation_reverses_truth_order(a, b) for a, b in product(_CHARGES, repeat=2)
        ),
        negation_knowledge_iso=all(
            negation_preserves_knowledge_order(a, b) for a, b in product(_CHARGES, repeat=2)
        ),
        canonical_closures=all(t_closure_holds(closure) for closure in closures),
        settled_fixed=all(
            settle_t_fixed(closure, seed) for closure in closures for seed in _CHARGES
        ),
        settled_least=all(
            t_closure_least(closure, seed, candidate)
            for closure in closures
            for seed, candidate in product(_CHARGES, repeat=2)
        ),
        truth_bottom_settles_to_bound=all(settle_t_tbot_holds(k) for k in _CHARGES),
    )
