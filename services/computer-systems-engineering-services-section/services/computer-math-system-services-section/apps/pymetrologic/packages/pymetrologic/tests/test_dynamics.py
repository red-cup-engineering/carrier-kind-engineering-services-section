"""Closure-flow dynamics — smooth/singular steps, firing count κ (RelMath.Flow)."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import (
    BL,
    closure_orbit,
    closure_step,
    drive_monotone,
    drive_step_inflationary,
    driven_flow,
    firing_count,
    four,
    is_singular_step,
    is_smooth_step,
    knowledge_lattice,
    smooth_is_terminal,
)

bl = four()
lat = knowledge_lattice(bl.L)
# A closure that drives every value up to ⊤ (the firing increment).
step: Callable[[BL[int]], BL[int]] = closure_step(lat, lambda x: x, bl.conflict)


def test_smooth_and_singular_steps() -> None:
    assert is_singular_step(lat, step, bl.none)  # ⊥ -> ⊤ fires
    assert is_smooth_step(lat, step, bl.conflict)  # ⊤ is fixed (no-op)
    assert not is_singular_step(lat, step, bl.conflict)


def test_firing_count_is_the_closure_ordinal() -> None:
    assert firing_count(lat, step, bl.none) == 1  # ⊥ -> ⊤ in one firing
    assert firing_count(lat, step, bl.conflict) == 0  # already settled


def test_smooth_is_terminal() -> None:
    # Once the flow goes smooth it stays smooth — firings stop at the closure ordinal.
    for seed in lat.elements:
        assert smooth_is_terminal(lat, step, seed)


def test_a_multi_step_firing() -> None:
    # A closure that adds evidence-for then never retracts: ⊥ -> t -> ⊤ takes one
    # firing to t under "join with t", then "join with f" would fire again — but the
    # composite "join with ⊤" settles in a single firing as above; here check a
    # two-stage flow climbs monotonically and terminates.
    j_true = closure_step(lat, lambda x: x, bl.true)
    assert firing_count(lat, j_true, bl.none) == 1  # ⊥ -> t
    assert firing_count(lat, j_true, bl.false) == 1  # f -> ⊤
    assert firing_count(lat, j_true, bl.true) == 0  # fixed


def test_increment_driven_flow_extends_the_closure_orbit() -> None:
    add_true = closure_step(lat, lambda x: x, bl.true)

    assert closure_orbit(lat, add_true, bl.none, steps=3) == (
        bl.none,
        bl.true,
        bl.true,
        bl.true,
    )
    assert driven_flow(lat, add_true, (bl.none, bl.none, bl.none), bl.none) == (
        bl.none,
        bl.true,
        bl.true,
        bl.true,
    )

    increments = (bl.none, bl.false, bl.none)
    assert driven_flow(lat, add_true, increments, bl.none) == (
        bl.none,
        bl.true,
        bl.conflict,
        bl.conflict,
    )
    assert drive_step_inflationary(lat, add_true, increments, bl.none)
    assert drive_monotone(lat, add_true, increments, bl.none)


def test_closure_orbit_rejects_negative_steps() -> None:
    with pytest.raises(ValueError, match="nonnegative"):
        closure_orbit(lat, step, bl.none, steps=-1)
