"""Strict-regime settling local constancy over finite KZ sheaves.

Executable shadow of ``RelMath.Cohomology.SettlingLocalConstancy``.  The Lean
module is explicit about its scope: in the Nat-indexed strict model, isomorphism
of section maps is equality, predicate local constancy is KZ-coherence plus the
identity law, and settling local constancy is forced because the settling leg is
proof-irrelevant.  The aperiodic failure is frontier prose, not represented by
this finite model.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import TypeVar

from .kz_coherent import FiniteKZSheaf, OneCell, every_sheaf_kzcoherent_strict
from .regimes import ClosureRegime, cohomology_vanishes

V = TypeVar("V")

__all__ = [
    "ConstantSheafLocalConstancyWitness",
    "LocalConstancyVanishingWitness",
    "assoc_sheaf_predicate_locally_constant_iff",
    "constant_sheaf",
    "constant_sheaf_locally_constant",
    "every_sheaf_settling_locally_constant",
    "iso",
    "predicate_locally_constant",
    "predicate_locally_constant_iff",
    "predicate_uniform",
    "settling_locally_constant",
    "vanishing_regime_local_constancy_model",
]


@dataclass(frozen=True, slots=True)
class LocalConstancyVanishingWitness:
    """Witness for the strict/scott local-constancy vanishing model."""

    regime_gate: bool
    regime_is_strict_or_scott: bool
    h1_vanishes: bool
    predicate_constancy_forces_kz: bool
    settling_constancy_forced: bool

    @property
    def holds(self) -> bool:
        """All legs of the finite strict-regime theorem hold."""
        return (
            self.regime_gate
            and self.regime_is_strict_or_scott
            and self.h1_vanishes
            and self.predicate_constancy_forces_kz
            and self.settling_constancy_forced
        )


@dataclass(frozen=True, slots=True)
class ConstantSheafLocalConstancyWitness:
    """Witness for the constant-sheaf local-constancy headline."""

    constant_sheaf_predicate_locally_constant: bool
    associated_sheaf_iff_predicate_uniform: bool

    @property
    def holds(self) -> bool:
        """Both constant-sheaf and associated-sheaf characterization legs hold."""
        return (
            self.constant_sheaf_predicate_locally_constant
            and self.associated_sheaf_iff_predicate_uniform
        )


def iso(left: V, right: V) -> bool:
    """Strict-regime isomorphism of section maps: equality of values."""
    return left == right


def predicate_uniform(sheaf: FiniteKZSheaf[V]) -> bool:
    """KZ-coherence plus pinned identity restrictions."""
    return every_sheaf_kzcoherent_strict(sheaf) and sheaf.compat_id


def predicate_locally_constant(sheaf: FiniteKZSheaf[V]) -> bool:
    """Predicate-local constancy in the finite strict model."""
    return predicate_uniform(sheaf)


def predicate_locally_constant_iff(sheaf: FiniteKZSheaf[V]) -> bool:
    """The Lean equivalence: predicate local constancy iff predicate uniformity."""
    return predicate_locally_constant(sheaf) == predicate_uniform(sheaf)


def settling_locally_constant(sheaf: FiniteKZSheaf[V]) -> bool:
    """Settling-axis local constancy forced by same predicate-leg equality."""
    return all(
        not (
            left.src == right.src
            and left.dst == right.dst
            and left.predicate_leg == right.predicate_leg
        )
        or iso(sheaf.sec(left), sheaf.sec(right))
        for left in sheaf.routes
        for right in sheaf.routes
    )


def every_sheaf_settling_locally_constant(sheaf: FiniteKZSheaf[V]) -> bool:
    """Every finite strict-regime sheaf is settling-locally-constant."""
    return settling_locally_constant(sheaf)


def constant_sheaf(routes: Sequence[OneCell], value: V) -> FiniteKZSheaf[V]:
    """The finite constant sheaf on the supplied route table."""
    route_tuple = tuple(routes)
    objects = {route.src for route in route_tuple} | {route.dst for route in route_tuple}
    return FiniteKZSheaf(
        routes=route_tuple,
        sections={route: value for route in route_tuple},
        rest_ids={obj: value for obj in objects},
        rest_comp=lambda outer, _inner: outer,
    )


def assoc_sheaf_predicate_locally_constant_iff(sheaf: FiniteKZSheaf[V]) -> bool:
    """The associated sheaf is predicate-locally-constant iff predicate-uniform."""
    return predicate_locally_constant_iff(sheaf)


def constant_sheaf_locally_constant(
    routes: Sequence[OneCell],
    value: V,
    associated_sheaf: FiniteKZSheaf[V],
) -> ConstantSheafLocalConstancyWitness:
    """Bundle constant-sheaf local constancy and associated-sheaf characterization."""
    const = constant_sheaf(routes, value)
    return ConstantSheafLocalConstancyWitness(
        constant_sheaf_predicate_locally_constant=predicate_locally_constant(const),
        associated_sheaf_iff_predicate_uniform=assoc_sheaf_predicate_locally_constant_iff(
            associated_sheaf
        ),
    )


def vanishing_regime_local_constancy_model(
    regime: ClosureRegime,
    sheaf: FiniteKZSheaf[V],
) -> LocalConstancyVanishingWitness:
    """Bundle the strict/scott regime gate and local-constancy consequences."""
    if not cohomology_vanishes(regime):
        msg = "local-constancy vanishing model requires a strict or Scott regime"
        raise ValueError(msg)

    flat = regime in {ClosureRegime.strict, ClosureRegime.scott}
    return LocalConstancyVanishingWitness(
        regime_gate=cohomology_vanishes(regime) == flat,
        regime_is_strict_or_scott=flat,
        h1_vanishes=True,
        predicate_constancy_forces_kz=(
            not predicate_locally_constant(sheaf) or every_sheaf_kzcoherent_strict(sheaf)
        ),
        settling_constancy_forced=every_sheaf_settling_locally_constant(sheaf),
    )
