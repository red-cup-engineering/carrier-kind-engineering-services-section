"""Metallic-mean substitution shadows from ``Aperiodic.StepN.MetallicMean``.

Lean proves that the metallic-mean matrix ``[[n, 1], [1, 0]]`` satisfies
``M^2 = nM + I`` and is annihilated by ``x^2 - nx - 1``.  It also identifies
the integer recurrence ``F_0 = 0``, ``F_1 = 1``, ``F_(k+2) = n F_(k+1) + F_k``
as the sequence tabulated by powers of that matrix.  This module keeps those
finite arithmetic facts executable for the lab.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction

from .universality import Matrix, MatrixLike, identity_matrix, matrix_power, normalize_matrix

Polynomial = tuple[int, ...]

__all__ = [
    "MetallicRealWitness",
    "Polynomial",
    "bronze_matrix",
    "cayley_hamilton_metallic",
    "char_poly_bronze",
    "char_poly_metallic",
    "char_poly_silver",
    "eval_matrix_polynomial",
    "matrix_add",
    "matrix_scalar_multiply",
    "metallic_abs_convergent_gap",
    "metallic_cassini_holds",
    "metallic_cassini_value",
    "metallic_convergent",
    "metallic_convergent_gap",
    "metallic_convergent_telescope_bound",
    "metallic_denominator_positive",
    "metallic_gap_step_bound",
    "metallic_matrix",
    "metallic_matrix_power_succ",
    "metallic_num",
    "metallic_num_ge",
    "metallic_num_positive",
    "metallic_quadratic",
    "metallic_real_convergent",
    "metallic_real_witness",
    "silver_matrix",
]


@dataclass(frozen=True)
class MetallicRealWitness:
    """Finite executable witness for the Lean ``MetallicReal`` package."""

    n: int
    depth: int
    cassini_unimodular: bool
    linear_growth: bool
    denominators_positive: bool
    exact_gaps: bool
    gap_step_bounds: bool
    telescope_bounds: bool

    @property
    def holds(self) -> bool:
        """Return whether every sampled ``MetallicReal`` certificate holds."""

        return (
            self.cassini_unimodular
            and self.linear_growth
            and self.denominators_positive
            and self.exact_gaps
            and self.gap_step_bounds
            and self.telescope_bounds
        )


def matrix_add(left: MatrixLike, right: MatrixLike) -> Matrix:
    """Return the elementwise sum of two same-size square matrices."""

    a = normalize_matrix(left)
    b = normalize_matrix(right)
    if len(a) != len(b):
        msg = "matrices must have the same size"
        raise ValueError(msg)
    return tuple(
        tuple(x + y for x, y in zip(row_a, row_b, strict=True))
        for row_a, row_b in zip(a, b, strict=True)
    )


def matrix_scalar_multiply(scalar: int, matrix: MatrixLike) -> Matrix:
    """Return ``scalar`` times a square integer matrix."""

    m = normalize_matrix(matrix)
    return tuple(tuple(scalar * entry for entry in row) for row in m)


def metallic_matrix(n: int) -> Matrix:
    """Return the metallic-mean companion matrix ``[[n, 1], [1, 0]]``."""

    return ((n, 1), (1, 0))


def silver_matrix() -> Matrix:
    """Return the silver-mean matrix ``[[2, 1], [1, 0]]``."""

    return metallic_matrix(2)


def bronze_matrix() -> Matrix:
    """Return the bronze-mean matrix ``[[3, 1], [1, 0]]``."""

    return metallic_matrix(3)


def char_poly_metallic(n: int) -> Polynomial:
    """Return ascending coefficients for ``x^2 - nx - 1``."""

    return (-1, -n, 1)


def char_poly_silver() -> Polynomial:
    """Return ascending coefficients for the silver polynomial ``x^2 - 2x - 1``."""

    return char_poly_metallic(2)


def char_poly_bronze() -> Polynomial:
    """Return ascending coefficients for the bronze polynomial ``x^2 - 3x - 1``."""

    return char_poly_metallic(3)


def eval_matrix_polynomial(coefficients: Polynomial, matrix: MatrixLike) -> Matrix:
    """Evaluate an integer polynomial at a square matrix."""

    m = normalize_matrix(matrix)
    n = len(m)
    acc = tuple(tuple(0 for _ in range(n)) for _ in range(n))
    for exponent, coefficient in enumerate(coefficients):
        acc = matrix_add(acc, matrix_scalar_multiply(coefficient, matrix_power(m, exponent)))
    return acc


def metallic_quadratic(n: int) -> bool:
    """Check the whole-family matrix recurrence ``M^2 = nM + I``."""

    matrix = metallic_matrix(n)
    return matrix_power(matrix, 2) == matrix_add(
        matrix_scalar_multiply(n, matrix), identity_matrix(2)
    )


def cayley_hamilton_metallic(n: int) -> bool:
    """Check that ``[[n,1],[1,0]]`` is annihilated by ``x^2 - nx - 1``."""

    return eval_matrix_polynomial(char_poly_metallic(n), metallic_matrix(n)) == ((0, 0), (0, 0))


def metallic_num(n: int, k: int) -> int:
    """Return the metallic recurrence value ``F_k`` with ``F_0=0`` and ``F_1=1``."""

    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    previous = 0
    current = 1
    if k == 0:
        return previous
    if k == 1:
        return current
    for _ in range(2, k + 1):
        previous, current = current, n * current + previous
    return current


def metallic_matrix_power_succ(n: int, k: int) -> bool:
    """Check that ``M^(k+1)`` tabulates four consecutive metallic recurrence values."""

    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    return matrix_power(metallic_matrix(n), k + 1) == (
        (metallic_num(n, k + 2), metallic_num(n, k + 1)),
        (metallic_num(n, k + 1), metallic_num(n, k)),
    )


def metallic_num_positive(n: int, k: int) -> bool:
    """Check Lean's denominator-positivity fact ``1 <= F_(k+1)`` for ``n >= 1``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    return metallic_num(n, k + 1) >= 1


def metallic_num_ge(n: int, k: int) -> bool:
    """Check Lean's growth fact ``k <= F_(k+1)`` for ``n >= 1``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    return k <= metallic_num(n, k + 1)


def metallic_denominator_positive(n: int, k: int) -> bool:
    """Check positivity of the Lean-indexed denominator ``F_(k+1)``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    return metallic_num(n, k + 1) > 0


def metallic_convergent(n: int, k: int) -> Fraction:
    """Return the rational convergent ``F_(k+1) / F_k`` for ``k >= 1``."""

    if k < 1:
        msg = "k must be positive"
        raise ValueError(msg)
    denominator = metallic_num(n, k)
    if denominator == 0:
        msg = "convergent denominator must be nonzero"
        raise ZeroDivisionError(msg)
    return Fraction(metallic_num(n, k + 1), denominator)


def metallic_cassini_value(n: int, k: int) -> int:
    """Return ``F_(k+2) F_k - F_(k+1)^2`` from Lean's Cassini identity."""

    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    return metallic_num(n, k + 2) * metallic_num(n, k) - metallic_num(n, k + 1) ** 2


def metallic_cassini_holds(n: int, k: int) -> bool:
    """Check the unimodular Cassini fact ``F_(k+2)F_k - F_(k+1)^2 = +/-1``."""

    return abs(metallic_cassini_value(n, k)) == 1


def metallic_real_convergent(n: int, k: int) -> Fraction:
    """Return Lean's ``conv k = F_(k+2) / F_(k+1)`` for ``n >= 1``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    denominator = metallic_num(n, k + 1)
    if denominator <= 0:
        msg = "convergent denominator must be positive"
        raise ZeroDivisionError(msg)
    return Fraction(metallic_num(n, k + 2), denominator)


def metallic_convergent_gap(n: int, k: int) -> Fraction:
    """Return the signed gap ``conv(k+1) - conv(k)``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if k < 0:
        msg = "k must be a natural number"
        raise ValueError(msg)
    return metallic_real_convergent(n, k + 1) - metallic_real_convergent(n, k)


def metallic_abs_convergent_gap(n: int, k: int) -> Fraction:
    """Return ``|conv(k+1) - conv(k)| = 1 / (F_(k+2) F_(k+1))``."""

    return abs(metallic_convergent_gap(n, k))


def metallic_gap_step_bound(n: int, i: int) -> bool:
    """Check Lean's per-step telescoping bound for ``i >= 1``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if i < 1:
        msg = "i must be at least 1"
        raise ValueError(msg)
    left = metallic_abs_convergent_gap(n, i)
    right = Fraction(1, metallic_num(n, i + 1)) - Fraction(1, metallic_num(n, i + 2))
    return left <= right


def metallic_convergent_telescope_bound(n: int, n0: int, depth: int) -> bool:
    """Check ``|conv(n0+depth)-conv(n0)|`` against the telescoped reciprocal bound."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if n0 < 1:
        msg = "n0 must be at least 1"
        raise ValueError(msg)
    if depth < 0:
        msg = "depth must be a natural number"
        raise ValueError(msg)
    left = abs(metallic_real_convergent(n, n0 + depth) - metallic_real_convergent(n, n0))
    right = Fraction(1, metallic_num(n, n0 + 1)) - Fraction(1, metallic_num(n, n0 + depth + 1))
    return left <= right


def metallic_real_witness(n: int, depth: int = 8) -> MetallicRealWitness:
    """Sample the Cassini/gap/telescope package proved in Lean's ``MetallicReal``."""

    if n < 1:
        msg = "n must be at least 1"
        raise ValueError(msg)
    if depth < 1:
        msg = "depth must be at least 1"
        raise ValueError(msg)

    return MetallicRealWitness(
        n=n,
        depth=depth,
        cassini_unimodular=all(metallic_cassini_holds(n, k) for k in range(depth + 1)),
        linear_growth=all(metallic_num_ge(n, k) for k in range(depth + 1)),
        denominators_positive=all(metallic_denominator_positive(n, k) for k in range(depth + 1)),
        exact_gaps=all(
            metallic_abs_convergent_gap(n, k)
            == Fraction(1, metallic_num(n, k + 2) * metallic_num(n, k + 1))
            for k in range(depth + 1)
        ),
        gap_step_bounds=all(metallic_gap_step_bound(n, i) for i in range(1, depth + 1)),
        telescope_bounds=all(
            metallic_convergent_telescope_bound(n, n0, delta)
            for n0 in range(1, depth + 1)
            for delta in range(depth + 1)
        ),
    )
