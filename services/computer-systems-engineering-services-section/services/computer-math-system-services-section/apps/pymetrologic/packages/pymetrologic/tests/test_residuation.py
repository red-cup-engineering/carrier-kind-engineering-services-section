"""The truth-order residuated structure on ``L^⋈`` (twist fusion ⊙ ⊣ residual ⇒).

Transcribed from ``RelMath.Order.ResiduatedLatticeStandalone`` and
``RelMath.Order.TwistProductResiduation`` (lean/); these tests are the
computational witness of the residuation adjunction proved there
(``fuse_leT_iff``), checked exhaustively on FOUR / a chain / the unit interval.
"""

from __future__ import annotations

import pytest

from pymetrologic import Bilattice, Chain, bilattice, boolean, four, unit_interval

BILATTICES: list[Bilattice[object]] = [
    bilattice(boolean()),
    bilattice(Chain(3)),
    bilattice(unit_interval()),
]
IDS = ["FOUR", "chain3", "unit"]


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_residuation_adjunction(bl: Bilattice[object]) -> None:
    # a ⊙ b ≤_t c  ⟺  a ≤_t (b ⇒ c)   — the headline.
    vals = bl.sample(4)
    for a in vals:
        for b in vals:
            for c in vals:
                assert bl.leq_t(bl.fuse(a, b), c) == bl.leq_t(a, bl.residuum(b, c))


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_fusion_is_commutative(bl: Bilattice[object]) -> None:
    vals = bl.sample(4)
    for a in vals:
        for b in vals:
            assert bl.eq(bl.fuse(a, b), bl.fuse(b, a))


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_fusion_unit_is_the_knowledge_top(bl: Bilattice[object]) -> None:
    # The monoidal unit is ⟨⊤,⊤⟩ (= conflict), NOT the truth top — non-integrality.
    assert bl.eq(bl.fusion_unit, bl.conflict)
    for a in bl.sample(4):
        assert bl.eq(bl.fuse(a, bl.fusion_unit), a)  # a ⊙ 1 = a


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_residuum_is_monotone_in_its_consequent(bl: Bilattice[object]) -> None:
    vals = bl.sample(4)
    for a in vals:
        for y in vals:
            for z in vals:
                if bl.leq_t(y, z):
                    assert bl.leq_t(bl.residuum(a, y), bl.residuum(a, z))


def test_belnap_residuum_values() -> None:
    bl = four()
    assert bl.eq(bl.residuum(bl.true, bl.true), bl.true)  # t ⇒ t = t
    assert bl.eq(bl.residuum(bl.true, bl.false), bl.false)  # t ⇒ f = f
    assert bl.eq(bl.residuum(bl.false, bl.true), bl.true)  # f ⇒ anything = t
    assert bl.eq(bl.residuum(bl.true, bl.none), bl.none)  # t ⇒ ⊥ = ⊥


def test_belnap_fusion_values() -> None:
    bl = four()
    assert bl.eq(bl.fuse(bl.true, bl.true), bl.true)  # t ⊙ t = t
    assert bl.eq(bl.fuse(bl.true, bl.false), bl.false)  # t ⊙ f = f


def test_right_residuation_operator_iterates() -> None:
    # R_a(x) = a ⇒ x; iterating it stays inside the lattice and is reproducible.
    bl = four()
    r = bl.right_residuation(bl.true)
    x = bl.none
    orbit = [x]
    for _ in range(4):
        x = r(x)
        orbit.append(x)
    assert all(isinstance(v.pro, int) for v in orbit)
    assert bl.eq(orbit[1], bl.residuum(bl.true, bl.none))
