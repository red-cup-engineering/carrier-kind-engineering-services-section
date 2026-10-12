"""Transfinite closure flow (RelMath.Flow.TransfiniteClosureFlow)."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import BL, closure_step, four, knowledge_lattice, omega
from pymetrologic.ordinal import of_nat
from pymetrologic.transfinite_flow import (
    omega_value,
    tflow_chain_le_omega,
    tflow_continuous_at_omega,
    tflow_finite_prefix,
    tflow_monotone_chain,
    tflow_no_nsc_firing_omega,
    tflow_value,
    transfinite_settling_continuity,
)

bl = four()
lat = knowledge_lattice(bl.L)
add_true: Callable[[BL[int]], BL[int]] = closure_step(lat, lambda x: x, bl.true)


def test_finite_ordinals_read_the_closure_orbit() -> None:
    assert tflow_finite_prefix(lat, add_true, bl.none, stages=4) == (
        bl.none,
        bl.true,
        bl.true,
        bl.true,
        bl.true,
    )
    assert tflow_value(lat, add_true, bl.none, of_nat(0)) == bl.none
    assert tflow_value(lat, add_true, bl.none, of_nat(3)) == bl.true


def test_omega_limit_reads_the_settled_value() -> None:
    assert omega_value(add_true, bl.none) == bl.true
    assert tflow_value(lat, add_true, bl.none, omega) == bl.true
    assert tflow_value(lat, add_true, bl.false, omega) == bl.conflict


def test_omega_continuity_is_lub_of_finite_predecessors() -> None:
    witness = tflow_continuous_at_omega(lat, add_true, bl.none)

    assert witness.holds
    assert witness.limit_value == bl.true
    assert witness.finite_prefix[:2] == (bl.none, bl.true)
    assert witness.upper_bound
    assert witness.least_upper_bound


def test_transfinite_settling_continuity_holds_for_each_seed() -> None:
    for seed in lat.elements:
        witness = transfinite_settling_continuity(lat, add_true, seed)

        assert witness.holds
        assert witness.monotone_finite_chain
        assert witness.finite_chain_below_omega
        assert witness.omega_continuity.holds
        assert witness.no_nsc_firing_at_omega
        assert tflow_monotone_chain(lat, add_true, seed)
        assert tflow_chain_le_omega(lat, add_true, seed)
        assert tflow_no_nsc_firing_omega(lat, add_true, seed)


def test_transfinite_flow_rejects_nonclosure_operator_for_continuity() -> None:
    def retract_top(x: BL[int]) -> BL[int]:
        return bl.none if x == bl.conflict else bl.conflict

    with pytest.raises(ValueError, match="closure operator"):
        tflow_continuous_at_omega(lat, retract_top, bl.none)
