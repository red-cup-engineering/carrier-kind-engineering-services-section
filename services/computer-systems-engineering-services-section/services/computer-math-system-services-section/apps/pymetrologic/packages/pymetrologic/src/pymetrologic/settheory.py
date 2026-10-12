"""Set theory: the powerset Boolean algebra and the Kuratowski pair.

Transcribed from ``RelMath.Order.SetNumberGraphTheory`` (set-theory part). A set
over a carrier is the extension of a predicate; the powerset is the canonical
Boolean algebra (``∩``/``∪``/complement) and satisfies **De Morgan**. The
**Kuratowski** ordered pair ``(a, b) = {{a}, {a, b}}`` has the characteristic
equality ``(a,b) = (c,d) ⟺ a = c ∧ b = d``.
"""

from __future__ import annotations

from typing import TypeVar

A = TypeVar("A")

__all__ = ["complement", "de_morgan_holds", "kuratowski_eq_holds", "kuratowski_pair"]


def complement(universe: frozenset[A], a: frozenset[A]) -> frozenset[A]:
    """The complement ``Aᶜ`` within ``universe``."""
    return universe - a


def de_morgan_holds(universe: frozenset[A], a: frozenset[A], b: frozenset[A]) -> bool:
    """De Morgan: ``(A∪B)ᶜ = Aᶜ∩Bᶜ`` and ``(A∩B)ᶜ = Aᶜ∪Bᶜ``."""
    return complement(universe, a | b) == complement(universe, a) & complement(universe, b) and (
        complement(universe, a & b) == complement(universe, a) | complement(universe, b)
    )


def kuratowski_pair(a: A, b: A) -> frozenset[frozenset[A]]:
    """The Kuratowski ordered pair ``(a, b) = {{a}, {a, b}}``."""
    return frozenset({frozenset({a}), frozenset({a, b})})


def kuratowski_eq_holds(a: A, b: A, c: A, d: A) -> bool:
    """The characteristic equality ``(a,b) = (c,d) ⟺ a = c ∧ b = d``."""
    return (kuratowski_pair(a, b) == kuratowski_pair(c, d)) == (a == c and b == d)
