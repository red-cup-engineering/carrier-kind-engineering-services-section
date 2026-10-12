"""Settling monotonicity, quiescence, and cosettling."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

from pymetrologic import BL, boolean, four
from pymetrologic.closure import FiniteLattice, fixed_points, is_closure, iterate_to_fixpoint
from pymetrologic.closure import knowledge_lattice as make_knowledge_lattice
from pymetrologic.dynamics import closure_orbit

E = TypeVar("E")
Closure = Callable[[E], E]

__all__ = [
    "Closure",
    "CosettlingWitness",
    "SettlingMonotonicityQuiescenceWitness",
    "cosettling_join_subsemilattice",
    "cosettling_preimages",
    "is_quiescent",
    "orbit_constant_from",
    "orbit_constant_iff_fixed",
    "orbit_le_succ",
    "orbit_monotone",
    "sample_settling_monotonicity_quiescence",
    "sample_truth_join_closure",
    "settle_least_quiescent",
    "settle_quiescent",
    "settled_value",
    "settling_monotonicity_quiescence_witness",
]


@dataclass(frozen=True, slots=True)
class CosettlingWitness:
    """Finite witness for one cosettling fiber ``T^-1(w)``."""

    stable_value_is_fixed: bool
    containment: bool
    maximum: bool
    join_closed: bool
    preimage_count: int

    @property
    def holds(self) -> bool:
        """All cosettling checks hold."""

        return (
            self.stable_value_is_fixed
            and self.containment
            and self.maximum
            and self.join_closed
            and self.preimage_count >= 1
        )


@dataclass(frozen=True, slots=True)
class SettlingMonotonicityQuiescenceWitness:
    """Executable bundle for ``Closure.SettlingMonotonicityQuiescence``."""

    closure_laws: bool
    orbit_step_ascends: bool
    orbit_is_monotone: bool
    quiescent_iff_fixed: bool
    orbit_constant_iff_fixed: bool
    settled_quiescent: bool
    settled_least_quiescent: bool
    cosettling: CosettlingWitness

    @property
    def holds(self) -> bool:
        """All finite settling checks hold."""

        return (
            self.closure_laws
            and self.orbit_step_ascends
            and self.orbit_is_monotone
            and self.quiescent_iff_fixed
            and self.orbit_constant_iff_fixed
            and self.settled_quiescent
            and self.settled_least_quiescent
            and self.cosettling.holds
        )


def orbit_le_succ(lat: FiniteLattice[E], closure: Closure[E], seed: E, n: int) -> bool:
    """Check ``orbit n <= orbit (n+1)`` for one closure step."""

    if n < 0:
        msg = "n must be nonnegative"
        raise ValueError(msg)
    orbit = closure_orbit(lat, closure, seed, steps=n + 1)
    return lat.leq(orbit[n], orbit[n + 1])


def orbit_monotone(lat: FiniteLattice[E], closure: Closure[E], seed: E, *, steps: int) -> bool:
    """Check ``m <= n -> orbit m <= orbit n`` over a finite prefix."""

    orbit = closure_orbit(lat, closure, seed, steps=steps)
    return all(lat.leq(orbit[i], orbit[j]) for i in range(len(orbit)) for j in range(i, len(orbit)))


def is_quiescent(lat: FiniteLattice[E], closure: Closure[E], value: E) -> bool:
    """A quiescent value is exactly a closure fixed point."""

    return lat.eq(closure(value), value)


def orbit_constant_from(
    lat: FiniteLattice[E],
    closure: Closure[E],
    seed: E,
    index: int,
    *,
    horizon: int,
) -> bool:
    """Check that the orbit is constant from ``index`` through ``horizon`` later steps."""

    if index < 0 or horizon < 1:
        msg = "index must be nonnegative and horizon must be positive"
        raise ValueError(msg)
    orbit = closure_orbit(lat, closure, seed, steps=index + horizon)
    base = orbit[index]
    return all(lat.eq(orbit[index + offset], base) for offset in range(horizon + 1))


def orbit_constant_iff_fixed(
    lat: FiniteLattice[E],
    closure: Closure[E],
    seed: E,
    index: int,
    *,
    horizon: int,
) -> bool:
    """Finite check of ``orbit constant from k`` iff ``orbit k`` is fixed."""

    orbit = closure_orbit(lat, closure, seed, steps=index)
    fixed = is_quiescent(lat, closure, orbit[index])
    constant = orbit_constant_from(lat, closure, seed, index, horizon=horizon)
    return constant == fixed


def settled_value(lat: FiniteLattice[E], closure: Closure[E], seed: E) -> E:
    """The settled value reached by iterating the closure from ``seed``."""

    return iterate_to_fixpoint(lat, closure, seed)[0]


def settle_quiescent(lat: FiniteLattice[E], closure: Closure[E], seed: E) -> bool:
    """Check that the settled value is quiescent."""

    return is_quiescent(lat, closure, settled_value(lat, closure, seed))


def settle_least_quiescent(lat: FiniteLattice[E], closure: Closure[E], seed: E) -> bool:
    """Check that the settled value is the least quiescent value above ``seed``."""

    settled = settled_value(lat, closure, seed)
    candidates = tuple(value for value in fixed_points(lat, closure) if lat.leq(seed, value))
    return all(lat.leq(settled, value) for value in candidates)


def cosettling_preimages(
    lat: FiniteLattice[E],
    closure: Closure[E],
    stable_value: E,
) -> tuple[E, ...]:
    """The one-step preimages ``{v : closure(v) = stable_value}``."""

    return tuple(value for value in lat.elements if lat.eq(closure(value), stable_value))


def cosettling_join_subsemilattice(
    lat: FiniteLattice[E],
    closure: Closure[E],
    stable_value: E,
) -> CosettlingWitness:
    """Check the cosettling containment/top/join-subsemilattice laws."""

    preimages = cosettling_preimages(lat, closure, stable_value)
    stable_value_is_fixed = is_quiescent(lat, closure, stable_value)
    containment = all(lat.leq(value, stable_value) for value in preimages)
    maximum = any(lat.eq(value, stable_value) for value in preimages) and all(
        lat.leq(value, stable_value) for value in preimages
    )
    join_closed = all(
        any(lat.eq(candidate, lat.join(left, right)) for candidate in preimages)
        for left in preimages
        for right in preimages
    )
    return CosettlingWitness(
        stable_value_is_fixed=stable_value_is_fixed,
        containment=containment,
        maximum=maximum,
        join_closed=join_closed,
        preimage_count=len(preimages),
    )


def sample_truth_join_closure() -> tuple[FiniteLattice[BL[int]], Closure[BL[int]], BL[int]]:
    """A small FOUR-valued closure used by the executable witness."""

    lat = make_knowledge_lattice(boolean())
    bl = four()
    return lat, lambda value: lat.join(value, bl.true), bl.none


def settling_monotonicity_quiescence_witness() -> SettlingMonotonicityQuiescenceWitness:
    """Bundle executable checks for the Lean settling-monotonicity node."""

    lat, closure, seed = sample_truth_join_closure()
    stable = settled_value(lat, closure, seed)
    return SettlingMonotonicityQuiescenceWitness(
        closure_laws=is_closure(lat, closure),
        orbit_step_ascends=all(orbit_le_succ(lat, closure, seed, n) for n in range(3)),
        orbit_is_monotone=orbit_monotone(lat, closure, seed, steps=4),
        quiescent_iff_fixed=all(
            is_quiescent(lat, closure, value) == lat.eq(closure(value), value)
            for value in lat.elements
        ),
        orbit_constant_iff_fixed=all(
            orbit_constant_iff_fixed(lat, closure, seed, index, horizon=3) for index in range(3)
        ),
        settled_quiescent=settle_quiescent(lat, closure, seed),
        settled_least_quiescent=settle_least_quiescent(lat, closure, seed),
        cosettling=cosettling_join_subsemilattice(lat, closure, stable),
    )


def sample_settling_monotonicity_quiescence() -> SettlingMonotonicityQuiescenceWitness:
    """Alias for notebook-friendly sampling."""

    return settling_monotonicity_quiescence_witness()
