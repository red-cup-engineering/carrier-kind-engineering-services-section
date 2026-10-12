"""Algebraic Laplacianizers (RelMath.Flow.Laplacianizability).

The Lean module packages the settling site as a one-object algebraic
Laplacianizer: the Lawvere/Tarski Laplacian is an idempotent monotone operator,
its harmonic states are its fixed points, and degree-0 cohomology is realized as
that same finite harmonic kernel. In this executable shadow, the Hodge map is the
identity between settled sections and harmonic representatives.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic.closure import FiniteLattice, fixed_points, is_closure, is_monotone

E = TypeVar("E")

__all__ = [
    "AlgebraicLaplacianizer",
    "HodgeRoundTrip",
    "SettlingLaplacianizability",
    "hodge_isomorphism_holds",
    "settled_sections",
    "settling_hodge_round_trips",
    "settling_is_laplacianizable",
    "settling_laplacianizability",
    "settling_laplacianizer",
]


@dataclass(frozen=True)
class HodgeRoundTrip(Generic[E]):
    """The two identity round-trips of ``eta : H^0 ~= ker Delta`` at one class."""

    cohomology_class: E
    harmonic_representative: E
    left_round_trip: bool
    right_round_trip: bool


@dataclass(frozen=True)
class AlgebraicLaplacianizer(Generic[E]):
    """A finite algebraic Laplacianizer over one settling object.

    ``cohomology`` is represented by the settled sections: the same carrier as
    the harmonic kernel. This matches the Lean specialization
    ``settledSections M = {v // closureOp v = v}``.
    """

    lattice: FiniteLattice[E]
    laplacian: Callable[[E], E]
    object_name: str = "settling-site"

    def is_idempotent_projection(self) -> bool:
        """``Delta^2 = Delta``: the Laplacian projects to harmonic states."""
        return all(
            self.lattice.eq(self.laplacian(self.laplacian(x)), self.laplacian(x))
            for x in self.lattice.elements
        )

    def is_q_functor(self) -> bool:
        """The Laplacian is monotone for the value/knowledge order."""
        return is_monotone(self.lattice, self.laplacian)

    def is_laplacianizer(self) -> bool:
        """The finite Lawvere/Tarski Laplacianizer laws."""
        return is_closure(self.lattice, self.laplacian)

    def harmonic_kernel(self) -> tuple[E, ...]:
        """``ker Delta``: fixed points of the order Laplacian."""
        return fixed_points(self.lattice, self.laplacian)

    def to_harmonic(self, cohomology_class: E) -> E:
        """The Hodge map ``eta`` from ``H^0`` to a harmonic representative."""
        if not self.lattice.eq(self.laplacian(cohomology_class), cohomology_class):
            raise ValueError("cohomology classes must be settled/harmonic fixed points")
        return cohomology_class

    def from_harmonic(self, harmonic: E) -> E:
        """The inverse Hodge map from a harmonic representative back to ``H^0``."""
        if not self.lattice.eq(self.laplacian(harmonic), harmonic):
            raise ValueError("harmonic representatives must be Laplacian fixed points")
        return harmonic

    def hodge_round_trip(self, cohomology_class: E) -> HodgeRoundTrip[E]:
        """Evaluate both Hodge-isomorphism round-trips on one settled section."""
        harmonic = self.to_harmonic(cohomology_class)
        back = self.from_harmonic(harmonic)
        return HodgeRoundTrip(
            cohomology_class=cohomology_class,
            harmonic_representative=harmonic,
            left_round_trip=self.lattice.eq(back, cohomology_class),
            right_round_trip=self.lattice.eq(self.to_harmonic(back), harmonic),
        )


@dataclass(frozen=True)
class SettlingLaplacianizability(Generic[E]):
    """Executable bundle of the Lean ``settling_laplacianizability`` theorem."""

    laplacianizable: bool
    laplacian_is_supplied_operator: bool
    idempotent_projection: bool
    monotone_q_functor: bool
    hodge_isomorphism: bool
    harmonic_kernel: tuple[E, ...]

    @property
    def holds(self) -> bool:
        """All legs of the settling Laplacianizability bundle hold."""
        return (
            self.laplacianizable
            and self.laplacian_is_supplied_operator
            and self.idempotent_projection
            and self.monotone_q_functor
            and self.hodge_isomorphism
        )


def settled_sections(lat: FiniteLattice[E], laplacian: Callable[[E], E]) -> tuple[E, ...]:
    """Degree-0 settling cohomology: the settled global sections."""
    return fixed_points(lat, laplacian)


def settling_laplacianizer(
    lat: FiniteLattice[E], laplacian: Callable[[E], E]
) -> AlgebraicLaplacianizer[E]:
    """Build the one-object settling Laplacianizer from a Lawvere closure operator."""
    return AlgebraicLaplacianizer(lat, laplacian)


def settling_hodge_round_trips(
    laplacianizer: AlgebraicLaplacianizer[E],
) -> tuple[HodgeRoundTrip[E], ...]:
    """The Hodge isomorphism evaluated on every settled cohomology class."""
    return tuple(
        laplacianizer.hodge_round_trip(section) for section in laplacianizer.harmonic_kernel()
    )


def hodge_isomorphism_holds(laplacianizer: AlgebraicLaplacianizer[E]) -> bool:
    """``eta : H^0 ~= ker Delta`` holds on the whole finite harmonic kernel."""
    return all(
        trip.left_round_trip and trip.right_round_trip
        for trip in settling_hodge_round_trips(laplacianizer)
    )


def settling_is_laplacianizable(lat: FiniteLattice[E], laplacian: Callable[[E], E]) -> bool:
    """The settling site/cohomology pair admits this algebraic Laplacianizer."""
    laplacianizer = settling_laplacianizer(lat, laplacian)
    return laplacianizer.is_laplacianizer() and hodge_isomorphism_holds(laplacianizer)


def settling_laplacianizability(
    lat: FiniteLattice[E], laplacian: Callable[[E], E]
) -> SettlingLaplacianizability[E]:
    """Bundle Laplacianizability, projection, monotonicity, and Hodge identity."""
    laplacianizer = settling_laplacianizer(lat, laplacian)
    return SettlingLaplacianizability(
        laplacianizable=settling_is_laplacianizable(lat, laplacian),
        laplacian_is_supplied_operator=all(
            lat.eq(laplacianizer.laplacian(x), laplacian(x)) for x in lat.elements
        ),
        idempotent_projection=laplacianizer.is_idempotent_projection(),
        monotone_q_functor=laplacianizer.is_q_functor(),
        hodge_isomorphism=hodge_isomorphism_holds(laplacianizer),
        harmonic_kernel=laplacianizer.harmonic_kernel(),
    )
