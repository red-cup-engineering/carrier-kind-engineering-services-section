"""CRDT convergence and CALM (RelMath.Cohomology.CRDTCohomologicalCALM).

The distributed-systems reading of the settling cohomology: ``H¹ = 0 ⟺
order-independent merge ⟺ confluence ⟺ unique settled fixed point``. Because the
merge is the knowledge-join ``∨ₖ`` (a commutative, associative, idempotent
semilattice operation), a replicated state **converges without coordination**:

* **order-independent merge** — the join of a list of deltas depends only on the
  *set* of deltas, not their order or multiplicity (CRDT convergence / CALM);
* **confluence** — for any two states the join ``u ∨ₖ w`` is a common upper bound
  (the least upper bound always exists, so divergent settling paths rejoin).
"""

from __future__ import annotations

from collections.abc import Sequence
from itertools import permutations
from typing import TypeVar

from .bilattice import BL, Bilattice

T = TypeVar("T")

__all__ = ["confluence_join", "is_confluent", "is_order_independent", "merge_deltas"]


def merge_deltas(bl: Bilattice[T], deltas: Sequence[BL[T]]) -> BL[T]:
    """Integrate a list of deltas by the knowledge-join ``∨ₖ`` (``⊥`` is the unit)."""
    acc = bl.none
    for d in deltas:
        acc = bl.join_k(acc, d)
    return acc


def is_order_independent(bl: Bilattice[T], deltas: Sequence[BL[T]]) -> bool:
    """The merge is independent of order *and* multiplicity (CRDT convergence / CALM)."""
    base = merge_deltas(bl, deltas)
    if not all(bl.eq(merge_deltas(bl, list(p)), base) for p in permutations(deltas)):
        return False
    doubled = [*deltas, *deltas]  # multiplicity-independence (idempotence)
    return bl.eq(merge_deltas(bl, doubled), base)


def confluence_join(bl: Bilattice[T], u: BL[T], w: BL[T]) -> BL[T]:
    """The canonical confluence witness ``u ∨ₖ w`` — the least upper bound."""
    return bl.join_k(u, w)


def is_confluent(bl: Bilattice[T], u: BL[T], w: BL[T]) -> bool:
    """``u ∨ₖ w`` is a common upper bound of ``u`` and ``w`` (divergent paths rejoin)."""
    j = confluence_join(bl, u, w)
    return bl.leq_k(u, j) and bl.leq_k(w, j)
