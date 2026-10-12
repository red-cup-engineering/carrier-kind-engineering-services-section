"""Coordination cohomology (RelMath.Cohomology.CoordinationCohomology)."""

from __future__ import annotations

import pytest

from pymetrologic.coordination import (
    CoverNerve,
    coordination_cost,
    coordinationFree_iff_forest,
    cover_nerve_from_edges,
    h1_vanishes_iff_forest,
    h1rank_is_coordination_cost,
    laplacian_kernel_cokernel,
    tree_coordination_free,
)


def test_cover_nerve_computes_h0_and_h1_cycle_rank() -> None:
    vertices = ("a", "b", "c")
    cycle = frozenset(
        {
            frozenset({"a", "b"}),
            frozenset({"b", "c"}),
            frozenset({"c", "a"}),
        }
    )
    nerve = cover_nerve_from_edges(vertices, cycle)

    assert nerve.entities == 3
    assert nerve.cells == 3
    assert nerve.components == 1
    assert nerve.H0rank == 1
    assert nerve.H1rank == 1
    assert not nerve.CoordinationFree
    assert not nerve.forest_identity


def test_h1_vanishes_iff_forest_for_tree_and_disconnected_forest() -> None:
    tree_edges = frozenset(
        {
            frozenset({"a", "b"}),
            frozenset({"b", "c"}),
            frozenset({"c", "d"}),
        }
    )
    tree = cover_nerve_from_edges(("a", "b", "c", "d"), tree_edges)

    forest_edges = frozenset({frozenset({"a", "b"}), frozenset({"c", "d"})})
    forest = cover_nerve_from_edges(("a", "b", "c", "d"), forest_edges)

    assert tree.H1rank == 0
    assert tree.forest_identity
    assert h1_vanishes_iff_forest(tree)
    assert coordinationFree_iff_forest(tree)
    assert tree_coordination_free(("a", "b", "c", "d"), tree_edges)

    assert forest.H0rank == 2
    assert forest.H1rank == 0
    assert forest.forest_identity
    assert h1_vanishes_iff_forest(forest)
    assert coordinationFree_iff_forest(forest)


def test_h1_rank_is_coordination_cost() -> None:
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
    nerve = cover_nerve_from_edges(vertices, edges)

    assert nerve.incidence_rank == 3
    assert nerve.H1rank == 2
    assert coordination_cost(nerve) == 2
    assert h1rank_is_coordination_cost(nerve)


def test_laplacian_kernel_cokernel_ranks_match_h0_and_h1() -> None:
    nerve = CoverNerve(entities=5, cells=4, components=2)
    witness = laplacian_kernel_cokernel(nerve)

    assert witness.incidence_rank == 3
    assert witness.h0_kernel_rank == 2
    assert witness.h1_cokernel_rank == 1
    assert witness.holds


def test_cover_nerve_rejects_invalid_union_find_counts_and_edges() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        CoverNerve(entities=-1, cells=0, components=0)

    with pytest.raises(ValueError, match="components"):
        CoverNerve(entities=1, cells=0, components=2)

    with pytest.raises(ValueError, match="spanning-forest"):
        CoverNerve(entities=3, cells=0, components=1)

    with pytest.raises(ValueError, match="exactly two"):
        cover_nerve_from_edges(("a", "b"), (frozenset({"a"}),))

    with pytest.raises(ValueError, match="unknown entity"):
        cover_nerve_from_edges(("a", "b"), (frozenset({"a", "c"}),))


def test_non_tree_is_not_certified_coordination_free_by_tree_witness() -> None:
    cycle = frozenset(
        {
            frozenset({"a", "b"}),
            frozenset({"b", "c"}),
            frozenset({"c", "a"}),
        }
    )

    assert not tree_coordination_free(("a", "b", "c"), cycle)
