from __future__ import annotations

import pytest

from pymetrologic.classification import (
    H1Class,
)
from pymetrologic.moduli import (
    StepRule,
)
from pymetrologic.universality import (
    cl_inv_invariant_of_coord,
    identity_matrix,
    matrix_multiply,
    matrix_power,
    matrix_size,
    normalize_matrix,
    same_universality_class,
    se_reflexive,
    se_symmetric,
    se_transitive,
    shift_equivalent_chain,
    sse_implies_se,
    strong_shift_equivalent,
)

FIBONACCI_MATRIX = ((1, 1), (1, 0))


def test_integer_square_matrix_operations() -> None:
    ident = identity_matrix(2)

    assert normalize_matrix([[1, 1], [1, 0]]) == FIBONACCI_MATRIX
    assert matrix_size(FIBONACCI_MATRIX) == 2
    assert matrix_multiply(FIBONACCI_MATRIX, ident) == FIBONACCI_MATRIX
    assert matrix_multiply(ident, FIBONACCI_MATRIX) == FIBONACCI_MATRIX
    assert matrix_power(FIBONACCI_MATRIX, 0) == ident
    assert matrix_power(FIBONACCI_MATRIX, 2) == ((2, 1), (1, 1))


def test_strong_shift_equivalence_witnesses_shift_equivalence() -> None:
    ident = identity_matrix(2)

    assert strong_shift_equivalent(FIBONACCI_MATRIX, FIBONACCI_MATRIX, FIBONACCI_MATRIX, ident)
    assert sse_implies_se(FIBONACCI_MATRIX, FIBONACCI_MATRIX, FIBONACCI_MATRIX, ident)
    assert same_universality_class(
        [FIBONACCI_MATRIX, FIBONACCI_MATRIX],
        [(FIBONACCI_MATRIX, ident)],
    )


def test_shift_equivalence_laws_for_finite_chains() -> None:
    ident = identity_matrix(2)
    chain = [FIBONACCI_MATRIX, FIBONACCI_MATRIX]
    witnesses = [(FIBONACCI_MATRIX, ident)]

    assert se_reflexive(FIBONACCI_MATRIX)
    assert se_symmetric(chain, witnesses)
    assert se_transitive(chain, witnesses, chain, witnesses)


def test_cl_inv_is_invariant_for_equal_classifying_coordinates() -> None:
    left = StepRule(substitution=((0, 1), (0,)), primitive=True, coord=7)
    right = StepRule(substitution=((1,), (0, 1)), primitive=True, coord=7)
    different = StepRule(substitution=((0, 1), (0,)), primitive=True, coord=8)

    assert cl_inv_invariant_of_coord(left, right)
    assert H1Class(7) == H1Class(right.coord)
    assert not cl_inv_invariant_of_coord(left, different)


def test_universality_validation_rejects_bad_shapes() -> None:
    with pytest.raises(ValueError, match="nonempty"):
        normalize_matrix([])

    with pytest.raises(ValueError, match="square"):
        normalize_matrix([[1, 0, 1], [0, 1, 0]])

    with pytest.raises(ValueError, match="witness count"):
        shift_equivalent_chain([FIBONACCI_MATRIX, FIBONACCI_MATRIX], [])
