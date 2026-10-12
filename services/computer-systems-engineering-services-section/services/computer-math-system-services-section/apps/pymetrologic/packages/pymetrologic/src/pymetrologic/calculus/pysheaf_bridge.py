"""Bridge to PySheaf: recover the cellular-sheaf answer, then beat it.

A *discrete graph sheaf* — data drawn from finite sets on the vertices and edges
of a graph, with restriction maps carrying a vertex datum to an edge datum — is
the running example of PySheaf. We encode it as a predication sheaf over Belnap
**FOUR**: each cell's stalk is indexed by its value set, an assertion "this cell
has value ``x``" is the one-hot section ``true`` at ``x`` and ``false``
elsewhere, and restriction is the truth-join pushforward along the sheaf's value
map.

Settling that encoding gives:

* the **same** consistency verdict as PySheaf — the consistency radius is
  ``0`` iff every edge's two endpoints restrict to the same edge value; and
* strictly **more** — the conflict map localizes *which* edges and *which*
  values disagree, as ``⊤`` (Belnap "both"), which PySheaf's scalar discards.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass
from typing import Any, cast

from pymetrologic import BL, four
from pymetrologic.site import Face, Site

from .cohomology import h0
from .consistency import conflict_map, consistency_radius
from .sheaf import PredicationSheaf, Section

__all__ = ["BridgeComparison", "DiscreteGraphSheaf", "compare_with_pysheaf"]

Value = Hashable
Vertex = str


@dataclass(frozen=True)
class DiscreteGraphSheaf:
    """A cellular sheaf on a graph with finite stalks and an assignment.

    * ``vertices`` / ``edges`` — the 1-complex. Each edge is an unordered pair.
    * ``vertex_values`` / ``edge_values`` — the finite stalk of each cell.
    * ``restriction`` — for each ``(vertex, edge)`` incidence, the sheaf map
      ``vertex_value → edge_value``.
    * ``assignment`` — the chosen value on each vertex (the data to test).
    """

    vertices: tuple[Vertex, ...]
    edges: tuple[tuple[Vertex, Vertex], ...]
    vertex_values: dict[Vertex, tuple[Value, ...]]
    edge_values: dict[str, tuple[Value, ...]]
    restriction: dict[tuple[Vertex, str], dict[Value, Value]]
    assignment: dict[Vertex, Value]

    def site(self) -> Site:
        return Site.graph(self.vertices, self.edges)

    def edge_name(self, u: Vertex, v: Vertex) -> str:
        return Site.edge_name(u, v)

    def classical_consistency_radius(self) -> int:
        """PySheaf's verdict re-derived: ``0`` if every edge agrees, else ``1``.

        For a discrete (Hamming) stalk metric this is exactly PySheaf's
        ``consistencyRadius`` for the given assignment.
        """
        worst = 0
        for u, v in self.edges:
            e = self.edge_name(u, v)
            ru = self.restriction[(u, e)][self.assignment[u]]
            rv = self.restriction[(v, e)][self.assignment[v]]
            if ru != rv:
                worst = 1
        return worst

    def to_predication_sheaf(self) -> tuple[PredicationSheaf, dict[str, Section[Value, Any]]]:
        """Encode as a predication sheaf over FOUR, with the one-hot assignment."""
        bl = four()
        site = self.site()

        stalk_index: dict[Hashable, tuple[Hashable, ...]] = {}
        for v in self.vertices:
            stalk_index[v] = self.vertex_values[v]
        for u, v in self.edges:
            e = self.edge_name(u, v)
            stalk_index[e] = self.edge_values[e]

        restriction: dict[Face, Any] = {}
        for u, v in self.edges:
            e = self.edge_name(u, v)
            for endpoint in (u, v):
                rho = self.restriction[(endpoint, e)]
                restriction[(endpoint, e)] = _pushforward(bl, rho, self.edge_values[e])

        sheaf = PredicationSheaf(
            site=site,
            bl=bl,
            stalk_index={str(k): val for k, val in stalk_index.items()},
            restriction=restriction,
        )

        assignment: dict[str, Section[Value, Any]] = {}
        for v in self.vertices:
            assignment[v] = {
                x: (bl.true if x == self.assignment[v] else bl.false) for x in self.vertex_values[v]
            }
        return sheaf, assignment


def _pushforward(bl: Any, rho: Mapping[Value, Value], codomain: tuple[Value, ...]) -> Any:
    """Truth-join pushforward of a one-hot section along the value map ``rho``."""

    def f_star(section: Section[Value, Any]) -> dict[Value, BL[Any]]:
        out: dict[Value, BL[Any]] = dict.fromkeys(codomain, bl.false)
        for x, value in section.items():
            y = rho[x]
            out[y] = bl.join_t(out[y], value)
        return out

    return f_star


@dataclass(frozen=True)
class BridgeComparison:
    """Side-by-side of PySheaf's scalar verdict and our localized one."""

    classical_radius: int
    bilattice_radius: int
    consistent: bool
    located_conflicts: dict[str, dict[Value, int]]

    @property
    def agrees_with_classical(self) -> bool:
        """The verdicts match: both clean, or both inconsistent."""
        return (self.classical_radius == 0) == (self.bilattice_radius == 0)


def compare_with_pysheaf(graph_sheaf: DiscreteGraphSheaf) -> BridgeComparison:
    """Settle the encoded sheaf and compare verdicts with PySheaf's.

    The verdicts always agree (meet); ``located_conflicts`` is the extra
    information PySheaf cannot give (beat).
    """
    sheaf, assignment = graph_sheaf.to_predication_sheaf()
    section = h0(sheaf, assignment)
    radius = consistency_radius(sheaf, section.section)
    located = conflict_map(sheaf, section.section)
    return BridgeComparison(
        classical_radius=graph_sheaf.classical_consistency_radius(),
        bilattice_radius=cast(int, radius),
        consistent=section.consistent,
        located_conflicts={
            cell: {k: cast(int, deg) for k, deg in keys.items()} for cell, keys in located.items()
        },
    )
