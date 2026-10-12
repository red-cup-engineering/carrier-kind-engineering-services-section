"""The Klein four-group gauge K₄ on the charge (RelMath.Positing.KleinFourGauge).

Witnesses that ``{id, neg, conflate, negConf}`` is a Klein four-group acting on
the bilattice: self-inverse, abelian, group action, and the proved order
signature of each gauge element.
"""

from __future__ import annotations

import pytest

from pymetrologic import K4, K4_ELEMENTS, Bilattice, Chain, bilattice, boolean, unit_interval
from pymetrologic.klein import act, is_group, mul

BILATTICES: list[Bilattice[object]] = [
    bilattice(boolean()),
    bilattice(Chain(3)),
    bilattice(unit_interval()),
]
IDS = ["FOUR", "chain3", "unit"]


def test_there_are_four_gauge_elements() -> None:
    assert len(K4_ELEMENTS) == 4
    assert len(set(K4_ELEMENTS)) == 4


def test_every_element_is_self_inverse() -> None:
    for g in K4_ELEMENTS:
        assert mul(g, g) is K4.ID


def test_group_is_abelian_and_closed() -> None:
    for g in K4_ELEMENTS:
        for h in K4_ELEMENTS:
            assert mul(g, h) is mul(h, g)
            assert mul(g, h) in K4_ELEMENTS


def test_cayley_negconf_is_neg_times_conf() -> None:
    assert mul(K4.NEG, K4.CONF) is K4.NEGCONF
    assert mul(K4.NEG, K4.NEGCONF) is K4.CONF
    assert mul(K4.CONF, K4.NEGCONF) is K4.NEG


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_is_group_action(bl: Bilattice[object]) -> None:
    assert is_group(bl)


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_act_matches_the_named_operations(bl: Bilattice[object]) -> None:
    for x in bl.sample(3):
        assert bl.eq(act(K4.ID, bl, x), x)
        assert bl.eq(act(K4.NEG, bl, x), bl.neg(x))
        assert bl.eq(act(K4.CONF, bl, x), bl.conflate(x))
        assert bl.eq(act(K4.NEGCONF, bl, x), bl.neg(bl.conflate(x)))


@pytest.mark.parametrize("bl", BILATTICES, ids=IDS)
def test_order_signature_of_each_gauge_element(bl: Bilattice[object]) -> None:
    vals = bl.sample(3)
    for a in vals:
        for b in vals:
            # id preserves both; neg preserves ≤_k, reverses ≤_t.
            assert bl.leq_k(act(K4.NEG, bl, a), act(K4.NEG, bl, b)) == bl.leq_k(a, b)
            assert bl.leq_t(act(K4.NEG, bl, a), act(K4.NEG, bl, b)) == bl.leq_t(b, a)
            # conflate reverses ≤_k, preserves ≤_t.
            assert bl.leq_k(act(K4.CONF, bl, a), act(K4.CONF, bl, b)) == bl.leq_k(b, a)
            assert bl.leq_t(act(K4.CONF, bl, a), act(K4.CONF, bl, b)) == bl.leq_t(a, b)
            # negConf reverses both.
            assert bl.leq_k(act(K4.NEGCONF, bl, a), act(K4.NEGCONF, bl, b)) == bl.leq_k(b, a)
            assert bl.leq_t(act(K4.NEGCONF, bl, a), act(K4.NEGCONF, bl, b)) == bl.leq_t(b, a)
