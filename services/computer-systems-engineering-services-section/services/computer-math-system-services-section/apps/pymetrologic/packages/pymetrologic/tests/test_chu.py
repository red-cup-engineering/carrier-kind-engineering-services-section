"""Chu spaces over FOUR and FOUR's *-autonomous alphabet (RelMath.Order.LinearLogicChu)."""

from __future__ import annotations

import pytest

from pymetrologic import (
    Bilattice,
    Chain,
    ChuSpace,
    bilattice,
    boolean,
    dual,
    four,
    four_hom,
    four_tensor,
    is_star_autonomous,
    unit_interval,
)


def _space(bl: Bilattice[int]) -> ChuSpace[int]:
    return ChuSpace(
        pts=("p0", "p1"),
        sts=("s0", "s1"),
        matrix={
            ("p0", "s0"): bl.true,
            ("p0", "s1"): bl.none,
            ("p1", "s0"): bl.conflict,
            ("p1", "s1"): bl.false,
        },
    )


def test_dual_transposes_points_and_states() -> None:
    bl = four()
    c = _space(bl)
    d = dual(bl, c)
    assert d.pts == c.sts
    assert d.sts == c.pts
    assert d.matrix[("s0", "p0")] == bl.neg(bl.true)  # transposed + negated


def test_dual_is_an_involution() -> None:
    bl = four()
    c = _space(bl)
    assert dual(bl, dual(bl, c)) == c


@pytest.mark.parametrize(
    "bl",
    [bilattice(boolean()), bilattice(Chain(3)), bilattice(unit_interval())],
    ids=["FOUR", "chain3", "unit"],
)
def test_alphabet_is_star_autonomous(bl: Bilattice[object]) -> None:
    assert is_star_autonomous(bl)


def test_tensor_and_hom_are_fusion_and_residual() -> None:
    bl = four()
    for a in bl.sample(2):
        for b in bl.sample(2):
            assert four_tensor(bl, a, b) == bl.fuse(a, b)
            assert four_hom(bl, a, b) == bl.residuum(a, b)
