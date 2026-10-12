"""Finite substitution universality shadows from ``RelMath.Aperiodic.Universality``.

Lean defines strong shift equivalence (SSE) between substitution matrices by
factor witnesses ``R,S`` with ``M = R*S`` and ``M' = S*R``.  Shift equivalence
is the reflexive-transitive closure of that relation, and universality classes
are its quotient classes.  This module keeps the executable finite skeleton:
integer square matrices, witness checking, finite SE chains, and the
``cl_inv`` invariance bridge into the moduli stack.
"""

from __future__ import annotations

from collections.abc import Sequence

from .moduli import StepRule, moduli_point

type Matrix = tuple[tuple[int, ...], ...]
type MatrixLike = Sequence[Sequence[int]]
type ShiftWitness = tuple[Matrix, Matrix]
type ShiftWitnessLike = tuple[MatrixLike, MatrixLike]

__all__ = [
    "Matrix",
    "MatrixLike",
    "ShiftWitness",
    "ShiftWitnessLike",
    "cl_inv_invariant_of_coord",
    "identity_matrix",
    "matrix_multiply",
    "matrix_power",
    "matrix_size",
    "normalize_matrix",
    "same_universality_class",
    "se_reflexive",
    "se_symmetric",
    "se_transitive",
    "shift_equivalent_chain",
    "sse_implies_se",
    "strong_shift_equivalent",
]


def normalize_matrix(rows: MatrixLike) -> Matrix:
    """Return ``rows`` as a nonempty square integer matrix."""

    matrix = tuple(tuple(row) for row in rows)
    n = len(matrix)
    if n == 0:
        msg = "matrix must be nonempty"
        raise ValueError(msg)
    if any(len(row) != n for row in matrix):
        msg = "matrix must be square"
        raise ValueError(msg)
    if any(not isinstance(entry, int) for row in matrix for entry in row):
        msg = "matrix entries must be integers"
        raise TypeError(msg)
    return matrix


def matrix_size(matrix: MatrixLike) -> int:
    """Return the side length of a square matrix."""

    return len(normalize_matrix(matrix))


def identity_matrix(n: int) -> Matrix:
    """Return the ``n x n`` identity matrix."""

    if n <= 0:
        msg = "identity matrix size must be positive"
        raise ValueError(msg)
    return tuple(tuple(1 if i == j else 0 for j in range(n)) for i in range(n))


def matrix_multiply(left: MatrixLike, right: MatrixLike) -> Matrix:
    """Return the product of two same-size square integer matrices."""

    a = normalize_matrix(left)
    b = normalize_matrix(right)
    n = len(a)
    if len(b) != n:
        msg = "matrices must have the same size"
        raise ValueError(msg)
    return tuple(
        tuple(sum(a[i][k] * b[k][j] for k in range(n)) for j in range(n)) for i in range(n)
    )


def matrix_power(matrix: MatrixLike, exponent: int) -> Matrix:
    """Return ``matrix`` raised to a nonnegative integer power."""

    base = normalize_matrix(matrix)
    if exponent < 0:
        msg = "matrix exponent must be nonnegative"
        raise ValueError(msg)
    result = identity_matrix(len(base))
    for _ in range(exponent):
        result = matrix_multiply(result, base)
    return result


def strong_shift_equivalent(
    left: MatrixLike,
    right: MatrixLike,
    factor_left: MatrixLike,
    factor_right: MatrixLike,
) -> bool:
    """Check the SSE witness equations ``left = R*S`` and ``right = S*R``."""

    left_matrix = normalize_matrix(left)
    right_matrix = normalize_matrix(right)
    r = normalize_matrix(factor_left)
    s = normalize_matrix(factor_right)
    if not (len(left_matrix) == len(right_matrix) == len(r) == len(s)):
        return False
    return matrix_multiply(r, s) == left_matrix and matrix_multiply(s, r) == right_matrix


def shift_equivalent_chain(
    matrices: Sequence[MatrixLike],
    witnesses: Sequence[ShiftWitnessLike],
) -> bool:
    """Check a finite shift-equivalence chain of adjacent SSE witnesses."""

    normalized = [normalize_matrix(matrix) for matrix in matrices]
    if len(witnesses) != max(len(normalized) - 1, 0):
        msg = "witness count must be one less than matrix count"
        raise ValueError(msg)
    return all(
        strong_shift_equivalent(left, right, r, s)
        for left, right, (r, s) in zip(normalized[:-1], normalized[1:], witnesses, strict=True)
    )


def sse_implies_se(
    left: MatrixLike,
    right: MatrixLike,
    factor_left: MatrixLike,
    factor_right: MatrixLike,
) -> bool:
    """Check Lean's one-step ``SSE -> SE`` inclusion."""

    return shift_equivalent_chain([left, right], [(factor_left, factor_right)])


def se_reflexive(matrix: MatrixLike) -> bool:
    """Check reflexivity of finite shift equivalence."""

    return shift_equivalent_chain([matrix], [])


def se_symmetric(
    matrices: Sequence[MatrixLike],
    witnesses: Sequence[ShiftWitnessLike],
) -> bool:
    """Check symmetry by reversing an SE chain and swapping each SSE witness."""

    if not shift_equivalent_chain(matrices, witnesses):
        return False
    normalized = [normalize_matrix(matrix) for matrix in matrices]
    reversed_witnesses: list[ShiftWitness] = []
    for r_like, s_like in reversed(witnesses):
        reversed_witnesses.append((normalize_matrix(s_like), normalize_matrix(r_like)))
    return shift_equivalent_chain(list(reversed(normalized)), reversed_witnesses)


def se_transitive(
    first_matrices: Sequence[MatrixLike],
    first_witnesses: Sequence[ShiftWitnessLike],
    second_matrices: Sequence[MatrixLike],
    second_witnesses: Sequence[ShiftWitnessLike],
) -> bool:
    """Check transitivity by concatenating two SE chains with a shared endpoint."""

    first = [normalize_matrix(matrix) for matrix in first_matrices]
    second = [normalize_matrix(matrix) for matrix in second_matrices]
    if not first or not second:
        msg = "chains must be nonempty"
        raise ValueError(msg)
    if first[-1] != second[0]:
        return False
    if not shift_equivalent_chain(first, first_witnesses):
        return False
    if not shift_equivalent_chain(second, second_witnesses):
        return False
    return shift_equivalent_chain(
        [*first, *second[1:]],
        [*first_witnesses, *second_witnesses],
    )


def same_universality_class(
    matrices: Sequence[MatrixLike],
    witnesses: Sequence[ShiftWitnessLike],
) -> bool:
    """Return whether the sampled matrices lie in one finite SE quotient class."""

    return shift_equivalent_chain(matrices, witnesses)


def cl_inv_invariant_of_coord(left: StepRule, right: StepRule) -> bool:
    """Check the moduli theorem's finite premise: same coordinate, same ``cl_inv``."""

    return left.coord == right.coord and moduli_point(left) == moduli_point(right)
