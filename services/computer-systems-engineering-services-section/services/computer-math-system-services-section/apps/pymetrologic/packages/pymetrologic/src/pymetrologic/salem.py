"""Salem/Pisot arithmetic shadows from ``Aperiodic.StepN.Salem``.

Lean separates the metallic Pisot family from a degree-four Salem example by
finite signatures: reciprocal polynomials, integer trace-resolvent sign
changes, determinant signs, and a companion-matrix Cayley-Hamilton identity.
This module keeps those arithmetic checks executable without claiming the
later Bishop-real square-root layer.
"""

from __future__ import annotations

from collections.abc import Sequence
from math import sqrt

from .metallic import (
    Polynomial,
    char_poly_metallic,
    matrix_add,
    matrix_scalar_multiply,
    metallic_matrix,
)
from .universality import Matrix, MatrixLike, identity_matrix, matrix_power, normalize_matrix

__all__ = [
    "char_poly_metallic_not_reciprocal",
    "char_poly_salem",
    "char_poly_salem_reciprocal",
    "det2",
    "det2_metallic_matrix",
    "det4",
    "det4_salem_companion",
    "det_salem_vs_pisot",
    "eval_int_poly",
    "golden_double_root",
    "golden_root_equation_holds",
    "golden_root_residual",
    "reciprocal",
    "salem_companion",
    "salem_companion_cayley_hamilton",
    "salem_trace",
    "salem_trace_double_root",
    "salem_trace_real_root",
    "salem_trace_root_equation_holds",
    "salem_trace_root_residual",
    "salem_trace_unit_circle",
    "salem_vs_pisot",
]


def reciprocal(polynomial: Sequence[int]) -> bool:
    """Return whether a coefficient list is palindromic."""

    coeffs = tuple(polynomial)
    return coeffs == tuple(reversed(coeffs))


def eval_int_poly(polynomial: Sequence[int], x: int) -> int:
    """Evaluate ascending integer coefficients at ``x`` by Horner recursion."""

    value = 0
    for coefficient in reversed(tuple(polynomial)):
        value = coefficient + x * value
    return value


def char_poly_salem() -> Polynomial:
    """Return the Salem polynomial ``x^4 - x^3 - x^2 - x + 1``."""

    return (1, -1, -1, -1, 1)


def salem_trace() -> Polynomial:
    """Return the trace resolvent ``y^2 - y - 3``."""

    return (-3, -1, 1)


def char_poly_salem_reciprocal() -> bool:
    """Check that the Salem polynomial is reciprocal."""

    return reciprocal(char_poly_salem())


def char_poly_metallic_not_reciprocal(n: int) -> bool:
    """Check that the metallic/Pisot polynomial is not reciprocal."""

    return not reciprocal(char_poly_metallic(n))


def salem_trace_unit_circle() -> bool:
    """Check the sign change across ``(-2, 0)``, inside the unit-circle trace band."""

    trace = salem_trace()
    return eval_int_poly(trace, -2) > 0 and eval_int_poly(trace, 0) < 0


def salem_trace_real_root() -> bool:
    """Check the sign change across ``(2, 3)``, giving the real Salem root."""

    trace = salem_trace()
    return eval_int_poly(trace, 2) < 0 and eval_int_poly(trace, 3) > 0


def salem_trace_double_root() -> float:
    """Return ``z = 1 + sqrt(13)``, twice the positive Salem trace root."""

    return 1 + sqrt(13)


def salem_trace_root_residual() -> float:
    """Return the residual of Lean's ``(1 + sqrt(13))^2 = 2sqrt(13) + 14``."""

    s = sqrt(13)
    z = 1 + s
    return z * z - (s + s + 14)


def salem_trace_root_equation_holds(*, tolerance: float = 1e-12) -> bool:
    """Check the executable square-root identity from ``SalemRoot.lean``."""

    if tolerance < 0:
        msg = "tolerance must be nonnegative"
        raise ValueError(msg)
    return abs(salem_trace_root_residual()) <= tolerance


def golden_double_root() -> float:
    """Return ``z = 1 + sqrt(5)``, twice the positive golden trace root."""

    return 1 + sqrt(5)


def golden_root_residual() -> float:
    """Return the residual of Lean's ``(1 + sqrt(5))^2 = 2sqrt(5) + 6``."""

    s = sqrt(5)
    z = 1 + s
    return z * z - (s + s + 6)


def golden_root_equation_holds(*, tolerance: float = 1e-12) -> bool:
    """Check the executable golden square-root identity from ``SalemRoot.lean``."""

    if tolerance < 0:
        msg = "tolerance must be nonnegative"
        raise ValueError(msg)
    return abs(golden_root_residual()) <= tolerance


def salem_vs_pisot() -> bool:
    """Bundle the reciprocal/sign-change Salem/Pisot contrast."""

    golden = char_poly_metallic(1)
    return (
        char_poly_salem_reciprocal()
        and char_poly_metallic_not_reciprocal(1)
        and salem_trace_unit_circle()
        and eval_int_poly(golden, -1) > 0
        and eval_int_poly(golden, 0) < 0
    )


def det2(matrix: MatrixLike) -> int:
    """Return the determinant of a 2 x 2 matrix."""

    m = normalize_matrix(matrix)
    if len(m) != 2:
        msg = "det2 requires a 2 x 2 matrix"
        raise ValueError(msg)
    return m[0][0] * m[1][1] - m[0][1] * m[1][0]


def _minor(matrix: Matrix, row: int, column: int) -> Matrix:
    return tuple(
        tuple(entry for j, entry in enumerate(values) if j != column)
        for i, values in enumerate(matrix)
        if i != row
    )


def _determinant(matrix: Matrix) -> int:
    n = len(matrix)
    if n == 1:
        return matrix[0][0]
    return sum(
        ((-1) ** column) * matrix[0][column] * _determinant(_minor(matrix, 0, column))
        for column in range(n)
    )


def det4(matrix: MatrixLike) -> int:
    """Return the determinant of a 4 x 4 matrix."""

    m = normalize_matrix(matrix)
    if len(m) != 4:
        msg = "det4 requires a 4 x 4 matrix"
        raise ValueError(msg)
    return _determinant(m)


def det2_metallic_matrix(n: int) -> int:
    """Return the metallic companion determinant, always ``-1``."""

    return det2(metallic_matrix(n))


def salem_companion() -> Matrix:
    """Return the companion matrix of ``x^4 - x^3 - x^2 - x + 1``."""

    return (
        (0, 0, 0, -1),
        (1, 0, 0, 1),
        (0, 1, 0, 1),
        (0, 0, 1, 1),
    )


def det4_salem_companion() -> int:
    """Return the Salem companion determinant, ``+1``."""

    return det4(salem_companion())


def det_salem_vs_pisot() -> bool:
    """Check the determinant signature: Salem ``+1`` versus Pisot ``-1``."""

    return det4_salem_companion() == 1 and det2_metallic_matrix(1) == -1


def salem_companion_cayley_hamilton() -> bool:
    """Check ``M^4 = M^3 + M^2 + M - I`` for the Salem companion."""

    m = salem_companion()
    right = matrix_add(
        matrix_add(matrix_power(m, 3), matrix_power(m, 2)),
        matrix_add(m, matrix_scalar_multiply(-1, identity_matrix(4))),
    )
    return matrix_power(m, 4) == right
