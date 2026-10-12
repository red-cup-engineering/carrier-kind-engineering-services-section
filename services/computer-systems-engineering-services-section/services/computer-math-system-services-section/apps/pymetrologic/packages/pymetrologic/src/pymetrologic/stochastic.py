"""Finite stochastic settling shadows for ``RelMath.Probability.Stochastic``.

Lean states stochastic settling abstractly over an ordered semiring: a Markov
kernel advances a distribution by ``pi * P``, and stationarity is exactly the
fixed-point equation for that closure.  The lab specializes the executable
surface to finite kernels with exact rational weights.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from fractions import Fraction
from typing import Generic, TypeVar

from pymetrologic.closure import FiniteLattice
from pymetrologic.value_settling import ValueCategory, value_category

S = TypeVar("S")


Distribution = Mapping[S, Fraction]
TransitionTable = Mapping[tuple[S, S], Fraction]


@dataclass(frozen=True, order=True, slots=True)
class UnitReal:
    """An exact rational point of the stochastic unit interval ``[0, 1]``."""

    value: Fraction

    def __post_init__(self) -> None:
        if self.value < 0 or self.value > 1:
            msg = "UnitReal values must lie in [0, 1]"
            raise ValueError(msg)


@dataclass(frozen=True)
class FiniteMarkovKernel(Generic[S]):
    """A finite Markov transition kernel with exact rational weights."""

    states: tuple[S, ...]
    transitions: TransitionTable[S]

    def __post_init__(self) -> None:
        if not self.states:
            msg = "a Markov kernel needs at least one state"
            raise ValueError(msg)
        if len(set(self.states)) != len(self.states):
            msg = "states must be unique"
            raise ValueError(msg)
        missing = [
            (source, target)
            for source in self.states
            for target in self.states
            if (source, target) not in self.transitions
        ]
        if missing:
            msg = f"transition table is missing {missing[0]!r}"
            raise ValueError(msg)
        for pair, weight in self.transitions.items():
            if pair[0] not in self.states or pair[1] not in self.states:
                msg = f"transition {pair!r} is outside the state space"
                raise ValueError(msg)
            if weight < 0:
                msg = f"transition {pair!r} has negative weight"
                raise ValueError(msg)

    def transition(self, source: S, target: S) -> Fraction:
        """Return ``P(source, target)``."""

        return self.transitions[(source, target)]


@dataclass(frozen=True, slots=True)
class RealUnitIntervalValueCategoryWitness:
    """Finite executable checks for the stochastic unit-interval value category."""

    carrier_is_unit_interval: bool
    reflexive: bool
    antisymmetric: bool
    bottom_is_zero: bool

    @property
    def holds(self) -> bool:
        """All sampled unit-interval value-category laws hold."""
        return (
            self.carrier_is_unit_interval
            and self.reflexive
            and self.antisymmetric
            and self.bottom_is_zero
        )


__all__ = [
    "Distribution",
    "FiniteMarkovKernel",
    "RealUnitIntervalValueCategoryWitness",
    "TransitionTable",
    "UnitReal",
    "advance_distribution",
    "identity_kernel",
    "is_doubly_stochastic",
    "is_stationary",
    "is_stochastic",
    "iterate_distribution",
    "real_unit_interval_is_value_category",
    "real_unit_interval_stoch_vc",
    "rzero_le_one",
    "stationary_is_closure_fixpoint",
    "uniform_distribution",
    "unit_real",
    "unit_real_zero",
]


def unit_real(value: Fraction | int) -> UnitReal:
    """Construct an exact unit-interval probability value."""

    return UnitReal(Fraction(value))


def unit_real_zero() -> UnitReal:
    """The seed probability ``0`` as a unit-interval value."""

    return unit_real(0)


def rzero_le_one() -> bool:
    """The internal-real order fact ``0 <= 1`` sampled by exact rationals."""

    return unit_real_zero().value <= unit_real(1).value


def real_unit_interval_stoch_vc(samples: Sequence[UnitReal]) -> ValueCategory[UnitReal]:
    """Build a finite sampled value category from unit-interval probabilities."""

    elements = tuple(dict.fromkeys((unit_real_zero(), *samples)))
    if not elements:
        msg = "unit interval value category needs at least one sample"
        raise ValueError(msg)
    return value_category(
        "UnitReal[0,1]",
        FiniteLattice(
            elements=tuple(sorted(elements)),
            leq=lambda left, right: left.value <= right.value,
            join=lambda left, right: left if left.value >= right.value else right,
            meet=lambda left, right: left if left.value <= right.value else right,
            bot=unit_real_zero(),
            top=max(elements),
        ),
    )


def real_unit_interval_is_value_category(
    samples: Sequence[UnitReal],
) -> RealUnitIntervalValueCategoryWitness:
    """Bundle the finite sampled value-category laws for real probabilities."""

    category = real_unit_interval_stoch_vc(samples)
    elements = category.lattice.elements
    return RealUnitIntervalValueCategoryWitness(
        carrier_is_unit_interval=all(0 <= value.value <= 1 for value in elements),
        reflexive=all(category.lattice.leq(value, value) for value in elements),
        antisymmetric=all(
            left == right
            for left in elements
            for right in elements
            if category.lattice.leq(left, right) and category.lattice.leq(right, left)
        ),
        bottom_is_zero=category.bot == unit_real_zero(),
    )


def identity_kernel(states: Sequence[S]) -> FiniteMarkovKernel[S]:
    """Return the identity Markov kernel on ``states``."""

    state_tuple = tuple(states)
    return FiniteMarkovKernel(
        states=state_tuple,
        transitions={
            (source, target): Fraction(1 if source == target else 0)
            for source in state_tuple
            for target in state_tuple
        },
    )


def uniform_distribution(states: Sequence[S]) -> dict[S, Fraction]:
    """Return the uniform distribution on a finite nonempty state space."""

    state_tuple = tuple(states)
    if not state_tuple:
        msg = "uniform distribution needs at least one state"
        raise ValueError(msg)
    weight = Fraction(1, len(state_tuple))
    return {state: weight for state in state_tuple}


def is_stochastic(kernel: FiniteMarkovKernel[S]) -> bool:
    """Check that every row of the transition table sums to ``1``."""

    return all(
        sum((kernel.transition(source, target) for target in kernel.states), start=Fraction(0)) == 1
        for source in kernel.states
    )


def is_doubly_stochastic(kernel: FiniteMarkovKernel[S]) -> bool:
    """Check row-stochasticity and column sums equal to ``1``."""

    return is_stochastic(kernel) and all(
        sum((kernel.transition(source, target) for source in kernel.states), start=Fraction(0)) == 1
        for target in kernel.states
    )


def advance_distribution(
    kernel: FiniteMarkovKernel[S],
    distribution: Distribution[S],
) -> dict[S, Fraction]:
    """Advance ``distribution`` one Markov step: ``(pi * P)(target)``."""

    _validate_distribution(kernel, distribution)
    return {
        target: sum(
            (distribution[source] * kernel.transition(source, target) for source in kernel.states),
            start=Fraction(0),
        )
        for target in kernel.states
    }


def iterate_distribution(
    kernel: FiniteMarkovKernel[S],
    distribution: Distribution[S],
    steps: int,
) -> dict[S, Fraction]:
    """Advance a distribution by ``steps`` applications of the stochastic closure."""

    if steps < 0:
        msg = "steps must be natural"
        raise ValueError(msg)
    current = dict(distribution)
    for _ in range(steps):
        current = advance_distribution(kernel, current)
    return current


def is_stationary(
    kernel: FiniteMarkovKernel[S],
    distribution: Distribution[S],
) -> bool:
    """Return whether ``distribution * P = distribution``."""

    return advance_distribution(kernel, distribution) == dict(distribution)


def stationary_is_closure_fixpoint(
    kernel: FiniteMarkovKernel[S],
    distribution: Distribution[S],
) -> bool:
    """Executable form of Lean's ``Markov stationary = stochastic-closure fixed point``."""

    return is_stationary(kernel, distribution) == (
        advance_distribution(kernel, distribution) == dict(distribution)
    )


def _validate_distribution(
    kernel: FiniteMarkovKernel[S],
    distribution: Distribution[S],
) -> None:
    if set(distribution) != set(kernel.states):
        msg = "distribution support must match kernel states"
        raise ValueError(msg)
    if any(weight < 0 for weight in distribution.values()):
        msg = "distribution weights must be non-negative"
        raise ValueError(msg)
    if sum(distribution.values(), start=Fraction(0)) != 1:
        msg = "distribution weights must sum to 1"
        raise ValueError(msg)
