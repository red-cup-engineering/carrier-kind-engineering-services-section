"""Temporal 2-category witnesses (RelMath.Predicating.TemporalTwoCategory)."""

from __future__ import annotations

import pytest

from pymetrologic.temporal_two_category import (
    TemporalBeckChevalleySquare,
    TemporalOneCell,
    TemporalTwoCell,
    TemporalZeroCell,
    opposite_category,
    reindex_valuation,
    sample_temporal_bc_square,
    temporal_beck_chevalley,
    temporal_compose,
    temporal_identity,
    temporal_two_category,
    twocell_identity,
    twocell_vcompose,
)
from pymetrologic.yoneda import (
    knowledge_presheaf_category,
)


def test_temporal_one_cells_package_predicate_and_settling_axes() -> None:
    category = knowledge_presheaf_category()
    source = TemporalZeroCell(2, "none")
    target = TemporalZeroCell(1, "true")
    arrow = category.hom("none", "true")[0]
    cell = TemporalOneCell(source, target, arrow)

    assert cell.settling_closes
    assert cell.arrow.name == "none<=true"
    assert temporal_identity(category, source).arrow.name == "none<=none"

    with pytest.raises(ValueError, match="endpoints"):
        TemporalOneCell(source, target, category.hom("none", "conflict")[0])

    with pytest.raises(ValueError, match="target tau"):
        TemporalOneCell(
            TemporalZeroCell(0, "none"),
            TemporalZeroCell(1, "true"),
            arrow,
        )


def test_temporal_two_category_laws_hold_on_sampled_knowledge_cells() -> None:
    category = knowledge_presheaf_category()
    cells = (
        TemporalZeroCell(2, "none"),
        TemporalZeroCell(1, "true"),
        TemporalZeroCell(1, "false"),
        TemporalZeroCell(0, "conflict"),
    )
    witness = temporal_two_category(category, cells)

    assert witness.holds
    assert witness.left_identity
    assert witness.right_identity
    assert witness.associative
    assert witness.twocell_associative


def test_temporal_composition_uses_both_axes() -> None:
    category = knowledge_presheaf_category()
    none = TemporalZeroCell(3, "none")
    true = TemporalZeroCell(2, "true")
    top = TemporalZeroCell(0, "conflict")
    first = TemporalOneCell(none, true, category.hom("none", "true")[0])
    second = TemporalOneCell(true, top, category.hom("true", "conflict")[0])

    composite = temporal_compose(category, first, second)

    assert composite.source == none
    assert composite.target == top
    assert composite.arrow.name == "none<=conflict"
    assert composite.settling_closes

    with pytest.raises(ValueError, match=r"first\.target"):
        temporal_compose(category, second, first)


def test_strict_temporal_twocells_are_equal_predicate_legs() -> None:
    category = knowledge_presheaf_category()
    cells = (TemporalZeroCell(1, "none"), TemporalZeroCell(0, "conflict"))
    one_cell = TemporalOneCell(cells[0], cells[1], category.hom("none", "conflict")[0])
    identity = twocell_identity(one_cell)

    assert twocell_vcompose(identity, identity) == identity

    other = TemporalOneCell(
        one_cell.source,
        one_cell.target,
        category.hom("none", "conflict")[0],
    )
    assert TemporalTwoCell(one_cell, other)

    with pytest.raises(ValueError, match="parallel"):
        TemporalTwoCell(one_cell, temporal_identity(category, cells[0]))


def test_opposite_category_reverses_predicate_axis() -> None:
    category = knowledge_presheaf_category()
    opposite = opposite_category(category)

    assert opposite.valid
    assert opposite.hom("conflict", "none")[0].name == "none<=conflict^op"
    assert opposite.hom("true", "none")[0].name == "none<=true^op"
    assert opposite.hom("none", "true") == ()


def test_temporal_beck_chevalley_reindexing_commutes() -> None:
    square = sample_temporal_bc_square()
    valuation = {
        "none": "bottom",
        "true": "positive",
        "false": "negative",
        "conflict": "top",
    }
    witness = temporal_beck_chevalley(square, valuation)

    assert square.predicate_axis_commutes
    assert square.settling_axis_closes
    assert witness.holds
    assert reindex_valuation(square.s, reindex_valuation(square.r, valuation)) == {
        "none": "top",
        "true": "top",
        "false": "top",
        "conflict": "top",
    }


def test_temporal_bc_square_rejects_non_commuting_or_open_data() -> None:
    objects = ("a", "b")
    swap = {"a": "b", "b": "a"}
    collapse = {"a": "a", "b": "a"}

    with pytest.raises(ValueError, match="commute"):
        TemporalBeckChevalleySquare(objects, swap, collapse, 0, 1, 1, 2)

    with pytest.raises(ValueError, match="settling"):
        TemporalBeckChevalleySquare(objects, collapse, collapse, 2, 1, 1, 2)

    with pytest.raises(ValueError, match="missing"):
        reindex_valuation({"a": "b"}, {"a": "seen"})
