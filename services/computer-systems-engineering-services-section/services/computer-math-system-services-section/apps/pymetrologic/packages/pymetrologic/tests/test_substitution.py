"""Aperiodic substitution matrices + Perron eigenvalues (RelMath.Aperiodic.StepN)."""

from __future__ import annotations

from math import isqrt

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    cayley_hamilton_holds,
    characteristic_polynomial,
    fibonacci,
    fibonacci_is_monotone,
    fibonacci_matrix,
    identity,
    is_monic,
    matadd,
    matpow,
    mk_step_n,
    padovan,
    padovan_dominated_by_fibonacci,
    padovan_matrix,
    perron_eigenvalue,
    polynomial_degree,
    step_n_co_increments,
    substitution_matrix,
)

PHI = (1 + 5**0.5) / 2  # golden ratio
RHO = 1.324717957244746  # plastic number (real root of x³−x−1)


def test_canonical_matrices() -> None:
    assert fibonacci_matrix() == [[1, 1], [1, 0]]
    assert padovan_matrix() == [[0, 1, 0], [0, 0, 1], [1, 1, 0]]
    # The substitution_matrix builder agrees.
    assert substitution_matrix({0: (0, 1), 1: (0,)}, 2) == [[1, 1], [1, 0]]


def test_sequence_conventions() -> None:
    # fibSeq: 1,1,2,3,5,8,13,... ; padovan: 1,1,1,2,2,3,4,5,7,9,12,...
    assert [fibonacci(k) for k in range(8)] == [1, 1, 2, 3, 5, 8, 13, 21]
    assert [padovan(k) for k in range(11)] == [1, 1, 1, 2, 2, 3, 4, 5, 7, 9, 12]


def test_padovan_dominated_by_fibonacci() -> None:
    # The extremal slow-growth shadow of ρ < φ: padovan k ≤ fibSeq k for every k.
    assert padovan_dominated_by_fibonacci(200)
    assert fibonacci_is_monotone(200)
    for k in range(201):
        assert padovan(k) <= fibonacci(k)


def test_characteristic_polynomials() -> None:
    # Fibonacci: x² − x − 1 = [-1,-1,1] (root φ); Padovan: x³ − x − 1 = [-1,-1,0,1] (root ρ).
    assert characteristic_polynomial(fibonacci_matrix()) == [-1, -1, 1]
    assert characteristic_polynomial(padovan_matrix()) == [-1, -1, 0, 1]
    assert is_monic(characteristic_polynomial(fibonacci_matrix()))
    assert polynomial_degree(characteristic_polynomial(fibonacci_matrix())) == 2
    assert polynomial_degree(characteristic_polynomial(padovan_matrix())) == 3


@given(
    rows=st.integers(1, 4).flatmap(
        lambda n: st.lists(
            st.lists(st.integers(-4, 4), min_size=n, max_size=n), min_size=n, max_size=n
        )
    )
)
def test_char_poly_is_monic_degree_n_and_cayley_hamilton(rows: list[list[int]]) -> None:
    # The characteristic polynomial of an n×n integer matrix is monic of degree n,
    # and the matrix is annihilated by it (Cayley–Hamilton) — a strong cross-check.
    n = len(rows)
    cp = characteristic_polynomial(rows)
    assert polynomial_degree(cp) == n
    assert is_monic(cp)
    assert cayley_hamilton_holds(rows, cp)


def test_step_n_co_increments() -> None:
    for n in range(2, 8):
        d = mk_step_n(n)
        assert d.matrix_dim == d.recurrence_depth == d.alphabet_size == d.coh_rank == n
        assert step_n_co_increments(n)
    # n = 2 ↔ Fibonacci/golden, n = 3 ↔ Padovan/plastic (matrix dim = recurrence depth).
    assert mk_step_n(2).matrix_dim == len(fibonacci_matrix())
    assert mk_step_n(3).matrix_dim == len(padovan_matrix())


def test_cayley_hamilton() -> None:
    fib = fibonacci_matrix()
    assert matpow(fib, 2) == matadd(fib, identity(2))  # M² = M + I
    assert cayley_hamilton_holds(fib, [-1, -1, 1])  # x² − x − 1

    pad = padovan_matrix()
    assert matpow(pad, 3) == matadd(pad, identity(3))  # M³ = M + I
    assert cayley_hamilton_holds(pad, [-1, -1, 0, 1])  # x³ − x − 1


def test_perron_eigenvalues_are_the_inflation_factors() -> None:
    phi = perron_eigenvalue(fibonacci_matrix())
    rho = perron_eigenvalue(padovan_matrix())
    assert abs(phi - PHI) < 1e-6  # Fibonacci inflation = golden ratio
    assert abs(rho - RHO) < 1e-6  # Padovan inflation = plastic number
    assert rho < phi  # eigenvalue extremality ρ < φ


def test_golden_ratio_identity() -> None:
    # φ² = φ + 1, the Fibonacci matrix's annihilation lifted to the eigenvalue.
    phi = perron_eigenvalue(fibonacci_matrix())
    assert abs(phi * phi - (phi + 1)) < 1e-6
    assert isqrt(5) == 2  # sanity on the surd used above
