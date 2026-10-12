"""Settling Frobenius algebra and Abrams 2D TQFT."""

from __future__ import annotations

import pytest

from pymetrologic.frobenius_tqft import (
    commutative_frobenius_is_tqft,
    counit_reads_top,
    degree_of_class,
    handle_operator,
    settling_frobenius_algebra,
    tqft_of_commutative,
    z2add,
    z2comul,
    z2counit,
    z2mul,
    z2neg,
    z2one,
    z2zero,
)

SAMPLES = ((-1, 0), (0, 0), (1, 0), (0, 1), (2, -1))


def test_z2_is_the_truncated_polynomial_product() -> None:
    assert z2mul((2, 3), (5, 7)) == (10, 29)
    assert z2mul((0, 1), (0, 1)) == z2zero()
    assert z2mul(z2one(), (4, -3)) == (4, -3)
    assert z2add((1, 2), z2neg((1, 2))) == z2zero()


def test_comultiplication_and_counit_recombine() -> None:
    assert z2counit((3, 4)) == 4
    assert z2comul((3, 4)) == (
        ((3, 0), (0, 1)),
        ((0, 1), (3, 0)),
        ((0, 4), (0, 1)),
    )

    frobenius = settling_frobenius_algebra(SAMPLES)
    assert frobenius.laws.counit_laws
    assert frobenius.laws.frobenius_compatibility


def test_settling_frobenius_algebra_bundles_all_laws() -> None:
    witness = settling_frobenius_algebra(SAMPLES)

    assert witness.holds
    assert witness.unit == z2one()
    assert witness.laws.module_laws
    assert witness.laws.algebra_laws
    assert witness.laws.bilinear
    assert witness.laws.commutative
    assert witness.k4_graded


def test_degree_model_places_h0_and_h1_on_the_two_axes() -> None:
    assert degree_of_class(0, 5) == (5, 0)
    assert degree_of_class(1, 5) == (0, 5)
    assert degree_of_class(2, 5) == z2zero()
    assert degree_of_class(4, -7) == z2zero()
    assert counit_reads_top(5)

    with pytest.raises(ValueError, match="degree must be nonnegative"):
        degree_of_class(-1, 1)


def test_handle_operator_is_mu_after_delta() -> None:
    assert handle_operator((3, 4)) == (0, 6)
    assert handle_operator((0, 4)) == z2zero()


def test_tqft_generators_are_the_frobenius_operations() -> None:
    tqft = tqft_of_commutative(SAMPLES)

    assert tqft.holds
    assert tqft.unit == z2one()
    assert tqft.mult((2, 3), (5, 7)) == z2mul((2, 3), (5, 7))
    assert tqft.counit((2, 3)) == z2counit((2, 3))
    assert tqft.comult((2, 3)) == z2comul((2, 3))


def test_commutative_frobenius_is_tqft_roundtrip() -> None:
    witness = commutative_frobenius_is_tqft(SAMPLES)

    assert witness.holds
    assert witness.circle_value == "Z[x]/(x^2)"
    assert witness.generators_match
    assert witness.roundtrip_mul
    assert witness.roundtrip_unit
