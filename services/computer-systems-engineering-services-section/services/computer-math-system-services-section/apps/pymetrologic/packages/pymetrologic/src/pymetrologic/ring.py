"""Ring iteration: power, n-fold sum, and indexed sum (RelMath.Order.NumberTheoryCombinatorics).

Over a (semi)ring, the iterated operations and their proven laws: the power
``xⁿ`` (``pow_succ``), the ``n``-fold sum ``nsmul c a = a+…+a`` (``nsmul_succ``,
``nsmul_add``), and the indexed sum ``Σ_{k<m} f k`` (``sum_succ``), with the
distributive law ``(Σ f k)·a = Σ (f k · a)`` (``sum_mul``).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

E = TypeVar("E")

__all__ = ["nsmul", "ring_pow", "ring_sum"]


def ring_pow(mul: Callable[[E, E], E], one: E, x: E, n: int) -> E:
    """``xⁿ`` — ``pow 0 = 1``, ``pow (n+1) = x · xⁿ``."""
    result = one
    for _ in range(n):
        result = mul(result, x)
    return result


def nsmul(add: Callable[[E, E], E], zero: E, c: int, a: E) -> E:
    """The ``c``-fold sum ``c · a = a + … + a`` (``nsmul (c+1) a = a + nsmul c a``)."""
    result = zero
    for _ in range(c):
        result = add(result, a)
    return result


def ring_sum(add: Callable[[E, E], E], zero: E, f: Callable[[int], E], m: int) -> E:
    """The indexed sum ``Σ_{k<m} f k`` — ``sum 0 = 0``, ``sum (m+1) = sum m + f m``."""
    result = zero
    for k in range(m):
        result = add(result, f(k))
    return result
