"""Rank–nullity over GF(p) (RelMath.LinearAlgebra.RankNullity)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    apply_matrix_gf,
    dimension_well_defined_gf,
    is_basis_gf,
    is_linearly_independent_gf,
    linear_combination_gf,
    nullity_gf,
    rank_gf,
    rank_nullity_holds,
    scalar_mul_gf,
    spans_gf,
    standard_basis_gf,
    vector_add_gf,
    vector_neg_gf,
)


def test_standard_basis_spans_and_is_independent() -> None:
    basis = standard_basis_gf(3, 2)

    assert basis == ((1, 0, 0), (0, 1, 0), (0, 0, 1))
    assert linear_combination_gf([1, 0, 1], basis, 2) == (1, 0, 1)
    assert is_linearly_independent_gf(basis, 2)
    assert spans_gf(basis, 3, 2)
    assert is_basis_gf(basis, 3, 2)
    assert dimension_well_defined_gf(basis, 3, 2)


def test_vector_space_operations_are_componentwise_over_gf() -> None:
    assert vector_add_gf((2, 3, 4), (4, 3, 2), 5) == (1, 1, 1)
    assert vector_neg_gf((1, 2, 0), 3) == (2, 1, 0)
    assert scalar_mul_gf(2, (2, 1, 0), 3) == (1, 2, 0)


def test_worked_bool_linear_map_matches_lean_basic_example() -> None:
    xor_map = [[1, 1]]

    assert apply_matrix_gf(xor_map, (1, 1), 2) == (0,)
    assert apply_matrix_gf(xor_map, (1, 0), 2) == (1,)
    assert rank_gf(xor_map, 2) == 1
    assert nullity_gf(xor_map, 2) == 1
    assert rank_nullity_holds(xor_map, 2)


def test_identity_and_zero_ranks() -> None:
    ident3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    assert rank_gf(ident3, 2) == 3
    assert nullity_gf(ident3, 2) == 0
    zero = [[0, 0, 0], [0, 0, 0]]
    assert rank_gf(zero, 2) == 0
    assert nullity_gf(zero, 2) == 3  # n − 0 = 3 columns


def test_rank_counts_independent_rows_over_gf2() -> None:
    # row 3 = row1 + row2 over GF(2) -> rank 2, nullity 1.
    m = [[1, 1, 0], [0, 1, 1], [1, 0, 1]]
    assert rank_gf(m, 2) == 2
    assert nullity_gf(m, 2) == 1
    assert rank_nullity_holds(m, 2)


def test_rank_depends_on_the_field() -> None:
    # Over GF(2), [[1,1],[1,1]] has rank 1; the all-ones structure differs by p.
    m = [[2, 4], [1, 2]]  # over GF(3): row2*2 = [2,4]=[2,1]; rank 1
    assert rank_gf(m, 3) == 1
    assert rank_nullity_holds(m, 3)


@given(
    p=st.sampled_from([2, 3, 5]),
    rows=st.integers(1, 4),
    cols=st.integers(1, 4),
    data=st.data(),
)
def test_rank_nullity_always_holds(p: int, rows: int, cols: int, data: st.DataObject) -> None:
    matrix = [[data.draw(st.integers(0, p - 1)) for _ in range(cols)] for _ in range(rows)]
    assert rank_nullity_holds(matrix, p)
    # rank never exceeds either dimension.
    assert rank_gf(matrix, p) <= min(rows, cols)
