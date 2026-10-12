"""Nuclei and commuting nuclei — the *commutating* half of the keystone.

A nucleus is a closure that also preserves meets (RelMath.Positing.Nucleus); two
commuting nuclei give the same coherence CommutingPair as twistoring
(RelMath.Positing.QuartetRecurrence.commutatingPair / twistoring_eq_commutating).
"""

from __future__ import annotations

from collections.abc import Callable

from pymetrologic import (
    BL,
    commutating_pair,
    four,
    is_closure,
    is_nucleus,
    join_nucleus,
    knowledge_lattice,
)

bl = four()
lat = knowledge_lattice(bl.L)


def test_every_join_map_is_a_nucleus() -> None:
    # x ↦ x ∨ c is a nucleus on the distributive knowledge lattice, for any c.
    for c in lat.elements:
        assert is_nucleus(lat, join_nucleus(lat, c))


def test_a_closure_that_is_not_a_nucleus() -> None:
    # Sends t ↦ ⊤ but fixes f: a closure (monotone+inflationary+idempotent) that
    # fails meet-preservation, so NOT a nucleus.
    table = {bl.none: bl.none, bl.true: bl.conflict, bl.false: bl.false, bl.conflict: bl.conflict}

    def j(x: BL[int]) -> BL[int]:
        return table[x]

    assert is_closure(lat, j)
    assert not is_nucleus(lat, j)  # j(t∧f)=j(⊥)=⊥ ≠ ⊤∧f = f


def test_commuting_nuclei_form_the_keystone_pair() -> None:
    # Two join-nuclei commute: (x∨c)∨d = (x∨d)∨c. They instantiate the SAME
    # CommutingPair coherence cell as twistoring.
    j1: Callable[[BL[int]], BL[int]] = join_nucleus(lat, bl.true)
    j2: Callable[[BL[int]], BL[int]] = join_nucleus(lat, bl.false)
    pair = commutating_pair(j1, j2)
    assert pair.commutes(lat.elements, lat.eq)
    for a in lat.elements:
        left, right = pair.square(a)
        assert lat.eq(left, right)
    # corner_op at ⊤ is the doubly-acted corner j1∘j2.
    from pymetrologic import Corner

    a = bl.none
    assert lat.eq(pair.corner_op(Corner.STABLE, a), j1(j2(a)))
