"""Graph theory: the handshake lemma, DAGs, and trees (RelMath.Order.SetNumberGraphTheory).

Graph theory is the floor under order — a relation made finite and explicit. This
realizes its named facts: the directed **handshake** identity
``Σ indeg = Σ outdeg = |E|``, a **DAG** (acyclic digraph, hence a strict partial
order), and the finite **tree** characterization ``connected + |E| = |V| − 1``.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

__all__ = [
    "DiGraph",
    "bipartite_closed_walk_even",
    "degree",
    "degree_sum_is_even",
    "handshake_holds",
    "indegree",
    "is_bipartite",
    "is_dag",
    "is_tree",
    "is_walk",
    "odd_degree_count_is_even",
    "outdegree",
    "walk_colour_alternates",
    "walk_end",
]


@dataclass(frozen=True)
class DiGraph:
    """A finite directed graph: vertices and directed ``(u, v)`` edges."""

    vertices: tuple[str, ...]
    edges: frozenset[tuple[str, str]]


def outdegree(g: DiGraph, v: str) -> int:
    """The number of edges leaving ``v``."""
    return sum(1 for (a, _) in g.edges if a == v)


def indegree(g: DiGraph, v: str) -> int:
    """The number of edges entering ``v``."""
    return sum(1 for (_, b) in g.edges if b == v)


def handshake_holds(g: DiGraph) -> bool:
    """The handshake lemma: ``Σ indeg = Σ outdeg = |E|``."""
    total_in = sum(indegree(g, v) for v in g.vertices)
    total_out = sum(outdegree(g, v) for v in g.vertices)
    return total_in == total_out == len(g.edges)


def is_dag(g: DiGraph) -> bool:
    """``True`` iff ``g`` has no directed cycle (so its reachability is a strict order)."""
    colour: dict[str, int] = {}  # 0 = on stack, 1 = done

    def visit(node: str) -> bool:
        colour[node] = 0
        for a, b in g.edges:
            if a != node:
                continue
            c = colour.get(b)
            if c == 0 or (c is None and visit(b)):
                return True
        colour[node] = 1
        return False

    return not any(colour.get(v) is None and visit(v) for v in g.vertices)


def is_tree(vertices: tuple[str, ...], edges: frozenset[frozenset[str]]) -> bool:
    """A finite tree: connected and acyclic, equivalently connected with ``|E| = |V| − 1``."""
    n = len(vertices)
    if n == 0:
        return False
    if len(edges) != n - 1:
        return False
    adj: dict[str, set[str]] = {v: set() for v in vertices}
    for e in edges:
        u, w = tuple(e)
        adj[u].add(w)
        adj[w].add(u)
    seen = {vertices[0]}
    frontier = [vertices[0]]
    while frontier:
        x = frontier.pop()
        for nb in adj[x]:
            if nb not in seen:
                seen.add(nb)
                frontier.append(nb)
    return len(seen) == n  # connected + (|E| = |V|−1) ⟹ acyclic tree


# --- undirected degree parity + bipartite (RelMath.Order.CombinatoricsExtremal) --- #
def degree(edges: frozenset[frozenset[str]], v: str) -> int:
    """The degree of ``v`` in an undirected graph: its number of incident edges."""
    return sum(1 for e in edges if v in e)


def degree_sum_is_even(vertices: tuple[str, ...], edges: frozenset[frozenset[str]]) -> bool:
    """The handshake corollary: ``Σ degree = 2|E|`` (hence even)."""
    total = sum(degree(edges, v) for v in vertices)
    return total == 2 * len(edges) and total % 2 == 0


def odd_degree_count_is_even(vertices: tuple[str, ...], edges: frozenset[frozenset[str]]) -> bool:
    """The number of odd-degree vertices is even (Eulerian necessary condition)."""
    return sum(1 for v in vertices if degree(edges, v) % 2 == 1) % 2 == 0


def is_bipartite(edges: frozenset[frozenset[str]], colour: Callable[[str], bool]) -> bool:
    """``colour`` is a proper 2-colouring: every edge joins the two colours (no mono edge)."""
    for e in edges:
        u, w = tuple(e)
        if colour(u) == colour(w):
            return False
    return True


def is_walk(edges: frozenset[frozenset[str]], start: str, vs: Sequence[str]) -> bool:
    """A walk from ``start``: each consecutive pair (including ``start → vs[0]``) is an edge.
    The walk's length is ``len(vs)`` (the number of edges traversed)."""
    prev = start
    for v in vs:
        if frozenset({prev, v}) not in edges:
            return False
        prev = v
    return True


def walk_end(start: str, vs: Sequence[str]) -> str:
    """The last vertex of a walk ``start :: vs`` (``start`` if the walk is empty)."""
    return vs[-1] if vs else start


def walk_colour_alternates(colour: Callable[[str], bool], start: str, vs: Sequence[str]) -> bool:
    """Colour alternation (the engine of König's necessary direction): under a proper
    2-colouring the endpoint colour is the start colour XOR the walk-length parity,
    ``colour(walk_end) = colour(start) ⊕ (len(vs) odd)``."""
    end = walk_end(start, vs)
    return colour(end) == (colour(start) ^ (len(vs) % 2 == 1))


def bipartite_closed_walk_even(
    edges: frozenset[frozenset[str]],
    colour: Callable[[str], bool],
    start: str,
    vs: Sequence[str],
) -> bool:
    """König's necessary direction: in a properly 2-coloured graph a *closed* walk
    (``walk_end == start``) has even length. Returns ``True`` when the implication holds
    (vacuously when ``vs`` is not a closed walk)."""
    if not (is_walk(edges, start, vs) and walk_end(start, vs) == start):
        return True
    return len(vs) % 2 == 0
