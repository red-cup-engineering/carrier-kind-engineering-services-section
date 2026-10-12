"""Closure-rule systems (RelMath.Closure.ClosureRuleSystem)."""

from __future__ import annotations

import pytest

from pymetrologic import BL, four, knowledge_lattice
from pymetrologic.closure_rules import (
    ClosureRule,
    ClosureRuleSystem,
    always_rule,
    generated_closure_is_least,
    immediate_consequence_lfp,
)

bl = four()
lat = knowledge_lattice(bl.L)


def _cascade_system() -> ClosureRuleSystem[BL[int]]:
    return ClosureRuleSystem(
        lat,
        (
            always_rule(bl.true, name="admit-truth"),
            ClosureRule(
                antecedent=lambda value: lat.leq(bl.true, value),
                consequent=bl.conflict,
                name="truth-forces-conflict",
            ),
        ),
    )


def test_immediate_consequence_operator_fires_a_cascade() -> None:
    system = _cascade_system()

    assert system.is_positive()
    assert system.step(bl.none) == bl.true
    assert system.step(bl.true) == bl.conflict
    assert system.step(bl.conflict) == bl.conflict


def test_generated_closure_is_the_least_fixed_point_above_seed() -> None:
    system = _cascade_system()
    witness = immediate_consequence_lfp(system, bl.none)

    assert witness.holds
    assert witness.seed == bl.none
    assert witness.closure == bl.conflict
    assert witness.iterations == 2
    assert generated_closure_is_least(system, bl.none)


def test_rule_respecting_closed_values_already_contain_fired_consequents() -> None:
    system = _cascade_system()

    assert not system.is_closed(bl.true)
    assert system.is_closed(bl.conflict)
    assert not system.respects_rules(bl.true)
    assert system.respects_rules(bl.conflict)


def test_always_rule_generates_a_single_step_closure() -> None:
    system = ClosureRuleSystem(lat, (always_rule(bl.true),))
    witness = system.generated_closure_witness(bl.none)

    assert witness.holds
    assert witness.closure == bl.true
    assert witness.iterations == 1


def test_nonpositive_antecedent_is_rejected_for_generated_closure() -> None:
    system = ClosureRuleSystem(
        lat,
        (
            ClosureRule(
                antecedent=lambda value: value == bl.none,
                consequent=bl.true,
                name="nonpositive",
            ),
        ),
    )

    assert not system.is_positive()
    with pytest.raises(ValueError, match="positive antecedents"):
        system.generated_closure(bl.none)
