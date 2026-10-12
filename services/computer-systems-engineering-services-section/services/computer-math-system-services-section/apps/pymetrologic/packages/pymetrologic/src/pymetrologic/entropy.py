"""Executable shadows of Lean coloring-entropy results."""

from __future__ import annotations

from itertools import product
from math import log2


def nat_log(base: int, value: int) -> int:
    """Floor logarithm, matching the Lean ``natLog`` construction."""
    if base < 2:
        raise ValueError("base must be at least 2")
    if value < 1:
        raise ValueError("value must be positive")
    exponent = 0
    while base ** (exponent + 1) <= value:
        exponent += 1
    return exponent


def full_shift_entropy(symbols: int) -> float:
    """Topological entropy of the full shift on ``symbols`` symbols: ``log2 symbols``."""
    if symbols < 1:
        raise ValueError("full-shift entropy needs at least one symbol")
    return log2(symbols)


def edge_colourings() -> list[tuple[bool, bool]]:
    """All two-colourings of one edge's endpoints."""
    return [(left, right) for left, right in product([False, True], repeat=2)]


def proper_edge_colourings() -> list[tuple[bool, bool]]:
    """The two proper colourings of a single edge."""
    return [colouring for colouring in edge_colourings() if colouring[0] != colouring[1]]


def colouring_entropy(colouring_count: int, vertex_count: int = 1) -> float:
    """Bits per vertex needed to specify one colouring among ``colouring_count`` choices."""
    if colouring_count < 1 or vertex_count < 1:
        raise ValueError("colouring_count and vertex_count must be positive")
    return log2(colouring_count) / vertex_count


def triangle_colourings(colours: int = 3) -> list[tuple[int, int, int]]:
    """All colourings of a triangle with ``colours`` colours."""
    if colours < 1:
        raise ValueError("triangle needs at least one colour")
    return [(first, second, third) for first, second, third in product(range(colours), repeat=3)]


def proper_triangle_colourings(colours: int = 3) -> list[tuple[int, int, int]]:
    """Proper triangle colourings: all three vertices pairwise distinct."""
    return [colouring for colouring in triangle_colourings(colours) if len(set(colouring)) == 3]


def complete_graph_colouring_count(vertices: int, colours: int) -> int:
    """Falling factorial ``colours * ... * (colours - vertices + 1)`` for ``K_vertices``."""
    if vertices < 0 or colours < 0:
        raise ValueError("vertices and colours must be natural numbers")
    count = 1
    for index in range(vertices):
        count *= max(0, colours - index)
    return count
