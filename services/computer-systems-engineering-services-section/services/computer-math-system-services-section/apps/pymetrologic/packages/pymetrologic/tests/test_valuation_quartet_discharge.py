"""Valuation-quartet discharge witnesses (RelMath.Positing.ValuationQuartetDischarge)."""

from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.quartet import Corner
from pymetrologic.valuation_quartet_discharge import (
    ValuationFiberHeytingWitness,
    ValuationFiberNucleusWitness,
    ValuationQuartetDischargeWitness,
    sample_valuation_fiber_cells,
    sample_valuation_fibers,
    valuation_delta,
    valuation_fiber_discharge_witness,
    valuation_fiber_eq,
    valuation_fiber_heyting_witness,
    valuation_fiber_himp,
    valuation_fiber_himp_adjunction,
    valuation_fiber_join_t,
    valuation_fiber_le_t,
    valuation_fiber_meet_t,
    valuation_fiber_nucleus_toward,
    valuation_fiber_nucleus_witness,
    valuation_fiber_pi,
    valuation_quartet_corner_op,
    valuation_quartet_fix_pi_iff,
    valuation_sigma,
)


def test_pointwise_truth_operations_match_lean_formulas() -> None:
    bl = four()
    left, right = sample_valuation_fiber_cells()
    valuation = {left: bl.none, right: bl.false}
    other = {left: bl.true, right: bl.conflict}

    assert valuation_fiber_meet_t(valuation, other) == {
        left: bl.none,
        right: bl.false,
    }
    assert valuation_fiber_join_t(valuation, other) == {
        left: bl.true,
        right: bl.conflict,
    }
    assert valuation_fiber_himp(valuation, other) == {
        left: bl.true,
        right: bl.true,
    }
    assert valuation_fiber_le_t(valuation, valuation_fiber_join_t(valuation, other))


def test_sigma_delta_and_pi_are_the_concrete_truth_closures() -> None:
    bl = four()
    left, right = sample_valuation_fiber_cells()
    valuation = {left: bl.none, right: bl.false}

    assert valuation_sigma(valuation) == {left: bl.true, right: bl.true}
    assert valuation_delta(valuation) == {left: bl.true, right: bl.conflict}
    assert valuation_fiber_pi(valuation) == valuation_sigma(valuation_delta(valuation))
    assert valuation_fiber_eq(
        valuation_sigma(valuation),
        valuation_fiber_nucleus_toward(bl.true, valuation),
    )
    assert valuation_fiber_eq(
        valuation_delta(valuation),
        valuation_fiber_nucleus_toward(bl.conflict, valuation),
    )


def test_heyting_and_nucleus_witnesses_hold_exhaustively_on_sample_support() -> None:
    samples = sample_valuation_fibers()
    heyting = valuation_fiber_heyting_witness(samples)
    nuclei = valuation_fiber_nucleus_witness(samples)

    assert isinstance(heyting, ValuationFiberHeytingWitness)
    assert isinstance(nuclei, ValuationFiberNucleusWitness)
    assert heyting.holds
    assert nuclei.holds
    assert valuation_fiber_himp_adjunction(samples)


def test_quartet_discharge_bundles_abstract_agreement_claims() -> None:
    witness = valuation_fiber_discharge_witness()

    assert isinstance(witness, ValuationQuartetDischargeWitness)
    assert witness.holds
    assert witness.corners_card
    assert witness.absurd_is_intersection
    assert witness.fix_pi_iff
    assert witness.j1_agrees
    assert witness.j2_agrees
    assert witness.pi_agrees


def test_corner_operators_are_identity_sigma_delta_pi() -> None:
    bl = four()
    left, right = sample_valuation_fiber_cells()
    valuation = {left: bl.true, right: bl.conflict}

    assert valuation_quartet_corner_op(Corner.ABSURD, valuation) == valuation
    assert valuation_quartet_corner_op(Corner.POTENTIAL, valuation) == valuation_sigma(valuation)
    assert valuation_quartet_corner_op(Corner.ACTIVE, valuation) == valuation_delta(valuation)
    assert valuation_quartet_corner_op(Corner.STABLE, valuation) == valuation_fiber_pi(valuation)
    assert valuation_quartet_fix_pi_iff(valuation)


def test_valuation_support_mismatches_are_explicit() -> None:
    bl = four()
    left, right = sample_valuation_fiber_cells()

    with pytest.raises(ValueError, match="same finite cell support"):
        valuation_fiber_meet_t({left: bl.true}, {right: bl.true})
