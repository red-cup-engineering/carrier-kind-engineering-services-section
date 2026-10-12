from __future__ import annotations

import pytest

from pymetrologic.order import (
    AlgebraicLattice,
    BoundedAlgebraicLattice,
    FinitePartialOrder,
    FinitePreorder,
    MonotoneMap,
    powerset_complete_lattice,
)


def test_preorder_and_partial_order_laws_are_detected() -> None:
    divisibility = FinitePartialOrder((1, 2, 3, 6), lambda left, right: right % left == 0)
    cyclic = FinitePartialOrder(("a", "b"), lambda _left, _right: True)

    assert divisibility.holds
    assert divisibility.preorder().holds
    assert not cyclic.holds
    assert cyclic.preorder().holds


def test_monotone_map_between_finite_orders() -> None:
    domain = FinitePreorder((0, 1, 2), lambda left, right: left <= right)
    codomain = FinitePreorder((0, 1, 2, 3, 4), lambda left, right: left <= right)

    assert MonotoneMap(domain, codomain, lambda value: value + 1).holds
    assert not MonotoneMap(domain, codomain, lambda value: 3 - value).holds


def test_algebraic_lattice_derives_order_glb_and_lub() -> None:
    lattice = AlgebraicLattice(
        elements=(False, True),
        meet=lambda left, right: left and right,
        join=lambda left, right: left or right,
    )

    assert lattice.holds
    assert lattice.leq(False, True)
    assert lattice.meet_order_matches_join_order()
    assert lattice.meet_is_glb()
    assert lattice.join_is_lub()
    assert lattice.is_distributive()


def test_bounded_lattice_derives_bottom_and_top_laws() -> None:
    lattice = AlgebraicLattice(
        elements=(frozenset(), frozenset({"a"}), frozenset({"b"}), frozenset({"a", "b"})),
        meet=lambda left, right: left.intersection(right),
        join=lambda left, right: left.union(right),
    )
    bounded = BoundedAlgebraicLattice(lattice, bot=frozenset(), top=frozenset({"a", "b"}))

    assert bounded.holds
    assert bounded.bot_le()
    assert bounded.le_top()


def test_complete_lattice_sup_inf_top_and_bottom() -> None:
    lattice = powerset_complete_lattice(("x", "y"))
    singleton_x = frozenset({"x"})
    singleton_y = frozenset({"y"})

    assert lattice.holds
    assert lattice.sup(frozenset({singleton_x, singleton_y})) == frozenset({"x", "y"})
    assert lattice.s_inf((singleton_x, singleton_y)) == frozenset()
    assert lattice.top() == frozenset({"x", "y"})
    assert lattice.bot() == frozenset()


def test_order_infra_rejects_duplicate_carriers() -> None:
    with pytest.raises(ValueError, match="unique"):
        FinitePreorder((1, 1), lambda left, right: left <= right)
