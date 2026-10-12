"""Transfinite cell complex colimit (RelMath.Cohomology.TransfiniteCellComplex)."""

from __future__ import annotations

import pytest

from pymetrologic.transfinite_cell_complex import (
    TransfiniteCellComplex,
    directed_finite_subcomplexes,
    in_colimit_iff_some_finite,
    transfinite_complex_is_colimit_of_finite,
)


def triangle_complex() -> TransfiniteCellComplex:
    return TransfiniteCellComplex(
        cells=("v0", "v1", "v2", "e01", "e12", "e20", "f"),
        dimensions={
            "v0": 0,
            "v1": 0,
            "v2": 0,
            "e01": 1,
            "e12": 1,
            "e20": 1,
            "f": 2,
        },
        faces=frozenset(
            {
                ("v0", "e01"),
                ("v1", "e01"),
                ("v1", "e12"),
                ("v2", "e12"),
                ("v2", "e20"),
                ("v0", "e20"),
                ("e01", "f"),
                ("e12", "f"),
                ("e20", "f"),
            }
        ),
    )


def test_generated_subcomplex_is_finite_and_downward_closed() -> None:
    complex = triangle_complex()

    edge_subcomplex = complex.generated_subcomplex("e01")
    face_subcomplex = complex.generated_subcomplex("f")

    assert edge_subcomplex.cells == frozenset({"v0", "v1", "e01"})
    assert edge_subcomplex.downward_closed
    assert face_subcomplex.cells == frozenset(complex.cells)
    assert face_subcomplex.downward_closed


def test_finite_subcomplexes_are_directed_by_union() -> None:
    complex = triangle_complex()
    left = complex.generated_subcomplex("e01")
    right = complex.generated_subcomplex("e12")
    union = left.union(right)

    assert directed_finite_subcomplexes(left, right)
    assert union.cells == frozenset({"v0", "v1", "v2", "e01", "e12"})
    assert left.is_subcomplex_of(union)
    assert right.is_subcomplex_of(union)


def test_transfinite_complex_is_colimit_of_finite_subcomplexes() -> None:
    complex = triangle_complex()
    witness = transfinite_complex_is_colimit_of_finite(complex)

    assert witness.holds
    assert witness.every_cell_in_generated_finite_subcomplex
    assert witness.finite_subcomplexes_directed
    assert witness.colimit_iff_some_finite
    assert witness.no_limit_cell_structure

    for cell in complex.cells:
        assert in_colimit_iff_some_finite(complex, cell)


def test_validation_rejects_non_complex_data() -> None:
    with pytest.raises(ValueError, match="unique"):
        TransfiniteCellComplex(
            cells=("v", "v"),
            dimensions={"v": 0},
            faces=frozenset(),
        )

    with pytest.raises(ValueError, match="every cell"):
        TransfiniteCellComplex(
            cells=("v", "e"),
            dimensions={"v": 0},
            faces=frozenset(),
        )

    with pytest.raises(ValueError, match="natural"):
        TransfiniteCellComplex(
            cells=("v",),
            dimensions={"v": -1},
            faces=frozenset(),
        )

    with pytest.raises(ValueError, match="unknown cell"):
        TransfiniteCellComplex(
            cells=("v",),
            dimensions={"v": 0},
            faces=frozenset({("missing", "v")}),
        )

    with pytest.raises(ValueError, match="strictly drop"):
        TransfiniteCellComplex(
            cells=("v", "bad"),
            dimensions={"v": 0, "bad": 0},
            faces=frozenset({("v", "bad")}),
        )


def test_explicit_finite_subcomplex_must_be_downward_closed() -> None:
    complex = triangle_complex()

    with pytest.raises(ValueError, match="downward-closed"):
        complex.finite_subcomplex(("e01",))

    with pytest.raises(ValueError, match="unknown cell"):
        complex.finite_subcomplex(("ghost",))
