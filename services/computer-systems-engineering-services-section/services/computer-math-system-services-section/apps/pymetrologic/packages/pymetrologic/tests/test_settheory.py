"""Set theory: powerset De Morgan + Kuratowski pair (RelMath.Order.SetNumberGraphTheory)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    complement,
    de_morgan_holds,
    kuratowski_eq_holds,
    kuratowski_pair,
    powerset,
)

U = frozenset({0, 1, 2, 3})


def test_complement_is_involutive() -> None:
    for a in powerset(U):
        a = frozenset(a)
        assert complement(U, complement(U, a)) == a


def test_de_morgan_over_all_subset_pairs() -> None:
    subsets = [frozenset(s) for s in powerset(U)]
    for a in subsets:
        for b in subsets:
            assert de_morgan_holds(U, a, b)


def test_kuratowski_pair_shape() -> None:
    assert kuratowski_pair("a", "b") == frozenset({frozenset({"a"}), frozenset({"a", "b"})})
    # The diagonal pair collapses: (a,a) = {{a}}.
    assert kuratowski_pair("a", "a") == frozenset({frozenset({"a"})})


@given(
    a=st.integers(0, 3),
    b=st.integers(0, 3),
    c=st.integers(0, 3),
    d=st.integers(0, 3),
)
def test_kuratowski_characteristic_equality(a: int, b: int, c: int, d: int) -> None:
    assert kuratowski_eq_holds(a, b, c, d)  # (a,b)=(c,d) ⟺ a=c ∧ b=d
