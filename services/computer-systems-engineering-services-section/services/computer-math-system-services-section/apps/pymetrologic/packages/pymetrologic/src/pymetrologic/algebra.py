"""The algebra tower (monoid → group) the lab's operations live in.

Transcribed from ``RelMath.Order.AlgebraHierarchy`` (lean/), where received
algebra is a degenerate shadow whose in-chain anchors are: a bounded lattice's
meet and join are commutative monoids (``meetMonoid``/``joinMonoid``), a
residuated lattice's fusion is a commutative monoid (``fuseMonoid``), and the
Klein four-gauge is an abelian group (``kleinFourGroup``). These checkers verify
the lab's own operations satisfy those proven laws.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TypeVar

E = TypeVar("E")

__all__ = ["is_abelian_group", "is_comm_monoid", "is_comm_semiring", "is_field"]


def _closed(elements: Sequence[E], op: Callable[[E, E], E], eq: Callable[[E, E], bool]) -> bool:
    return all(any(eq(op(a, b), e) for e in elements) for a in elements for b in elements)


def is_comm_monoid(
    elements: Sequence[E],
    op: Callable[[E, E], E],
    unit: E,
    eq: Callable[[E, E], bool],
) -> bool:
    """A commutative monoid: ``op`` closed, associative, commutative, with ``unit`` identity."""
    if not _closed(elements, op, eq):
        return False
    for a in elements:
        if not eq(op(a, unit), a):  # identity
            return False
        for b in elements:
            if not eq(op(a, b), op(b, a)):  # commutativity
                return False
            for c in elements:
                if not eq(op(op(a, b), c), op(a, op(b, c))):  # associativity
                    return False
    return True


def is_abelian_group(
    elements: Sequence[E],
    op: Callable[[E, E], E],
    inv: Callable[[E], E],
    unit: E,
    eq: Callable[[E, E], bool],
) -> bool:
    """A commutative monoid in which every element has an inverse."""
    if not is_comm_monoid(elements, op, unit, eq):
        return False
    return all(eq(op(a, inv(a)), unit) for a in elements)


def is_comm_semiring(
    elements: Sequence[E],
    add: Callable[[E, E], E],
    mul: Callable[[E, E], E],
    zero: E,
    one: E,
    eq: Callable[[E, E], bool],
) -> bool:
    """A commutative semiring: ``(+)`` and ``(*)`` commutative monoids, ``*`` distributes
    over ``+``, and ``0`` annihilates ``*``."""
    if not is_comm_monoid(elements, add, zero, eq):
        return False
    if not is_comm_monoid(elements, mul, one, eq):
        return False
    distributive = all(
        eq(mul(a, add(b, c)), add(mul(a, b), mul(a, c)))
        for a in elements
        for b in elements
        for c in elements
    )
    annihilates = all(eq(mul(a, zero), zero) for a in elements)
    return distributive and annihilates


def is_field(
    elements: Sequence[E],
    add: Callable[[E, E], E],
    mul: Callable[[E, E], E],
    zero: E,
    one: E,
    add_inv: Callable[[E], E],
    mul_inv: Callable[[E], E],
    eq: Callable[[E, E], bool],
) -> bool:
    """A field: ``(+)`` an abelian group, ``(*)`` an abelian group on the nonzero
    elements, ``*`` distributing over ``+``, and ``0 ≠ 1``."""
    if eq(zero, one):
        return False
    if not is_abelian_group(elements, add, add_inv, zero, eq):
        return False
    nonzero = [x for x in elements if not eq(x, zero)]
    if not is_abelian_group(nonzero, mul, mul_inv, one, eq):
        return False
    return all(
        eq(mul(a, add(b, c)), add(mul(a, b), mul(a, c)))
        for a in elements
        for b in elements
        for c in elements
    )
