"""Finite Ramsey shadows for ``RelMath.Order.Ramsey``.

Lean proves the constructive party theorem ``R(3,3) <= 6``: every Boolean
edge-colouring of the complete graph on six vertices contains a monochromatic
triangle.  This module keeps that finite proof executable.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping, Sequence
from dataclasses import dataclass
from itertools import combinations
from typing import Generic, TypeVar

from .colouring import UndirectedEdge, complete_graph_edges

V = TypeVar("V", bound=Hashable)
EdgeColouring = Mapping[UndirectedEdge[V], bool]

__all__ = [
    "EdgeColouring",
    "MonochromaticTriangle",
    "edge_colour",
    "find_mono_triangle",
    "is_mono_triangle",
    "mono_of_three_spokes",
    "ramsey_three_three",
    "ramsey_three_three_holds",
    "three_of_five",
]


@dataclass(frozen=True, slots=True)
class MonochromaticTriangle(Generic[V]):
    """Three distinct vertices whose three connecting edges have one colour."""

    vertices: tuple[V, V, V]
    colour: bool


def edge_colour(colouring: EdgeColouring[V], left: V, right: V) -> bool:
    """Return the colour of the unordered edge ``{left, right}``."""

    if left == right:
        msg = "Ramsey edge colours are only defined between distinct vertices"
        raise ValueError(msg)
    edge = frozenset((left, right))
    try:
        return colouring[edge]
    except KeyError as exc:
        msg = f"missing colour for edge {tuple(edge)!r}"
        raise ValueError(msg) from exc


def is_mono_triangle(colouring: EdgeColouring[V], left: V, middle: V, right: V) -> bool:
    """Return whether ``left``, ``middle``, and ``right`` form a monochromatic triangle."""

    if len({left, middle, right}) != 3:
        return False
    lm = edge_colour(colouring, left, middle)
    lr = edge_colour(colouring, left, right)
    mr = edge_colour(colouring, middle, right)
    return lm == lr == mr


def find_mono_triangle(
    vertices: Sequence[V],
    colouring: EdgeColouring[V],
) -> MonochromaticTriangle[V] | None:
    """Search a finite complete graph colouring for a monochromatic triangle."""

    _validate_unique(vertices)
    _validate_complete_colouring(vertices, colouring)
    for left, middle, right in combinations(vertices, 3):
        colour = edge_colour(colouring, left, middle)
        if colour == edge_colour(colouring, left, right) == edge_colour(colouring, middle, right):
            return MonochromaticTriangle((left, middle, right), colour)
    return None


def three_of_five(values: Sequence[bool]) -> tuple[int, int, int]:
    """Return indices of a constant triple among five Boolean values."""

    if len(values) != 5:
        msg = "three_of_five expects exactly five Boolean values"
        raise ValueError(msg)
    for indices in combinations(range(5), 3):
        left, middle, right = indices
        if values[left] == values[middle] == values[right]:
            return indices
    msg = "five Boolean values must contain a constant triple"
    raise RuntimeError(msg)


def mono_of_three_spokes(
    colouring: EdgeColouring[V],
    center: V,
    spokes: Sequence[V],
) -> MonochromaticTriangle[V]:
    """Construct the monochromatic triangle forced by three equal-coloured spokes."""

    if len(spokes) != 3:
        msg = "mono_of_three_spokes expects exactly three spoke vertices"
        raise ValueError(msg)
    left, middle, right = spokes
    if len({center, left, middle, right}) != 4:
        msg = "center and spokes must be distinct"
        raise ValueError(msg)

    spoke_colour = edge_colour(colouring, center, left)
    if (
        edge_colour(colouring, center, middle) != spoke_colour
        or edge_colour(colouring, center, right) != spoke_colour
    ):
        msg = "all three spokes must have the same colour"
        raise ValueError(msg)

    for first, second in ((left, middle), (middle, right), (left, right)):
        if edge_colour(colouring, first, second) == spoke_colour:
            return MonochromaticTriangle((center, first, second), spoke_colour)
    return MonochromaticTriangle((left, middle, right), not spoke_colour)


def ramsey_three_three(
    vertices: Sequence[V],
    colouring: EdgeColouring[V],
) -> MonochromaticTriangle[V]:
    """Return the constructive ``R(3,3) <= 6`` monochromatic triangle witness."""

    _validate_unique(vertices)
    if len(vertices) != 6:
        msg = "ramsey_three_three expects exactly six vertices"
        raise ValueError(msg)
    _validate_complete_colouring(vertices, colouring)

    center = vertices[0]
    neighbors = tuple(vertices[1:])
    spoke_colours = tuple(edge_colour(colouring, center, vertex) for vertex in neighbors)
    spoke_indices = three_of_five(spoke_colours)
    spokes = tuple(neighbors[index] for index in spoke_indices)
    return mono_of_three_spokes(colouring, center, spokes)


def ramsey_three_three_holds(vertices: Sequence[V], colouring: EdgeColouring[V]) -> bool:
    """Return whether the six-vertex colouring has the Lean-forced triangle."""

    triangle = ramsey_three_three(vertices, colouring)
    left, middle, right = triangle.vertices
    return is_mono_triangle(colouring, left, middle, right)


def _validate_unique(values: Sequence[Hashable]) -> None:
    if len(set(values)) != len(values):
        msg = "vertices must be unique"
        raise ValueError(msg)


def _validate_complete_colouring(vertices: Sequence[V], colouring: EdgeColouring[V]) -> None:
    expected_edges = complete_graph_edges(vertices)
    missing_edges = expected_edges.difference(colouring)
    if missing_edges:
        edge = next(iter(missing_edges))
        msg = f"missing colour for edge {tuple(edge)!r}"
        raise ValueError(msg)
