"""Exact rational shadows of RelMath.Real.RealMultiplication."""

from __future__ import annotations

from fractions import Fraction

import pytest

from pymetrologic.reals import (
    BishopProductEstimateWitness,
    RationalMultiplicationWitness,
    bishop_product_estimate,
    rat_abs_mul,
    rat_abs_sub_zero,
    rat_inv_nat_p,
    rat_le_nat_ge,
    rat_mul_le_mul_of_nonneg_left,
    rat_mul_le_mul_of_nonneg_right,
    rat_mul_neg,
    rat_mul_sub,
    rat_mul_sub_split,
    rat_nat_ge,
    rat_of_nat_le_of_nat,
    rat_of_nat_mul_inv_nat_p_le,
    rat_sub_add_sub_cancel,
    real_abs_seq_le_tail_bound,
    real_multiplication_witness,
    real_tail_bound,
)


def test_rational_multiplication_identities_are_exact() -> None:
    samples = (Fraction(-3, 2), Fraction(-1, 3), Fraction(0), Fraction(2, 5), Fraction(5, 4))

    for x in samples:
        assert rat_abs_sub_zero(x)
        for y in samples:
            assert rat_abs_mul(x, y)
            assert rat_mul_neg(x, y)
            for z in samples:
                assert rat_mul_sub(x, y, z)
                assert rat_sub_add_sub_cancel(x, y, z)

    assert rat_mul_sub_split(Fraction(2), Fraction(3, 5), Fraction(7, 4), Fraction(-1, 2))


def test_nonnegative_multiplication_monotonicity_requires_hypotheses() -> None:
    assert rat_mul_le_mul_of_nonneg_left(Fraction(1, 3), Fraction(2, 3), Fraction(5))
    assert rat_mul_le_mul_of_nonneg_right(Fraction(-2), Fraction(3), Fraction(7, 4))

    with pytest.raises(ValueError, match="a <= b"):
        rat_mul_le_mul_of_nonneg_left(Fraction(3), Fraction(2), Fraction(1))

    with pytest.raises(ValueError, match="0 <= c"):
        rat_mul_le_mul_of_nonneg_right(Fraction(1), Fraction(2), Fraction(-1))


def test_positive_reciprocal_and_bound_scaling_match_lean_indexing() -> None:
    assert rat_inv_nat_p(0) == Fraction(1)
    assert rat_inv_nat_p(4) == Fraction(1, 5)
    assert rat_of_nat_mul_inv_nat_p_le(3, 4, 14)
    assert rat_of_nat_le_of_nat(4, 7)

    with pytest.raises(ValueError, match="natural"):
        rat_inv_nat_p(-1)

    with pytest.raises(ValueError, match=r"bound .* <= m"):
        rat_of_nat_mul_inv_nat_p_le(3, 4, 13)

    with pytest.raises(ValueError, match="m <= n"):
        rat_of_nat_le_of_nat(5, 4)


def test_nat_ge_and_finite_tail_bound_are_constructive_bounds() -> None:
    values = (Fraction(-7, 3), Fraction(0), Fraction(5, 2))

    assert rat_nat_ge(Fraction(-9, 4)) == 1
    assert rat_le_nat_ge(Fraction(11, 5))
    assert real_tail_bound(values) == 3
    assert real_abs_seq_le_tail_bound(values)

    with pytest.raises(ValueError, match="nonempty"):
        real_tail_bound(())


def test_bishop_product_estimate_uses_refined_modulus() -> None:
    witness = bishop_product_estimate(
        Fraction(2),
        Fraction(1),
        Fraction(79, 40),
        Fraction(39, 40),
        factor_bound=3,
        precision=4,
    )

    assert isinstance(witness, BishopProductEstimateWitness)
    assert witness.refined_index == 30
    assert witness.left_difference == Fraction(1, 40)
    assert witness.right_difference == Fraction(1, 40)
    assert witness.product_difference == Fraction(119, 1600)
    assert witness.bound == Fraction(1, 5)
    assert witness.holds


def test_bishop_product_estimate_validates_lean_side_conditions() -> None:
    with pytest.raises(ValueError, match="positive natural"):
        bishop_product_estimate(
            Fraction(0), Fraction(0), Fraction(0), Fraction(0), factor_bound=0, precision=1
        )

    with pytest.raises(ValueError, match="bounded"):
        bishop_product_estimate(
            Fraction(4), Fraction(0), Fraction(0), Fraction(0), factor_bound=3, precision=1
        )

    with pytest.raises(ValueError, match="refined modulus"):
        bishop_product_estimate(
            Fraction(1), Fraction(1), Fraction(1, 2), Fraction(0), factor_bound=1, precision=2
        )


def test_real_multiplication_witness_bundles_the_socket_checks() -> None:
    witness = real_multiplication_witness()

    assert isinstance(witness, RationalMultiplicationWitness)
    assert witness.nat_ceiling == 2
    assert witness.holds
