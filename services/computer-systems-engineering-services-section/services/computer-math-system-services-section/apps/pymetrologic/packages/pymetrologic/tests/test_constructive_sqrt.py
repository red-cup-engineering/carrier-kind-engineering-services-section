"""Constructive square-root approximants from RelMath.Real.IVT."""

from __future__ import annotations

from fractions import Fraction

import pytest

from pymetrologic.reals import (
    ConstructiveSqrtWitness,
    constructive_sqrt_witness,
    nat_sqrt,
    nat_sqrt_le_mul,
    nat_sqrt_spec,
    of_nat_sub_sqrt_seq_sq_le,
    sqrt_seq,
    sqrt_seq_le_succ,
    sqrt_seq_num_le,
    sqrt_seq_sq_le,
)


def test_nat_sqrt_is_floor_square_root() -> None:
    expected = {
        0: 0,
        1: 1,
        2: 1,
        3: 1,
        4: 2,
        8: 2,
        9: 3,
        15: 3,
        16: 4,
        80: 8,
        81: 9,
    }

    for n, root in expected.items():
        assert nat_sqrt(n) == root
        assert nat_sqrt_spec(n)

    with pytest.raises(ValueError, match="natural"):
        nat_sqrt(-1)


def test_sqrt_seq_matches_floor_scaled_approximants() -> None:
    assert sqrt_seq(2, 0) == Fraction(1)
    assert sqrt_seq(2, 1) == Fraction(1)
    assert sqrt_seq(2, 2) == Fraction(4, 3)
    assert sqrt_seq(2, 4) == Fraction(7, 5)
    assert sqrt_seq(2, 11) == Fraction(4, 3)

    assert sqrt_seq(9, 0) == Fraction(3)
    assert sqrt_seq(9, 7) == Fraction(3)

    with pytest.raises(ValueError, match="natural"):
        sqrt_seq(2, -1)


def test_sqrt_seq_directional_cauchy_bounds_are_exact() -> None:
    for c in range(1, 8):
        for m in range(8):
            for n in range(8):
                assert sqrt_seq_num_le(c, m, n)
                assert sqrt_seq_le_succ(c, m, n)


def test_sqrt_seq_brackets_the_square_root() -> None:
    for c in range(1, 12):
        for k in range(12):
            assert sqrt_seq_sq_le(c, k)
            assert nat_sqrt_le_mul(c, k)
            assert of_nat_sub_sqrt_seq_sq_le(c, k)

    approximation = sqrt_seq(5, 6)
    assert approximation == Fraction(15, 7)
    assert Fraction(5) - approximation * approximation == Fraction(20, 49)
    assert Fraction(20, 49) <= Fraction(10, 7)


def test_constructive_sqrt_witness_bundles_lean_checks() -> None:
    witness = constructive_sqrt_witness(2, 12)

    assert isinstance(witness, ConstructiveSqrtWitness)
    assert witness.c == 2
    assert witness.depth == 12
    assert witness.approximations[0] == Fraction(1)
    assert witness.final_approximation == Fraction(18, 13)
    assert witness.final_square_gap == Fraction(14, 169)
    assert witness.holds


def test_constructive_sqrt_validation() -> None:
    with pytest.raises(ValueError, match="positive natural"):
        constructive_sqrt_witness(0, 3)

    with pytest.raises(ValueError, match="natural"):
        constructive_sqrt_witness(2, -1)

    with pytest.raises(ValueError, match="positive natural"):
        nat_sqrt_le_mul(0, 1)

    with pytest.raises(ValueError, match="positive natural"):
        of_nat_sub_sqrt_seq_sq_le(0, 1)
