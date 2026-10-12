"""Combinatorial identities (RelMath.Order.NumberTheoryCombinatorics)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import binomial_expansion, choose, factorial, pascal_holds, perm


def test_factorial_recurrence() -> None:
    assert factorial(0) == 1
    for n in range(10):
        assert factorial(n + 1) == (n + 1) * factorial(n)


def test_perm_recurrence_and_relation_to_choose() -> None:
    for n in range(8):
        assert perm(n, 0) == 1
        for k in range(n):
            assert perm(n, k + 1) == (n - k) * perm(n, k)
        for k in range(n + 1):
            assert perm(n, k) == choose(n, k) * factorial(k)


def test_pascals_rule() -> None:
    for n in range(10):
        for k in range(n + 1):
            assert choose(n + 1, k + 1) == choose(n, k) + choose(n, k + 1)


def test_choose_edge_cases() -> None:
    for n in range(10):
        assert choose(n, n) == 1
        assert choose(n, 0) == 1
        assert choose(n, n + 1) == 0  # n < k


@given(n=st.integers(0, 20), k=st.integers(0, 20))
def test_choose_symmetry(n: int, k: int) -> None:
    assert choose(n, k) == choose(n, n - k)


@given(n=st.integers(0, 25), k=st.integers(0, 25))
def test_pascal_holds(n: int, k: int) -> None:
    assert pascal_holds(n, k)


@given(x=st.integers(-12, 12), y=st.integers(-12, 12), n=st.integers(0, 15))
def test_binomial_theorem(x: int, y: int, n: int) -> None:
    # (x + y)^n = Σ_{k=0}^n C(n,k) x^k y^(n-k)
    assert binomial_expansion(x, y, n) == (x + y) ** n


def test_binomial_theorem_small() -> None:
    assert binomial_expansion(1, 1, 5) == 2**5  # Σ C(5,k) = 32
    assert binomial_expansion(2, 3, 3) == 5**3  # (2+3)^3 = 125
