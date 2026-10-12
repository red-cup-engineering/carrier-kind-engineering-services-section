"""Coordination cohomology for finite cover nerves.

Executable shadow of ``RelMath.Cohomology.CoordinationCohomology``.  A
federated cover contributes a finite source-stance nerve, and its Cech
``H1`` rank is the cycle rank ``|E| - |V| + |C|``.  That rank is the
coordination cost: the number of independent gluing obstructions beyond a
spanning forest.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from pymetrologic.graph import is_tree

__all__ = [
    "CoverNerve",
    "LaplacianRankWitness",
    "coordinationFree_iff_forest",
    "coordination_cost",
    "cover_nerve_from_edges",
    "h1_vanishes_iff_forest",
    "h1rank_is_coordination_cost",
    "laplacian_kernel_cokernel",
    "tree_coordination_free",
]


@dataclass(frozen=True, slots=True)
class CoverNerve:
    """Euler-count carrier for one logical cell's source-stance nerve."""

    entities: int
    cells: int
    components: int

    def __post_init__(self) -> None:
        """Enforce the union-find invariants carried by the Lean structure."""
        if self.entities < 0 or self.cells < 0 or self.components < 0:
            msg = "cover-nerve counts must be non-negative"
            raise ValueError(msg)
        if self.components > self.entities:
            msg = "components cannot exceed entities"
            raise ValueError(msg)
        if self.entities > self.cells + self.components:
            msg = "cover nerve violates the spanning-forest bound"
            raise ValueError(msg)

    @property
    def H0rank(self) -> int:
        """``H0`` rank: the number of connected components."""
        return self.components

    @property
    def H1rank(self) -> int:
        """``H1`` rank: ``|E| - |V| + |C|`` as a non-negative cycle rank."""
        return self.cells + self.components - self.entities

    @property
    def incidence_rank(self) -> int:
        """Rank of the finite incidence matrix, ``rho = |V| - |C|``."""
        return self.entities - self.components

    @property
    def CoordinationFree(self) -> bool:
        """The nerve has no coordination obstruction."""
        return self.H1rank == 0

    @property
    def forest_identity(self) -> bool:
        """The Euler forest identity ``|V| = |E| + |C|``."""
        return self.entities == self.cells + self.components


@dataclass(frozen=True, slots=True)
class LaplacianRankWitness:
    """Kernel/cokernel rank identities around the incidence rank."""

    h0_kernel_rank: int
    h1_cokernel_rank: int
    incidence_rank: int
    h0_identity: bool
    h1_identity: bool

    @property
    def holds(self) -> bool:
        """Both Laplacian rank identities hold."""
        return self.h0_identity and self.h1_identity


def cover_nerve_from_edges(
    vertices: Iterable[str],
    edges: Iterable[frozenset[str]],
) -> CoverNerve:
    """Build a cover nerve from a finite undirected source-stance graph."""
    verts = tuple(dict.fromkeys(vertices))
    vertex_set = set(verts)
    normalized_edges = tuple(_normalize_edge(edge, vertex_set) for edge in edges)
    components = _component_count(verts, normalized_edges)
    return CoverNerve(
        entities=len(verts),
        cells=len(normalized_edges),
        components=components,
    )


def h1_vanishes_iff_forest(nerve: CoverNerve) -> bool:
    """``H1 = 0`` iff the nerve is a forest."""
    return nerve.CoordinationFree == nerve.forest_identity


def coordinationFree_iff_forest(nerve: CoverNerve) -> bool:
    """Named predicate restatement of ``h1_vanishes_iff_forest``."""
    return h1_vanishes_iff_forest(nerve)


def coordination_cost(nerve: CoverNerve) -> int:
    """Cells in excess of a spanning forest, the irreducible coordination cost."""
    return nerve.cells - nerve.incidence_rank


def h1rank_is_coordination_cost(nerve: CoverNerve) -> bool:
    """The first cohomology rank equals the coordination cost."""
    return nerve.H1rank == coordination_cost(nerve) and h1_vanishes_iff_forest(nerve)


def laplacian_kernel_cokernel(nerve: CoverNerve) -> LaplacianRankWitness:
    """Return the ``H0`` kernel and ``H1`` cokernel rank identities."""
    rho = nerve.incidence_rank
    h0_kernel = nerve.entities - rho
    h1_cokernel = nerve.cells - rho
    return LaplacianRankWitness(
        h0_kernel_rank=h0_kernel,
        h1_cokernel_rank=h1_cokernel,
        incidence_rank=rho,
        h0_identity=nerve.H0rank == h0_kernel,
        h1_identity=nerve.H1rank == h1_cokernel,
    )


def tree_coordination_free(vertices: tuple[str, ...], edges: frozenset[frozenset[str]]) -> bool:
    """A finite tree cover has vanishing ``H1`` coordination cost."""
    if not is_tree(vertices, edges):
        return False
    return cover_nerve_from_edges(vertices, edges).CoordinationFree


def _normalize_edge(edge: frozenset[str], vertices: set[str]) -> frozenset[str]:
    if len(edge) != 2:
        msg = "cover-nerve edges must join exactly two distinct entities"
        raise ValueError(msg)
    if not edge <= vertices:
        msg = "cover-nerve edge contains an unknown entity"
        raise ValueError(msg)
    return frozenset(edge)


def _component_count(vertices: tuple[str, ...], edges: tuple[frozenset[str], ...]) -> int:
    if not vertices:
        return 0

    parent = {vertex: vertex for vertex in vertices}

    def find(vertex: str) -> str:
        root = parent[vertex]
        if root != vertex:
            root = find(root)
            parent[vertex] = root
        return root

    def union(left: str, right: str) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for edge in edges:
        left, right = tuple(edge)
        union(left, right)

    return len({find(vertex) for vertex in vertices})
