"""Exact rational linear algebra + Smith Normal Form (extension beyond the Lean corpus).

Ported from pypredcalc's ``_linalg`` layer — see ``pymetrologic.exact_linalg``'s
module docstring for provenance. No Lean theorem is realized here.
"""

from __future__ import annotations

from fractions import Fraction

import pytest

from pymetrologic import (
    ExactMatrix,
    exact_det,
    exact_inverse,
    exact_rank,
    exact_solve,
    integer_rank,
    smith_normal_form,
)


class TestExactMatrix:
    def test_shape(self) -> None:
        m = ExactMatrix.from_rows([[1, 2, 3], [4, 5, 6]])
        assert m.shape == (2, 3)
        assert m.n_rows == 2
        assert m.n_cols == 3

    def test_zeros_and_identity(self) -> None:
        z = ExactMatrix.zeros(2, 3)
        assert all(x == 0 for row in z.rows for x in row)
        ident = ExactMatrix.identity(3)
        for r in range(3):
            for c in range(3):
                assert ident.get(r, c) == (1 if r == c else 0)

    def test_ragged_raises(self) -> None:
        with pytest.raises(ValueError, match="ragged"):
            ExactMatrix.from_rows([[1, 2], [3]])

    def test_matmul(self) -> None:
        a = ExactMatrix.from_rows([[1, 2], [3, 4]])
        b = ExactMatrix.from_rows([[5, 6], [7, 8]])
        assert (a @ b) == ExactMatrix.from_rows([[19, 22], [43, 50]])

    def test_matmul_shape_mismatch(self) -> None:
        a = ExactMatrix.from_rows([[1, 2]])
        with pytest.raises(ValueError, match="shape mismatch"):
            a @ a

    def test_transpose(self) -> None:
        m = ExactMatrix.from_rows([[1, 2, 3], [4, 5, 6]])
        assert m.transpose() == ExactMatrix.from_rows([[1, 4], [2, 5], [3, 6]])

    def test_fractional_entries_stay_exact(self) -> None:
        m = ExactMatrix.from_rows([[Fraction(1, 2), Fraction(1, 3)]])
        assert m.get(0, 0) == Fraction(1, 2)
        assert m.get(0, 1) == Fraction(1, 3)


class TestExactDet:
    def test_2x2(self) -> None:
        assert exact_det(ExactMatrix.from_rows([[1, 2], [3, 4]])) == Fraction(-2)

    def test_singular_is_zero(self) -> None:
        assert exact_det(ExactMatrix.from_rows([[1, 1], [1, 1]])) == Fraction(0)

    def test_identity_is_one(self) -> None:
        assert exact_det(ExactMatrix.identity(5)) == Fraction(1)

    def test_fractional_entries(self) -> None:
        m = ExactMatrix.from_rows(
            [[Fraction(1, 2), Fraction(1, 3)], [Fraction(1, 4), Fraction(1, 5)]]
        )
        # det = 1/10 - 1/12 = 1/60
        assert exact_det(m) == Fraction(1, 60)

    def test_non_square_raises(self) -> None:
        with pytest.raises(ValueError, match="square"):
            exact_det(ExactMatrix.from_rows([[1, 2, 3]]))


class TestExactRank:
    def test_full_rank(self) -> None:
        assert exact_rank(ExactMatrix.identity(3)) == 3

    def test_zero_matrix(self) -> None:
        assert exact_rank(ExactMatrix.zeros(3, 3)) == 0

    def test_rank_deficient(self) -> None:
        assert exact_rank(ExactMatrix.from_rows([[1, 1], [1, 1]])) == 1

    def test_rectangular(self) -> None:
        assert exact_rank(ExactMatrix.from_rows([[1, 0, 0], [0, 1, 0]])) == 2


class TestExactInverseAndSolve:
    def test_identity_inverse(self) -> None:
        assert exact_inverse(ExactMatrix.identity(3)) == ExactMatrix.identity(3)

    def test_round_trips(self) -> None:
        a = ExactMatrix.from_rows([[1, 2], [3, 4]])
        inv = exact_inverse(a)
        assert (a @ inv) == ExactMatrix.identity(2)
        assert (inv @ a) == ExactMatrix.identity(2)

    def test_singular_raises(self) -> None:
        with pytest.raises(ValueError, match="singular"):
            exact_inverse(ExactMatrix.from_rows([[1, 2], [2, 4]]))

    def test_solve_matches_inverse(self) -> None:
        a = ExactMatrix.from_rows([[2, 1], [1, 3]])
        b = ExactMatrix.from_rows([[5], [10]])
        x = exact_solve(a, b)
        assert (a @ x) == b

    def test_solve_singular_raises(self) -> None:
        with pytest.raises(ValueError, match="singular"):
            exact_solve(
                ExactMatrix.from_rows([[1, 1], [1, 1]]),
                ExactMatrix.from_rows([[1], [2]]),
            )


class TestSmithNormalForm:
    def test_identity(self) -> None:
        assert smith_normal_form(ExactMatrix.identity(3)) == (1, 1, 1)

    def test_zero_matrix(self) -> None:
        assert smith_normal_form(ExactMatrix.zeros(2, 2)) == ()

    def test_diagonal_already_invariant(self) -> None:
        assert smith_normal_form(ExactMatrix.from_rows([[1, 0], [0, 6]])) == (1, 6)

    def test_torsion_2x2(self) -> None:
        # diag(2, 4): 2 | 4, genuine torsion (a Z/2 x Z/4 quotient's shape).
        assert smith_normal_form(ExactMatrix.from_rows([[2, 0], [0, 4]])) == (2, 4)

    def test_unimodular_fibonacci_matrix(self) -> None:
        assert smith_normal_form(ExactMatrix.from_rows([[1, 1], [1, 0]])) == (1, 1)

    def test_rank_deficient(self) -> None:
        assert smith_normal_form(ExactMatrix.from_rows([[1, 1], [1, 1]])) == (1,)

    def test_integer_rank(self) -> None:
        assert integer_rank(ExactMatrix.identity(4)) == 4
        assert integer_rank(ExactMatrix.zeros(3, 3)) == 0
        assert integer_rank(ExactMatrix.from_rows([[1, 1], [1, 1]])) == 1

    def test_non_integer_entries_raise(self) -> None:
        with pytest.raises(ValueError, match="integer"):
            smith_normal_form(ExactMatrix.from_rows([[Fraction(1, 2)]]))
