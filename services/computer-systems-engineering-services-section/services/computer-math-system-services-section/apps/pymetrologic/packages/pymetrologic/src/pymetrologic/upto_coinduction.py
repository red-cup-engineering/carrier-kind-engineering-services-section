"""Up-to-closure coinduction for finite settling coalgebras.

Realizes ``RelMath.Aperiodic.UpToClosureCoinduction`` in the strict finite
regime: for an idempotent closure, a relation that is stable under joint closure
and agrees on settled values is contained in settling bisimilarity. Geometric
MLD is therefore classified by equality of settled values.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from .closure import FiniteLattice, is_closure
from .dynamics import closure_orbit

E = TypeVar("E")
Relation = Callable[[E, E], bool]
Closure = Callable[[E], E]

__all__ = [
    "BisimUTCWitness",
    "Closure",
    "ClosureAbsorptionWitness",
    "GeoMldClassificationWitness",
    "Relation",
    "bisim_iff_settle_eq",
    "bisim_utc_holds",
    "bisim_utc_orbit_holds",
    "bisim_utc_settle_kernel_holds",
    "bisim_utc_sound",
    "cross_base_classification",
    "geo_mld",
    "geo_mld_iff_settle_eq",
    "settle_closure_absorbs",
    "settle_orbit_constant",
]


@dataclass(frozen=True, slots=True)
class ClosureAbsorptionWitness(Generic[E]):
    """Finite witness that settling absorbs a closure step."""

    seed: E
    settled: E
    closure_laws: bool
    le_settle: bool
    settle_closure_op: bool
    settle_orbit: bool

    @property
    def holds(self) -> bool:
        """All closure-absorption checks hold."""

        return self.closure_laws and self.le_settle and self.settle_closure_op and self.settle_orbit


@dataclass(frozen=True, slots=True)
class BisimUTCWitness(Generic[E]):
    """Finite witness for a bisimulation up to closure."""

    relation_agrees_on_settle: bool
    relation_closed_under_closure: bool
    related_orbits: bool
    sound: bool

    @property
    def holds(self) -> bool:
        """The relation is a sound settling bisimulation up to closure."""

        return (
            self.relation_agrees_on_settle
            and self.relation_closed_under_closure
            and self.related_orbits
            and self.sound
        )


@dataclass(frozen=True, slots=True)
class GeoMldClassificationWitness(Generic[E]):
    """Executable bundle for the cross-base MLD classification."""

    left: E
    right: E
    settled_left: E
    settled_right: E
    geo_mld_iff_settle_eq: bool
    reflexive: bool
    symmetric: bool
    transitive: bool

    @property
    def holds(self) -> bool:
        """All finite geometric-MLD classification laws hold."""

        return self.geo_mld_iff_settle_eq and self.reflexive and self.symmetric and self.transitive


def _require_closure(lat: FiniteLattice[E], closure: Closure[E]) -> None:
    if not is_closure(lat, closure):
        msg = "up-to-closure coinduction requires a closure operator"
        raise ValueError(msg)


def _horizon(lat: FiniteLattice[E], horizon: int | None) -> int:
    if horizon is None:
        return len(lat.elements) + 1
    if horizon < 0:
        msg = "horizon must be nonnegative"
        raise ValueError(msg)
    return horizon


def settle_closure_absorbs(
    lat: FiniteLattice[E], closure: Closure[E], seed: E, *, horizon: int | None = None
) -> ClosureAbsorptionWitness[E]:
    """Witness ``settle(closure(seed)) = settle(seed)`` for an idempotent closure."""

    _require_closure(lat, closure)
    settled = closure(seed)
    steps = _horizon(lat, horizon)
    return ClosureAbsorptionWitness(
        seed=seed,
        settled=settled,
        closure_laws=True,
        le_settle=lat.leq(seed, settled),
        settle_closure_op=lat.eq(closure(closure(seed)), settled),
        settle_orbit=settle_orbit_constant(lat, closure, seed, horizon=steps),
    )


def settle_orbit_constant(
    lat: FiniteLattice[E], closure: Closure[E], seed: E, *, horizon: int | None = None
) -> bool:
    """Check that every sampled orbit stage settles to the seed's settled value."""

    _require_closure(lat, closure)
    steps = _horizon(lat, horizon)
    settled = closure(seed)
    orbit = closure_orbit(lat, closure, seed, steps=steps)
    return all(lat.eq(closure(stage), settled) for stage in orbit)


def bisim_iff_settle_eq(
    lat: FiniteLattice[E],
    closure: Closure[E],
    left: E,
    right: E,
    *,
    horizon: int | None = None,
) -> bool:
    """Finite check of ``Bisim left right <-> closure(left) = closure(right)``."""

    _require_closure(lat, closure)
    steps = _horizon(lat, horizon)
    left_orbit = closure_orbit(lat, closure, left, steps=steps)
    right_orbit = closure_orbit(lat, closure, right, steps=steps)
    bisim = all(
        lat.eq(closure(left_stage), closure(right_stage))
        for left_stage, right_stage in zip(left_orbit, right_orbit, strict=True)
    )
    settle_eq = lat.eq(closure(left), closure(right))
    return bisim == settle_eq


def bisim_utc_holds(lat: FiniteLattice[E], closure: Closure[E], relation: Relation[E]) -> bool:
    """Check the two defining legs of a bisimulation up to closure over the carrier."""

    _require_closure(lat, closure)
    return all(
        lat.eq(closure(left), closure(right)) and relation(closure(left), closure(right))
        for left in lat.elements
        for right in lat.elements
        if relation(left, right)
    )


def bisim_utc_orbit_holds(
    lat: FiniteLattice[E],
    closure: Closure[E],
    relation: Relation[E],
    left: E,
    right: E,
    *,
    horizon: int | None = None,
) -> bool:
    """If ``relation left right``, check that the relation stays true on both orbits."""

    _require_closure(lat, closure)
    steps = _horizon(lat, horizon)
    if not relation(left, right):
        return False
    left_orbit = closure_orbit(lat, closure, left, steps=steps)
    right_orbit = closure_orbit(lat, closure, right, steps=steps)
    return all(
        relation(left_stage, right_stage)
        for left_stage, right_stage in zip(left_orbit, right_orbit, strict=True)
    )


def bisim_utc_sound(
    lat: FiniteLattice[E],
    closure: Closure[E],
    relation: Relation[E],
    left: E,
    right: E,
    *,
    horizon: int | None = None,
) -> BisimUTCWitness[E]:
    """Soundness: a bisimulation up to closure is contained in bisimilarity."""

    _require_closure(lat, closure)
    relation_pairs = tuple(
        (left_value, right_value)
        for left_value in lat.elements
        for right_value in lat.elements
        if relation(left_value, right_value)
    )
    relation_agrees_on_settle = all(
        lat.eq(closure(left_value), closure(right_value))
        for left_value, right_value in relation_pairs
    )
    relation_closed_under_closure = all(
        relation(closure(left_value), closure(right_value))
        for left_value, right_value in relation_pairs
    )
    related_orbits = bisim_utc_orbit_holds(lat, closure, relation, left, right, horizon=horizon)
    sound = (
        relation(left, right)
        and relation_agrees_on_settle
        and relation_closed_under_closure
        and all(
            bisim_iff_settle_eq(lat, closure, left_value, right_value, horizon=horizon)
            for left_value, right_value in relation_pairs
        )
    )
    return BisimUTCWitness(
        relation_agrees_on_settle=relation_agrees_on_settle,
        relation_closed_under_closure=relation_closed_under_closure,
        related_orbits=related_orbits,
        sound=sound,
    )


def bisim_utc_settle_kernel_holds(lat: FiniteLattice[E], closure: Closure[E]) -> bool:
    """The settled-value kernel is a bisimulation up to closure."""

    _require_closure(lat, closure)
    return bisim_utc_holds(lat, closure, lambda left, right: lat.eq(closure(left), closure(right)))


def geo_mld(lat: FiniteLattice[E], closure: Closure[E], left: E, right: E) -> bool:
    """Geometric MLD in the finite closure model: the settled-value kernel relates."""

    _require_closure(lat, closure)
    return lat.eq(closure(left), closure(right)) and bisim_utc_settle_kernel_holds(lat, closure)


def geo_mld_iff_settle_eq(lat: FiniteLattice[E], closure: Closure[E], left: E, right: E) -> bool:
    """Check ``GeoMld left right <-> closure(left) = closure(right)``."""

    _require_closure(lat, closure)
    return geo_mld(lat, closure, left, right) == lat.eq(closure(left), closure(right))


def cross_base_classification(
    lat: FiniteLattice[E], closure: Closure[E], left: E, right: E
) -> GeoMldClassificationWitness[E]:
    """Classify geometric MLD by settled value, including equivalence laws."""

    _require_closure(lat, closure)
    related_pairs = tuple(
        (a, b, c)
        for a in lat.elements
        for b in lat.elements
        for c in lat.elements
        if geo_mld(lat, closure, a, b) and geo_mld(lat, closure, b, c)
    )
    return GeoMldClassificationWitness(
        left=left,
        right=right,
        settled_left=closure(left),
        settled_right=closure(right),
        geo_mld_iff_settle_eq=geo_mld_iff_settle_eq(lat, closure, left, right),
        reflexive=all(geo_mld(lat, closure, value, value) for value in lat.elements),
        symmetric=all(
            geo_mld(lat, closure, b, a)
            for a in lat.elements
            for b in lat.elements
            if geo_mld(lat, closure, a, b)
        ),
        transitive=all(geo_mld(lat, closure, a, c) for a, _b, c in related_pairs),
    )
