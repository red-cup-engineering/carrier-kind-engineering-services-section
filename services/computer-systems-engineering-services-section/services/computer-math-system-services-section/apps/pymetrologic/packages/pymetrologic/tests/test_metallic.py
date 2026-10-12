from __future__ import annotations

from fractions import Fraction

import pytest

from pymetrologic.metallic import (
    MetallicRealWitness,
    bronze_matrix,
    cayley_hamilton_metallic,
    char_poly_bronze,
    char_poly_metallic,
    char_poly_silver,
    eval_matrix_polynomial,
    matrix_add,
    matrix_scalar_multiply,
    metallic_abs_convergent_gap,
    metallic_cassini_holds,
    metallic_cassini_value,
    metallic_convergent,
    metallic_convergent_gap,
    metallic_convergent_telescope_bound,
    metallic_denominator_positive,
    metallic_gap_step_bound,
    metallic_matrix,
    metallic_matrix_power_succ,
    metallic_num,
    metallic_num_ge,
    metallic_num_positive,
    metallic_quadratic,
    metallic_real_convergent,
    metallic_real_witness,
    silver_matrix,
)


def test_silver_and_bronze_matrices_have_expected_polynomials() -> None:
    assert silver_matrix() == ((2, 1), (1, 0))
    assert bronze_matrix() == ((3, 1), (1, 0))
    assert char_poly_silver() == (-1, -2, 1)
    assert char_poly_bronze() == (-1, -3, 1)
    assert char_poly_metallic(7) == (-1, -7, 1)


def test_metallic_quadratic_identity_holds_for_whole_family() -> None:
    for n in range(-3, 8):
        matrix = metallic_matrix(n)
        assert metallic_quadratic(n)
        assert matrix_add(matrix_scalar_multiply(n, matrix), ((1, 0), (0, 1))) == (
            (n * n + 1, n),
            (n, 1),
        )


def test_cayley_hamilton_annihilates_metallic_matrix() -> None:
    for n in range(-2, 6):
        assert cayley_hamilton_metallic(n)
        assert eval_matrix_polynomial(char_poly_metallic(n), metallic_matrix(n)) == (
            (0, 0),
            (0, 0),
        )


def test_metallic_recurrence_matches_known_sequences() -> None:
    assert [metallic_num(1, k) for k in range(8)] == [0, 1, 1, 2, 3, 5, 8, 13]
    assert [metallic_num(2, k) for k in range(8)] == [0, 1, 2, 5, 12, 29, 70, 169]
    assert [metallic_num(3, k) for k in range(6)] == [0, 1, 3, 10, 33, 109]


def test_metallic_matrix_powers_tabulate_recurrence_values() -> None:
    for n in range(1, 5):
        for k in range(8):
            assert metallic_matrix_power_succ(n, k)


def test_metallic_convergents_and_denominators() -> None:
    assert metallic_convergent(1, 6) == Fraction(13, 8)
    assert metallic_convergent(2, 5) == Fraction(70, 29)
    assert all(metallic_num_positive(2, k) for k in range(12))


def test_metallic_cassini_identity_is_unimodular() -> None:
    assert [metallic_cassini_value(2, k) for k in range(6)] == [-1, 1, -1, 1, -1, 1]
    assert all(metallic_cassini_holds(3, k) for k in range(10))


def test_metallic_real_convergent_gaps_are_exact() -> None:
    assert metallic_real_convergent(2, 0) == Fraction(2, 1)
    assert metallic_real_convergent(2, 1) == Fraction(5, 2)
    assert metallic_convergent_gap(2, 0) == Fraction(1, 2)
    assert metallic_convergent_gap(2, 1) == Fraction(-1, 10)
    assert metallic_abs_convergent_gap(2, 1) == Fraction(
        1,
        metallic_num(2, 3) * metallic_num(2, 2),
    )


def test_metallic_real_growth_and_telescope_bounds() -> None:
    assert all(metallic_num_ge(2, k) for k in range(12))
    assert all(metallic_denominator_positive(2, k) for k in range(12))
    assert all(metallic_gap_step_bound(2, i) for i in range(1, 12))
    assert metallic_convergent_telescope_bound(2, 1, 3)

    witness = metallic_real_witness(2, depth=8)
    assert isinstance(witness, MetallicRealWitness)
    assert witness.holds


def test_metallic_validation() -> None:
    with pytest.raises(ValueError, match="natural"):
        metallic_num(1, -1)

    with pytest.raises(ValueError, match="natural"):
        metallic_matrix_power_succ(1, -1)

    with pytest.raises(ValueError, match="at least 1"):
        metallic_num_positive(0, 1)

    with pytest.raises(ValueError, match="positive"):
        metallic_convergent(1, 0)

    with pytest.raises(ValueError, match="at least 1"):
        metallic_real_convergent(0, 0)

    with pytest.raises(ValueError, match="natural"):
        metallic_cassini_value(1, -1)

    with pytest.raises(ValueError, match="at least 1"):
        metallic_gap_step_bound(1, 0)

    with pytest.raises(ValueError, match="natural"):
        metallic_convergent_telescope_bound(1, 1, -1)
