"""Closure 2-monad KZ witnesses over finite closure operators.

Executable shadow of ``RelMath.Closure.Closure2MonadKZ``.  Lean models the
closure 2-monad one-categorically over the thin valuation knowledge order:
the unit is inflation ``x <= Cl x``, multiplication is the nested-closure
collapse ``Cl(Cl x) = Cl x``, and Kock-Zoeberlein lax idempotence collapses to
strict idempotence on an antisymmetric finite carrier.  A ``Cl``-algebra is
therefore property-like: it is exactly a closure fixed point, not extra data.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic import BL, closure_step, fixed_points, four, is_closure, knowledge_lattice
from pymetrologic.closure import FiniteLattice, is_scott_continuous

from .lax_slack import FiniteRelation, closure_no_lax_slack, is_antisymmetric

E = TypeVar("E")

__all__ = [
    "ClAlgebraPropertyWitness",
    "Closure2MonadKZWitness",
    "ClosureRegimeShadow",
    "closed_algebra_structures",
    "closure_2monad_kz_witness",
    "closure_algebra_property_like",
    "closure_kz_lax_idempotent",
    "is_cl_algebra",
    "kz_inequality",
    "sample_closure_2monad_kz_witness",
    "strict_regime_mu_identity",
]


@dataclass(frozen=True, slots=True)
class ClosureRegimeShadow:
    """Finite shadow of the low closure-ordinal regimes."""

    finite_base: bool
    scott_continuous: bool
    strict_or_scott: bool


@dataclass(frozen=True, slots=True)
class Closure2MonadKZWitness(Generic[E]):
    """KZ / lax-idempotent closure-2-monad witness for a finite closure."""

    unit_inflation: bool
    multiplication_collapse: bool
    triangle_cl_eta: bool
    triangle_eta_cl: bool
    kz_inequality: bool
    no_lax_slack: bool
    regime_mu_identity: bool

    @property
    def holds(self) -> bool:
        """All KZ closure-2-monad checks hold."""

        return (
            self.unit_inflation
            and self.multiplication_collapse
            and self.triangle_cl_eta
            and self.triangle_eta_cl
            and self.kz_inequality
            and self.no_lax_slack
            and self.regime_mu_identity
        )


@dataclass(frozen=True, slots=True)
class ClAlgebraPropertyWitness(Generic[E]):
    """Witness that ``Cl``-algebra structure is fixed-point property."""

    fixed_points: tuple[E, ...]
    structure_exists_iff_fixed: bool
    structure_unique: bool
    structure_map_forced_identity: bool

    @property
    def holds(self) -> bool:
        """The algebra structure is property-like."""

        return (
            self.structure_exists_iff_fixed
            and self.structure_unique
            and self.structure_map_forced_identity
        )


def _require_closure(lat: FiniteLattice[E], closure: Callable[[E], E]) -> None:
    if not is_closure(lat, closure):
        msg = "operator must be a finite closure"
        raise ValueError(msg)


def kz_inequality(lat: FiniteLattice[E], closure: Callable[[E], E], point: E) -> bool:
    """The KZ lax direction ``Cl(Cl point) <= Cl point``."""

    return lat.leq(closure(closure(point)), closure(point))


def strict_regime_mu_identity(lat: FiniteLattice[E], closure: Callable[[E], E]) -> bool:
    """Finite strict/Scott shadow: multiplication ``mu`` is identity."""

    _require_closure(lat, closure)
    return is_scott_continuous(lat, closure) and all(
        lat.eq(closure(closure(point)), closure(point)) for point in lat.elements
    )


def closure_kz_lax_idempotent(
    lat: FiniteLattice[E],
    closure: Callable[[E], E],
    points: Sequence[E] | None = None,
) -> Closure2MonadKZWitness[E]:
    """Bundle the KZ unit, multiplication, triangles, and lax inequality."""

    _require_closure(lat, closure)
    carrier = tuple(lat.elements if points is None else points)
    rel = FiniteRelation(lat.elements, lat.leq)
    return Closure2MonadKZWitness(
        unit_inflation=all(lat.leq(point, closure(point)) for point in carrier),
        multiplication_collapse=all(
            lat.eq(closure(closure(point)), closure(point)) for point in carrier
        ),
        triangle_cl_eta=all(lat.eq(closure(closure(point)), closure(point)) for point in carrier),
        triangle_eta_cl=all(lat.eq(closure(closure(point)), closure(point)) for point in carrier),
        kz_inequality=all(kz_inequality(lat, closure, point) for point in carrier),
        no_lax_slack=is_antisymmetric(rel) and closure_no_lax_slack(lat, closure),
        regime_mu_identity=strict_regime_mu_identity(lat, closure),
    )


def is_cl_algebra(lat: FiniteLattice[E], closure: Callable[[E], E], point: E) -> bool:
    """A ``Cl``-algebra is exactly a fixed point."""

    _require_closure(lat, closure)
    return lat.eq(closure(point), point)


def closed_algebra_structures(
    lat: FiniteLattice[E],
    closure: Callable[[E], E],
) -> dict[E, tuple[str, ...]]:
    """Canonical proof-token view of algebra structures over fixed points.

    The token is intentionally unique: on a thin finite poset the structure map
    ``Cl x <= x`` is forced by antisymmetry and exists exactly at fixed points.
    """

    _require_closure(lat, closure)
    return {
        point: (("identity",) if is_cl_algebra(lat, closure, point) else ())
        for point in lat.elements
    }


def closure_algebra_property_like(
    lat: FiniteLattice[E],
    closure: Callable[[E], E],
) -> ClAlgebraPropertyWitness[E]:
    """Bundle Kelly-Lack K2: algebra status is a property, not data."""

    _require_closure(lat, closure)
    structures = closed_algebra_structures(lat, closure)
    fixed = fixed_points(lat, closure)
    return ClAlgebraPropertyWitness(
        fixed_points=fixed,
        structure_exists_iff_fixed=all(
            bool(structures[point]) == (point in fixed) for point in lat.elements
        ),
        structure_unique=all(len(structures[point]) <= 1 for point in lat.elements),
        structure_map_forced_identity=all(
            structures[point] in ((), ("identity",)) for point in lat.elements
        ),
    )


def closure_2monad_kz_witness(
    lat: FiniteLattice[E],
    closure: Callable[[E], E],
) -> tuple[Closure2MonadKZWitness[E], ClAlgebraPropertyWitness[E]]:
    """Return the KZ and property-like algebra witnesses together."""

    return (
        closure_kz_lax_idempotent(lat, closure),
        closure_algebra_property_like(lat, closure),
    )


def sample_closure_2monad_kz_witness() -> tuple[
    Closure2MonadKZWitness[BL[int]],
    ClAlgebraPropertyWitness[BL[int]],
]:
    """Sample witness over FOUR's knowledge lattice and ``x |-> x join_k true``."""

    bl = four()
    lat = knowledge_lattice(bl.L)
    closure = closure_step(lat, lambda value: value, bl.true)
    return closure_2monad_kz_witness(lat, closure)
