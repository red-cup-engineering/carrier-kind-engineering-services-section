"""Aperiodic substitution matrices and their Perron eigenvalues (RelMath.Aperiodic.StepN).

A substitution (letter ↦ word) abelianizes to its **substitution matrix** —
``M[i][j]`` = the count of letter ``j`` in the image of letter ``i``. Its
Perron–Frobenius eigenvalue is the **inflation factor** of the aperiodic tiling.
Each matrix is annihilated by its characteristic polynomial (Cayley–Hamilton):
Fibonacci ``M² = M + I`` (golden ratio ``φ``, ``x²−x−1``) and Padovan ``M³ = M + I``
(plastic number ``ρ``, ``x³−x−1``), with ``ρ < φ``.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

Matrix = list[list[int]]
Poly = list[int]  # ascending coefficients: poly[k] = coefficient of xᵏ

__all__ = [
    "StepNData",
    "cayley_hamilton_holds",
    "characteristic_polynomial",
    "fibonacci",
    "fibonacci_is_monotone",
    "fibonacci_matrix",
    "identity",
    "is_monic",
    "matadd",
    "matmul",
    "matpow",
    "mk_step_n",
    "padovan",
    "padovan_dominated_by_fibonacci",
    "padovan_matrix",
    "perron_eigenvalue",
    "polynomial_degree",
    "step_n_co_increments",
    "substitution_matrix",
]


def substitution_matrix(rule: dict[int, Sequence[int]], n: int) -> Matrix:
    """Abelianize a substitution: ``M[i][j]`` = count of letter ``j`` in ``rule[i]``."""
    return [[list(rule[i]).count(j) for j in range(n)] for i in range(n)]


def fibonacci_matrix() -> Matrix:
    """The Fibonacci substitution ``a↦ab, b↦a`` matrix ``[[1,1],[1,0]]``."""
    return substitution_matrix({0: (0, 1), 1: (0,)}, 2)


def padovan_matrix() -> Matrix:
    """The Padovan substitution ``a↦b, b↦c, c↦ab`` matrix ``[[0,1,0],[0,0,1],[1,1,0]]``."""
    return substitution_matrix({0: (1,), 1: (2,), 2: (0, 1)}, 3)


def matmul(a: Matrix, b: Matrix) -> Matrix:
    """Integer matrix product."""
    k = len(b)
    return [
        [sum(a[i][t] * b[t][j] for t in range(k)) for j in range(len(b[0]))] for i in range(len(a))
    ]


def identity(n: int) -> Matrix:
    """The ``n × n`` identity matrix."""
    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]


def matpow(m: Matrix, p: int) -> Matrix:
    """The ``p``-th matrix power (``p ≥ 0``)."""
    result = identity(len(m))
    for _ in range(p):
        result = matmul(result, m)
    return result


def matadd(a: Matrix, b: Matrix) -> Matrix:
    """Elementwise matrix sum."""
    return [[a[i][j] + b[i][j] for j in range(len(a[0]))] for i in range(len(a))]


def cayley_hamilton_holds(m: Matrix, coeffs: Sequence[int]) -> bool:
    """``Σ coeffs[k] · Mᵏ = 0`` — ``m`` is annihilated by the monic polynomial ``coeffs``.

    ``coeffs`` are ascending: ``[c₀, c₁, …, 1]`` for ``c₀ + c₁ x + … + xᵈ``.
    """
    n = len(m)
    acc = [[0] * n for _ in range(n)]
    for k, c in enumerate(coeffs):
        term = matpow(m, k)
        acc = [[acc[i][j] + c * term[i][j] for j in range(n)] for i in range(n)]
    return all(acc[i][j] == 0 for i in range(n) for j in range(n))


def perron_eigenvalue(m: Matrix, *, iterations: int = 300) -> float:
    """The dominant (Perron–Frobenius) eigenvalue via power iteration — the inflation factor."""
    n = len(m)
    v = [1.0] * n
    value = 1.0
    for _ in range(iterations):
        w = [sum(m[i][j] * v[j] for j in range(n)) for i in range(n)]
        value = max(abs(x) for x in w)
        if value == 0:
            return 0.0
        v = [x / value for x in w]
    return value


def fibonacci(n: int) -> int:
    """The Fibonacci sequence ``F: 1,1,2,3,5,…`` (``F(n)=F(n-1)+F(n-2)``) — growth ``φ``."""
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def padovan(n: int) -> int:
    """The Padovan sequence ``P: 1,1,1,2,2,3,4,…`` (``P(n)=P(n-2)+P(n-3)``) — growth ``ρ``."""
    seq = [1, 1, 1]
    for i in range(3, n + 1):
        seq.append(seq[i - 2] + seq[i - 3])
    return seq[n]


# --- the step-n recurrence: characteristic polynomial + co-incrementing hierarchy --- #
# (RelMath.Aperiodic.StepN.Recurrence)


def _padd(a: Poly, b: Poly) -> Poly:
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]


def _pmul(a: Poly, b: Poly) -> Poly:
    r = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            r[i + j] += x * y
    return r


def _ptrim(p: Poly) -> Poly:
    while len(p) > 1 and p[-1] == 0:
        p = p[:-1]
    return p


def _pdet(mat: list[list[Poly]]) -> Poly:
    """Determinant of a matrix of polynomials, by Laplace expansion on the first row."""
    n = len(mat)
    if n == 1:
        return mat[0][0]
    acc: Poly = [0]
    for j in range(n):
        minor = [row[:j] + row[j + 1 :] for row in mat[1:]]
        term = _pmul(mat[0][j], _pdet(minor))
        acc = _padd(acc, term if j % 2 == 0 else [-c for c in term])
    return acc


def characteristic_polynomial(m: Matrix) -> Poly:
    """The integer characteristic polynomial ``det(xI − M)`` as ascending coefficients.

    For an ``n × n`` integer matrix this is monic of degree ``n``. Carries the degree-``n``
    algebraic content of the Perron growth rate without reals: Fibonacci ``[-1,-1,1]``
    (``x²−x−1``, root ``φ``), Padovan ``[-1,-1,0,1]`` (``x³−x−1``, root ``ρ``).
    """
    n = len(m)
    xi_minus_m = [[[-m[i][j], 1] if i == j else [-m[i][j]] for j in range(n)] for i in range(n)]
    return _ptrim(_pdet(xi_minus_m))


def is_monic(cp: Poly) -> bool:
    """Whether the polynomial is monic — its leading (highest-degree) coefficient is ``1``."""
    return _ptrim(cp)[-1] == 1


def polynomial_degree(cp: Poly) -> int:
    """The degree of the polynomial (trailing zeros ignored)."""
    return len(_ptrim(cp)) - 1


@dataclass(frozen=True)
class StepNData:
    """The co-incrementing data of a step-``n`` substitution rule: the four ``Nat`` quantities the
    single parameter ``n`` controls — matrix dimension, recurrence depth, alphabet size, and
    cohomological rank. For the canonical rule all four equal ``n``."""

    matrix_dim: int
    recurrence_depth: int
    alphabet_size: int
    coh_rank: int


def mk_step_n(n: int) -> StepNData:
    """The canonical step-``n`` bundle: every controlled quantity equals the parameter ``n``."""
    return StepNData(matrix_dim=n, recurrence_depth=n, alphabet_size=n, coh_rank=n)


def step_n_co_increments(n: int) -> bool:
    """The co-incrementing hierarchy: all four quantities equal ``n`` for the canonical bundle, and
    all equal ``n+1`` for the next — one ``+1`` in the parameter is a ``+1`` in every field."""
    d, d1 = mk_step_n(n), mk_step_n(n + 1)
    at_n = d.matrix_dim == d.recurrence_depth == d.alphabet_size == d.coh_rank == n
    at_n1 = d1.matrix_dim == d1.recurrence_depth == d1.alphabet_size == d1.coh_rank == n + 1
    return at_n and at_n1


def fibonacci_is_monotone(n: int) -> bool:
    """Whether Fibonacci is nondecreasing up to ``n``: ``F(k) ≤ F(k+1)`` for ``k < n``."""
    return all(fibonacci(k) <= fibonacci(k + 1) for k in range(n))


def padovan_dominated_by_fibonacci(n: int) -> bool:
    """The extremal slow-growth shadow ``padovan k ≤ fibSeq k`` for all ``k ≤ n``.

    The integer, kernel-checkable form of ``ρ < φ``: the plastic number is the smallest
    Pisot number, so Padovan is the slowest-growing nontrivial primitive substitution, at
    the bottom of the Pisot growth-rate ordering — everywhere dominated by golden Fibonacci.
    """
    return all(padovan(k) <= fibonacci(k) for k in range(n + 1))
