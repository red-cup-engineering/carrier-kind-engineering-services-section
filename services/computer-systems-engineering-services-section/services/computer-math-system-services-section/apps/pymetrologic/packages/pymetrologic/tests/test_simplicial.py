"""General n-dimensional simplicial complexes (extension beyond the Lean corpus).

Ported from pypredcalc's ``combinatorics.simplicial_complex`` — see
``pymetrologic.simplicial``'s module docstring for provenance. No Lean
theorem is realized here.
"""

from __future__ import annotations

import pytest

from pymetrologic import Simplex, SimplicialComplex


class TestSimplex:
    def test_dimension(self) -> None:
        assert Simplex((0,)).dim == 0
        assert Simplex((0, 1)).dim == 1
        assert Simplex((0, 1, 2)).dim == 2

    def test_vertex_has_no_faces(self) -> None:
        assert Simplex((0,)).faces() == []

    def test_edge_faces_are_its_two_vertices(self) -> None:
        faces = Simplex((0, 1)).faces()
        assert Simplex((0,)) in faces
        assert Simplex((1,)) in faces
        assert len(faces) == 2

    def test_triangle_has_three_faces(self) -> None:
        assert len(Simplex((0, 1, 2)).faces()) == 3

    def test_hashable(self) -> None:
        assert len({Simplex((0,)), Simplex((0,))}) == 1


class TestSimplicialComplex:
    def test_not_closed_under_faces_raises(self) -> None:
        with pytest.raises(ValueError, match="not closed under faces"):
            SimplicialComplex(frozenset([Simplex((0, 1))]))

    def test_cells_by_dimension(self) -> None:
        interval = SimplicialComplex(frozenset([Simplex((0,)), Simplex((1,)), Simplex((0, 1))]))
        assert len(interval.cells(0)) == 2
        assert len(interval.cells(1)) == 1
        assert interval.cells(2) == []

    def test_dimension(self) -> None:
        interval = SimplicialComplex(frozenset([Simplex((0,)), Simplex((1,)), Simplex((0, 1))]))
        assert interval.dimension() == 1

    def test_dimension_of_filled_triangle(self) -> None:
        filled = SimplicialComplex(
            frozenset(
                [
                    Simplex((0,)),
                    Simplex((1,)),
                    Simplex((2,)),
                    Simplex((0, 1)),
                    Simplex((1, 2)),
                    Simplex((0, 2)),
                    Simplex((0, 1, 2)),
                ]
            )
        )
        assert filled.dimension() == 2

    def test_empty_complex_has_dimension_negative_one(self) -> None:
        assert SimplicialComplex(frozenset()).dimension() == -1
