"""Bigraded settling cohomology (RelMath.Cohomology.BigradedSettlingCohomology)."""

from __future__ import annotations

import pytest

from pymetrologic import BL, four
from pymetrologic.associated_sheaf import (
    zero_cochain,
)
from pymetrologic.bigraded_cohomology import (
    BigradedRegime,
    BigradedTruthKnowledgeLESWitness,
    Designation,
    bigraded_refines_h1,
    bigraded_regime_of,
    bigraded_two_row_mapping_cone,
    bigraded_vanishes_above_one,
    classical_gauge_moves,
    designation_to_charge,
    dv,
    dv_zero,
    false_content,
    gauge_fixes_inconsistency,
    gauge_flips_truth,
    inconsistency_content,
    knowledge_section_merge,
    knowledge_section_split,
    negate_bigraded_valuation,
    paraconsistent_gauge_stable,
    trichotomy,
    truth_content,
    truth_knowledge_graded_decomposition,
    truth_knowledge_section_decomposition,
)
from pymetrologic.regimes import (
    ClosureRegime,
)


def sample_valuation() -> dict[str, BL[int]]:
    bl = four()
    return {
        "truth": bl.true,
        "conflict": bl.conflict,
        "false": bl.false,
        "none": bl.none,
    }


def test_designation_grade_is_two_charges_not_a_nat_row() -> None:
    bl = four()

    assert set(Designation) == {Designation.truth, Designation.inconsistency}
    assert designation_to_charge(Designation.truth) == bl.true
    assert designation_to_charge(Designation.inconsistency) == bl.conflict
    assert designation_to_charge(Designation.truth) != designation_to_charge(
        Designation.inconsistency
    )


def test_bigraded_four_point_invariant_and_trichotomy() -> None:
    assert bigraded_regime_of(False, False) == BigradedRegime.trivial
    assert bigraded_regime_of(True, False) == BigradedRegime.consistent
    assert bigraded_regime_of(False, True) == BigradedRegime.paraconsistent
    assert bigraded_regime_of(True, True) == BigradedRegime.mixed

    assert trichotomy(True, False)
    assert trichotomy(False, True)
    assert trichotomy(True, True)
    with pytest.raises(ValueError, match="nontrivial"):
        trichotomy(False, False)


def test_gauge_fixes_inconsistency_and_flips_truth_to_false() -> None:
    valuation = sample_valuation()
    bl = four()
    negated = negate_bigraded_valuation(valuation)

    assert truth_content(valuation)
    assert inconsistency_content(valuation)
    assert false_content(valuation)
    assert negated["truth"] == bl.false
    assert negated["false"] == bl.true
    assert negated["conflict"] == bl.conflict
    assert gauge_fixes_inconsistency(valuation)
    assert gauge_flips_truth(valuation)
    assert classical_gauge_moves(valuation, "truth")

    with pytest.raises(ValueError, match="truth cell"):
        classical_gauge_moves(valuation, "false")


def test_paraconsistent_points_are_gauge_stable() -> None:
    bl = four()
    stable = {"none": bl.none, "conflict": bl.conflict}

    assert paraconsistent_gauge_stable(stable)
    with pytest.raises(ValueError, match="none/conflict"):
        paraconsistent_gauge_stable(sample_valuation())


def test_vertical_differential_is_zero_and_mapping_cone_input_splits() -> None:
    valuation = sample_valuation()
    cochain = {"truth": 7, "conflict": -3, "false": 0, "none": 0}
    cells = tuple(cochain)

    assert dv(valuation, cochain) == zero_cochain(cells)
    assert dv_zero(valuation, cochain)
    assert bigraded_two_row_mapping_cone(valuation, cochain).holds


def test_truth_knowledge_section_decomposition_is_direct_sum() -> None:
    valuation = sample_valuation()
    cochain = {"truth": 7, "conflict": -3, "false": 0, "none": 0}

    truth_part, top_part = knowledge_section_split(valuation, cochain)
    assert truth_part == {"truth": 7, "conflict": 0, "false": 0, "none": 0}
    assert top_part == {"truth": 0, "conflict": -3, "false": 0, "none": 0}
    assert knowledge_section_merge(valuation, truth_part, top_part) == cochain

    witness = truth_knowledge_section_decomposition(valuation, cochain)
    assert isinstance(witness, BigradedTruthKnowledgeLESWitness)
    assert witness.section_decomposition_holds
    assert witness.h1_vanishes
    assert witness.vanishes_above_one
    assert witness.holds

    graded = truth_knowledge_graded_decomposition(valuation, cochain)
    assert graded.holds


def test_truth_knowledge_section_decomposition_validates_support() -> None:
    valuation = sample_valuation()

    with pytest.raises(ValueError, match="knowledge-supported"):
        knowledge_section_split(valuation, {"false": 1})

    with pytest.raises(ValueError, match="truth-supported"):
        knowledge_section_merge(valuation, {"conflict": 1}, {"conflict": 0})

    with pytest.raises(ValueError, match="top-supported"):
        knowledge_section_merge(valuation, {"truth": 1}, {"truth": 1})


def test_bigraded_refinement_is_strict_scott_only() -> None:
    assert not bigraded_vanishes_above_one(1)
    assert bigraded_vanishes_above_one(2)

    strict = bigraded_refines_h1(ClosureRegime.strict)
    scott = bigraded_refines_h1(ClosureRegime.scott)

    assert strict.holds
    assert scott.holds
    assert strict.row_separation
    assert strict.rows_vanish_above_one

    with pytest.raises(ValueError, match="strict or Scott"):
        bigraded_refines_h1(ClosureRegime.aperiodic)
