"""The four-corner coherence cell — QuartetRecurrence (the corpus keystone).

Witnesses RelMath's master conflation (every four-corner reading round-trips to
the identity) and the recurring coherence 2-cell (twistoring: neg ∘ conflate =
conflate ∘ neg on every bilattice).
"""

from __future__ import annotations

import pytest

from pymetrologic import (
    CORNERS,
    Bilattice,
    Chain,
    Corner,
    Modal,
    bilattice,
    boolean,
    charge_of_corner,
    corner_of_charge,
    corner_of_modal,
    corner_of_status,
    four,
    modal_of_corner,
    quartet_recurrence,
    status_of_corner,
    twistoring_pair,
    unit_interval,
)


def test_master_conflation_holds() -> None:
    assert quartet_recurrence()


def test_there_are_exactly_four_corners() -> None:
    assert len(CORNERS) == 4
    assert len(set(CORNERS)) == 4
    assert len(list(Modal)) == 4


def test_corner_status_roundtrip_is_identity() -> None:
    for c in CORNERS:
        assert corner_of_status(*status_of_corner(c)) is c


def test_corner_modal_roundtrip_is_identity() -> None:
    for c in CORNERS:
        assert corner_of_modal(modal_of_corner(c)) is c
    for m in Modal:
        assert modal_of_corner(corner_of_modal(m)) is m


def test_charge_alignment_with_FOUR() -> None:
    bl = four()
    assert charge_of_corner(bl, Corner.ABSURD) == bl.none  # ⊥
    assert charge_of_corner(bl, Corner.POTENTIAL) == bl.true  # t
    assert charge_of_corner(bl, Corner.ACTIVE) == bl.false  # f
    assert charge_of_corner(bl, Corner.STABLE) == bl.conflict  # ⊤
    for c in CORNERS:
        assert corner_of_charge(bl, charge_of_corner(bl, c)) is c


def test_modal_corner_names_line_up() -> None:
    assert modal_of_corner(Corner.ABSURD) is Modal.NEITHER
    assert modal_of_corner(Corner.POTENTIAL) is Modal.DIA  # ◇ = j₁
    assert modal_of_corner(Corner.ACTIVE) is Modal.BOX  # □ = j₂
    assert modal_of_corner(Corner.STABLE) is Modal.BOTH


@pytest.mark.parametrize(
    "bl",
    [bilattice(boolean()), bilattice(Chain(3)), bilattice(unit_interval())],
    ids=["FOUR", "chain3", "unit"],
)
def test_twistoring_pair_commutes(bl: Bilattice[object]) -> None:
    # The coherence 2-cell: neg ∘ conflate = conflate ∘ neg on every bilattice.
    pair = twistoring_pair(bl)
    assert pair.commutes(bl.sample(4), bl.eq)


def test_corner_op_actions() -> None:
    bl = four()
    pair = twistoring_pair(bl)
    a = bl.true
    assert pair.corner_op(Corner.ABSURD, a) == a  # identity
    assert pair.corner_op(Corner.POTENTIAL, a) == bl.neg(a)  # f
    assert pair.corner_op(Corner.ACTIVE, a) == bl.conflate(a)  # g
    assert pair.corner_op(Corner.STABLE, a) == bl.neg(bl.conflate(a))  # f∘g
    # The square: both paths from the free corner agree.
    left, right = pair.square(a)
    assert bl.eq(left, right)
