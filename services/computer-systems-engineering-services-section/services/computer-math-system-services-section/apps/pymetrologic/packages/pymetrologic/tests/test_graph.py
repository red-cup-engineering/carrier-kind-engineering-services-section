"""Graph theory: handshake, DAG, tree (RelMath.Order.SetNumberGraphTheory)."""

from __future__ import annotations

from collections.abc import Callable

from pymetrologic import (
    DiGraph,
    bipartite_closed_walk_even,
    handshake_holds,
    indegree,
    is_bipartite,
    is_dag,
    is_tree,
    is_walk,
    outdegree,
    walk_colour_alternates,
    walk_end,
)

Edges = frozenset[frozenset[str]]


def _enumerate_walks(edges: Edges, start: str, max_len: int) -> list[list[str]]:
    """All walks from ``start`` of length ``≤ max_len`` (each as its list ``vs``)."""
    walks: list[list[str]] = [[]]
    frontier: list[tuple[str, list[str]]] = [(start, [])]
    while frontier:
        cur, vs = frontier.pop()
        if len(vs) >= max_len:
            continue
        for e in edges:
            if cur in e:
                nxt = next(iter(e - {cur}))
                vs2 = [*vs, nxt]
                walks.append(vs2)
                frontier.append((nxt, vs2))
    return walks


def _cycle(n: int) -> tuple[tuple[str, ...], Edges]:
    verts = tuple(str(i) for i in range(n))
    edges = frozenset(frozenset({str(i), str((i + 1) % n)}) for i in range(n))
    return verts, edges


def test_handshake_lemma() -> None:
    g = DiGraph(
        vertices=("a", "b", "c"),
        edges=frozenset({("a", "b"), ("b", "c"), ("a", "c")}),
    )
    assert outdegree(g, "a") == 2
    assert indegree(g, "c") == 2
    assert handshake_holds(g)


def test_is_dag_detects_cycles() -> None:
    dag = DiGraph(("a", "b", "c"), frozenset({("a", "b"), ("b", "c"), ("a", "c")}))
    assert is_dag(dag)
    cyclic = DiGraph(("a", "b", "c"), frozenset({("a", "b"), ("b", "c"), ("c", "a")}))
    assert not is_dag(cyclic)


def test_tree_characterisation() -> None:
    verts = ("a", "b", "c", "d")
    tree = frozenset({frozenset({"a", "b"}), frozenset({"b", "c"}), frozenset({"c", "d"})})
    assert is_tree(verts, tree)  # connected, |E| = |V| − 1

    disconnected = frozenset({frozenset({"a", "b"}), frozenset({"c", "d"})})
    assert not is_tree(verts, disconnected)  # |E| = 2 ≠ 3

    with_cycle = frozenset({frozenset({"a", "b"}), frozenset({"b", "c"}), frozenset({"c", "a"})})
    assert not is_tree(("a", "b", "c"), with_cycle)  # |E| = |V|, has a cycle


def test_empty_and_singleton() -> None:
    assert not is_tree((), frozenset())
    assert is_tree(("a",), frozenset())  # single vertex, no edges


def test_is_walk_and_end() -> None:
    _, edges = _cycle(4)  # 0-1-2-3-0
    assert is_walk(edges, "0", ["1", "2", "3", "0"])
    assert walk_end("0", ["1", "2", "3", "0"]) == "0"
    assert walk_end("0", []) == "0"
    assert not is_walk(edges, "0", ["2"])  # 0 and 2 are not adjacent in C4


def _bipartite_colour(n: int) -> Callable[[str], bool]:
    return lambda v: int(v) % 2 == 1


def test_walk_colour_alternates_on_bipartite() -> None:
    # Even cycles are bipartite; colour alternation holds along every walk.
    for n in (4, 6, 8):
        _, edges = _cycle(n)
        colour = _bipartite_colour(n)
        assert is_bipartite(edges, colour)
        for vs in _enumerate_walks(edges, "0", 7):
            assert walk_colour_alternates(colour, "0", vs)


def test_bipartite_no_odd_closed_walk() -> None:
    # The König necessary direction: in a bipartite graph, every closed walk is even.
    for n in (4, 6, 8):
        _, edges = _cycle(n)
        colour = _bipartite_colour(n)
        for vs in _enumerate_walks(edges, "0", 9):
            assert bipartite_closed_walk_even(edges, colour, "0", vs)
            if vs and walk_end("0", vs) == "0":
                assert len(vs) % 2 == 0  # genuinely a closed walk, and even


def test_odd_cycle_has_odd_closed_walk() -> None:
    # Contrast: an odd cycle (C5) is not bipartite and DOES admit an odd closed walk,
    # so no proper 2-colouring can exist (sanity check on the contrapositive).
    _, edges = _cycle(5)
    closed_lengths = {
        len(vs) for vs in _enumerate_walks(edges, "0", 5) if vs and walk_end("0", vs) == "0"
    }
    assert 5 in closed_lengths  # the odd cycle itself is an odd closed walk
    assert not is_bipartite(edges, _bipartite_colour(5))
