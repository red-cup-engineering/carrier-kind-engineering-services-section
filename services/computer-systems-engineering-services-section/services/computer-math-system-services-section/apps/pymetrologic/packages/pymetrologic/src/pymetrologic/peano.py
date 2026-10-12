"""ℕ as the initial successor algebra (RelMath.Order.SetNumberGraphTheory, number-theory part).

A **successor algebra** is a carrier with a point ``zero`` and an endomap ``succ``.
ℕ is the **initial** one: for any successor algebra ``A`` there is a unique
homomorphism ``rec : ℕ → A`` (preserving ``zero`` and ``succ``), namely
``n ↦ succ^n(zero)``. This is the recursion principle / Peano universal property.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

A = TypeVar("A")

__all__ = ["SuccAlgebra", "is_homomorphism", "rec"]


@dataclass(frozen=True)
class SuccAlgebra(Generic[A]):
    """A carrier with a base point ``zero`` and an endomap ``succ``."""

    zero: A
    succ: Callable[[A], A]


def rec(alg: SuccAlgebra[A], n: int) -> A:
    """The unique homomorphism ``ℕ → A``: ``n ↦ succ^n(zero)``."""
    if n < 0:
        raise ValueError("rec is defined on natural numbers")
    x = alg.zero
    for _ in range(n):
        x = alg.succ(x)
    return x


def is_homomorphism(alg: SuccAlgebra[A], h: Callable[[int], A], upto: int) -> bool:
    """``h`` preserves the algebra on ``0..upto``: ``h 0 = zero`` and ``h (n+1) = succ (h n)``."""
    if h(0) != alg.zero:
        return False
    return all(h(n + 1) == alg.succ(h(n)) for n in range(upto))
