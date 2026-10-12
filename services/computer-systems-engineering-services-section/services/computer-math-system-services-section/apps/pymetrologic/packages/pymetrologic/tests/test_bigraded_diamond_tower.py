"""K4-graded bigraded diamond tower from RelMath.Positing.BigradedDiamondTower."""

from __future__ import annotations

from pymetrologic.bigraded_diamond_tower import (
    BigradedDiamondTowerWitness,
    GradeSquare,
    axes_independent,
    bigraded_diamond_tower,
    bigrading_roundtrip,
    grade_corner,
    grade_of_corner,
    grade_poles,
    knowledge_axis,
    of_four_corner,
    to_four_corner,
    tower_bigrading_is_two_orders,
    tower_square,
    truth_axis,
)
from pymetrologic.klein import K4, K4_ELEMENTS, mul
from pymetrologic.quartet import CORNERS, Corner


def test_k4_decomposes_as_two_grading_bits() -> None:
    assert to_four_corner(K4.ID) == (False, False)
    assert to_four_corner(K4.NEG) == (True, False)
    assert to_four_corner(K4.CONF) == (False, True)
    assert to_four_corner(K4.NEGCONF) == (True, True)

    for grade in K4_ELEMENTS:
        assert of_four_corner(to_four_corner(grade)) is grade


def test_grade_corner_bijection_matches_the_four_corners() -> None:
    assert tuple(grade_corner(grade) for grade in K4_ELEMENTS) == CORNERS

    for corner in CORNERS:
        assert grade_corner(grade_of_corner(corner)) is corner


def test_axes_are_independent_z2_factors() -> None:
    assert axes_independent()

    for grade in K4_ELEMENTS:
        assert knowledge_axis(mul(K4.NEG, grade)) is (not knowledge_axis(grade))
        assert truth_axis(mul(K4.NEG, grade)) is truth_axis(grade)
        assert knowledge_axis(mul(K4.CONF, grade)) is knowledge_axis(grade)
        assert truth_axis(mul(K4.CONF, grade)) is (not truth_axis(grade))


def test_each_grade_selects_a_same_order_square_slot() -> None:
    square = tower_square(K4.NEGCONF)

    assert isinstance(square, GradeSquare)
    assert square.corner is Corner.STABLE
    assert grade_poles(K4.ID) == (Corner.ABSURD, Corner.ABSURD)
    assert grade_poles(K4.NEG) == (Corner.POTENTIAL, Corner.ABSURD)
    assert grade_poles(K4.CONF) == (Corner.ACTIVE, Corner.ABSURD)
    assert grade_poles(K4.NEGCONF) == (Corner.STABLE, Corner.ABSURD)


def test_bigraded_diamond_tower_witness_bundles_the_lean_laws() -> None:
    witness = bigraded_diamond_tower()
    two_orders = tower_bigrading_is_two_orders()

    assert isinstance(witness, BigradedDiamondTowerWitness)
    assert witness.holds
    assert two_orders.holds
    assert bigrading_roundtrip()
