"""Transfinite closure flow (RelMath.Flow.TransfiniteClosureFlow).

This module lifts a finite closure orbit to the internal Brouwer/tree ordinal
carrier from :mod:`pymetrologic.ordinal`. Finite ordinals read ordinary orbit
stages; a limit ordinal reads the settled value ``closure(seed)``. At the
canonical limit ``omega`` this gives an executable version of settling
continuity: the limit value is the least upper bound of the finite predecessor
chain, and therefore no non-Scott-continuous firing occurs there.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic.closure import FiniteLattice, is_closure
from pymetrologic.dynamics import closure_orbit
from pymetrologic.ordinal import Ord, of_nat, omega, to_nat

E = TypeVar("E")

__all__ = [
    "OmegaContinuityWitness",
    "TransfiniteSettlingContinuity",
    "omega_value",
    "tflow_chain_le_omega",
    "tflow_continuous_at_omega",
    "tflow_finite_prefix",
    "tflow_monotone_chain",
    "tflow_no_nsc_firing_omega",
    "tflow_value",
    "transfinite_settling_continuity",
]


@dataclass(frozen=True)
class OmegaContinuityWitness(Generic[E]):
    """The two LUB legs of settling-continuity at ``omega``."""

    limit_value: E
    finite_prefix: tuple[E, ...]
    upper_bound: bool
    least_upper_bound: bool

    @property
    def holds(self) -> bool:
        """The omega-limit value is the LUB of the finite predecessor chain."""
        return self.upper_bound and self.least_upper_bound


@dataclass(frozen=True)
class TransfiniteSettlingContinuity(Generic[E]):
    """Executable bundle of the Lean ``transfinite_settling_continuity`` theorem."""

    monotone_finite_chain: bool
    finite_chain_below_omega: bool
    omega_continuity: OmegaContinuityWitness[E]
    no_nsc_firing_at_omega: bool

    @property
    def holds(self) -> bool:
        """All legs of the transfinite settling-continuity theorem hold."""
        return (
            self.monotone_finite_chain
            and self.finite_chain_below_omega
            and self.omega_continuity.holds
            and self.no_nsc_firing_at_omega
        )


def omega_value(closure: Callable[[E], E], seed: E) -> E:
    """The value of the concrete transfinite flow at ``omega``: ``closure(seed)``."""
    return closure(seed)


def tflow_value(lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, ordinal: Ord) -> E:
    """The concrete transfinite closure flow.

    Finite ordinals evaluate the ordinary closure orbit. Limit ordinals evaluate
    the settled value, matching Lean's ``tflowOf_limit``.
    """

    if ordinal.kind == "limit":
        return omega_value(closure, seed)
    return closure_orbit(lat, closure, seed, steps=to_nat(ordinal))[-1]


def tflow_finite_prefix(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int
) -> tuple[E, ...]:
    """Return ``[tflow(ofNat 0), ..., tflow(ofNat stages)]``."""

    if stages < 0:
        msg = "stages must be nonnegative"
        raise ValueError(msg)
    return tuple(tflow_value(lat, closure, seed, of_nat(n)) for n in range(stages + 1))


def tflow_monotone_chain(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int = 8
) -> bool:
    """Check monotonicity along the genuine finite ordinal chain."""

    prefix = tflow_finite_prefix(lat, closure, seed, stages=stages)
    return all(
        lat.leq(prefix[i], prefix[j]) for i in range(len(prefix)) for j in range(i, len(prefix))
    )


def tflow_chain_le_omega(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int = 8
) -> bool:
    """Every checked finite stage is below the omega-limit value."""

    limit_value = tflow_value(lat, closure, seed, omega)
    return all(
        lat.leq(value, limit_value)
        for value in tflow_finite_prefix(lat, closure, seed, stages=stages)
    )


def tflow_continuous_at_omega(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int = 8
) -> OmegaContinuityWitness[E]:
    """The omega-limit value is the LUB of the finite predecessor chain.

    The least-upper-bound leg is checked over the finite carrier. The stage-1
    predecessor is already ``closure(seed)`` for any closure operator, so any
    upper bound of the predecessor chain must bound the limit value.
    """

    if not is_closure(lat, closure):
        msg = "transfinite settling-continuity requires a closure operator"
        raise ValueError(msg)
    prefix = tflow_finite_prefix(lat, closure, seed, stages=max(1, stages))
    limit_value = omega_value(closure, seed)
    upper_bound = all(lat.leq(value, limit_value) for value in prefix)
    least_upper_bound = all(
        lat.leq(limit_value, candidate)
        for candidate in lat.elements
        if all(lat.leq(value, candidate) for value in prefix)
    )
    return OmegaContinuityWitness(
        limit_value=limit_value,
        finite_prefix=prefix,
        upper_bound=upper_bound,
        least_upper_bound=least_upper_bound,
    )


def tflow_no_nsc_firing_omega(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int = 8
) -> bool:
    """No NSC firing occurs at ``omega`` when settling-continuity holds there."""
    return tflow_continuous_at_omega(lat, closure, seed, stages=stages).holds


def transfinite_settling_continuity(
    lat: FiniteLattice[E], closure: Callable[[E], E], seed: E, *, stages: int = 8
) -> TransfiniteSettlingContinuity[E]:
    """Bundle monotone finite chain, omega LUB continuity, and no omega NSC firing."""

    continuity = tflow_continuous_at_omega(lat, closure, seed, stages=stages)
    return TransfiniteSettlingContinuity(
        monotone_finite_chain=tflow_monotone_chain(lat, closure, seed, stages=stages),
        finite_chain_below_omega=tflow_chain_le_omega(lat, closure, seed, stages=stages),
        omega_continuity=continuity,
        no_nsc_firing_at_omega=continuity.holds,
    )
