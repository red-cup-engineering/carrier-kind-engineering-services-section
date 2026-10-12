"""Finite probability measure as quantitative positing.

Executable shadow of ``RelMath.Probability.Measure``.  The older
``pymetrologic.probability`` module already carries the event algebra and counting
measure functions; this module packages them in the RelMath style as witness
bundles over a finite sample space:

* the counting measure is a valuation on events;
* the impossible event has mass ``0`` and the certain event has full mass;
* disjoint events add, subset inclusion is monotone, and complements partition
  the total mass;
* conditioning is restriction to ``A ∩ B``, with the Bayes numerator symmetry.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic.probability import (
    Event,
    additivity_holds,
    bayes_symmetry_holds,
    complement_law_holds,
    cond_measure,
    event_compl,
    event_empty,
    event_inter,
    event_union,
    event_univ,
    measure,
    monotone_holds,
    total_mass,
)

T = TypeVar("T")

__all__ = [
    "ConditionalFiberAdjointWitness",
    "CountingSampleSpace",
    "FiniteCountingMeasureWitness",
    "ProbabilityMeasureWitness",
    "conditional_via_fiber_adjoint",
    "counting_measure_is_valuation",
    "probability_measure_witness",
    "sample_probability_events",
    "sample_probability_space",
]


@dataclass(frozen=True, slots=True)
class CountingSampleSpace(Generic[T]):
    """A finite duplicate-free sample space for the counting measure."""

    outcomes: tuple[T, ...]

    def __post_init__(self) -> None:
        for index, outcome in enumerate(self.outcomes):
            if outcome in self.outcomes[:index]:
                msg = f"duplicate outcome in sample space: {outcome!r}"
                raise ValueError(msg)

    def measure(self, event: Event[T]) -> int:
        """The counting measure ``mu(A) = |A cap Omega|``."""

        return measure(self.outcomes, event)

    @property
    def total(self) -> int:
        """The total mass ``mu(Omega)``."""

        return total_mass(self.outcomes)

    def cond_measure(self, a: Event[T], b: Event[T]) -> int:
        """The conditional numerator ``mu(A cap B)``."""

        return cond_measure(self.outcomes, a, b)

    def probability_pair(self, event: Event[T]) -> tuple[int, int]:
        """Represent finite uniform probability as ``(mu(A), mu(Omega))``."""

        return self.measure(event), self.total

    def conditional_pair(self, a: Event[T], b: Event[T]) -> tuple[int, int]:
        """Represent ``P(A|B)`` as ``(mu(A cap B), mu(B))``."""

        return self.cond_measure(a, b), self.measure(b)


@dataclass(frozen=True, slots=True)
class FiniteCountingMeasureWitness:
    """Witness that counting measure satisfies the finite probability laws."""

    empty_zero: bool
    univ_total: bool
    disjoint_additive: bool
    monotone: bool
    complement_adds_to_total: bool
    complement_subtraction: bool

    @property
    def holds(self) -> bool:
        """All finite counting-measure checks hold."""

        return (
            self.empty_zero
            and self.univ_total
            and self.disjoint_additive
            and self.monotone
            and self.complement_adds_to_total
            and self.complement_subtraction
        )


@dataclass(frozen=True, slots=True)
class ConditionalFiberAdjointWitness:
    """Witness that conditioning is restriction plus Bayes numerator symmetry."""

    restricted_measure: bool
    bayes_symmetric_numerator: bool
    restriction_le_marginal: bool

    @property
    def holds(self) -> bool:
        """All finite conditioning checks hold."""

        return (
            self.restricted_measure
            and self.bayes_symmetric_numerator
            and self.restriction_le_marginal
        )


@dataclass(frozen=True, slots=True)
class ProbabilityMeasureWitness:
    """Bundle the valuation and conditioning facts for a finite sample space."""

    valuation: FiniteCountingMeasureWitness
    conditioning: ConditionalFiberAdjointWitness

    @property
    def holds(self) -> bool:
        """The finite probability-measure witness holds."""

        return self.valuation.holds and self.conditioning.holds


def _events_with_bounds(events: Sequence[Event[T]]) -> tuple[Event[T], ...]:
    return (event_empty, event_univ, *events)


def counting_measure_is_valuation(
    space: CountingSampleSpace[T],
    events: Sequence[Event[T]],
) -> FiniteCountingMeasureWitness:
    """Check Lean's ``measure_is_valuation`` bundle on finite sampled events."""

    checked_events = _events_with_bounds(events)
    pairs = tuple((a, b) for a in checked_events for b in checked_events)
    return FiniteCountingMeasureWitness(
        empty_zero=space.measure(event_empty) == 0,
        univ_total=space.measure(event_univ) == space.total,
        disjoint_additive=all(additivity_holds(space.outcomes, a, b) for a, b in pairs),
        monotone=all(monotone_holds(space.outcomes, a, b) for a, b in pairs),
        complement_adds_to_total=all(
            space.measure(a) + space.measure(event_compl(a)) == space.total for a in checked_events
        ),
        complement_subtraction=all(complement_law_holds(space.outcomes, a) for a in checked_events),
    )


def conditional_via_fiber_adjoint(
    space: CountingSampleSpace[T],
    a: Event[T],
    b: Event[T],
) -> ConditionalFiberAdjointWitness:
    """Check the finite conditioning-as-restriction/Bayes facts."""

    return ConditionalFiberAdjointWitness(
        restricted_measure=space.cond_measure(a, b) == space.measure(event_inter(a, b)),
        bayes_symmetric_numerator=bayes_symmetry_holds(space.outcomes, a, b),
        restriction_le_marginal=space.cond_measure(a, b) <= space.measure(b),
    )


def probability_measure_witness(
    space: CountingSampleSpace[T],
    events: Sequence[Event[T]],
    conditional_pair: tuple[Event[T], Event[T]] | None = None,
) -> ProbabilityMeasureWitness:
    """Bundle the finite valuation and conditioning facts."""

    checked_events = tuple(events)
    if conditional_pair is None:
        if len(checked_events) < 2:
            msg = "at least two events are required when no conditional pair is supplied"
            raise ValueError(msg)
        conditional_pair = (checked_events[0], checked_events[1])
    a, b = conditional_pair
    return ProbabilityMeasureWitness(
        valuation=counting_measure_is_valuation(space, checked_events),
        conditioning=conditional_via_fiber_adjoint(space, a, b),
    )


def sample_probability_space() -> CountingSampleSpace[int]:
    """A six-outcome die sample space."""

    return CountingSampleSpace((1, 2, 3, 4, 5, 6))


def sample_probability_events() -> tuple[Callable[[int], bool], ...]:
    """A small family of die events used by tests and notebooks."""

    return (
        lambda n: n % 2 == 0,
        lambda n: n % 3 == 0,
        lambda n: n >= 4,
        lambda n: n <= 3,
        lambda n: n in (1, 6),
        event_union(lambda n: n == 1, lambda n: n == 6),
    )
