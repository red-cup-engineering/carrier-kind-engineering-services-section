"""Finite probability-measure witnesses (RelMath.Probability.Measure)."""

from __future__ import annotations

import pytest

from pymetrologic import event_compl, event_empty, event_inter, event_union, event_univ
from pymetrologic.probability_measure import (
    ConditionalFiberAdjointWitness,
    CountingSampleSpace,
    FiniteCountingMeasureWitness,
    ProbabilityMeasureWitness,
    conditional_via_fiber_adjoint,
    counting_measure_is_valuation,
    probability_measure_witness,
    sample_probability_events,
    sample_probability_space,
)


def _even(n: int) -> bool:
    return n % 2 == 0


def _high(n: int) -> bool:
    return n >= 4


def _low(n: int) -> bool:
    return n <= 3


def test_counting_sample_space_measures_events_as_finite_counts() -> None:
    space = sample_probability_space()

    assert space.measure(event_empty) == 0
    assert space.measure(event_univ) == space.total == 6
    assert space.measure(_even) == 3
    assert space.measure(event_compl(_even)) == 3
    assert space.measure(event_inter(_even, _high)) == 2
    assert space.measure(event_union(_low, _high)) == 6
    assert space.probability_pair(_even) == (3, 6)
    assert space.conditional_pair(_even, _high) == (2, 3)


def test_measure_is_valuation_bundle_holds_on_sampled_die_events() -> None:
    witness = counting_measure_is_valuation(
        sample_probability_space(),
        sample_probability_events(),
    )

    assert isinstance(witness, FiniteCountingMeasureWitness)
    assert witness.holds
    assert witness.empty_zero
    assert witness.univ_total
    assert witness.disjoint_additive
    assert witness.monotone
    assert witness.complement_adds_to_total
    assert witness.complement_subtraction


def test_conditioning_is_restriction_with_bayes_symmetric_numerator() -> None:
    space = sample_probability_space()
    witness = conditional_via_fiber_adjoint(space, _even, _high)

    assert isinstance(witness, ConditionalFiberAdjointWitness)
    assert witness.holds
    assert witness.restricted_measure
    assert witness.bayes_symmetric_numerator
    assert witness.restriction_le_marginal
    assert space.cond_measure(_even, _high) == space.cond_measure(_high, _even) == 2
    assert space.cond_measure(_even, _high) <= space.measure(_high)


def test_probability_measure_witness_bundles_valuation_and_conditioning() -> None:
    witness = probability_measure_witness(
        sample_probability_space(),
        sample_probability_events(),
    )

    assert isinstance(witness, ProbabilityMeasureWitness)
    assert witness.holds
    assert witness.valuation.holds
    assert witness.conditioning.holds


def test_sample_space_rejects_duplicate_listed_outcomes() -> None:
    with pytest.raises(ValueError, match="duplicate outcome"):
        CountingSampleSpace((1, 2, 2, 3))


def test_probability_witness_requires_conditioning_data() -> None:
    with pytest.raises(ValueError, match="at least two events"):
        probability_measure_witness(sample_probability_space(), (_even,))
