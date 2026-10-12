"""Settling over a value category (RelMath.Value.SettlingOverValueCategory)."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import BL, four
from pymetrologic.regimes import (
    ClosureRegime,
)
from pymetrologic.value_settling import (
    ValueRegimeData,
    boolean_recovers_spine,
    boolean_value_category,
    charge_value_category,
    classify_value_regime,
    four_regime_v_independent,
    genuine_lax_cone_needs_non_thin_carrier,
    lax_closure_idem_of_antisymm,
    lax_slack_witnesses_nonantisymmetry,
    lax_vclosure,
    pre_value_category,
    prevalue_has_lax_slack,
    regime_of,
    vclosure,
    vsettle,
    vsettle_lfp,
)

bl = four()


def _four_add_true() -> Callable[[BL[int]], BL[int]]:
    four_v = charge_value_category()
    return lambda value: four_v.lattice.join(value, bl.true)


def test_value_closure_settles_to_least_fixed_point_over_boolean() -> None:
    boolean_v = boolean_value_category()
    force_true = vclosure(boolean_v, lambda value: value or True)
    witness = vsettle_lfp(force_true, False)

    assert vsettle(force_true, False)
    assert witness.holds
    assert witness.seed is False
    assert witness.settled is True
    assert witness.seed_below_settled
    assert witness.fixed
    assert witness.least_fixed_above_seed


def test_value_closure_recovers_four_spine_settling() -> None:
    four_v = charge_value_category()
    add_true = vclosure(four_v, _four_add_true())
    witness = vsettle_lfp(add_true, bl.none)

    assert vsettle(add_true, bl.none) == bl.true
    assert witness.holds
    assert witness.settled == bl.true


@pytest.mark.parametrize(
    ("data", "expected"),
    [
        (
            ValueRegimeData(scott_continuous=True, finite_base=True, countable_cofinality=True),
            ClosureRegime.strict,
        ),
        (
            ValueRegimeData(scott_continuous=True, finite_base=False, countable_cofinality=True),
            ClosureRegime.scott,
        ),
        (
            ValueRegimeData(scott_continuous=False, finite_base=False, countable_cofinality=True),
            ClosureRegime.transfinite_bounded,
        ),
        (
            ValueRegimeData(scott_continuous=False, finite_base=False, countable_cofinality=False),
            ClosureRegime.aperiodic,
        ),
    ],
)
def test_value_regime_classifier_matches_four_regime_dichotomy(
    data: ValueRegimeData, expected: ClosureRegime
) -> None:
    assert classify_value_regime(data) == expected


def test_value_regime_classification_is_independent_of_carrier() -> None:
    boolean_closure = vclosure(boolean_value_category(), lambda value: value or True)
    four_closure = vclosure(charge_value_category(), _four_add_true())
    data = ValueRegimeData(scott_continuous=False, finite_base=False, countable_cofinality=True)
    witness = four_regime_v_independent(boolean_closure, four_closure, data)

    assert witness.holds
    assert witness.left_category == "Boolean"
    assert witness.right_category == "FOUR"
    assert witness.left_regime == ClosureRegime.transfinite_bounded
    assert witness.right_regime == ClosureRegime.transfinite_bounded
    assert regime_of(boolean_closure, data) == regime_of(four_closure, data)


def test_boolean_and_four_recover_the_spine() -> None:
    witness = boolean_recovers_spine()

    assert witness.holds
    assert witness.boolean_reflexive
    assert witness.four_reflexive
    assert witness.four_settle_is_closure
    assert witness.four_settle_lfp.holds


def test_pre_value_category_allows_non_thin_lax_slack() -> None:
    prevalue = pre_value_category("indiscrete-two", ("a", "b"), lambda _left, _right: True, "a")

    def flip(value: str) -> str:
        return "b" if value == "a" else "a"

    closure = lax_vclosure(prevalue, flip)
    witness = lax_slack_witnesses_nonantisymmetry(closure, "a")
    headline = genuine_lax_cone_needs_non_thin_carrier(closure, "a")

    assert not prevalue.is_antisymmetric()
    assert prevalue_has_lax_slack(closure, "a")
    assert witness.holds
    assert witness.lower == "a"
    assert witness.upper == "b"
    assert headline == witness


def test_lax_closure_collapses_to_idempotence_on_antisymmetric_prevalue() -> None:
    boolean_prevalue = pre_value_category(
        "boolean-prevalue",
        (False, True),
        lambda left, right: (not left) or right,
        False,
    )
    closure = lax_vclosure(boolean_prevalue, lambda value: value or True)

    assert boolean_prevalue.is_antisymmetric()
    assert lax_closure_idem_of_antisymm(closure, False)
    assert lax_closure_idem_of_antisymm(closure, True)
    assert not prevalue_has_lax_slack(closure, False)


def test_value_settling_rejects_invalid_data_and_nonclosure() -> None:
    with pytest.raises(ValueError, match="finite value-regime data"):
        classify_value_regime(
            ValueRegimeData(scott_continuous=False, finite_base=True, countable_cofinality=True)
        )

    boolean_v = boolean_value_category()
    with pytest.raises(ValueError, match="closure operator"):
        vclosure(boolean_v, lambda value: not value)


def test_pre_value_category_rejects_invalid_lax_closure_data() -> None:
    with pytest.raises(ValueError, match="reflexive"):
        pre_value_category("not-reflexive", ("a",), lambda _left, _right: False, "a")

    boolean_prevalue = pre_value_category(
        "boolean-prevalue",
        (False, True),
        lambda left, right: (not left) or right,
        False,
    )
    with pytest.raises(ValueError, match="inflationary"):
        lax_vclosure(boolean_prevalue, lambda _value: False)
