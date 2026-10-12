"""Factorial, permutations, and binomials (RelMath.Order.NumberTheoryCombinatorics).

The combinatorial shadow: ``factorial``, the falling factorial ``perm n k``, and
the binomial ``choose n k``, with the proven recurrences and identities —
``factorial (n+1) = (n+1)·factorial n``, ``perm n (k+1) = (n−k)·perm n k``,
Pascal's rule ``choose (n+1)(k+1) = choose n k + choose n (k+1)``, ``choose n n =
1``, and ``choose n k = 0`` when ``n < k``.
"""

from __future__ import annotations

__all__ = ["binomial_expansion", "choose", "factorial", "pascal_holds", "perm"]


def factorial(n: int) -> int:
    """``n!`` — ``factorial 0 = 1``, ``factorial (n+1) = (n+1)·factorial n``."""
    if n < 0:
        raise ValueError("factorial of a negative number")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result


def perm(n: int, k: int) -> int:
    """The falling factorial ``perm n k = n·(n−1)···(n−k+1)`` (number of k-permutations)."""
    if k < 0 or k > n:
        return 0
    return factorial(n) // factorial(n - k)


def choose(n: int, k: int) -> int:
    """The binomial ``choose n k`` (``0`` when ``k < 0`` or ``n < k``)."""
    if k < 0 or k > n:
        return 0
    return factorial(n) // (factorial(k) * factorial(n - k))


def pascal_holds(n: int, k: int) -> bool:
    """Pascal's recurrence ``C(n+1,k+1) = C(n,k) + C(n,k+1)`` (the triangle rule)."""
    return choose(n + 1, k + 1) == choose(n, k) + choose(n, k + 1)


def binomial_expansion(x: int, y: int, n: int) -> int:
    """The binomial theorem right side ``Σ_{k=0}^n C(n,k)·x^k·y^(n−k)`` — equals ``(x+y)^n``."""
    if n < 0:
        raise ValueError("the binomial theorem is stated for n ≥ 0")
    return sum(choose(n, k) * x**k * y ** (n - k) for k in range(n + 1))
