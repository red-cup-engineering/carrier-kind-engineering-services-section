"""Lorentzian causal settling — transitive closure + light cones (RelMath.Lorentzian.Causal)."""

from __future__ import annotations

import pytest

from pymetrologic import (
    CausalMicrosupportWitness,
    ClosureRegime,
    MicrolocalSupportWitness,
    alexandrov_interval,
    boolean_cone_report,
    boolean_cone_report_consistent,
    boolean_cone_report_reachable_iff,
    causal_closure,
    causal_closure_idempotent,
    causal_closure_inflationary,
    causal_closure_least_harmonic,
    causal_closure_monotone,
    causal_diffusion_gap_one,
    causal_laplacian,
    causal_laplacian_theory,
    causal_microsupport,
    causal_microsupport_unifies,
    causal_net_region_theory,
    causal_propagation_is_closure,
    causal_section_closure,
    causally_precedes,
    charged_future,
    closed_diamond_mono,
    confined_to,
    diamond_region,
    four,
    full_light_observation_reconstructs_causal_order,
    full_observers,
    future,
    future_closed_region,
    future_signature,
    future_signature_antimono,
    h1_classifies_singularity_regime,
    harmonic_iff_future_closed,
    is_future_closed_section,
    is_harmonic_section,
    merge_reports,
    merge_reports_comm,
    merge_reports_infl_left,
    microlocal_support_shadow,
    microsupport_eq_union_cones,
    microsupport_excludes_spacelike,
    microsupport_excludes_spacelike_region,
    microsupport_idempotent,
    microsupport_point,
    microsupport_upward_closed,
    observer_family_separating,
    paraconsistent_cone_reports,
    past,
    past_signature,
    past_signature_mono,
    region_le,
    region_le_refl,
    region_le_trans,
    reports_inconsistent,
    reports_reachable,
    reports_unknown,
    same_observation_signature,
    singular_support,
    smooth_flow,
    spacelike_microsupport_independent,
    spacelike_regions,
    spacelike_regions_disjoint,
    spacelike_regions_symmetric,
)

EVENTS = ("a", "b", "c", "d")
# Seed adjacency a≺b≺c, plus a≺d (a diamond-ish DAG, no d≺c).
SEED = frozenset({("a", "b"), ("b", "c"), ("a", "d")})


def test_transitive_closure_adds_indirect_links() -> None:
    order = causal_closure(EVENTS, SEED)
    assert causally_precedes(order, "a", "c")  # a≺b≺c forces a≺c
    assert ("a", "c") not in SEED  # was indirect
    # spacelike pairs stay unrelated: c and d are incomparable.
    assert not causally_precedes(order, "c", "d")
    assert not causally_precedes(order, "d", "c")


def test_no_closed_timelike_curves() -> None:
    order = causal_closure(EVENTS, SEED)
    assert all((x, x) not in order for x in EVENTS)  # acyclic = antisymmetric


def test_light_cones() -> None:
    order = causal_closure(EVENTS, SEED)
    assert future(EVENTS, order, "a") == frozenset({"b", "c", "d"})
    assert past(EVENTS, order, "c") == frozenset({"a", "b"})


def test_alexandrov_interval_is_the_causal_diamond() -> None:
    order = causal_closure(EVENTS, SEED)
    # [a, c] = {a, b, c}: events between a and c inclusive (d is off this chain).
    assert alexandrov_interval(EVENTS, order, "a", "c") == frozenset({"a", "b", "c"})


def test_causal_laplacian_future_closes_sections() -> None:
    order = causal_closure(EVENTS, SEED)

    assert causal_section_closure(EVENTS, order, {"b"}) == frozenset({"b", "c"})
    assert causal_laplacian(EVENTS, order, {"b"}) == frozenset({"b", "c"})
    assert causal_section_closure(EVENTS, order, {"c", "d"}) == frozenset({"c", "d"})


def test_causal_laplacian_closure_laws() -> None:
    order = causal_closure(EVENTS, SEED)
    seed = frozenset({"b"})
    harmonic = frozenset({"b", "c"})

    assert causal_closure_inflationary(EVENTS, order, seed)
    assert causal_closure_monotone(EVENTS, order, seed, {"a", "b"})
    assert causal_closure_idempotent(EVENTS, order, seed)
    assert causal_diffusion_gap_one(EVENTS, order, seed)
    assert causal_closure_least_harmonic(EVENTS, order, seed, harmonic)


def test_microlocal_support_shadow_reuses_causal_propagation_and_h1_regimes() -> None:
    order = causal_closure(EVENTS, SEED)

    assert singular_support((False, False, True, False)) == frozenset({2})
    assert smooth_flow((False, False, False))
    assert not smooth_flow((False, True, False))

    propagation = causal_propagation_is_closure(EVENTS, order)
    assert propagation.holds
    assert h1_classifies_singularity_regime(ClosureRegime.strict) == (True, True)
    assert h1_classifies_singularity_regime(ClosureRegime.aperiodic) == (True, True)

    witness = microlocal_support_shadow(EVENTS, order, ClosureRegime.strict)
    assert isinstance(witness, MicrolocalSupportWitness)
    assert witness.empty_singular_support
    assert witness.propagation_closure.holds
    assert witness.h1_vanishing_classifies_flat
    assert witness.h1_nonvanishing_classifies_curved
    assert witness.holds

    singular_witness = microlocal_support_shadow(
        EVENTS,
        order,
        ClosureRegime.aperiodic,
        (False, True),
    )
    assert not singular_witness.empty_singular_support
    assert singular_witness.h1_vanishing_classifies_flat
    assert singular_witness.h1_nonvanishing_classifies_curved
    assert not singular_witness.holds


def test_causal_microsupport_is_future_cone_closure() -> None:
    order = causal_closure(EVENTS, SEED)

    assert causal_microsupport(EVENTS, order, {"b"}) == frozenset({"b", "c"})
    assert microsupport_point(EVENTS, order, "a") == frozenset({"a", "b", "c", "d"})
    assert microsupport_eq_union_cones(EVENTS, order, {"a", "d"})
    assert microsupport_upward_closed(EVENTS, order, {"a"})
    assert microsupport_idempotent(EVENTS, order, {"a"})
    assert confined_to(EVENTS, order, {"b"}, {"b", "c"})
    assert not confined_to(EVENTS, order, {"a"}, {"a", "b", "c"})


def test_causal_microsupport_excludes_spacelike_targets() -> None:
    order = causal_closure(EVENTS, SEED)

    assert microsupport_excludes_spacelike(EVENTS, order, "c", "d")
    assert microsupport_excludes_spacelike(EVENTS, order, "d", "c")
    assert spacelike_microsupport_independent(EVENTS, order, "c", "d")
    assert microsupport_excludes_spacelike_region(EVENTS, order, {"c"}, "d")

    with pytest.raises(ValueError, match="spacelike"):
        microsupport_excludes_spacelike(EVENTS, order, "a", "c")


def test_causal_microsupport_unifies_cone_propagation_and_locality() -> None:
    order = causal_closure(EVENTS, SEED)
    witness = causal_microsupport_unifies(EVENTS, order)

    assert isinstance(witness, CausalMicrosupportWitness)
    assert witness.point_sources_are_closed_future
    assert witness.microsupports_are_upward_closed
    assert witness.spacelike_points_are_independent
    assert witness.microsupports_are_idempotent
    assert witness.holds


def test_harmonic_sections_are_future_closed_sections() -> None:
    order = causal_closure(EVENTS, SEED)

    assert is_future_closed_section(EVENTS, order, {"b", "c"})
    assert is_harmonic_section(EVENTS, order, {"b", "c"})
    assert harmonic_iff_future_closed(EVENTS, order, {"b", "c"})

    assert not is_future_closed_section(EVENTS, order, {"b"})
    assert not is_harmonic_section(EVENTS, order, {"b"})
    assert harmonic_iff_future_closed(EVENTS, order, {"b"})

    witness = causal_laplacian_theory(EVENTS, order)
    assert witness.holds


def test_full_light_observation_signatures_recover_causal_order() -> None:
    order = causal_closure(EVENTS, SEED)
    observers = full_observers(EVENTS)

    assert past_signature(EVENTS, order, observers, "c") == frozenset({"a", "b", "c"})
    assert future_signature(EVENTS, order, observers, "a") == frozenset({"a", "b", "c", "d"})

    for left in EVENTS:
        for right in EVENTS:
            causal_le = left == right or (left, right) in order
            assert (left in past_signature(EVENTS, order, observers, right)) == causal_le
            assert (right in future_signature(EVENTS, order, observers, left)) == causal_le

    assert observer_family_separating(EVENTS, order, observers)
    assert not same_observation_signature(EVENTS, order, observers, "c", "d")


def test_light_observation_monotonicity_and_separation_boundary() -> None:
    order = causal_closure(EVENTS, SEED)
    observers = full_observers(EVENTS)

    assert past_signature_mono(EVENTS, order, observers, "a", "c")
    assert future_signature_antimono(EVENTS, order, observers, "a", "c")
    assert not observer_family_separating(EVENTS, order, {"a"})

    witness = full_light_observation_reconstructs_causal_order(EVENTS, order)
    assert witness.holds
    assert witness.full_observers_separate


def test_paraconsistent_cone_reports_merge_four_valued_causal_knowledge() -> None:
    order = causal_closure(EVENTS, SEED)
    bl = four()
    boolean_report = boolean_cone_report(EVENTS, order)
    conflict_report = {("c", "d"): bl.conflict, ("d", "c"): bl.false}

    assert boolean_cone_report_consistent(EVENTS, order)
    assert boolean_cone_report_reachable_iff(EVENTS, order)
    assert reports_reachable(boolean_report, "a", "c")
    assert reports_unknown(boolean_report, "c", "d")
    assert charged_future(EVENTS, boolean_report, "a") == {
        "a": bl.none,
        "b": bl.true,
        "c": bl.true,
        "d": bl.true,
    }

    merged = merge_reports(EVENTS, boolean_report, conflict_report)
    assert reports_inconsistent(conflict_report, "c", "d")
    assert merged[("c", "d")] == bl.conflict
    assert merged[("d", "c")] == bl.false
    assert merge_reports_infl_left(EVENTS, boolean_report, conflict_report)
    assert merge_reports_comm(EVENTS, boolean_report, conflict_report)

    witness = paraconsistent_cone_reports(EVENTS, order, (boolean_report, conflict_report))
    assert witness.holds
    assert witness.merge_accumulates_left


def test_causal_regions_form_inclusion_preorder() -> None:
    assert region_le(EVENTS, {"b"}, {"b", "c"})
    assert region_le_refl(EVENTS, {"a", "d"})
    assert region_le_trans(EVENTS, {"b"}, {"b", "c"}, {"b", "c", "d"})


def test_spacelike_regions_are_symmetric_and_disjoint() -> None:
    order = causal_closure(EVENTS, SEED)

    assert spacelike_regions(EVENTS, order, {"c"}, {"d"})
    assert spacelike_regions_symmetric(EVENTS, order, {"c"}, {"d"})
    assert spacelike_regions_disjoint(EVENTS, order, {"c"}, {"d"})
    assert not spacelike_regions(EVENTS, order, {"b"}, {"c"})


def test_closed_diamond_regions_are_monotone_in_endpoints() -> None:
    order = causal_closure(EVENTS, SEED)

    assert diamond_region(EVENTS, order, "b", "c") == frozenset({"b", "c"})
    assert closed_diamond_mono(EVENTS, order, "b", "c", "a", "c")
    assert diamond_region(EVENTS, order, "b", "c") <= diamond_region(EVENTS, order, "a", "c")
    assert future_closed_region(EVENTS, order, {"b", "c"})

    witness = causal_net_region_theory(EVENTS, order)
    assert witness.holds
    assert witness.closed_diamonds_monotone
