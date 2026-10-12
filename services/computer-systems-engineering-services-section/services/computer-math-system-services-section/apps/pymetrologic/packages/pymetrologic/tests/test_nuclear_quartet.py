"""The nuclear quartet: the four sub-algebras as the four-corner cell (BigradedDiamond)."""

from __future__ import annotations

from pymetrologic import (
    BL,
    Corner,
    commutating_pair,
    four,
    join_nucleus,
    knowledge_lattice,
    nuclear_quartet,
)

bl = four()
lat = knowledge_lattice(bl.L)
# Two commuting join-nuclei: j₁ closes upward to include t, j₂ to include f.
j1 = join_nucleus(lat, bl.true)
j2 = join_nucleus(lat, bl.false)
pair = commutating_pair(j1, j2)
quartet = nuclear_quartet(pair, lat.elements, lat.eq)


def test_potential_corner_is_the_whole_algebra() -> None:
    # Fix(id) = A — every element is fixed by the identity corner operator.
    assert set(quartet[Corner.ABSURD]) == set(lat.elements)


def test_active_and_stable_are_the_single_nucleus_fixed_points() -> None:
    # Fix j₁ = {x : x ≥ t} = {t, ⊤};  Fix j₂ = {x : x ≥ f} = {f, ⊤}.
    assert set(quartet[Corner.POTENTIAL]) == {bl.true, bl.conflict}
    assert set(quartet[Corner.ACTIVE]) == {bl.false, bl.conflict}


def test_absurd_corner_is_the_doubly_closed_subalgebra() -> None:
    # A* = Fix(j₁∘j₂) = {⊤} — the most-closed corner.
    assert set(quartet[Corner.STABLE]) == {bl.conflict}


def test_quartet_is_nested_by_closure() -> None:
    a_star = set(quartet[Corner.STABLE])
    fix1 = set(quartet[Corner.POTENTIAL])
    fix2 = set(quartet[Corner.ACTIVE])
    free = set(quartet[Corner.ABSURD])
    # A* ⊆ Fix j₁, Fix j₂ ⊆ A — the four-corner containment lattice.
    assert a_star <= fix1 <= free
    assert a_star <= fix2 <= free


def test_all_four_corners_present() -> None:
    assert set(quartet) == set(Corner)
    assert all(isinstance(v, tuple) for v in quartet.values())
    assert all(isinstance(x, BL) for corner in quartet.values() for x in corner)
