"""Continuous sensor fusion: conflict is graded, not just present/absent."""

from __future__ import annotations

from pymetrologic.calculus import graded_conflicts, sensor_fusion_sheaf, triangle_sheaf
from pymetrologic.calculus.examples import PROP
from pymetrologic.site import Site


def test_strongly_contradicting_sensors_have_high_graded_conflict() -> None:
    # yes ⟨0.9,0⟩ vs no ⟨0,0.8⟩ -> edge merges to ⟨0.9,0.8⟩ -> conflict min = 0.8.
    sheaf, assignment = sensor_fusion_sheaf({"u": (0.9, 0.0), "v": (0.0, 0.8)}, [("u", "v")])
    conflicts = graded_conflicts(sheaf, assignment)
    e = Site.edge_name("u", "v")
    assert e in conflicts
    assert abs(conflicts[e] - 0.8) < 1e-9


def test_agreeing_sensors_have_low_graded_conflict() -> None:
    # yes ⟨0.9,0⟩ vs a faint no ⟨0,0.15⟩ -> edge ⟨0.9,0.15⟩ -> small conflict 0.15.
    sheaf, assignment = sensor_fusion_sheaf({"u": (0.9, 0.0), "v": (0.0, 0.15)}, [("u", "v")])
    conflicts = graded_conflicts(sheaf, assignment)
    e = Site.edge_name("u", "v")
    assert 0.0 < conflicts.get(e, 0.0) < 0.2


def test_perfect_agreement_is_clean() -> None:
    sheaf, assignment = sensor_fusion_sheaf({"u": (0.7, 0.0), "v": (0.7, 0.0)}, [("u", "v")])
    assert graded_conflicts(sheaf, assignment) == {}


def test_graded_conflict_orders_disagreements() -> None:
    # A square where one sensor dissents (s says NO, the rest say yes):
    # the two edges touching s should be the worst.
    readings = {"n": (0.9, 0.0), "e": (0.85, 0.0), "s": (0.0, 0.9), "w": (0.8, 0.0)}
    edges = [("n", "e"), ("e", "s"), ("s", "w"), ("w", "n")]
    sheaf, assignment = sensor_fusion_sheaf(readings, edges)
    conflicts = graded_conflicts(sheaf, assignment)
    es, sw = Site.edge_name("e", "s"), Site.edge_name("s", "w")
    ne = Site.edge_name("n", "e")
    # Edges touching the dissenting sensor s are far more conflicted than n-e.
    assert conflicts[es] > 0.5 and conflicts[sw] > 0.5
    assert conflicts.get(ne, 0.0) < 0.2


def test_triangle_factory_matches_a_known_case() -> None:
    gs = triangle_sheaf("0", "1", "0")
    assert gs.assignment == {"a": "0", "b": "1", "c": "0"}
    assert gs.vertex_values["a"] == ("0", "1")
    assert PROP == "level"  # stable proposition key for the continuous example
