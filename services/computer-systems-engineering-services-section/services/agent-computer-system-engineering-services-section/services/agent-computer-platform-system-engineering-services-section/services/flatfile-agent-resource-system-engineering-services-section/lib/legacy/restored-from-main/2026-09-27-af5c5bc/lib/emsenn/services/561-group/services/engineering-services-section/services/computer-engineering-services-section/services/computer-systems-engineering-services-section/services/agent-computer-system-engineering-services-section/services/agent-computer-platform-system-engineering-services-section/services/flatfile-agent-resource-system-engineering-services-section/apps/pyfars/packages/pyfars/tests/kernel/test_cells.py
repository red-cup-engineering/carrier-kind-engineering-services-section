"""Tests for kernel.cells — PredicationCell values built from Tier A
fm/body edges (design spec section 4)."""

from __future__ import annotations

from pathlib import Path

from pyfars.kernel.cells import build_cells, cell_of
from pyfars.substrate.index.edges import build as build_edges
from pyfars.substrate.load.notes import load
from pymetrologic.predicating import Entity, Predicate, PredicationCell

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_FIXTURE_CORPUS = _SECTION_ROOT / "lib" / "conformance" / "fixture-corpus"


def test_cell_of_lifts_a_predication_into_an_oriented_triple() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    edges = build_edges(notes)
    edge = next(e for e in edges if e.kind == "depends-on" and e.src == "beta")
    cell = cell_of(edge)
    assert cell == PredicationCell(
        Entity("beta"), Predicate("depends-on"), Entity("alpha")
    )


def test_build_cells_preserves_edge_order() -> None:
    notes, _ = load(_FIXTURE_CORPUS)
    edges = build_edges(notes)
    cells = build_cells(edges)
    assert len(cells) == len(edges)
    assert [c.subject.surface for c in cells] == [e.src for e in edges]
    assert [c.predicate.surface for c in cells] == [e.kind for e in edges]
    assert [c.object.surface for c in cells] == [e.dst for e in edges]
