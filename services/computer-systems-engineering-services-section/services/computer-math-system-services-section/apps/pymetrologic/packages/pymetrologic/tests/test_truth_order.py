from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import BL, four
from pymetrologic.closure_operator_fiber import (
    CHARGES,
)
from pymetrologic.truth_order import (
    TClosure,
    TruthOrderWitness,
    join_t_closure,
    negation_preserves_knowledge_order,
    negation_reverses_truth_order,
    settle_t,
    settle_t_fixed,
    settle_t_tbot_holds,
    t_closure_holds,
    t_closure_least,
    truth_bounds_hold,
    truth_lattice_laws_hold,
    truth_order_witness,
)

charges = st.sampled_from(CHARGES)


def test_truth_order_is_a_bounded_lattice() -> None:
    assert truth_lattice_laws_hold()
    assert truth_bounds_hold()


@given(a=charges, b=charges)
def test_negation_reverses_truth_and_preserves_knowledge(a: BL[int], b: BL[int]) -> None:
    assert negation_reverses_truth_order(a, b)
    assert negation_preserves_knowledge_order(a, b)


def test_join_t_closure_is_truth_closure_and_settles() -> None:
    bl = four()

    for k in CHARGES:
        closure = join_t_closure(k)

        assert isinstance(closure, TClosure)
        assert t_closure_holds(closure)
        assert all(settle_t_fixed(closure, seed) for seed in CHARGES)
        assert settle_t_tbot_holds(k)
        assert settle_t(closure, bl.false) == k


def test_truth_closure_least_fixed_point_above_seed() -> None:
    for k in CHARGES:
        closure = join_t_closure(k)
        for seed in CHARGES:
            for candidate in CHARGES:
                assert t_closure_least(closure, seed, candidate)


def test_truth_order_witness_bundles_all_lean_legs() -> None:
    witness = truth_order_witness()

    assert isinstance(witness, TruthOrderWitness)
    assert witness.holds
    assert witness.truth_lattice
    assert witness.truth_bounds
    assert witness.negation_truth_duality
    assert witness.negation_knowledge_iso
    assert witness.canonical_closures
    assert witness.settled_fixed
    assert witness.settled_least
    assert witness.truth_bottom_settles_to_bound


def test_truth_order_rejects_outside_four_charges() -> None:
    outsider = BL(2, 0)

    with pytest.raises(ValueError, match="four charges"):
        join_t_closure(outsider)
    with pytest.raises(ValueError, match="four charges"):
        settle_t(join_t_closure(four().true), outsider)
    with pytest.raises(ValueError, match="FOUR charges"):
        t_closure_least(join_t_closure(four().true), four().none, outsider)
