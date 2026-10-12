"""Knaster–Tarski fixed points and closure operators on the knowledge lattice.

Computational witnesses of ``RelMath.Order.KnasterTarskiStandalone`` (lfp/gfp are
fixed points, lfp least, lfp ≤ gfp) and ``RelMath.Closure.ClosureMonad``
(closure = monotone+inflationary+idempotent; the settling step climbs to a fixed
point without periodic orbits).
"""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import (
    BL,
    Bilattice,
    Chain,
    bilattice,
    closure_step,
    fixed_points,
    four,
    gfp,
    is_closure,
    is_monotone,
    iterate_to_fixpoint,
    knowledge_lattice,
    lfp,
)

FOUR = four()
CHAIN = bilattice(Chain(2))


def _monos(bl: Bilattice[object]) -> list[Callable[[BL[object]], BL[object]]]:
    """A spread of knowledge-monotone maps (the lattice of the bilattice's ≤_k)."""
    return [
        lambda x: x,  # identity (a closure)
        lambda x, bl=bl: bl.conflict,  # const ⊤ (a closure)
        lambda x, bl=bl: bl.join_k(x, bl.true),  # add evidence-for (a closure)
        lambda x, bl=bl: bl.join_k(x, bl.false),  # add evidence-against (a closure)
        lambda x, bl=bl: bl.meet_k(x, bl.true),  # monotone but NOT inflationary
    ]


@pytest.mark.parametrize("bl", [FOUR, CHAIN], ids=["FOUR", "chain2"])
def test_knaster_tarski_fixed_points(bl: Bilattice[object]) -> None:
    lat = knowledge_lattice(bl.L)
    for f in _monos(bl):
        assert is_monotone(lat, f)
        p, q = lfp(lat, f), gfp(lat, f)
        assert lat.eq(f(p), p)  # lfp is a fixed point
        assert lat.eq(f(q), q)  # gfp is a fixed point
        assert lat.leq(p, q)  # lfp ≤ gfp
        fps = fixed_points(lat, f)
        assert all(lat.leq(p, x) for x in fps)  # lfp is least
        assert all(lat.leq(x, q) for x in fps)  # gfp is greatest


def test_closure_detection_and_least_closed_element() -> None:
    bl = FOUR
    lat = knowledge_lattice(bl.L)

    def add_true(x: BL[object]) -> BL[object]:
        return bl.join_k(x, bl.true)

    def meet_true(x: BL[object]) -> BL[object]:
        return bl.meet_k(x, bl.true)

    assert is_closure(lat, add_true)  # monotone + inflationary + idempotent
    assert is_closure(lat, lambda x: x)
    assert not is_closure(lat, meet_true)  # not inflationary
    # For a closure c, the least closed element is c(⊥) and equals lfp.
    assert lat.eq(lfp(lat, add_true), add_true(lat.bot))
    assert lat.eq(lfp(lat, add_true), bl.true)


def test_settling_step_climbs_to_a_fixed_point_without_cycling() -> None:
    bl = FOUR
    lat = knowledge_lattice(bl.L)

    def c(x: BL[object]) -> BL[object]:  # trivial closure
        return x

    step = closure_step(lat, c, bl.false)  # settleStep c u v = (c v) ∨ u

    # Inflationary and monotone -> the orbit is non-decreasing (no periodic orbit).
    orbit = [lat.bot]
    for _ in range(5):
        orbit.append(step(orbit[-1]))
    assert all(lat.leq(orbit[i], orbit[i + 1]) for i in range(len(orbit) - 1))

    settled, _ = iterate_to_fixpoint(lat, step, lat.bot)
    assert lat.eq(settled, step(settled))  # genuine fixed point
    assert lat.eq(settled, lat.join(c(settled), bl.false))  # = (c r) ∨ u
    assert lat.eq(settled, bl.false)


def test_settling_step_with_a_nontrivial_closure() -> None:
    bl = FOUR
    lat = knowledge_lattice(bl.L)

    def c(x: BL[object]) -> BL[object]:
        return bl.join_k(x, bl.true)

    step = closure_step(lat, c, bl.false)
    settled, _ = iterate_to_fixpoint(lat, step, lat.bot)
    # c forces evidence-for, the increment forces evidence-against -> ⊤ (conflict).
    assert lat.eq(settled, bl.conflict)
