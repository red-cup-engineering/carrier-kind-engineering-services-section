"""CRDT convergence and CALM (RelMath.Cohomology.CRDTCohomologicalCALM)."""

from __future__ import annotations

import pytest

from pymetrologic import (
    Bilattice,
    Chain,
    bilattice,
    boolean,
    confluence_join,
    four,
    is_confluent,
    is_order_independent,
    merge_deltas,
)


def test_merge_is_order_and_multiplicity_independent() -> None:
    bl = four()
    deltas = [bl.true, bl.false, bl.none, bl.true]
    assert is_order_independent(bl, deltas)
    # t ∨ₖ f = ⊤, joined with anything stays ⊤.
    assert merge_deltas(bl, deltas) == bl.conflict


@pytest.mark.parametrize("bl", [bilattice(boolean()), bilattice(Chain(3))], ids=["FOUR", "chain3"])
def test_confluence_is_total(bl: Bilattice[object]) -> None:
    # The join is always a common upper bound — divergent paths always rejoin.
    for u in bl.sample(0):
        for w in bl.sample(0):
            assert is_confluent(bl, u, w)
            j = confluence_join(bl, u, w)
            assert bl.eq(j, bl.join_k(u, w))


def test_empty_merge_is_bottom() -> None:
    bl = four()
    assert merge_deltas(bl, []) == bl.none
    assert is_order_independent(bl, [])
