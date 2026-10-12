"""Tests for pyfars.substrate.bilattice — the FOUR algebra."""
from __future__ import annotations

import itertools

import pytest

from pyfars.substrate.bilattice import (
    BilatticeValue,
    conflate,
    from_truth_evidence,
    join_k,
    join_t,
    leq_k,
    leq_t,
    meet_k,
    meet_t,
    negate,
)


B = BilatticeValue.BOTTOM
T = BilatticeValue.TRUE
F = BilatticeValue.FALSE
TOP = BilatticeValue.TOP
ALL = (B, T, F, TOP)
BINARY_OPS = (meet_t, join_t, meet_k, join_k)


# -- symbols and string forms ---------------------------------------


def test_symbols_are_canonical_glyphs():
    assert B.symbol == "⊥"
    assert T.symbol == "t"
    assert F.symbol == "f"
    assert TOP.symbol == "⊤"
    # __str__ delegates to symbol so f-string templating stays compact.
    assert f"{T}" == "t"


# -- the four binary ops: algebraic laws ----------------------------


@pytest.mark.parametrize("op", BINARY_OPS)
def test_op_is_idempotent(op):
    """Every meet/join is idempotent: ``op(x, x) == x``."""
    for x in ALL:
        assert op(x, x) is x


@pytest.mark.parametrize("op", BINARY_OPS)
def test_op_is_commutative(op):
    for x, y in itertools.product(ALL, ALL):
        assert op(x, y) is op(y, x), f"{op.__name__}({x},{y}) != {op.__name__}({y},{x})"


@pytest.mark.parametrize("op", BINARY_OPS)
def test_op_is_associative(op):
    for x, y, z in itertools.product(ALL, ALL, ALL):
        assert op(op(x, y), z) is op(x, op(y, z))


def test_meet_t_has_top_unit_and_bottom_zero_in_truth_order():
    """In truth order: f is the bottom (zero of ∨_t, absorber of ∧_t),
    t is the top (unit of ∧_t, absorber of ∨_t)."""
    for x in ALL:
        assert meet_t(x, T) is x   # t is unit of meet_t
        assert meet_t(x, F) is F   # f absorbs meet_t
        assert join_t(x, F) is x   # f is unit of join_t
        assert join_t(x, T) is T   # t absorbs join_t


def test_meet_k_has_top_unit_and_bottom_zero_in_knowledge_order():
    """In knowledge order: ⊥ is bottom (zero of join_k, absorber of meet_k),
    ⊤ is top (unit of meet_k, absorber of join_k)."""
    for x in ALL:
        assert meet_k(x, TOP) is x
        assert meet_k(x, B) is B
        assert join_k(x, B) is x
        assert join_k(x, TOP) is TOP


# -- specific table cells called out by the docstring ---------------


def test_meet_t_top_and_bottom_is_false():
    """The diamond truth lattice has f as the only common lower bound of ⊥ and ⊤."""
    assert meet_t(B, TOP) is F
    assert meet_t(TOP, B) is F


def test_join_t_top_and_bottom_is_true():
    assert join_t(B, TOP) is T


def test_join_k_true_and_false_is_top():
    """Contradiction surfaces as ⊤ — the property the belief query depends on."""
    assert join_k(T, F) is TOP


def test_meet_k_true_and_false_is_bottom():
    """Consensus of disagreement is silence."""
    assert meet_k(T, F) is B


# -- order predicates -----------------------------------------------


def test_truth_order_hasse_diagram():
    """Truth order: f ≤_t ⊥, ⊤ ≤_t t (diamond)."""
    assert leq_t(F, B)
    assert leq_t(F, TOP)
    assert leq_t(F, T)
    assert leq_t(B, T)
    assert leq_t(TOP, T)
    # Reflexive
    for x in ALL:
        assert leq_t(x, x)
    # Antisymmetric on incomparable middle pair
    assert not leq_t(B, TOP)
    assert not leq_t(TOP, B)
    # Strict cases that must NOT hold
    assert not leq_t(T, F)
    assert not leq_t(B, F)


def test_knowledge_order_hasse_diagram():
    """Knowledge order: ⊥ ≤_k t, f ≤_k ⊤ (diamond)."""
    assert leq_k(B, T)
    assert leq_k(B, F)
    assert leq_k(B, TOP)
    assert leq_k(T, TOP)
    assert leq_k(F, TOP)
    for x in ALL:
        assert leq_k(x, x)
    assert not leq_k(T, F)
    assert not leq_k(F, T)


# -- involutions ----------------------------------------------------


def test_negate_swaps_truth_axis_only():
    assert negate(T) is F
    assert negate(F) is T
    assert negate(B) is B
    assert negate(TOP) is TOP


def test_negate_is_involution():
    for x in ALL:
        assert negate(negate(x)) is x


def test_conflate_swaps_knowledge_axis_only():
    assert conflate(B) is TOP
    assert conflate(TOP) is B
    assert conflate(T) is T
    assert conflate(F) is F


def test_conflate_is_involution():
    for x in ALL:
        assert conflate(conflate(x)) is x


# -- from_truth_evidence lifting -----------------------------------


def test_silent_witness_votes_bottom():
    """Default evidence_threshold is 0.0 — only literally-zero is silent."""
    assert from_truth_evidence(1.0, 0.0) is B
    assert from_truth_evidence(0.0, 0.0) is B


def test_high_truth_witness_votes_true():
    assert from_truth_evidence(1.0, 1.0) is T
    assert from_truth_evidence(0.51, 0.01) is T


def test_low_truth_witness_votes_false():
    assert from_truth_evidence(0.0, 1.0) is F
    assert from_truth_evidence(0.49, 0.01) is F


def test_agnostic_witness_votes_bottom():
    """truth == threshold (default 0.5) abstains as ⊥ even with full evidence."""
    assert from_truth_evidence(0.5, 1.0) is B


def test_single_witness_cannot_vote_top():
    """⊤ is a property of the cell, never of one observation."""
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        for e in (0.0, 0.5, 1.0):
            assert from_truth_evidence(t, e) is not TOP


def test_custom_thresholds_change_partition():
    """A stricter evidence threshold silences low-confidence votes."""
    assert from_truth_evidence(1.0, 0.4, evidence_threshold=0.5) is B
    assert from_truth_evidence(1.0, 0.6, evidence_threshold=0.5) is T


def test_out_of_range_axes_raise():
    with pytest.raises(ValueError):
        from_truth_evidence(1.5, 1.0)
    with pytest.raises(ValueError):
        from_truth_evidence(0.5, -0.1)
