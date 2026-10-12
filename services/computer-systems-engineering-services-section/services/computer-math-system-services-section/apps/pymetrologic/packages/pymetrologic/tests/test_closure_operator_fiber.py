"""Closure-operator fiber laws (RelMath.Closure.ClosureOperatorFiber)."""

from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.closure_operator_fiber import (
    CHARGES,
    charge_closure_laws,
    charge_join_closure,
    closure_merge,
    closure_operator_fiber_laws,
    identity_charge_closure,
    iter_valuation,
    lfp_is_settled,
    lfp_reached_by_three,
    lift_op,
    no_periodic_orbits,
    pointwise_family,
    reindex,
    settle_lift,
    valuation_eq,
    valuation_join_k,
    valuation_leq,
    valuations,
)

FOUR = four()
CELLS = ("p", "q")


def test_charge_join_closure_is_a_four_closure() -> None:
    closure = charge_join_closure(FOUR.true)

    assert charge_closure_laws(identity_charge_closure())
    assert charge_closure_laws(closure)
    assert closure(FOUR.none) == FOUR.true
    assert closure(FOUR.false) == FOUR.conflict
    assert closure(FOUR.conflict) == FOUR.conflict


def test_lift_op_applies_the_charge_closure_fiberwise() -> None:
    closure = charge_join_closure(FOUR.true)
    valuation = {"p": FOUR.none, "q": FOUR.false}

    assert lift_op(closure, valuation) == {"p": FOUR.true, "q": FOUR.conflict}
    assert valuation_leq(valuation, lift_op(closure, valuation))
    assert valuation_eq(lift_op(closure, lift_op(closure, valuation)), lift_op(closure, valuation))


def test_pointwise_family_is_c_natural_under_reindexing() -> None:
    closure = charge_join_closure(FOUR.true)
    cells = ("p", "q", "r")
    rotation = {"p": "q", "q": "r", "r": "p"}
    valuation = {"p": FOUR.none, "q": FOUR.false, "r": FOUR.true}

    assert pointwise_family(closure, cells, rotation).holds
    assert lift_op(closure, reindex(rotation, valuation, cells)) == reindex(
        rotation,
        lift_op(closure, valuation),
        cells,
    )


def test_closure_merge_makes_first_saturation_redundant() -> None:
    closure = charge_join_closure(FOUR.true)
    left = {"p": FOUR.none, "q": FOUR.false}
    right = {"p": FOUR.false, "q": FOUR.true}

    assert closure_merge(closure, left, right)
    assert lift_op(closure, valuation_join_k(lift_op(closure, left), right)) == lift_op(
        closure,
        valuation_join_k(left, right),
    )


def test_no_periodic_orbits_for_pointwise_closure() -> None:
    closure = charge_join_closure(FOUR.true)
    nonfixed = {"p": FOUR.none, "q": FOUR.false}
    fixed = lift_op(closure, nonfixed)

    assert no_periodic_orbits(closure, nonfixed, 2)
    assert no_periodic_orbits(closure, fixed, 2)
    assert iter_valuation(closure, fixed, 2) == fixed
    with pytest.raises(ValueError, match="positive"):
        no_periodic_orbits(closure, fixed, 0)


def test_lfp_is_the_settled_valuation() -> None:
    closure = charge_join_closure(FOUR.true)
    seed = {"p": FOUR.none, "q": FOUR.false}
    settled = settle_lift(closure, seed)

    assert settled == {"p": FOUR.true, "q": FOUR.conflict}
    assert lfp_is_settled(closure, seed)
    assert lift_op(closure, settled) == settled


def test_reached_by_three_bound_holds_on_all_sampled_valuations() -> None:
    closure = charge_join_closure(FOUR.true)

    assert len(CHARGES) == 4
    assert len(valuations(CELLS)) == 16
    assert all(lfp_reached_by_three(closure, valuation) for valuation in valuations(CELLS))


def test_closure_operator_fiber_witness_bundles_all_laws() -> None:
    closure = charge_join_closure(FOUR.true)
    witness = closure_operator_fiber_laws(closure, CELLS)

    assert witness.holds
    assert witness.pointwise_family
    assert witness.no_periodic_orbits
    assert witness.closure_merge
    assert witness.lfp_is_settled
    assert witness.reached_by_three
