"""Equivalence relations partition (RelMath.Order.SetNumberGraphTheory).

An equivalence relation on a carrier (reflexive, symmetric, transitive) **partitions**
it: the equivalence classes are nonempty, pairwise equal-or-disjoint, and cover the
carrier (``equivalence-relation`` / partition node).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TypeVar

E = TypeVar("E")

__all__ = ["classes", "equivalence_class", "is_equivalence", "partitions"]


def is_equivalence(carrier: Sequence[E], rel: Callable[[E, E], bool]) -> bool:
    """``rel`` is reflexive, symmetric, and transitive on ``carrier``."""
    reflexive = all(rel(x, x) for x in carrier)
    symmetric = all(rel(x, y) == rel(y, x) for x in carrier for y in carrier)
    transitive = all(
        not (rel(x, y) and rel(y, z)) or rel(x, z)
        for x in carrier
        for y in carrier
        for z in carrier
    )
    return reflexive and symmetric and transitive


def equivalence_class(carrier: Sequence[E], rel: Callable[[E, E], bool], x: E) -> frozenset[E]:
    """The class ``[x] = {y : rel x y}``."""
    return frozenset(y for y in carrier if rel(x, y))


def classes(carrier: Sequence[E], rel: Callable[[E, E], bool]) -> frozenset[frozenset[E]]:
    """The distinct equivalence classes."""
    return frozenset(equivalence_class(carrier, rel, x) for x in carrier)


def partitions(carrier: Sequence[E], rel: Callable[[E, E], bool]) -> bool:
    """The classes form a partition: nonempty, pairwise equal-or-disjoint, covering."""
    cs = classes(carrier, rel)
    universe = frozenset(carrier)
    covered = frozenset[E]().union(*cs) == universe if cs else len(universe) == 0
    disjoint = all(a == b or not (a & b) for a in cs for b in cs)
    nonempty = all(len(c) > 0 for c in cs)
    return covered and disjoint and nonempty
