"""Reusable example sheaves — shared by notebooks, tests, and the demo CLI.

Two families:

* :func:`triangle_sheaf` — the discrete (Belnap FOUR) graph sheaf used to meet
  PySheaf on its own ground.
* :func:`sensor_fusion_sheaf` — a **continuous** ``[0,1]`` sheaf. Each sensor
  reports ``⟨confidence-for, confidence-against⟩`` about one proposition; edges
  demand agreement. Settling merges by ``∨_k`` and the conflict degree
  ``pro ∧ con`` becomes a *graded* number — how hard two sensors contradict —
  which a discrete consistency radius cannot express. This is the continuous
  regime PySheaf does not reach.
"""

from __future__ import annotations

from collections.abc import Hashable, Sequence
from typing import Any, cast

from pymetrologic.bilattice import BL, bilattice, unit_interval
from pymetrologic.site import Cell, Site

from .consistency import conflict_map
from .pysheaf_bridge import DiscreteGraphSheaf
from .sections import settle_assignment
from .sheaf import PredicationSheaf, Section

__all__ = [
    "graded_conflicts",
    "sensor_fusion_sheaf",
    "triangle_sheaf",
]

# A reading is one-sided evidence: ``(q, 0)`` = "yes, confidence q"; ``(0, q)`` =
# "no, confidence q". One-sidedness means a lone sensor carries no self-conflict,
# so every conflict that appears is genuine *disagreement* between sensors.
Reading = tuple[float, float]  # ⟨confidence-for, confidence-against⟩
Edge = tuple[str, str]
PROP = "level"  # the single proposition each sensor estimates


def triangle_sheaf(a: str, b: str, c: str) -> DiscreteGraphSheaf:
    """The binary triangle a-b-c with identity restriction maps (PySheaf's classic)."""
    vertices = ("a", "b", "c")
    edges: tuple[Edge, ...] = (("a", "b"), ("b", "c"), ("a", "c"))
    values: tuple[Hashable, ...] = ("0", "1")
    edge_values: dict[str, tuple[Hashable, ...]] = {
        Site.edge_name(u, v): values for (u, v) in edges
    }
    restriction: dict[tuple[str, str], dict[Hashable, Hashable]] = {}
    for u, v in edges:
        e = Site.edge_name(u, v)
        ident: dict[Hashable, Hashable] = {"0": "0", "1": "1"}
        restriction[(u, e)] = ident
        restriction[(v, e)] = ident
    return DiscreteGraphSheaf(
        vertices=vertices,
        edges=edges,
        vertex_values=dict.fromkeys(vertices, values),
        edge_values=edge_values,
        restriction=restriction,
        assignment={"a": a, "b": b, "c": c},
    )


def sensor_fusion_sheaf(
    readings: dict[str, Reading],
    edges: Sequence[Edge],
) -> tuple[PredicationSheaf, dict[str, Section[Hashable, Any]]]:
    """A continuous ``[0,1]`` sensor network: vertices read, edges demand agreement.

    ``readings[v] = (pro, con)`` is sensor ``v``'s confidence for and against the
    shared proposition. Restriction onto a shared edge is the identity, so two
    sensors on an edge merge by ``∨_k`` and any contradiction surfaces as a
    graded conflict there.
    """
    bl = bilattice(unit_interval())
    vertices = tuple(readings)
    site = Site.graph(vertices, edges)

    stalk_index: dict[Cell, tuple[Hashable, ...]] = {v: (PROP,) for v in vertices}
    for u, v in edges:
        stalk_index[Site.edge_name(u, v)] = (PROP,)

    def identity(section: Section[Hashable, Any]) -> dict[Hashable, BL[Any]]:
        return {PROP: section[PROP]}

    restriction: dict[tuple[Cell, Cell], Any] = {}
    for u, v in edges:
        e = Site.edge_name(u, v)
        restriction[(u, e)] = identity
        restriction[(v, e)] = identity

    sheaf = PredicationSheaf(
        site=site,
        bl=bl,
        stalk_index=stalk_index,
        restriction=restriction,
    )
    assignment: dict[str, Section[Hashable, Any]] = {
        v: {PROP: BL(pro, con)} for v, (pro, con) in readings.items()
    }
    return sheaf, assignment


def graded_conflicts(
    sheaf: PredicationSheaf,
    assignment: dict[str, Section[Hashable, Any]],
) -> dict[Cell, float]:
    """Settle, then report the graded conflict on each **edge** (``0`` = clean).

    Conflict is reported only on edges (cells that are cofaces — the overlaps two
    sensors share), so the number is pure *disagreement* between sensors, graded
    by how hard they contradict. With one-sided readings a lone sensor never
    self-conflicts, so an edge is clean exactly when its endpoints agree.
    """
    settled, _ = settle_assignment(sheaf, assignment)
    located = conflict_map(sheaf, settled)
    return {
        cell: cast(float, keys[PROP])
        for cell, keys in located.items()
        if PROP in keys and sheaf.site.faces_of(cell)  # cofaces (edges) only
    }
