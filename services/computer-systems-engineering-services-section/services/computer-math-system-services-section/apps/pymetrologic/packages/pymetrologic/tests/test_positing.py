"""Root positing carrier (RelMath.Positing)."""

from __future__ import annotations

import pytest

from pymetrologic.articulating_primitives import Mark
from pymetrologic.positing import (
    Charge,
    charge_join_k,
    charge_join_t,
    charge_le_k,
    charge_le_t,
    charge_meet_k,
    charge_meet_t,
    charge_neg,
    charge_negate,
    charge_negation_laws_hold,
    charge_of_slots,
    charge_pos,
    charge_slot_roundtrip_holds,
    charge_truth_poles_swap_holds,
    charge_with_knowledge_poles_hold,
    knowledge_least,
    positing_root_witness,
    valuation_join_k,
    valuation_knowledge_least,
    valuation_le_k,
)
from pymetrologic.predicating import PredicationCell
from pymetrologic.quartet import CORNERS, Corner


def test_charge_is_the_four_corner_object() -> None:
    assert tuple(Charge) == CORNERS
    assert charge_of_slots(False, False) is Corner.ABSURD
    assert charge_of_slots(True, False) is Corner.POTENTIAL
    assert charge_of_slots(False, True) is Corner.ACTIVE
    assert charge_of_slots(True, True) is Corner.STABLE
    assert all(charge_of_slots(charge_pos(c), charge_neg(c)) is c for c in CORNERS)
    assert charge_slot_roundtrip_holds()


def test_knowledge_and_truth_operations_match_slots() -> None:
    assert knowledge_least is Corner.ABSURD
    assert charge_join_k(Corner.POTENTIAL, Corner.ACTIVE) is Corner.STABLE
    assert charge_meet_k(Corner.POTENTIAL, Corner.ACTIVE) is Corner.ABSURD
    assert charge_join_t(Corner.POTENTIAL, Corner.ACTIVE) is Corner.POTENTIAL
    assert charge_meet_t(Corner.POTENTIAL, Corner.ACTIVE) is Corner.ACTIVE

    assert all(charge_le_k(Corner.ABSURD, c) for c in CORNERS)
    assert all(charge_le_k(c, Corner.STABLE) for c in CORNERS)
    assert charge_le_t(Corner.ACTIVE, Corner.POTENTIAL)
    assert charge_with_knowledge_poles_hold()


def test_negation_is_truth_duality() -> None:
    assert charge_negate(Corner.POTENTIAL) is Corner.ACTIVE
    assert charge_negate(Corner.ACTIVE) is Corner.POTENTIAL
    assert charge_truth_poles_swap_holds()
    assert charge_negation_laws_hold()


def test_valuation_seed_and_join() -> None:
    cells = (
        PredicationCell(Mark("alice"), Mark("knows"), Mark("bob")),
        PredicationCell(Mark("bob"), Mark("knows"), Mark("alice")),
    )
    bottom = valuation_knowledge_least(cells)
    sample = {cells[0]: Corner.POTENTIAL, cells[1]: Corner.ACTIVE}

    assert valuation_le_k(bottom, sample)
    assert valuation_join_k(bottom, sample) == sample

    with pytest.raises(ValueError, match="same finite support"):
        valuation_join_k(bottom, {cells[0]: Corner.POTENTIAL})


def test_positing_root_witness_holds() -> None:
    assert positing_root_witness().holds
