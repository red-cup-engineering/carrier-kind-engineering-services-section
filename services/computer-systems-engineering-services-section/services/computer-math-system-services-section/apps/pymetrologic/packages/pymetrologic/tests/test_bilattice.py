"""The bilattice laws, checked exhaustively on FOUR / chains and via Hypothesis.

These pin down that ``L^⋈`` really is a (distributive, interlaced) bilattice and
that the knowledge join ``∨_k`` — the settling merge — is a semilattice
operation, the corpus' load-bearing fact.
"""

from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import BL, Bilattice, Chain, bilattice, boolean, four, unit_interval

BILATTICES: list[Bilattice[object]] = [
    bilattice(boolean()),
    bilattice(Chain(3)),
    bilattice(unit_interval()),
]


def _values(bl: Bilattice[object]) -> list[BL[object]]:
    return list(bl.sample(4))


@pytest.mark.parametrize("bl", BILATTICES, ids=["FOUR", "chain3", "unit"])
def test_knowledge_join_is_a_semilattice(bl: Bilattice[object]) -> None:
    vals = _values(bl)
    for x in vals:
        assert bl.eq(bl.join_k(x, x), x)  # idempotent
        for y in vals:
            assert bl.eq(bl.join_k(x, y), bl.join_k(y, x))  # commutative
            for z in vals:
                left = bl.join_k(bl.join_k(x, y), z)
                right = bl.join_k(x, bl.join_k(y, z))
                assert bl.eq(left, right)  # associative


@pytest.mark.parametrize("bl", BILATTICES, ids=["FOUR", "chain3", "unit"])
def test_all_four_operations_are_semilattices(bl: Bilattice[object]) -> None:
    vals = _values(bl)
    for op in (bl.join_k, bl.meet_k, bl.join_t, bl.meet_t):
        for x in vals:
            assert bl.eq(op(x, x), x)
            for y in vals:
                assert bl.eq(op(x, y), op(y, x))


@pytest.mark.parametrize("bl", BILATTICES, ids=["FOUR", "chain3", "unit"])
def test_negation_is_an_involution_swapping_the_truth_order(bl: Bilattice[object]) -> None:
    vals = _values(bl)
    for x in vals:
        assert bl.eq(bl.neg(bl.neg(x)), x)  # involution
        for y in vals:
            # ∼ is an anti-iso of ≤_t and an iso of ≤_k (De Morgan bilattice).
            assert bl.leq_t(x, y) == bl.leq_t(bl.neg(y), bl.neg(x))
            assert bl.leq_k(x, y) == bl.leq_k(bl.neg(x), bl.neg(y))


@pytest.mark.parametrize("bl", BILATTICES, ids=["FOUR", "chain3", "unit"])
def test_designated_points_bound_the_two_orders(bl: Bilattice[object]) -> None:
    for x in _values(bl):
        assert bl.leq_k(bl.none, x)  # ⊥ is least in knowledge
        assert bl.leq_k(x, bl.conflict)  # ⊤ is greatest in knowledge
        assert bl.leq_t(bl.false, x)  # f is least in truth
        assert bl.leq_t(x, bl.true)  # t is greatest in truth


def test_four_is_belnap() -> None:
    bl = four()
    assert bl.none == BL(0, 0)
    assert bl.true == BL(1, 0)
    assert bl.false == BL(0, 1)
    assert bl.conflict == BL(1, 1)
    # merging t and f yields ⊤ — the canonical Belnap collision.
    assert bl.eq(bl.join_k(bl.true, bl.false), bl.conflict)


def test_conflict_degree_grades_inconsistency() -> None:
    bl = four()
    assert bl.conflict_degree(bl.none) == 0
    assert bl.conflict_degree(bl.true) == 0
    assert bl.conflict_degree(bl.false) == 0
    assert bl.conflict_degree(bl.conflict) == 1
    assert bl.is_consistent(bl.true)
    assert not bl.is_consistent(bl.conflict)


def test_conflict_degree_is_graded_on_a_chain() -> None:
    bl = bilattice(Chain(4))
    # ⟨3, 2⟩ asserts 3 for and 2 against: overlap (conflict) is min = 2.
    assert bl.conflict_degree(BL(3, 2)) == 2
    assert bl.conflict_degree(BL(4, 0)) == 0


@given(
    a=st.integers(0, 1),
    b=st.integers(0, 1),
    c=st.integers(0, 1),
    d=st.integers(0, 1),
)
def test_interlacing_join_k_monotone_in_truth_join(a: int, b: int, c: int, d: int) -> None:
    # Interlaced bilattice: each knowledge op is monotone w.r.t. ≤_t and vice versa.
    bl = four()
    x, y = BL(a, b), BL(c, d)
    j = bl.join_k(x, y)
    assert bl.leq_k(x, j) and bl.leq_k(y, j)
