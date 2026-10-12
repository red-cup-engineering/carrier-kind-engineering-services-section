"""readouts.py: every wrapper agrees with the corpus call it wraps.

This is a naming layer — the tests exist to lock down that agreement, not to
re-prove corpus math (that is already proven by the modules being wrapped).
"""

from __future__ import annotations

from pymetrologic.calculus.consistency import (
    conflict_map,
    conflicted_cells,
    consistency_radius,
    filtration,
    is_consistent,
)
from pymetrologic.calculus.examples import sensor_fusion_sheaf, triangle_sheaf
from pymetrologic.calculus.sections import settle_assignment
from pymetrologic.coordination import CoverNerve, cover_nerve_from_edges
from pymetrologic.quartet import Corner
from pymetrologic.readouts import (
    Allocation,
    Conflicts,
    CoordinationCost,
    FourValued,
    Obstruction,
    Settled,
    allocate_under_budget,
    conflicts,
    coordination_cost,
    coordination_cost_from_edges,
    describe,
    is_feasible,
    is_told_both,
    is_told_false,
    is_told_none,
    is_told_true,
    residual,
    settle,
    severity_filtration,
    told_both,
    told_false,
    told_none,
    told_true,
    total_benefit,
    total_cost,
)

# --------------------------------------------------------------------------- #
# FourValued
# --------------------------------------------------------------------------- #


def test_four_valued_is_a_bare_alias_for_corner() -> None:
    assert FourValued is Corner


def test_told_constructors_match_corpus_corners() -> None:
    assert told_none() is Corner.ABSURD
    assert told_true() is Corner.POTENTIAL
    assert told_false() is Corner.ACTIVE
    assert told_both() is Corner.STABLE


def test_told_predicates_are_exact_and_mutually_exclusive() -> None:
    for value in Corner:
        flags = [
            is_told_none(value),
            is_told_true(value),
            is_told_false(value),
            is_told_both(value),
        ]
        assert sum(flags) == 1


def test_describe_is_distinct_and_readable_per_corner() -> None:
    descriptions = {describe(c) for c in Corner}
    assert len(descriptions) == 4
    for c in Corner:
        assert c.value in describe(c)


def test_describe_never_uses_a_bare_h1_style_name() -> None:
    for c in Corner:
        text = describe(c).lower()
        assert "h1" not in text


# --------------------------------------------------------------------------- #
# settle — agrees with settle_assignment + is_consistent
# --------------------------------------------------------------------------- #


def test_settle_agrees_with_settle_assignment_on_the_triangle_example() -> None:
    gs = triangle_sheaf("0", "1", "0")
    sheaf, assignment = gs.to_predication_sheaf()

    expected_sections, expected_iterations = settle_assignment(sheaf, assignment)
    result = settle(sheaf, assignment)

    assert isinstance(result, Settled)
    assert result.sections == expected_sections
    assert result.iterations == expected_iterations
    assert result.consistent == is_consistent(sheaf, expected_sections)


def test_settle_agrees_with_settle_assignment_on_the_sensor_example() -> None:
    sheaf, assignment = sensor_fusion_sheaf({"u": (0.9, 0.0), "v": (0.0, 0.8)}, [("u", "v")])

    expected_sections, expected_iterations = settle_assignment(sheaf, assignment)
    result = settle(sheaf, assignment)

    assert result.sections == expected_sections
    assert result.iterations == expected_iterations
    assert result.consistent == is_consistent(sheaf, expected_sections)


def test_settled_verdict_never_claims_a_proof_of_coordination_freedom() -> None:
    clean_sheaf, clean_assignment = triangle_sheaf("0", "0", "0").to_predication_sheaf()
    clean = settle(clean_sheaf, clean_assignment)
    assert clean.consistent
    verdict = clean.verdict("the triangle model")
    assert "no obstruction found" in verdict
    assert "provably" not in verdict.lower()
    assert "coordination-free" not in verdict.lower()

    dirty_sheaf, dirty_assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    dirty = settle(dirty_sheaf, dirty_assignment)
    assert not dirty.consistent
    assert "located" in dirty.verdict()


def test_settle_is_invariant_to_assignment_dict_key_order() -> None:
    # A stranger should never be able to change the answer by reordering how
    # they wrote out their claims. Real posit-order independence (the proven
    # knowledge-join fact) is exercised on fusion.BeliefBoard; here we lock
    # down that the readouts.settle() wrapper itself is order-blind to how
    # its caller happens to have built the assignment mapping.
    sheaf, assignment = sensor_fusion_sheaf(
        {"u": (0.9, 0.0), "v": (0.0, 0.8), "w": (0.5, 0.0)},
        [("u", "v"), ("v", "w")],
    )
    forward = dict(assignment)
    backward = dict(reversed(list(assignment.items())))
    assert list(forward) != list(backward)  # actually exercises different order

    result_forward = settle(sheaf, forward)
    result_backward = settle(sheaf, backward)
    assert result_forward.sections == result_backward.sections
    assert result_forward.consistent == result_backward.consistent


# --------------------------------------------------------------------------- #
# conflicts / severity_filtration
# --------------------------------------------------------------------------- #


def test_conflicts_agrees_with_conflict_map_and_consistency_radius() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled_sections, _ = settle_assignment(sheaf, assignment)

    result = conflicts(sheaf, settled_sections)

    assert isinstance(result, Conflicts)
    assert result.located == conflict_map(sheaf, settled_sections)
    assert result.radius == consistency_radius(sheaf, settled_sections)
    assert result.cells == conflicted_cells(sheaf, settled_sections)
    assert bool(result) is True


def test_conflicts_accepts_a_settled_result_or_a_raw_dict_identically() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled = settle(sheaf, assignment)

    from_settled = conflicts(sheaf, settled)
    from_dict = conflicts(sheaf, settled.sections)
    assert from_settled == from_dict


def test_conflicts_is_empty_and_falsy_for_a_clean_settle() -> None:
    sheaf, assignment = triangle_sheaf("0", "0", "0").to_predication_sheaf()
    settled = settle(sheaf, assignment)
    result = conflicts(sheaf, settled)
    assert not result
    assert result.located == {}


def test_severity_filtration_agrees_with_consistency_filtration() -> None:
    sheaf, assignment = sensor_fusion_sheaf({"u": (0.9, 0.0), "v": (0.0, 0.8)}, [("u", "v")])
    settled_sections, _ = settle_assignment(sheaf, assignment)

    assert severity_filtration(sheaf, settled_sections) == filtration(sheaf, settled_sections)

    settled = settle(sheaf, assignment)
    assert severity_filtration(sheaf, settled) == filtration(sheaf, settled_sections)


# --------------------------------------------------------------------------- #
# coordination_cost — never named "h1"
# --------------------------------------------------------------------------- #


def test_coordination_cost_agrees_with_cover_nerve_fields_on_a_cycle() -> None:
    vertices = ("a", "b", "c")
    cycle = frozenset({frozenset({"a", "b"}), frozenset({"b", "c"}), frozenset({"c", "a"})})
    nerve = cover_nerve_from_edges(vertices, cycle)

    result = coordination_cost(nerve)

    assert isinstance(result, CoordinationCost)
    assert result.cycle_rank == nerve.H1rank == 1
    assert result.is_forest == nerve.CoordinationFree is False
    assert result.components == nerve.components == 1


def test_coordination_cost_agrees_with_cover_nerve_fields_on_a_tree() -> None:
    edges = frozenset({frozenset({"a", "b"}), frozenset({"b", "c"}), frozenset({"c", "d"})})
    nerve = cover_nerve_from_edges(("a", "b", "c", "d"), edges)

    result = coordination_cost(nerve)
    assert result.cycle_rank == 0
    assert result.is_forest is True
    assert result.components == 1


def test_coordination_cost_from_edges_matches_manual_nerve_construction() -> None:
    vertices = ("a", "b", "c", "d")
    edges = frozenset(
        {
            frozenset({"a", "b"}),
            frozenset({"b", "c"}),
            frozenset({"c", "d"}),
            frozenset({"d", "a"}),
            frozenset({"a", "c"}),
        }
    )
    expected = coordination_cost(cover_nerve_from_edges(vertices, edges))
    assert coordination_cost_from_edges(vertices, edges) == expected


def test_coordination_cost_never_exposes_a_bare_h1_attribute() -> None:
    nerve = CoverNerve(entities=5, cells=4, components=2)
    result = coordination_cost(nerve)
    for attr in vars(result):
        assert attr not in {"h1", "H1", "h1rank", "H1rank"}


# --------------------------------------------------------------------------- #
# allocate_under_budget — extension, feasibility-only guarantees
# --------------------------------------------------------------------------- #


def test_allocation_respects_the_budget() -> None:
    universe = [
        Obstruction("a", cost=3, benefit=5),
        Obstruction("b", cost=4, benefit=4),
        Obstruction("c", cost=2, benefit=3),
    ]
    result = allocate_under_budget(universe, budget=5)

    assert isinstance(result, Allocation)
    assert is_feasible(5, result.selected)
    assert result.total_cost == total_cost(result.selected)
    assert result.total_benefit == total_benefit(result.selected)
    assert result.residual == residual(universe, result.selected)
    assert result.total_cost <= 5


def test_allocation_of_empty_universe_is_empty_and_free() -> None:
    result = allocate_under_budget([], budget=10)
    assert result.selected == ()
    assert result.total_cost == 0
    assert result.residual == 0


def test_allocation_never_overflows_budget_across_many_cases() -> None:
    import random

    rng = random.Random(11)
    for _ in range(25):
        universe = [
            Obstruction(f"o{i}", cost=rng.randint(0, 10), benefit=rng.randint(0, 10))
            for i in range(rng.randint(0, 8))
        ]
        budget = rng.randint(0, 20)
        result = allocate_under_budget(universe, budget)
        assert result.total_cost <= budget
        assert is_feasible(budget, result.selected)


def test_obstruction_rejects_negative_cost_or_benefit() -> None:
    import pytest

    with pytest.raises(ValueError, match="non-negative"):
        Obstruction("bad", cost=-1, benefit=0)
    with pytest.raises(ValueError, match="non-negative"):
        Obstruction("bad", cost=0, benefit=-1)
