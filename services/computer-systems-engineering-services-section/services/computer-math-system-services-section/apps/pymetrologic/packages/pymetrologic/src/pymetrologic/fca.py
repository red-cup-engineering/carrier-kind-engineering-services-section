"""Formal Concept Analysis — the derivation Galois connection and concept lattice.

Transcribed from ``RelMath.Order.FormalConceptAnalysis`` (lean/). A formal context
``(G, M, I)`` — objects ``G``, attributes ``M``, incidence ``I`` — generates by
*derivation*: an extent ``A`` maps to its intent ``A' = primeA`` (attributes shared
by all of ``A``), an intent ``B`` to its extent ``B' = primeB`` (objects with all of
``B``). The two load-bearing facts: the **derivation adjunction** ``A ⊆ B' ⟺ B ⊆
A'`` (an antitone Galois connection), and the induced **closure** ``closeA = primeB
∘ primeA`` (monotone, inflationary, idempotent). A **concept** is a closed pair
``(A, B)`` with ``A' = B`` and ``B' = A``.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from itertools import combinations

__all__ = [
    "Context",
    "close_extent",
    "close_intent",
    "concepts",
    "is_galois_connection",
    "powerset",
    "prime_attrs",
    "prime_objs",
]


@dataclass(frozen=True)
class Context:
    """A formal context ``(G, M, I)``: objects, attributes, and the incidence pairs."""

    objects: tuple[str, ...]
    attributes: tuple[str, ...]
    incidence: frozenset[tuple[str, str]]

    def has(self, g: str, m: str) -> bool:
        """``I g m`` — object ``g`` has attribute ``m``."""
        return (g, m) in self.incidence


def powerset(items: Iterable[str]) -> tuple[frozenset[str], ...]:
    """Every subset of ``items`` as a frozenset (the powerset, smallest first)."""
    seq = tuple(items)
    return tuple(frozenset(c) for r in range(len(seq) + 1) for c in combinations(seq, r))


def prime_attrs(ctx: Context, extent: frozenset[str]) -> frozenset[str]:
    """``A' = primeA``: the attributes shared by every object in ``extent``."""
    return frozenset(m for m in ctx.attributes if all(ctx.has(g, m) for g in extent))


def prime_objs(ctx: Context, intent: frozenset[str]) -> frozenset[str]:
    """``B' = primeB``: the objects having every attribute in ``intent``."""
    return frozenset(g for g in ctx.objects if all(ctx.has(g, m) for m in intent))


def close_extent(ctx: Context, extent: frozenset[str]) -> frozenset[str]:
    """``closeA = primeB ∘ primeA`` — the closure of an extent (a closure operator)."""
    return prime_objs(ctx, prime_attrs(ctx, extent))


def close_intent(ctx: Context, intent: frozenset[str]) -> frozenset[str]:
    """``closeB = primeA ∘ primeB`` — closure of an attribute intent."""
    return prime_attrs(ctx, prime_objs(ctx, intent))


def is_galois_connection(ctx: Context) -> bool:
    """The derivation adjunction ``A ⊆ B' ⟺ B ⊆ A'`` over all extent/intent subsets."""
    for a in powerset(ctx.objects):
        for b in powerset(ctx.attributes):
            if (a <= prime_objs(ctx, b)) != (b <= prime_attrs(ctx, a)):
                return False
    return True


def concepts(ctx: Context) -> tuple[tuple[frozenset[str], frozenset[str]], ...]:
    """All formal concepts ``(A, B)`` (closed pairs ``A' = B``, ``B' = A``), extent-first."""
    by_extent: dict[frozenset[str], frozenset[str]] = {}
    for a in powerset(ctx.objects):
        extent = close_extent(ctx, a)
        by_extent[extent] = prime_attrs(ctx, extent)
    return tuple(
        (extent, by_extent[extent])
        for extent in sorted(by_extent, key=lambda e: (len(e), sorted(e)))
    )
