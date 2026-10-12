"""Equivalence relations partition (RelMath.Order.SetNumberGraphTheory)."""

from __future__ import annotations

from pymetrologic import classes, equivalence_class, is_equivalence, partitions

CARRIER = (0, 1, 2, 3, 4, 5)


def mod2(a: int, b: int) -> bool:
    return (a - b) % 2 == 0


def not_transitive(a: int, b: int) -> bool:
    return abs(a - b) <= 1  # reflexive + symmetric but NOT transitive


def test_mod2_is_an_equivalence_that_partitions() -> None:
    assert is_equivalence(CARRIER, mod2)
    assert partitions(CARRIER, mod2)
    assert classes(CARRIER, mod2) == frozenset({frozenset({0, 2, 4}), frozenset({1, 3, 5})})
    assert equivalence_class(CARRIER, mod2, 1) == frozenset({1, 3, 5})


def test_non_transitive_relation_is_not_an_equivalence() -> None:
    assert not is_equivalence(CARRIER, not_transitive)


def test_equality_partitions_into_singletons() -> None:
    eq = is_equivalence(CARRIER, lambda a, b: a == b)
    assert eq
    assert partitions(CARRIER, lambda a, b: a == b)
    singletons = classes(CARRIER, lambda a, b: a == b)
    assert all(len(c) == 1 for c in singletons)
    assert len(singletons) == len(CARRIER)
