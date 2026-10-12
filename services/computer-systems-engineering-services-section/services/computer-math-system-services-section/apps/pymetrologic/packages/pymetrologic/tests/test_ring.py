"""Ring iteration laws (RelMath.Order.NumberTheoryCombinatorics)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import nsmul, ring_pow, ring_sum

ADD = lambda a, b: a + b  # noqa: E731
MUL = lambda a, b: a * b  # noqa: E731


def test_pow_and_nsmul_and_sum_values() -> None:
    assert ring_pow(MUL, 1, 2, 5) == 32  # 2^5
    assert nsmul(ADD, 0, 3, 5) == 15  # 3·5
    assert ring_sum(ADD, 0, lambda k: k, 5) == 10  # 0+1+2+3+4


@given(x=st.integers(0, 6), n=st.integers(0, 8))
def test_pow_succ(x: int, n: int) -> None:
    assert ring_pow(MUL, 1, x, n + 1) == x * ring_pow(MUL, 1, x, n)


@given(c=st.integers(0, 10), d=st.integers(0, 10), a=st.integers(-5, 5))
def test_nsmul_recurrence_and_additivity(c: int, d: int, a: int) -> None:
    assert nsmul(ADD, 0, c + 1, a) == a + nsmul(ADD, 0, c, a)  # nsmul_succ
    assert nsmul(ADD, 0, c + d, a) == nsmul(ADD, 0, c, a) + nsmul(ADD, 0, d, a)  # nsmul_add


@given(m=st.integers(0, 12), a=st.integers(-4, 4))
def test_sum_succ_and_distributivity(m: int, a: int) -> None:
    f = lambda k: 2 * k + 1  # noqa: E731
    assert ring_sum(ADD, 0, f, m + 1) == ring_sum(ADD, 0, f, m) + f(m)  # sum_succ
    # (Σ f k) · a = Σ (f k · a)  — sum_mul distributivity.
    left = ring_sum(ADD, 0, f, m) * a
    right = ring_sum(ADD, 0, lambda k: f(k) * a, m)
    assert left == right
