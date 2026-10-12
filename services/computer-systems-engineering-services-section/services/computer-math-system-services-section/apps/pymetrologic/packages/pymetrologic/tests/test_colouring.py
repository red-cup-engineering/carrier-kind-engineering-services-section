from __future__ import annotations

import pytest

from pymetrologic.colouring import (
    FOUR_CHARGE_PALETTE,
    chromatic_number,
    complete_graph_edges,
    graph_homomorphism_to_complete,
    is_colorable,
    is_proper_colouring,
    k4_requires_four,
    minimum_colourings,
    proper_complete_graph_colouring_is_injective,
)
from pymetrologic.entropy import (
    complete_graph_colouring_count,
    full_shift_entropy,
    nat_log,
    proper_edge_colourings,
    proper_triangle_colourings,
)


def test_proper_colouring_is_graph_hom_to_complete_colour_shift() -> None:
    vertices = ("u", "v")
    edges = complete_graph_edges(vertices)
    proper = {"u": "red", "v": "blue"}
    improper = {"u": "red", "v": "red"}

    assert is_proper_colouring(edges, proper)
    assert graph_homomorphism_to_complete(edges, proper)
    assert not is_proper_colouring(edges, improper)
    assert not graph_homomorphism_to_complete(edges, improper)


def test_complete_graph_colourings_are_injective() -> None:
    vertices = ("a", "b", "c")
    proper = {"a": 0, "b": 1, "c": 2}
    improper = {"a": 0, "b": 1, "c": 1}

    assert proper_complete_graph_colouring_is_injective(vertices, proper)
    assert not proper_complete_graph_colouring_is_injective(vertices, improper)


def test_complete_graph_chromatic_ladder() -> None:
    k2 = ("a", "b")
    k3 = ("a", "b", "c")

    assert chromatic_number(k2, complete_graph_edges(k2)) == 2
    assert chromatic_number(k3, complete_graph_edges(k3)) == 3
    assert not is_colorable(k3, complete_graph_edges(k3), (0, 1))
    assert is_colorable(k3, complete_graph_edges(k3), (0, 1, 2))


def test_k4_requires_the_four_charge_palette() -> None:
    assert chromatic_number(FOUR_CHARGE_PALETTE, complete_graph_edges(FOUR_CHARGE_PALETTE)) == 4
    assert k4_requires_four()

    colourings = minimum_colourings(
        FOUR_CHARGE_PALETTE,
        complete_graph_edges(FOUR_CHARGE_PALETTE),
        FOUR_CHARGE_PALETTE,
        limit=1,
    )
    assert len(set(colourings[0].values())) == 4


def test_colouring_entropy_counts_are_information_shadows() -> None:
    assert nat_log(2, 8) == 3
    assert len(proper_edge_colourings()) == 2
    assert full_shift_entropy(2) == 1
    assert len(proper_triangle_colourings()) == 6
    assert complete_graph_colouring_count(3, 3) == 6


def test_colouring_validation() -> None:
    with pytest.raises(ValueError, match="unique"):
        complete_graph_edges(("a", "a"))
    with pytest.raises(ValueError, match="exactly two"):
        is_proper_colouring(frozenset({frozenset({"a"})}), {"a": 0})
    with pytest.raises(ValueError, match="limit"):
        minimum_colourings(("a",), frozenset(), (0,), limit=0)
