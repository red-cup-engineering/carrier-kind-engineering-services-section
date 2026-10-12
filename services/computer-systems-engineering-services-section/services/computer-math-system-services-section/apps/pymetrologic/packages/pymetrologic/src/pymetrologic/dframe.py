"""d-frames — the algebraic dual of bitopological space (RelMath.Cohomology.DFrame).

A d-frame ``ℒ = (L₊, L₋, con, tot)`` bundles two frames with a **consistency**
relation ``con`` (downward-closed) and a **totality** relation ``tot``
(upward-closed). The canonical example is a bitopological space ``(X, τ₊, τ₋)``:
``con(U,V) ⟺ U ∩ V = ∅`` and ``tot(U,V) ⟺ U ∪ V = X``. A pair that is both
consistent and total is a **clopen partition** of ``X`` — the bilattice-native
truth-side / inconsistency-side structure of a settling stage.
"""

from __future__ import annotations

from itertools import combinations

__all__ = [
    "con_is_downward_closed",
    "consistency",
    "is_clopen_partition",
    "powerset_of",
    "tot_is_upward_closed",
    "totality",
]


def consistency(u: frozenset[str], v: frozenset[str]) -> bool:
    """``con(U,V) ⟺ U ∩ V = ∅`` — the two sides do not co-witness a ``⊤`` state."""
    return not (u & v)


def totality(universe: frozenset[str], u: frozenset[str], v: frozenset[str]) -> bool:
    """``tot(U,V) ⟺ U ∪ V = X`` — the two sides cover the carrier."""
    return (u | v) == universe


def powerset_of(universe: frozenset[str]) -> tuple[frozenset[str], ...]:
    """Every subset of ``universe``."""
    seq = tuple(universe)
    return tuple(frozenset(c) for r in range(len(seq) + 1) for c in combinations(seq, r))


def con_is_downward_closed(universe: frozenset[str]) -> bool:
    """``con`` is downward-closed: if ``con(U,V)`` and ``U'⊆U, V'⊆V`` then ``con(U',V')``."""
    subsets = powerset_of(universe)
    for u in subsets:
        for v in subsets:
            if consistency(u, v) and any(
                not consistency(u2, v2) for u2 in subsets if u2 <= u for v2 in subsets if v2 <= v
            ):
                return False
    return True


def tot_is_upward_closed(universe: frozenset[str]) -> bool:
    """``tot`` is upward-closed: if ``tot(U,V)`` and ``U⊆U', V⊆V'`` then ``tot(U',V')``."""
    subsets = powerset_of(universe)
    for u in subsets:
        for v in subsets:
            if totality(universe, u, v) and any(
                not totality(universe, u2, v2)
                for u2 in subsets
                if u <= u2
                for v2 in subsets
                if v <= v2
            ):
                return False
    return True


def is_clopen_partition(universe: frozenset[str], u: frozenset[str], v: frozenset[str]) -> bool:
    """``(U,V)`` is consistent **and** total — a clopen partition of ``X``."""
    return consistency(u, v) and totality(universe, u, v)
