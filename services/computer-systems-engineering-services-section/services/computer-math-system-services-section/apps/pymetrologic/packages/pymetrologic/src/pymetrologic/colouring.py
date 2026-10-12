"""Finite graph-colouring shadows for ``RelMath.Order.GraphColoring``.

Lean proves that a proper colouring is exactly a graph homomorphism into the
complete graph on the colour palette, and then computes concrete complete-graph
chromatic numbers: ``K2`` needs two colours, ``K3`` needs three, and ``K4`` forces
all four Belnap charges.  The lab keeps the finite executable part.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping, Sequence
from itertools import combinations, product
from typing import TypeVar

V = TypeVar("V", bound=Hashable)
C = TypeVar("C", bound=Hashable)

UndirectedEdge = frozenset[V]
UndirectedEdges = frozenset[UndirectedEdge[V]]

FOUR_CHARGE_PALETTE = ("bottom", "true", "false", "top")

__all__ = [
    "FOUR_CHARGE_PALETTE",
    "UndirectedEdge",
    "UndirectedEdges",
    "chromatic_number",
    "complete_graph_edges",
    "graph_homomorphism_to_complete",
    "is_colorable",
    "is_proper_colouring",
    "k4_requires_four",
    "minimum_colourings",
    "proper_complete_graph_colouring_is_injective",
]


def complete_graph_edges(vertices: Sequence[V]) -> UndirectedEdges[V]:
    """Return the undirected edge set of the complete graph on ``vertices``."""

    _validate_unique(vertices)
    return frozenset(frozenset(pair) for pair in combinations(vertices, 2))


def is_proper_colouring(edges: UndirectedEdges[V], colouring: Mapping[V, C]) -> bool:
    """Return whether adjacent vertices always receive distinct colours."""

    return all(_edge_colours_differ(edge, colouring) for edge in edges)


def graph_homomorphism_to_complete(edges: UndirectedEdges[V], colouring: Mapping[V, C]) -> bool:
    """Executable form of ``proper colouring iff graph hom to completeGraph C``."""

    return is_proper_colouring(edges, colouring)


def proper_complete_graph_colouring_is_injective(
    vertices: Sequence[V],
    colouring: Mapping[V, C],
) -> bool:
    """Check Lean's lower bound: every proper colouring of ``K_C`` is injective."""

    edges = complete_graph_edges(vertices)
    if not is_proper_colouring(edges, colouring):
        return False
    return len({colouring[vertex] for vertex in vertices}) == len(vertices)


def is_colorable(vertices: Sequence[V], edges: UndirectedEdges[V], colours: Sequence[C]) -> bool:
    """Return whether a finite graph admits a proper colouring by ``colours``."""

    return bool(minimum_colourings(vertices, edges, colours, limit=1))


def minimum_colourings(
    vertices: Sequence[V],
    edges: UndirectedEdges[V],
    colours: Sequence[C],
    *,
    limit: int | None = None,
) -> tuple[dict[V, C], ...]:
    """Enumerate proper colourings over ``colours``, optionally stopping at ``limit``."""

    _validate_unique(vertices)
    _validate_unique(colours)
    if limit is not None and limit < 1:
        msg = "limit must be positive when supplied"
        raise ValueError(msg)

    results: list[dict[V, C]] = []
    for assignment in product(colours, repeat=len(vertices)):
        colouring = dict(zip(vertices, assignment, strict=True))
        if is_proper_colouring(edges, colouring):
            results.append(colouring)
            if limit is not None and len(results) >= limit:
                break
    return tuple(results)


def chromatic_number(vertices: Sequence[V], edges: UndirectedEdges[V]) -> int:
    """Brute-force the finite chromatic number of a small graph."""

    _validate_unique(vertices)
    if not vertices:
        return 0
    palette = tuple(range(1, len(vertices) + 1))
    for size in range(1, len(vertices) + 1):
        if is_colorable(vertices, edges, palette[:size]):
            return size
    msg = "finite graph should be colorable by one colour per vertex"
    raise RuntimeError(msg)


def k4_requires_four() -> bool:
    """Return the concrete ``K4`` witness: the complete graph on FOUR has chromatic number four."""

    return chromatic_number(FOUR_CHARGE_PALETTE, complete_graph_edges(FOUR_CHARGE_PALETTE)) == 4


def _edge_colours_differ(edge: UndirectedEdge[V], colouring: Mapping[V, C]) -> bool:
    if len(edge) != 2:
        msg = "undirected graph edges must contain exactly two distinct vertices"
        raise ValueError(msg)
    left, right = tuple(edge)
    return colouring[left] != colouring[right]


def _validate_unique(values: Sequence[Hashable]) -> None:
    if len(set(values)) != len(values):
        msg = "vertices and palettes must have unique entries"
        raise ValueError(msg)
