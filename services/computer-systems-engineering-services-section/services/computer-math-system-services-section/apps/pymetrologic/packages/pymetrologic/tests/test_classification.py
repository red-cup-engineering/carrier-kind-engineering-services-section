from __future__ import annotations

import pytest

from pymetrologic.classification import (
    FLAT_REGIMES,
    AperiodicSettling,
    BaseSettling,
    CohomologicalSettling,
    H1Class,
    LocalDerivability,
    aperiodic_mld_classification_reduction,
    aperiodic_not_trivial,
    aperiodic_witness,
    base_cl_inv,
    base_clinv_of_base_mld,
    base_mld,
    base_mld_derivation,
    base_mld_of_clinv_eq,
    classification_equivalence_holds,
    classification_iff_complete,
    classifying_equivalent,
    clinv_dichotomy,
    coh_equiv_local_derivability,
    cohomological_invariant,
    cohomologically_equivalent,
    common_base_classification,
    equality_local_derivability,
    exists_complete_local_derivability,
    flat_clinv_zero,
    flat_settlings_collapse,
    local_derivability_complete,
    local_derivability_refines_classifying,
    mld_refines_classifying_equivalence,
    trivial_settling,
)
from pymetrologic.regimes import (
    ClosureRegime,
)


def test_flat_regimes_force_zero_classifying_invariant() -> None:
    assert {ClosureRegime.strict, ClosureRegime.scott} == FLAT_REGIMES
    for regime in FLAT_REGIMES:
        flat = AperiodicSettling(regime, H1Class(0))
        assert flat_clinv_zero(flat)

        with pytest.raises(ValueError, match="cl_inv = 0"):
            AperiodicSettling(regime, H1Class(1))


def test_classifying_equivalence_is_equality_of_clinv() -> None:
    left = AperiodicSettling(ClosureRegime.aperiodic, H1Class(2))
    right = AperiodicSettling(ClosureRegime.transfinite_bounded, H1Class(2))
    other = AperiodicSettling(ClosureRegime.aperiodic, H1Class(3))

    assert classifying_equivalent(left, right)
    assert not classifying_equivalent(left, other)


def test_full_cohomological_equivalence_uses_h0_clinv_and_regime() -> None:
    first = CohomologicalSettling(AperiodicSettling(ClosureRegime.aperiodic, H1Class(1)), h0=4)
    same = CohomologicalSettling(AperiodicSettling(ClosureRegime.aperiodic, H1Class(1)), h0=4)
    different_h0 = CohomologicalSettling(
        AperiodicSettling(ClosureRegime.aperiodic, H1Class(1)),
        h0=5,
    )

    assert cohomological_invariant(first) == (4, H1Class(1), ClosureRegime.aperiodic)
    assert cohomologically_equivalent(first, same)
    assert not cohomologically_equivalent(first, different_h0)

    with pytest.raises(ValueError, match="h0"):
        CohomologicalSettling(AperiodicSettling(ClosureRegime.aperiodic), h0=-1)


def test_flat_settlings_collapse_and_aperiodic_witness_does_not() -> None:
    strict = AperiodicSettling(ClosureRegime.strict)
    scott = AperiodicSettling(ClosureRegime.scott)

    assert flat_settlings_collapse(strict, scott)
    assert trivial_settling().base == strict
    assert aperiodic_witness().base.cl_inv == H1Class(1)
    assert aperiodic_not_trivial()
    assert clinv_dichotomy() == (True, True)


def test_mld_refinement_requires_preserved_classifying_invariant() -> None:
    left = AperiodicSettling(ClosureRegime.aperiodic, H1Class(7))
    same = AperiodicSettling(ClosureRegime.transfinite_bounded, H1Class(7))
    different = AperiodicSettling(ClosureRegime.aperiodic, H1Class(8))

    assert mld_refines_classifying_equivalence(left, same, mld=True)
    assert not mld_refines_classifying_equivalence(left, different, mld=True)
    assert mld_refines_classifying_equivalence(left, different, mld=False)


def test_flat_clinv_zero_rejects_nonflat_regimes() -> None:
    with pytest.raises(ValueError, match="strict or Scott"):
        flat_clinv_zero(AperiodicSettling(ClosureRegime.aperiodic, H1Class(0)))


def test_classification_reduction_is_exactly_completeness() -> None:
    left = AperiodicSettling(ClosureRegime.aperiodic, H1Class(4))
    same_class = AperiodicSettling(ClosureRegime.transfinite_bounded, H1Class(4))
    different_class = AperiodicSettling(ClosureRegime.aperiodic, H1Class(5))
    samples = [(left, left), (left, same_class), (left, different_class)]

    equality_mld = equality_local_derivability()
    assert local_derivability_refines_classifying(equality_mld, samples)
    assert not local_derivability_complete(equality_mld, samples)
    assert not classification_equivalence_holds(equality_mld, samples)
    assert classification_iff_complete(equality_mld, samples)

    coarsest = coh_equiv_local_derivability()
    assert local_derivability_complete(coarsest, samples)
    assert classification_equivalence_holds(coarsest, samples)
    assert exists_complete_local_derivability(samples)

    witness = aperiodic_mld_classification_reduction(equality_mld, samples)
    assert witness.classification_iff_complete
    assert witness.complete_structure_exists


def test_classification_reduction_rejects_non_refining_relations() -> None:
    left = AperiodicSettling(ClosureRegime.aperiodic, H1Class(1))
    right = AperiodicSettling(ClosureRegime.aperiodic, H1Class(2))
    invalid = LocalDerivability("invalid", lambda _left, _right: True)

    with pytest.raises(ValueError, match="preserve cl_inv"):
        local_derivability_complete(invalid, [(left, right)])


def test_common_base_classification_is_firing_pattern_equality() -> None:
    first = BaseSettling((0, 2, 5))
    same = BaseSettling((0, 2, 5))
    different = BaseSettling((0, 3, 5))

    assert base_cl_inv(first) == (0, 2, 5)
    assert base_mld(first, same)
    assert not base_mld(first, different)
    assert base_clinv_of_base_mld(first, same)
    assert base_mld_derivation(first, same).source == first
    assert base_mld_of_clinv_eq(first, same).target == same

    with pytest.raises(ValueError, match="equal firing-pattern"):
        base_mld_of_clinv_eq(first, different)
    with pytest.raises(ValueError, match="common-base derivation"):
        base_mld_derivation(first, different)
    with pytest.raises(ValueError, match="natural"):
        BaseSettling((0, -1))

    witness = common_base_classification([first, same, different])
    assert witness.reflexive
    assert witness.symmetric
    assert witness.transitive
    assert witness.mld_iff_clinv
