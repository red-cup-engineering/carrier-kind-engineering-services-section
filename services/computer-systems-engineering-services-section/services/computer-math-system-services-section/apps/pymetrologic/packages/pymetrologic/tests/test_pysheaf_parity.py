"""Parity with PySheaf (meet) plus localized conflict (beat).

We build a small graph sheaf, settle its predication encoding, and check that
our verdict always agrees with the classical consistency radius — while also
returning the located conflicts PySheaf's scalar cannot.

``test_against_real_pysheaf_if_available`` goes one step further: when the real
``kb1dds/pysheaf`` package is importable, it builds an actual ``pysheaf.Sheaf``
from the same :class:`DiscreteGraphSheaf` fixture used everywhere else in this
file and checks that ``Sheaf.ComputeConsistencyRadius()`` agrees with both our
:meth:`DiscreteGraphSheaf.classical_consistency_radius` rederivation and our
settled ``bilattice_radius``. PySheaf is GitHub-only (not on PyPI) and is
*not* a declared project dependency — see the note in the root
``pyproject.toml`` — so this stays behind ``pytest.importorskip``: install it
locally with ``uv pip install git+https://github.com/kb1dds/pysheaf`` (uv
supports git dependencies directly; this does not touch the lockfile) to
activate the live check, otherwise it skips exactly as before.
"""

from __future__ import annotations

from typing import Any

import pytest

from pymetrologic.calculus import DiscreteGraphSheaf, compare_with_pysheaf
from pymetrologic.site import Site


def _triangle(a: str, b: str, c: str) -> DiscreteGraphSheaf:
    """A triangle a-b-c with binary stalks and identity restriction maps.

    PySheaf's canonical "do the vertices agree on the shared edges?" sheaf.
    """
    vertices = ("a", "b", "c")
    edges = (("a", "b"), ("b", "c"), ("a", "c"))
    values = ("0", "1")
    edge_values = {Site.edge_name(u, v): values for (u, v) in edges}
    restriction: dict[tuple[str, str], dict[str, str]] = {}
    for u, v in edges:
        e = Site.edge_name(u, v)
        restriction[(u, e)] = {"0": "0", "1": "1"}
        restriction[(v, e)] = {"0": "0", "1": "1"}
    return DiscreteGraphSheaf(
        vertices=vertices,
        edges=edges,
        vertex_values=dict.fromkeys(vertices, values),
        edge_values=edge_values,
        restriction=restriction,
        assignment={"a": a, "b": b, "c": c},
    )


def test_consistent_assignment_meets_pysheaf() -> None:
    cmp = compare_with_pysheaf(_triangle("0", "0", "0"))
    assert cmp.classical_radius == 0
    assert cmp.bilattice_radius == 0
    assert cmp.consistent
    assert cmp.agrees_with_classical
    assert cmp.located_conflicts == {}


def test_inconsistent_assignment_meets_then_beats_pysheaf() -> None:
    # a=0, b=1, c=0: edges a|b and b|c disagree; a|c agrees.
    cmp = compare_with_pysheaf(_triangle("0", "1", "0"))
    # Meet: same verdict.
    assert cmp.classical_radius == 1
    assert cmp.bilattice_radius == 1
    assert cmp.agrees_with_classical
    # Beat: localize exactly which edges and values collide.
    assert set(cmp.located_conflicts) == {"a|b", "b|c"}
    for edge in ("a|b", "b|c"):
        assert set(cmp.located_conflicts[edge]) == {"0", "1"}
    assert "a|c" not in cmp.located_conflicts


def test_verdicts_agree_across_all_binary_assignments() -> None:
    # Exhaustive small check: our verdict must match the classical one everywhere.
    for a in ("0", "1"):
        for b in ("0", "1"):
            for c in ("0", "1"):
                cmp = compare_with_pysheaf(_triangle(a, b, c))
                assert cmp.agrees_with_classical, (a, b, c)


def _build_real_pysheaf(graph_sheaf: DiscreteGraphSheaf, ps: Any) -> Any:
    """Build an actual ``pysheaf.Sheaf`` mirroring ``graph_sheaf``.

    Each vertex is a ``"vertex"`` cell carrying its assigned value; each edge
    is an ``"edge"`` cell reached by a coface from both endpoints, using
    ``graph_sheaf.restriction`` as the edge method. Values here are discrete
    (string) labels, so cells compare with a Hamming metric (``0`` if equal,
    ``1`` otherwise) rather than PySheaf's numeric default. Edge cells get no
    data assignment of their own — there is no independently-asserted edge
    value in this model, only what the two endpoints push in — so
    ``mExtendedAssignmentConsistancyWeight`` is set to compare the two pushed
    values *against each other* instead of against a (nonexistent) local
    assignment; this is exactly PySheaf's own supported mechanism for an
    overlap cell with no ground truth of its own.
    """

    def discrete_compare(left: object, right: object) -> float:
        return 0.0 if left == right else 1.0

    shf = ps.Sheaf()
    for v in graph_sheaf.vertices:
        shf.AddCell(v, ps.Cell("vertex", compareAssignmentsMethod=discrete_compare))
    for u, v in graph_sheaf.edges:
        e = graph_sheaf.edge_name(u, v)
        edge_cell = ps.Cell("edge", compareAssignmentsMethod=discrete_compare)
        edge_cell.mExtendedAssignmentConsistancyWeight = 1.0
        shf.AddCell(e, edge_cell)
        for endpoint in (u, v):
            rho = graph_sheaf.restriction[(endpoint, e)]
            shf.AddCoface(endpoint, e, ps.Coface("vertex", "edge", lambda x, rho=rho: rho[x]))
    for v in graph_sheaf.vertices:
        shf.GetCell(v).SetDataAssignment(ps.Assignment("vertex", graph_sheaf.assignment[v]))
    shf.mPreventRedundantExtendedAssignments = False
    for v in graph_sheaf.vertices:
        shf.MaximallyExtendCell(v)
    return shf


def test_against_real_pysheaf_if_available() -> None:
    """When PySheaf is installed, cross-check its real consistency radius.

    Builds an actual ``pysheaf.Sheaf`` from the same triangle fixture used by
    every other test in this file, across all 8 binary vertex assignments, and
    checks ``Sheaf.ComputeConsistencyRadius()`` against both
    ``classical_consistency_radius()`` (our hand-rederivation) and the settled
    ``bilattice_radius`` from :func:`compare_with_pysheaf` — closing the gap
    between "parity is proven by re-deriving PySheaf's definition" and "parity
    is checked against the real library."
    """
    ps = pytest.importorskip("pysheaf")

    for a in ("0", "1"):
        for b in ("0", "1"):
            for c in ("0", "1"):
                graph_sheaf = _triangle(a, b, c)
                real_sheaf = _build_real_pysheaf(graph_sheaf, ps)
                real_radius = real_sheaf.ComputeConsistencyRadius()
                assert real_radius is not None, (a, b, c)
                assert real_radius == float(graph_sheaf.classical_consistency_radius()), (a, b, c)

                cmp = compare_with_pysheaf(graph_sheaf)
                assert (real_radius > 0) == (cmp.bilattice_radius > 0), (a, b, c)
