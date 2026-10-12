"""Probability as the posit made quantitative (RelMath.Probability.Measure)."""

from __future__ import annotations

from collections.abc import Callable

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    additivity_holds,
    bayes_symmetry_holds,
    complement_law_holds,
    cond_measure,
    event_compl,
    event_empty,
    event_inter,
    event_union,
    event_univ,
    measure,
    monotone_holds,
    total_mass,
)

DIE = (1, 2, 3, 4, 5, 6)


def _even(n: int) -> bool:
    return n % 2 == 0


def _high(n: int) -> bool:
    return n >= 4


def _low(n: int) -> bool:
    return n <= 3


def test_empty_and_certain() -> None:
    assert measure(DIE, event_empty) == 0  # P(∅) = 0
    assert measure(DIE, event_univ) == total_mass(DIE) == 6  # P(Ω) = 1


def test_basic_counts() -> None:
    assert measure(DIE, _even) == 3  # {2,4,6}
    assert measure(DIE, _high) == 3  # {4,5,6}
    assert cond_measure(DIE, _even, _high) == 2  # {4,6}
    assert measure(DIE, event_compl(_even)) == 3  # {1,3,5}


# A small family of events over the die, indexed by a residue/threshold predicate.
def _events() -> list[Callable[[int], bool]]:
    return [
        lambda n: n % 2 == 0,
        lambda n: n % 3 == 0,
        lambda n: n >= 4,
        lambda n: n <= 2,
        lambda n: n in (1, 6),
        event_empty,
        event_univ,
    ]


@given(i=st.integers(0, 6), j=st.integers(0, 6))
def test_additivity_monotone_bayes(i: int, j: int) -> None:
    evs = _events()
    a, b = evs[i], evs[j]
    assert additivity_holds(DIE, a, b)
    assert monotone_holds(DIE, a, b)
    assert bayes_symmetry_holds(DIE, a, b)
    assert complement_law_holds(DIE, a)


def test_additivity_on_genuinely_disjoint() -> None:
    assert measure(DIE, event_inter(_low, _high)) == 0  # disjoint
    assert measure(DIE, event_union(_low, _high)) == 6
    assert additivity_holds(DIE, _low, _high)
    assert measure(DIE, _low) + measure(DIE, _high) == 6


def test_complement_law_partitions_total() -> None:
    for a in _events():
        assert measure(DIE, a) + measure(DIE, event_compl(a)) == total_mass(DIE)
