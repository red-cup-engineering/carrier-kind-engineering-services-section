from __future__ import annotations

from pymetrologic.classification import (
    AperiodicSettling,
    H1Class,
)
from pymetrologic.coclassification import (
    H1Homology,
    co_cl_inv,
    co_classifying_equivalent,
    co_classifying_model_holds,
    co_clinv_aperiodic_witness_nonzero,
    d_spatial,
    d_spatial_inv,
    d_spatial_isomorphism,
    d_spatial_zero,
    dual_cosheaf,
    dual_cosheaf_boolean_dframe,
    mld_refines_coclassifying_equivalence,
)
from pymetrologic.regimes import (
    ClosureRegime,
)


def test_spatial_verdier_duality_is_coordinate_isomorphism() -> None:
    cohomology = H1Class(7)
    homology = H1Homology(-3)

    assert d_spatial(cohomology) == H1Homology(7)
    assert d_spatial_inv(homology) == H1Class(-3)
    assert d_spatial_isomorphism(cohomology, homology) == (True, True)
    assert d_spatial_zero()


def test_dual_cosheaf_carries_coclassifying_invariant() -> None:
    settling = AperiodicSettling(ClosureRegime.aperiodic, H1Class(2))
    cosheaf = dual_cosheaf(frozenset({"left", "right"}), settling)

    assert cosheaf.points == frozenset({"left", "right"})
    assert cosheaf.homology_class == H1Homology(2)
    assert co_cl_inv(settling) == cosheaf.homology_class


def test_dual_cosheaf_boolean_dframe_reads_disjointness_and_covering() -> None:
    universe = frozenset({"a", "b", "c"})

    assert dual_cosheaf_boolean_dframe(universe, frozenset({"a"}), frozenset({"b", "c"})) == (
        True,
        True,
    )
    assert dual_cosheaf_boolean_dframe(universe, frozenset({"a"}), frozenset({"a", "b"})) == (
        False,
        False,
    )
    assert dual_cosheaf_boolean_dframe(universe, frozenset({"a"}), frozenset({"b"})) == (
        True,
        False,
    )


def test_coclassifying_equality_matches_classifying_equality() -> None:
    left = AperiodicSettling(ClosureRegime.aperiodic, H1Class(5))
    same = AperiodicSettling(ClosureRegime.transfinite_bounded, H1Class(5))
    different = AperiodicSettling(ClosureRegime.aperiodic, H1Class(6))

    assert co_classifying_equivalent(left, same)
    assert co_classifying_model_holds(left, same)
    assert not co_classifying_equivalent(left, different)
    assert co_classifying_model_holds(left, different)


def test_aperiodic_witness_has_nonzero_coclassifying_invariant() -> None:
    assert co_clinv_aperiodic_witness_nonzero()


def test_mld_refines_coclassifying_equivalence() -> None:
    left = AperiodicSettling(ClosureRegime.aperiodic, H1Class(9))
    same = AperiodicSettling(ClosureRegime.transfinite_bounded, H1Class(9))
    different = AperiodicSettling(ClosureRegime.aperiodic, H1Class(10))

    assert mld_refines_coclassifying_equivalence(left, same, mld=True)
    assert not mld_refines_coclassifying_equivalence(left, different, mld=True)
    assert mld_refines_coclassifying_equivalence(left, different, mld=False)
