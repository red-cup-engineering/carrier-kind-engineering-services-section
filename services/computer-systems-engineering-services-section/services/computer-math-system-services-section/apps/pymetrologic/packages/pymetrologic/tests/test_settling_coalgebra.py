"""Settling coalgebra structure (RelMath.Closure.SettlingCoalgebra)."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import BL, closure_step, four, knowledge_lattice
from pymetrologic.settling_coalgebra import (
    canonical_coalgebra,
    cclosed_iff_closure_algebra,
    coalgebra_dual_of_algebra,
    coalgebra_orbit,
    coalgebra_orbit_limit_witness,
    settling_endofunctor,
    settling_endofunctor_mono_holds,
    settling_endofunctor_zero_holds,
)

bl = four()
lat = knowledge_lattice(bl.L)
add_true: Callable[[BL[int]], BL[int]] = closure_step(lat, lambda x: x, bl.true)


def test_settling_endofunctor_zero_recovers_closure() -> None:
    assert settling_endofunctor(lat, add_true, bl.false, bl.none) == bl.conflict

    for value in lat.elements:
        assert settling_endofunctor_zero_holds(lat, add_true, value)


def test_canonical_coalgebra_is_inflationary_and_orbit_monotone() -> None:
    witness = canonical_coalgebra(lat, add_true, bl.none, bl.false)

    assert witness.holds
    assert witness.carrier == bl.none
    assert witness.increment == bl.false
    assert witness.target == bl.conflict
    assert settling_endofunctor_mono_holds(lat, add_true, bl.false)


def test_coalgebra_limit_is_join_of_prior_orbit() -> None:
    witness = coalgebra_orbit_limit_witness(lat, add_true, bl.none, stages=4)

    assert witness.holds
    assert witness.prefix == (bl.none, bl.true, bl.true, bl.true)
    assert witness.limit_value == bl.true
    assert coalgebra_orbit(lat, add_true, bl.none, steps=3) == (
        bl.none,
        bl.true,
        bl.true,
        bl.true,
    )


def test_coalgebra_duality_holds_at_quiescence() -> None:
    witness = coalgebra_dual_of_algebra(lat, add_true, bl.true)

    assert witness.holds
    assert witness.value == bl.true
    assert witness.algebra_to_coalgebra_duality
    assert witness.iso_at_quiescence


def test_cclosed_is_closure_algebra_with_unique_structure() -> None:
    closed = cclosed_iff_closure_algebra(lat, add_true, bl.true)
    open_value = cclosed_iff_closure_algebra(lat, add_true, bl.none)

    assert closed.holds
    assert closed.c_closed
    assert closed.closure_algebra
    assert closed.unique_structure
    assert open_value.holds
    assert not open_value.c_closed
    assert not open_value.closure_algebra


def test_settling_coalgebra_rejects_nonclosure_operator() -> None:
    def retract_top(x: BL[int]) -> BL[int]:
        return bl.none if x == bl.conflict else bl.conflict

    with pytest.raises(ValueError, match="closure operator"):
        canonical_coalgebra(lat, retract_top, bl.none, bl.false)

    with pytest.raises(ValueError, match="closure operator"):
        coalgebra_orbit_limit_witness(lat, retract_top, bl.none)
