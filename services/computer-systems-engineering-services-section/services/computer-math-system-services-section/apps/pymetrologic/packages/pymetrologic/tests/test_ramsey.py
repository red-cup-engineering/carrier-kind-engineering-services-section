from __future__ import annotations

from collections.abc import Hashable
from itertools import product
from typing import TypeVar

import pytest

from pymetrologic.colouring import complete_graph_edges
from pymetrologic.ramsey import (
    EdgeColouring,
    find_mono_triangle,
    is_mono_triangle,
    mono_of_three_spokes,
    ramsey_three_three,
    ramsey_three_three_holds,
    three_of_five,
)

V = TypeVar("V", bound=Hashable)


def _colouring(vertices: tuple[V, ...], true_edges: set[frozenset[V]]) -> EdgeColouring[V]:
    return {edge: edge in true_edges for edge in complete_graph_edges(vertices)}


def test_three_of_five_returns_a_constant_triple_for_every_boolean_word() -> None:
    for values in product((False, True), repeat=5):
        indices = three_of_five(values)
        assert len(set(indices)) == 3
        left, middle, right = indices
        assert values[left] == values[middle] == values[right]


def test_three_equal_spokes_close_through_center_when_inner_edge_matches() -> None:
    vertices = ("z", "p", "q", "r")
    colouring = _colouring(
        vertices,
        {
            frozenset(("z", "p")),
            frozenset(("z", "q")),
            frozenset(("z", "r")),
            frozenset(("p", "q")),
        },
    )

    triangle = mono_of_three_spokes(colouring, "z", ("p", "q", "r"))

    assert triangle.vertices == ("z", "p", "q")
    assert triangle.colour is True
    assert is_mono_triangle(colouring, *triangle.vertices)


def test_three_equal_spokes_force_outer_triangle_when_inner_edges_are_opposite() -> None:
    vertices = ("z", "p", "q", "r")
    colouring = _colouring(
        vertices,
        {frozenset(("z", "p")), frozenset(("z", "q")), frozenset(("z", "r"))},
    )

    triangle = mono_of_three_spokes(colouring, "z", ("p", "q", "r"))

    assert triangle.vertices == ("p", "q", "r")
    assert triangle.colour is False
    assert is_mono_triangle(colouring, *triangle.vertices)


def test_ramsey_three_three_finds_a_monochromatic_triangle_in_every_k6_colouring() -> None:
    vertices = tuple(range(6))
    edges = tuple(complete_graph_edges(vertices))

    for colours in product((False, True), repeat=len(edges)):
        colouring = dict(zip(edges, colours, strict=True))
        triangle = ramsey_three_three(vertices, colouring)
        assert is_mono_triangle(colouring, *triangle.vertices)
        assert ramsey_three_three_holds(vertices, colouring)


def test_find_mono_triangle_detects_absence_on_five_cycle_counterexample() -> None:
    vertices = tuple(range(5))
    cycle_edges = {
        frozenset((0, 1)),
        frozenset((1, 2)),
        frozenset((2, 3)),
        frozenset((3, 4)),
        frozenset((0, 4)),
    }
    colouring = _colouring(vertices, cycle_edges)

    assert find_mono_triangle(vertices, colouring) is None


def test_ramsey_validation() -> None:
    vertices = tuple(range(6))
    colouring = dict.fromkeys(complete_graph_edges(vertices), False)
    missing_edge = next(iter(colouring))
    del colouring[missing_edge]

    with pytest.raises(ValueError, match="exactly five"):
        three_of_five((True, False))
    with pytest.raises(ValueError, match="exactly six"):
        ramsey_three_three(tuple(range(5)), {})
    with pytest.raises(ValueError, match="missing colour"):
        ramsey_three_three(vertices, colouring)
    with pytest.raises(ValueError, match="same colour"):
        mono_of_three_spokes(
            _colouring(("z", "p", "q", "r"), {frozenset(("z", "p"))}),
            "z",
            ("p", "q", "r"),
        )
