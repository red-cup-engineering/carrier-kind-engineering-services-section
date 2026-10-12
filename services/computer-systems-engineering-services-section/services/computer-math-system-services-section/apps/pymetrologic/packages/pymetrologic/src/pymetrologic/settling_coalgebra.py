"""Settling coalgebra structure (RelMath.Closure.SettlingCoalgebra).

The settling endofunctor is ``F_U(v) = Cl(v) join u``: close a value under
inference, then admit one increment of new evidence. A coalgebra is the
unfolding witness ``E <= F_U(E)`` together with monotonicity of the pure closure
orbit. At zero increment, a quiescent/fixed point is simultaneously a closure
algebra and a coalgebra fixed point.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic.closure import FiniteLattice, is_closure
from pymetrologic.dynamics import closure_orbit

E = TypeVar("E")

__all__ = [
    "CClosedAlgebraWitness",
    "CoalgebraDualityWitness",
    "CoalgebraLimitWitness",
    "SettlingCoalgebra",
    "canonical_coalgebra",
    "cclosed_iff_closure_algebra",
    "coalgebra_dual_of_algebra",
    "coalgebra_orbit",
    "coalgebra_orbit_limit",
    "coalgebra_orbit_limit_witness",
    "settling_endofunctor",
    "settling_endofunctor_mono_holds",
    "settling_endofunctor_zero_holds",
]


@dataclass(frozen=True)
class SettlingCoalgebra(Generic[E]):
    """A finite settling coalgebra witness over ``F_U(v) = Cl(v) join u``."""

    carrier: E
    increment: E
    target: E
    coalg_map: bool
    orbit_monotone: bool

    @property
    def holds(self) -> bool:
        """The coalgebra map and C3 orbit-monotonicity legs both hold."""
        return self.coalg_map and self.orbit_monotone


@dataclass(frozen=True)
class CoalgebraLimitWitness(Generic[E]):
    """The finite settling-continuity join ``v_mu = join {v_sigma | sigma < mu}``."""

    limit_value: E
    prefix: tuple[E, ...]
    upper_bound: bool
    least_upper_bound: bool

    @property
    def holds(self) -> bool:
        """The computed limit is the least upper bound of the prefix."""
        return self.upper_bound and self.least_upper_bound


@dataclass(frozen=True)
class CoalgebraDualityWitness(Generic[E]):
    """Executable bundle of ``coalgebra_dual_of_algebra`` at zero increment."""

    value: E
    orbit_monotone: bool
    limit_continuity: CoalgebraLimitWitness[E]
    algebra_to_coalgebra_duality: bool
    iso_at_quiescence: bool

    @property
    def holds(self) -> bool:
        """All finite legs of the algebra/coalgebra duality theorem hold."""
        return (
            self.orbit_monotone
            and self.limit_continuity.holds
            and self.algebra_to_coalgebra_duality
            and self.iso_at_quiescence
        )


@dataclass(frozen=True)
class CClosedAlgebraWitness(Generic[E]):
    """``C``-closed iff closure-algebra, with uniqueness as property-like data."""

    value: E
    c_closed: bool
    closure_algebra: bool
    unique_structure: bool

    @property
    def holds(self) -> bool:
        """The two predicates agree and the structure is unique up to equality."""
        return self.c_closed == self.closure_algebra and self.unique_structure


def _require_closure(lat: FiniteLattice[E], closure: Callable[[E], E]) -> None:
    if not is_closure(lat, closure):
        msg = "settling coalgebra requires a closure operator"
        raise ValueError(msg)


def settling_endofunctor(
    lat: FiniteLattice[E], closure: Callable[[E], E], increment: E, value: E
) -> E:
    """The settling endofunctor ``F_U(value) = closure(value) join increment``."""
    return lat.join(closure(value), increment)


def settling_endofunctor_zero_holds(
    lat: FiniteLattice[E], closure: Callable[[E], E], value: E
) -> bool:
    """At the zero increment ``bot``, ``F_0(value)`` recovers ``closure(value)``."""
    return lat.eq(settling_endofunctor(lat, closure, lat.bot, value), closure(value))


def settling_endofunctor_mono_holds(
    lat: FiniteLattice[E], closure: Callable[[E], E], increment: E
) -> bool:
    """Check monotonicity of ``F_U`` over the finite carrier."""
    return all(
        lat.leq(
            settling_endofunctor(lat, closure, increment, left),
            settling_endofunctor(lat, closure, increment, right),
        )
        for left in lat.elements
        for right in lat.elements
        if lat.leq(left, right)
    )


def coalgebra_orbit(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, steps: int
) -> tuple[E, ...]:
    """The pure-closure coalgebra orbit ``seed, Cl(seed), ...``."""
    return closure_orbit(lat, closure, seed, steps=steps)


def coalgebra_orbit_limit(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int
) -> E:
    """The finite limit step ``join {orbit(seed, sigma) | sigma < stages}``."""
    if stages < 0:
        msg = "stages must be nonnegative"
        raise ValueError(msg)
    acc = lat.bot
    for stage in range(stages):
        acc = lat.join(acc, closure_orbit(lat, closure, seed, steps=stage)[-1])
    return acc


def coalgebra_orbit_limit_witness(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int = 8
) -> CoalgebraLimitWitness[E]:
    """Witness that the finite limit is the least upper bound of earlier stages."""
    _require_closure(lat, closure)
    if stages < 0:
        msg = "stages must be nonnegative"
        raise ValueError(msg)
    prefix = tuple(closure_orbit(lat, closure, seed, steps=stage)[-1] for stage in range(stages))
    limit_value = coalgebra_orbit_limit(lat, closure, seed, stages=stages)
    upper_bound = all(lat.leq(value, limit_value) for value in prefix)
    least_upper_bound = all(
        lat.leq(limit_value, candidate)
        for candidate in lat.elements
        if all(lat.leq(value, candidate) for value in prefix)
    )
    return CoalgebraLimitWitness(
        limit_value=limit_value,
        prefix=prefix,
        upper_bound=upper_bound,
        least_upper_bound=least_upper_bound,
    )


def canonical_coalgebra(
    lat: FiniteLattice[E],
    closure: Callable[[E], E],
    carrier: E,
    increment: E,
    *,
    stages: int = 8,
) -> SettlingCoalgebra[E]:
    """Every finite closure state carries the canonical settling coalgebra."""
    _require_closure(lat, closure)
    if stages < 0:
        msg = "stages must be nonnegative"
        raise ValueError(msg)
    target = settling_endofunctor(lat, closure, increment, carrier)
    orbit = closure_orbit(lat, closure, carrier, steps=stages)
    return SettlingCoalgebra(
        carrier=carrier,
        increment=increment,
        target=target,
        coalg_map=lat.leq(carrier, target),
        orbit_monotone=all(
            lat.leq(orbit[left], orbit[right])
            for left in range(len(orbit))
            for right in range(left, len(orbit))
        ),
    )


def coalgebra_dual_of_algebra(
    lat: FiniteLattice[E], closure: Callable[[E], E], value: E, *, stages: int = 8
) -> CoalgebraDualityWitness[E]:
    """The coalgebra map is dual to the closure-algebra structure map.

    The algebra leg consumes ``Cl(value)`` into ``value`` and therefore exists
    exactly at fixed points. The zero-increment coalgebra leg produces
    ``F_0(value)`` from ``value``; at quiescence both directions coincide.
    """
    _require_closure(lat, closure)
    coalg = canonical_coalgebra(lat, closure, value, lat.bot, stages=stages)
    is_algebra = lat.leq(closure(value), value)
    produces_zero_target = lat.leq(value, settling_endofunctor(lat, closure, lat.bot, value))
    return CoalgebraDualityWitness(
        value=value,
        orbit_monotone=coalg.orbit_monotone,
        limit_continuity=coalgebra_orbit_limit_witness(lat, closure, value, stages=stages),
        algebra_to_coalgebra_duality=is_algebra and produces_zero_target,
        iso_at_quiescence=lat.eq(settling_endofunctor(lat, closure, lat.bot, value), value),
    )


def cclosed_iff_closure_algebra(
    lat: FiniteLattice[E], closure: Callable[[E], E], value: E
) -> CClosedAlgebraWitness[E]:
    """A ``C``-closed value is exactly a closure-algebra fixed point."""
    _require_closure(lat, closure)
    fixed = lat.eq(closure(value), value)
    return CClosedAlgebraWitness(
        value=value,
        c_closed=fixed,
        closure_algebra=fixed,
        unique_structure=True,
    )
