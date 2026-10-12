"""Pairwise Stone/Priestley duality for Belnap FOUR."""

from __future__ import annotations

import pytest

from pymetrologic import BL, four
from pymetrologic.pairwise_stone import (
    CLOPEN_BOT,
    CLOPEN_MINUS,
    CLOPEN_PLUS,
    CLOPEN_TOP,
    CLOPEN_UPS,
    FOUR_DUAL_POINTS,
    FourDualPoint,
    four_dual_le,
    four_dual_sigma,
    four_priestley_dual,
    of_charge,
    order_recovered_from_tau_plus,
    pairwise_stone_topology,
    sigma_act,
    swap_induces_negate,
    swap_is_gauge_neg,
    swap_is_z2_negation,
    tau_minus,
    tau_plus,
    to_charge,
)


def test_dual_points_are_a_two_point_antichain_with_swap() -> None:
    assert FOUR_DUAL_POINTS == (FourDualPoint.PLUS, FourDualPoint.MINUS)
    assert four_dual_le(FourDualPoint.PLUS, FourDualPoint.PLUS)
    assert not four_dual_le(FourDualPoint.PLUS, FourDualPoint.MINUS)
    assert not four_dual_le(FourDualPoint.MINUS, FourDualPoint.PLUS)
    assert four_dual_sigma(FourDualPoint.PLUS) is FourDualPoint.MINUS
    assert four_dual_sigma(FourDualPoint.MINUS) is FourDualPoint.PLUS
    assert all(four_dual_sigma(four_dual_sigma(point)) is point for point in FOUR_DUAL_POINTS)


def test_clopen_upsets_are_four_boolean_membership_cells() -> None:
    assert CLOPEN_UPS == (
        CLOPEN_BOT,
        CLOPEN_PLUS,
        CLOPEN_MINUS,
        CLOPEN_TOP,
    )
    assert CLOPEN_PLUS.mem(FourDualPoint.PLUS)
    assert not CLOPEN_PLUS.mem(FourDualPoint.MINUS)
    assert CLOPEN_MINUS.mem(FourDualPoint.MINUS)
    assert not CLOPEN_MINUS.mem(FourDualPoint.PLUS)
    assert CLOPEN_PLUS.join(CLOPEN_MINUS) == CLOPEN_TOP
    assert CLOPEN_PLUS.meet(CLOPEN_MINUS) == CLOPEN_BOT


def test_four_priestley_duality_table_and_inverses() -> None:
    bl = four()
    witness = four_priestley_dual()

    assert witness.holds
    assert witness.table == (
        (CLOPEN_BOT, bl.none),
        (CLOPEN_PLUS, bl.true),
        (CLOPEN_MINUS, bl.false),
        (CLOPEN_TOP, bl.conflict),
    )
    assert [of_charge(to_charge(clopen)) for clopen in CLOPEN_UPS] == list(CLOPEN_UPS)
    assert [
        to_charge(of_charge(charge)) for charge in (bl.none, bl.true, bl.false, bl.conflict)
    ] == [
        bl.none,
        bl.true,
        bl.false,
        bl.conflict,
    ]


def test_non_four_charges_are_rejected() -> None:
    with pytest.raises(ValueError, match="not one of Belnap FOUR"):
        of_charge(BL(2, 0))


def test_sigma_action_is_bilattice_negation_and_gauge_negation() -> None:
    assert sigma_act(CLOPEN_PLUS) == CLOPEN_MINUS
    assert sigma_act(CLOPEN_MINUS) == CLOPEN_PLUS
    assert sigma_act(CLOPEN_TOP) == CLOPEN_TOP
    assert sigma_act(CLOPEN_BOT) == CLOPEN_BOT

    witness = swap_is_z2_negation()
    assert witness.holds
    assert all(swap_induces_negate(clopen) for clopen in CLOPEN_UPS)
    assert all(swap_is_gauge_neg(clopen) for clopen in CLOPEN_UPS)


def test_pairwise_stone_topologies_recover_the_antichain_order() -> None:
    witness = pairwise_stone_topology()

    assert witness.holds
    assert tau_plus() == CLOPEN_UPS
    assert tau_minus() == (
        CLOPEN_BOT,
        CLOPEN_MINUS,
        CLOPEN_PLUS,
        CLOPEN_TOP,
    )
    assert all(
        order_recovered_from_tau_plus(left, right)
        for left in FOUR_DUAL_POINTS
        for right in FOUR_DUAL_POINTS
    )
