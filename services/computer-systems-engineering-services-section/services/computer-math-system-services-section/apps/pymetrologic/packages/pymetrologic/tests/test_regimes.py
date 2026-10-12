from __future__ import annotations

import pytest

from pymetrologic.quartet import CORNERS, Corner
from pymetrologic.regimes import (
    CURVED_REGIMES,
    FLAT_CURVATURE_REGIMES,
    ClosureRegime,
    ClosureRegimeData,
    FourRegimeDichotomyWitness,
    classify_closure_regime,
    cohomology_vanishes,
    curvature_rank,
    curvature_regime_correspondence,
    four_regime_dichotomy,
    inflation_regime,
    inflation_regime_data,
    is_curved_regime,
    is_flat_regime,
    regime_is_four_corner,
    regime_of_corner,
    regime_to_corner,
    salem_vs_pisot_regime,
    spine_cohomology_vanishes,
    spine_is_strict,
    spine_regime_data,
    terminates_by_omega,
)

REGIMES = tuple(ClosureRegime)

REGIME_CASES = (
    (ClosureRegimeData(True, True, True), ClosureRegime.strict),
    (ClosureRegimeData(True, False, True), ClosureRegime.scott),
    (ClosureRegimeData(False, False, True), ClosureRegime.transfinite_bounded),
    (ClosureRegimeData(False, False, False), ClosureRegime.aperiodic),
)


def test_closure_regime_data_classifies_the_four_dichotomy_cases() -> None:
    for data, expected in REGIME_CASES:
        witness = four_regime_dichotomy(data)

        assert classify_closure_regime(data) is expected
        assert isinstance(witness, FourRegimeDichotomyWitness)
        assert witness.regime is expected
        assert witness.holds


def test_invalid_finite_regime_data_is_rejected() -> None:
    with pytest.raises(ValueError, match="finite regime data"):
        classify_closure_regime(ClosureRegimeData(False, True, True))

    with pytest.raises(ValueError, match="finite regime data"):
        classify_closure_regime(ClosureRegimeData(True, True, False))


def test_regimes_are_the_recurring_four_corners() -> None:
    assert regime_is_four_corner()
    assert tuple(regime_to_corner(regime) for regime in REGIMES) == CORNERS
    assert regime_to_corner(ClosureRegime.strict) is Corner.ABSURD
    assert regime_to_corner(ClosureRegime.aperiodic) is Corner.STABLE

    for corner in CORNERS:
        assert regime_to_corner(regime_of_corner(corner)) is corner


def test_spine_data_is_strict_and_cohomologically_flat() -> None:
    data = spine_regime_data()

    assert data.valid_constraints
    assert classify_closure_regime(data) is ClosureRegime.strict
    assert spine_is_strict()
    assert spine_cohomology_vanishes()


def test_curvature_regimes_partition_the_four_corners() -> None:
    assert {ClosureRegime.strict, ClosureRegime.scott} == FLAT_CURVATURE_REGIMES
    assert {ClosureRegime.transfinite_bounded, ClosureRegime.aperiodic} == CURVED_REGIMES

    for regime in REGIMES:
        assert is_flat_regime(regime) is (not is_curved_regime(regime))
        assert not (is_flat_regime(regime) and is_curved_regime(regime))


def test_cohomology_vanishing_and_omega_termination_are_flat() -> None:
    for regime in REGIMES:
        assert cohomology_vanishes(regime) is is_flat_regime(regime)
        assert (not cohomology_vanishes(regime)) is is_curved_regime(regime)
        assert terminates_by_omega(regime) is is_flat_regime(regime)
        assert not (is_curved_regime(regime) and terminates_by_omega(regime))


def test_curvature_rank_is_zero_exactly_for_flat_regimes() -> None:
    for regime in FLAT_CURVATURE_REGIMES:
        assert curvature_rank(regime) == 0

    for regime in CURVED_REGIMES:
        assert curvature_rank(regime) is None


def test_curvature_regime_correspondence_bundles_theorem_legs() -> None:
    for regime in REGIMES:
        witness = curvature_regime_correspondence(regime)

        assert witness.regime is regime
        assert witness.flat_iff_not_curved
        assert witness.vanishes_iff_flat
        assert witness.nonvanishes_iff_curved
        assert witness.no_curved_omega_terminating
        assert witness.rank_zero_iff_flat
        assert witness.curvature_rank == curvature_rank(regime)


def test_salem_pisot_regime_split_still_matches_curvature_partition() -> None:
    salem, pisot = salem_vs_pisot_regime()

    assert salem == inflation_regime(on_unit_circle=True)
    assert pisot == inflation_regime(on_unit_circle=False)
    assert is_curved_regime(salem)
    assert is_flat_regime(pisot)

    salem_data = inflation_regime_data(on_unit_circle=True)
    pisot_data = inflation_regime_data(on_unit_circle=False)
    assert not salem_data.scott_continuous
    assert pisot_data.scott_continuous
