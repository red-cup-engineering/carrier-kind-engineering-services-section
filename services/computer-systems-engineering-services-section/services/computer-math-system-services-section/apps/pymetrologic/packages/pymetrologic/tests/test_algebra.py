"""The algebra tower: the lab's operations satisfy the proven monoid/group laws.

Witnesses RelMath.Order.AlgebraHierarchy: meet/join are commutative monoids,
fusion is a commutative monoid, and the Klein four-gauge is an abelian group.
"""

from __future__ import annotations

import pytest

from pymetrologic import (
    K4,
    K4_ELEMENTS,
    Bilattice,
    Chain,
    bilattice,
    boolean,
    is_abelian_group,
    is_comm_monoid,
    unit_interval,
)
from pymetrologic.klein import mul

FINITE: list[Bilattice[object]] = [bilattice(boolean()), bilattice(Chain(3))]
ALL: list[Bilattice[object]] = [*FINITE, bilattice(unit_interval())]
FINITE_IDS = ["FOUR", "chain3"]
ALL_IDS = ["FOUR", "chain3", "unit"]


@pytest.mark.parametrize("bl", FINITE, ids=FINITE_IDS)
def test_knowledge_meet_and_join_are_commutative_monoids(bl: Bilattice[object]) -> None:
    vals = bl.sample(0)  # the full finite carrier
    # join_k has unit ⊥ (none); meet_k has unit ⊤ (conflict).
    assert is_comm_monoid(vals, bl.join_k, bl.none, bl.eq)
    assert is_comm_monoid(vals, bl.meet_k, bl.conflict, bl.eq)


@pytest.mark.parametrize("bl", FINITE, ids=FINITE_IDS)
def test_truth_meet_and_join_are_commutative_monoids(bl: Bilattice[object]) -> None:
    vals = bl.sample(0)
    assert is_comm_monoid(vals, bl.join_t, bl.false, bl.eq)  # unit f
    assert is_comm_monoid(vals, bl.meet_t, bl.true, bl.eq)  # unit t


@pytest.mark.parametrize("bl", ALL, ids=ALL_IDS)
def test_fusion_is_a_commutative_monoid(bl: Bilattice[object]) -> None:
    vals = bl.sample(3)
    # The non-integral unit is ⟨⊤,⊤⟩ = fusion_unit (the knowledge top).
    assert is_comm_monoid(vals, bl.fuse, bl.fusion_unit, bl.eq)


def test_klein_four_is_an_abelian_group() -> None:
    # K₄ with mul, every element self-inverse, unit = id.
    assert is_abelian_group(K4_ELEMENTS, mul, lambda g: g, K4.ID, lambda a, b: a is b)
