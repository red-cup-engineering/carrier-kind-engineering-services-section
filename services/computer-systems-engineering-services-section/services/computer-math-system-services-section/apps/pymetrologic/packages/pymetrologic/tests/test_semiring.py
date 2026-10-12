"""Commutative semiring axioms (RelMath.Order.NumberTheoryCombinatorics / AlgebraHierarchy).

The Boolean semiring, GF(p), and — tying back to the bilattice — the truth
lattice (∨ₜ, ∧ₜ) as an idempotent commutative semiring.
"""

from __future__ import annotations

import pytest

from pymetrologic import Bilattice, Chain, bilattice, boolean, four, is_comm_semiring


def test_boolean_semiring() -> None:
    assert is_comm_semiring(
        (False, True),
        add=lambda a, b: a or b,
        mul=lambda a, b: a and b,
        zero=False,
        one=True,
        eq=lambda a, b: a == b,
    )


def test_gf_p_is_a_semiring() -> None:
    p = 5
    assert is_comm_semiring(
        tuple(range(p)),
        add=lambda a, b: (a + b) % p,
        mul=lambda a, b: (a * b) % p,
        zero=0,
        one=1,
        eq=lambda a, b: a == b,
    )


@pytest.mark.parametrize("bl", [four(), bilattice(Chain(3))], ids=["FOUR", "chain3"])
def test_truth_lattice_is_an_idempotent_semiring(bl: Bilattice[object]) -> None:
    # (∨ₜ, ∧ₜ, f, t) — the bilattice truth lattice is a commutative semiring.
    assert is_comm_semiring(
        bl.sample(0),
        add=bl.join_t,
        mul=bl.meet_t,
        zero=bl.false,
        one=bl.true,
        eq=bl.eq,
    )


def test_boolean_lattice_join_meet_is_a_semiring() -> None:
    bl = bilattice(boolean())
    assert is_comm_semiring(
        bl.sample(0), add=bl.join_k, mul=bl.meet_k, zero=bl.none, one=bl.conflict, eq=bl.eq
    )
