"""Executable D4 gauge facts from RelMath.Positing.D4Gauge."""

from __future__ import annotations

from pymetrologic import four
from pymetrologic.d4_gauge import (
    D8,
    D8_ELEMENTS,
    d4_is_aut_four,
    d4_is_dihedral,
    d8_act,
    d8_inv,
    d8_mul,
    d8_order,
    in_k4,
    in_swap_coset,
)
from pymetrologic.orderswap import swap

FOUR = four()
CHARGES = (FOUR.none, FOUR.true, FOUR.false, FOUR.conflict)


def test_there_are_eight_faithful_gauge_elements() -> None:
    assert len(D8_ELEMENTS) == 8
    assert len(set(D8_ELEMENTS)) == 8
    assert (
        len({tuple(d8_act(element, charge) for charge in CHARGES) for element in D8_ELEMENTS}) == 8
    )


def test_d8_action_matches_named_operations() -> None:
    for charge in CHARGES:
        assert d8_act(D8.id, charge) == charge
        assert d8_act(D8.neg, charge) == FOUR.neg(charge)
        assert d8_act(D8.conf, charge) == FOUR.conflate(charge)
        assert d8_act(D8.negConf, charge) == FOUR.neg(FOUR.conflate(charge))
        assert d8_act(D8.swap, charge) == swap(charge)
        assert d8_act(D8.negSwap, charge) == FOUR.neg(swap(charge))
        assert d8_act(D8.confSwap, charge) == FOUR.conflate(swap(charge))
        assert d8_act(D8.negConfSwap, charge) == FOUR.neg(FOUR.conflate(swap(charge)))


def test_multiplication_realizes_left_after_right_composition() -> None:
    for left in D8_ELEMENTS:
        for right in D8_ELEMENTS:
            product = d8_mul(left, right)
            assert product in D8_ELEMENTS
            for charge in CHARGES:
                assert d8_act(product, charge) == d8_act(left, d8_act(right, charge))


def test_group_laws_and_dihedral_presentation() -> None:
    r = D8.negSwap
    s = D8.swap
    for g in D8_ELEMENTS:
        assert d8_mul(D8.id, g) is g
        assert d8_mul(g, D8.id) is g
        assert d8_mul(d8_inv(g), g) is D8.id
        assert d8_mul(g, d8_inv(g)) is D8.id
    for g in D8_ELEMENTS:
        for h in D8_ELEMENTS:
            for k in D8_ELEMENTS:
                assert d8_mul(d8_mul(g, h), k) is d8_mul(g, d8_mul(h, k))

    assert d8_order(r) == 4
    assert d8_order(D8.confSwap) == 4
    assert d8_order(s) == 2
    assert d8_mul(d8_mul(s, r), s) is d8_inv(r)
    assert d8_mul(d8_mul(D8.swap, D8.neg), D8.swap) is D8.conf
    assert d8_mul(D8.neg, D8.swap) is not d8_mul(D8.swap, D8.neg)


def test_dihedral_and_automorphism_witnesses_hold() -> None:
    assert d4_is_dihedral().holds
    assert d4_is_aut_four().holds


def test_k4_and_swap_cosets_partition_with_homomorphic_coset_bit() -> None:
    assert {g for g in D8_ELEMENTS if in_k4(g)} == {D8.id, D8.neg, D8.conf, D8.negConf}
    assert {g for g in D8_ELEMENTS if in_swap_coset(g)} == {
        D8.swap,
        D8.negSwap,
        D8.confSwap,
        D8.negConfSwap,
    }
    for g in D8_ELEMENTS:
        for h in D8_ELEMENTS:
            assert in_swap_coset(d8_mul(g, h)) == (in_swap_coset(g) != in_swap_coset(h))


def test_k4_coset_preserves_order_families_with_signs() -> None:
    for left in CHARGES:
        for right in CHARGES:
            assert FOUR.leq_k(d8_act(D8.id, left), d8_act(D8.id, right)) == FOUR.leq_k(left, right)
            assert FOUR.leq_t(d8_act(D8.id, left), d8_act(D8.id, right)) == FOUR.leq_t(left, right)
            assert FOUR.leq_k(d8_act(D8.neg, left), d8_act(D8.neg, right)) == FOUR.leq_k(
                left, right
            )
            assert FOUR.leq_t(d8_act(D8.neg, left), d8_act(D8.neg, right)) == FOUR.leq_t(
                right, left
            )
            assert FOUR.leq_k(d8_act(D8.conf, left), d8_act(D8.conf, right)) == FOUR.leq_k(
                right, left
            )
            assert FOUR.leq_t(d8_act(D8.conf, left), d8_act(D8.conf, right)) == FOUR.leq_t(
                left, right
            )
            assert FOUR.leq_k(d8_act(D8.negConf, left), d8_act(D8.negConf, right)) == FOUR.leq_k(
                right, left
            )
            assert FOUR.leq_t(d8_act(D8.negConf, left), d8_act(D8.negConf, right)) == FOUR.leq_t(
                right, left
            )


def test_swap_coset_exchanges_knowledge_and_truth_orders_with_signs() -> None:
    expected = {
        D8.swap: (False, False),
        D8.negSwap: (False, True),
        D8.confSwap: (True, False),
        D8.negConfSwap: (True, True),
    }
    for element, (reverse_k_source, reverse_t_source) in expected.items():
        for left in CHARGES:
            for right in CHARGES:
                k_left, k_right = (right, left) if reverse_k_source else (left, right)
                t_left, t_right = (right, left) if reverse_t_source else (left, right)
                acted_left = d8_act(element, left)
                acted_right = d8_act(element, right)
                assert FOUR.leq_k(acted_left, acted_right) == FOUR.leq_t(k_left, k_right)
                assert FOUR.leq_t(acted_left, acted_right) == FOUR.leq_k(t_left, t_right)
