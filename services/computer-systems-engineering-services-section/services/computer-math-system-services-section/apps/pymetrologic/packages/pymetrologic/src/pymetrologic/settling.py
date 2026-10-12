"""Settling — the knowledge-order join ``∨_k`` merge run to a fixed point.

The corpus proves that the pointwise knowledge-order join ``∨_k`` on predication
settlings is a **semilattice operation** (commutative, associative, idempotent).
A *settling* here is a finite assignment ``index → L^⋈`` (a section of one
fiber). Merging two settlings is the pointwise ``∨_k``; merging is therefore a
semilattice, and any knowledge-monotone, inflationary update on a bounded fiber
reaches a least fixed point — that fixed point is the *settled state*.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterable, Mapping
from typing import TypeVar

from .bilattice import BL, Bilattice

K = TypeVar("K", bound=Hashable)
T = TypeVar("T")

__all__ = ["Settling", "conflict_total", "merge", "merge_all", "settle"]

# A settling: a finite section of one fiber, index ↦ bilattice value.
Settling = Mapping[K, BL[T]]


def merge(bl: Bilattice[T], a: Settling[K, T], b: Settling[K, T]) -> dict[K, BL[T]]:
    """Pointwise knowledge-join ``∨_k`` of two settlings.

    Missing keys default to ``⊥`` (nothing known), so this is the join in the
    semilattice of settlings ordered cellwise by ``≤_k``. Commutative,
    associative, and idempotent.
    """
    keys: set[K] = set(a) | set(b)
    out: dict[K, BL[T]] = {}
    for k in keys:
        out[k] = bl.join_k(a.get(k, bl.none), b.get(k, bl.none))
    return out


def merge_all(bl: Bilattice[T], settlings: Iterable[Settling[K, T]]) -> dict[K, BL[T]]:
    """Fold :func:`merge` over many settlings (``⊥`` is the unit)."""
    acc: dict[K, BL[T]] = {}
    for s in settlings:
        acc = merge(bl, acc, s)
    return acc


def settle(
    bl: Bilattice[T],
    step: Callable[[dict[K, BL[T]]], Mapping[K, BL[T]]],
    start: Settling[K, T],
    *,
    max_iter: int = 100_000,
) -> tuple[dict[K, BL[T]], int]:
    """Iterate ``step`` from ``start`` to a ``≤_k`` fixed point.

    ``step`` must be knowledge-monotone and inflationary (``x ≤_k step(x)``); on
    a bounded fiber the orbit is then increasing and bounded, so it converges.
    Returns the settled state and the number of iterations taken.

    Raises ``RuntimeError`` if ``max_iter`` is hit without convergence (a sign
    ``step`` is not inflationary, or the fiber is not bounded).
    """
    state = dict(start)
    for i in range(max_iter):
        nxt = step(state)
        merged = merge(bl, state, nxt)
        if _settled(bl, state, merged):
            return merged, i
        state = merged
    raise RuntimeError(
        f"settling did not converge in {max_iter} iterations; "
        "check that `step` is knowledge-monotone and inflationary"
    )


def conflict_total(bl: Bilattice[T], state: Settling[K, T]) -> T:
    """The greatest per-index conflict in a settling (``⊥`` iff fully consistent)."""
    worst: T = bl.L.bot
    for v in state.values():
        worst = bl.L.join(worst, bl.conflict_degree(v))
    return worst


def _settled(bl: Bilattice[T], a: Settling[K, T], b: Settling[K, T]) -> bool:
    if set(a) != set(b):
        return False
    return all(bl.eq(a[k], b[k]) for k in a)
