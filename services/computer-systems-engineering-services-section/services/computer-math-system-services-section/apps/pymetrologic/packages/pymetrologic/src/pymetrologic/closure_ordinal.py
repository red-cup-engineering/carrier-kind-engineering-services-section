"""Finite closure ordinals over FOUR (``RelMath.Closure.ClosureOrdinal``).

Lean proves that every inflationary endomap on the finite charge lattice settles
by ``kHeight = Corner.all.length - 1``. In Python we can earn the same theorem by
enumerating the whole finite surface: FOUR has exactly 16 inflationary endomaps,
and every one reaches a fixed point by step 3 from every starting charge.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, four
from pymetrologic.ordinal import is_finite, of_nat, to_nat
from pymetrologic.quartet import CORNERS

__all__ = [
    "CHARGES",
    "CHARGE_K_HEIGHT",
    "ChargeEndomap",
    "ChargeMap",
    "ClosureOrdinalWitness",
    "charge_inflationary",
    "charge_iter",
    "charge_iter_add_holds",
    "charge_iter_fixed_of",
    "charge_iter_mono_holds",
    "charge_iter_stable",
    "charge_kchain_height_holds",
    "charge_map_value",
    "charge_settled_fixed",
    "charge_settled_is_omega_lub",
    "charge_settles_by",
    "charge_settles_by_three",
    "closure_ordinal_witness",
    "inflationary_charge_endomaps",
]


_FOUR = four()
CHARGES: tuple[BL[int], ...] = (_FOUR.none, _FOUR.true, _FOUR.false, _FOUR.conflict)
CHARGE_K_HEIGHT = len(CORNERS) - 1

ChargeEndomap = Callable[[BL[int]], BL[int]]
ChargeMap = tuple[BL[int], ...]


def charge_iter(f: ChargeEndomap, n: int, x: BL[int]) -> BL[int]:
    """``iter f n x = f^n x``: the finite settling orbit."""
    if n < 0:
        raise ValueError("iteration count must be nonnegative")
    value = x
    for _ in range(n):
        value = f(value)
    return value


def charge_map_value(mapping: ChargeMap, x: BL[int]) -> BL[int]:
    """Apply an endomap encoded by images in canonical charge order."""
    if len(mapping) != len(CHARGES):
        raise ValueError("charge map must have one image for each FOUR charge")
    return mapping[CHARGES.index(x)]


def _map_fn(mapping: ChargeMap) -> ChargeEndomap:
    return lambda x: charge_map_value(mapping, x)


def charge_inflationary(f: ChargeEndomap) -> bool:
    """Every charge climbs in the knowledge order: ``x ≤ₖ f(x)``."""
    return all(_FOUR.leq_k(x, f(x)) for x in CHARGES)


def inflationary_charge_endomaps() -> tuple[ChargeMap, ...]:
    """All inflationary endomaps of FOUR, encoded by canonical image tuples."""
    choices = tuple(tuple(y for y in CHARGES if _FOUR.leq_k(x, y)) for x in CHARGES)
    return tuple(mapping for mapping in product(*choices) if charge_inflationary(_map_fn(mapping)))


def charge_iter_fixed_of(f: ChargeEndomap, a: BL[int], depth: int = CHARGE_K_HEIGHT + 1) -> bool:
    """A fixed point stays fixed under all checked finite iterates."""
    if depth < 0:
        raise ValueError("depth must be nonnegative")
    if f(a) != a:
        return False
    return all(charge_iter(f, n, a) == a for n in range(depth + 1))


def charge_iter_add_holds(f: ChargeEndomap, x: BL[int], m: int, n: int) -> bool:
    """Iteration adds: ``f^(n+m)(x) = f^m(f^n(x))``."""
    if m < 0 or n < 0:
        raise ValueError("iteration counts must be nonnegative")
    return charge_iter(f, n + m, x) == charge_iter(f, m, charge_iter(f, n, x))


def charge_iter_mono_holds(f: ChargeEndomap, x: BL[int], k: int, m: int) -> bool:
    """The inflationary orbit is monotone whenever ``k ≤ m``."""
    if k < 0 or m < 0:
        raise ValueError("iteration counts must be nonnegative")
    if k > m:
        raise ValueError("expected k <= m")
    if not charge_inflationary(f):
        return False
    return _FOUR.leq_k(charge_iter(f, k, x), charge_iter(f, m, x))


def charge_kchain_height_holds() -> bool:
    """No ``≤ₖ`` chain of four charges has all three adjacent links strict."""
    for a, b, c, d in product(CHARGES, repeat=4):
        if (
            _FOUR.leq_k(a, b)
            and _FOUR.leq_k(b, c)
            and _FOUR.leq_k(c, d)
            and a != b
            and b != c
            and c != d
        ):
            return False
    return True


def charge_settles_by(f: ChargeEndomap, x: BL[int], n: int) -> bool:
    """``f`` settles ``x`` by step ``n``: adjacent iterates agree there."""
    if n < 0:
        raise ValueError("settling bound must be nonnegative")
    return charge_iter(f, n + 1, x) == charge_iter(f, n, x)


def charge_settles_by_three(f: ChargeEndomap, x: BL[int]) -> bool:
    """Strict-finite termination at FOUR's derived height ``3``."""
    return charge_inflationary(f) and charge_settles_by(f, x, CHARGE_K_HEIGHT)


def charge_settled_fixed(f: ChargeEndomap, x: BL[int]) -> bool:
    """The value at ``kHeight`` is an actual fixed point."""
    if not charge_inflationary(f):
        return False
    settled = charge_iter(f, CHARGE_K_HEIGHT, x)
    return f(settled) == settled


def charge_iter_stable(f: ChargeEndomap, x: BL[int], k: int) -> bool:
    """After ``kHeight`` the orbit is constant at its settled value."""
    if k < CHARGE_K_HEIGHT:
        raise ValueError("stability is only claimed at or after kHeight")
    if not charge_inflationary(f):
        return False
    return charge_iter(f, k, x) == charge_iter(f, CHARGE_K_HEIGHT, x)


def charge_settled_is_omega_lub(f: ChargeEndomap, x: BL[int]) -> bool:
    """The finite settled value is the knowledge-order LUB of the whole orbit."""
    if not charge_inflationary(f):
        return False
    settled = charge_iter(f, CHARGE_K_HEIGHT, x)
    finite_prefix = tuple(charge_iter(f, k, x) for k in range(CHARGE_K_HEIGHT + 1))
    upper_bound = all(_FOUR.leq_k(stage, settled) for stage in finite_prefix)
    least_upper_bound = all(
        _FOUR.leq_k(settled, w)
        for w in CHARGES
        if all(_FOUR.leq_k(stage, w) for stage in finite_prefix)
    )
    return upper_bound and least_upper_bound


@dataclass(frozen=True, slots=True)
class ClosureOrdinalWitness:
    """Executable witness for the strict-finite closure-ordinal theorem."""

    k_height: int
    inflationary_endomaps_checked: int
    k_height_eq_three: bool
    closure_ordinal_is_finite: bool
    kchain_height: bool
    iter_step_le: bool
    iter_add: bool
    iter_fixed_of: bool
    settles_by_k_height: bool
    settled_fixed: bool
    omega_lub_collapses: bool

    @property
    def holds(self) -> bool:
        return (
            self.k_height_eq_three
            and self.closure_ordinal_is_finite
            and self.kchain_height
            and self.iter_step_le
            and self.iter_add
            and self.iter_fixed_of
            and self.settles_by_k_height
            and self.settled_fixed
            and self.omega_lub_collapses
        )


def closure_ordinal_witness() -> ClosureOrdinalWitness:
    """Check the whole finite theorem surface over all inflationary FOUR maps."""
    maps = inflationary_charge_endomaps()
    map_fns = tuple(_map_fn(mapping) for mapping in maps)
    closure_ordinal = of_nat(CHARGE_K_HEIGHT)

    return ClosureOrdinalWitness(
        k_height=CHARGE_K_HEIGHT,
        inflationary_endomaps_checked=len(maps),
        k_height_eq_three=CHARGE_K_HEIGHT == 3,
        closure_ordinal_is_finite=(
            is_finite(closure_ordinal) and to_nat(closure_ordinal) == CHARGE_K_HEIGHT
        ),
        kchain_height=charge_kchain_height_holds(),
        iter_step_le=all(
            _FOUR.leq_k(charge_iter(f, n, x), charge_iter(f, n + 1, x))
            for f in map_fns
            for x in CHARGES
            for n in range(CHARGE_K_HEIGHT + 1)
        ),
        iter_add=all(
            charge_iter_add_holds(f, x, m, n)
            for f in map_fns
            for x in CHARGES
            for m in range(CHARGE_K_HEIGHT + 1)
            for n in range(CHARGE_K_HEIGHT + 1)
        ),
        iter_fixed_of=all(
            charge_iter_fixed_of(f, charge_iter(f, CHARGE_K_HEIGHT, x))
            for f in map_fns
            for x in CHARGES
        ),
        settles_by_k_height=all(
            charge_settles_by(f, x, CHARGE_K_HEIGHT) for f in map_fns for x in CHARGES
        ),
        settled_fixed=all(charge_settled_fixed(f, x) for f in map_fns for x in CHARGES),
        omega_lub_collapses=all(
            charge_settled_is_omega_lub(f, x) for f in map_fns for x in CHARGES
        ),
    )
