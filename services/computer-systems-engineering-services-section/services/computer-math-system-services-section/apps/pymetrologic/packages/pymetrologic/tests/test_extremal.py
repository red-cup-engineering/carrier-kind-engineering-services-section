"""Degree parity + bipartite (RelMath.Order.CombinatoricsExtremal)."""

from __future__ import annotations

from pymetrologic import (
    degree,
    degree_sum_is_even,
    is_bipartite,
    odd_degree_count_is_even,
)


def _cycle(n: int) -> tuple[tuple[str, ...], frozenset[frozenset[str]]]:
    verts = tuple(str(i) for i in range(n))
    edges = frozenset(frozenset({str(i), str((i + 1) % n)}) for i in range(n))
    return verts, edges


def test_handshake_corollary_degree_sum_even() -> None:
    verts, edges = _cycle(5)
    assert all(degree(edges, v) == 2 for v in verts)
    assert degree_sum_is_even(verts, edges)  # Σ deg = 2|E| = 10


def test_odd_degree_vertex_count_is_even() -> None:
    # A path a-b-c: endpoints have degree 1 (odd), middle degree 2 — two odd, even count.
    verts = ("a", "b", "c")
    edges = frozenset({frozenset({"a", "b"}), frozenset({"b", "c"})})
    assert degree(edges, "a") == 1
    assert odd_degree_count_is_even(verts, edges)


def test_even_cycle_is_bipartite_odd_cycle_colouring_fails() -> None:
    _, even = _cycle(4)
    assert is_bipartite(even, lambda v: int(v) % 2 == 0)  # proper 2-colouring

    _, odd = _cycle(3)
    # No parity 2-colouring works on an odd cycle (the necessary direction of König).
    assert not is_bipartite(odd, lambda v: int(v) % 2 == 0)
