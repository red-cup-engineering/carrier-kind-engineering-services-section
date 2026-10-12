"""Finite Yoneda witnesses (RelMath.Predicating.YonedaArrowsFirst)."""

from __future__ import annotations

import pytest

from pymetrologic.yoneda import (
    Arrow,
    PredicationCell,
    incoming_arrow_bundle,
    knowledge_presheaf_category,
    kp_initial_arrow,
    kp_object_is_its_arrows,
    kp_terminal_arrow,
    object_recovered_by_representables,
    predication_discrete_category,
    predication_object_is_its_arrows,
    representable_functoriality,
    representable_signature,
    yoneda_arrows_first,
    yoneda_faithful_on_homs,
    yoneda_image,
    yoneda_recovers_homs,
)


def test_knowledge_presheaf_category_has_initial_and_terminal_charges() -> None:
    category = knowledge_presheaf_category()

    assert category.valid
    assert kp_object_is_its_arrows()
    assert all(kp_initial_arrow(target).source == "none" for target in category.objects)
    assert all(kp_terminal_arrow(source).target == "conflict" for source in category.objects)
    assert category.hom("true", "false") == ()
    assert category.hom("true", "conflict")[0].name == "true<=conflict"


def test_representable_is_the_incoming_arrow_bundle() -> None:
    category = knowledge_presheaf_category()
    bundle = incoming_arrow_bundle(category, "true")

    assert tuple(arrow.name for arrow in bundle["none"]) == ("none<=true",)
    assert tuple(arrow.name for arrow in bundle["true"]) == ("true<=true",)
    assert bundle["false"] == ()
    assert representable_signature(category, "true") != representable_signature(
        category,
        "false",
    )


def test_representable_functoriality_and_yoneda_hom_recovery() -> None:
    category = knowledge_presheaf_category()
    arrow = category.hom("true", "conflict")[0]
    image = yoneda_image(category, arrow)

    assert all(representable_functoriality(category, target) for target in category.objects)
    assert yoneda_recovers_homs(category)
    assert yoneda_faithful_on_homs(category)
    assert ("true", (("true<=true", "true<=conflict"),)) in image
    assert ("none", (("none<=true", "none<=conflict"),)) in image


def test_discrete_predication_category_distinguishes_converse_cells() -> None:
    cell = PredicationCell("alice", "trusts", "bob")
    converse = cell.converse()
    category = predication_discrete_category((cell, converse))

    assert category.valid
    assert object_recovered_by_representables(category)
    assert predication_object_is_its_arrows(cell)
    assert representable_signature(category, cell) != representable_signature(
        category,
        converse,
    )
    assert category.hom(cell, converse) == ()
    assert category.hom(cell, cell)[0].source == cell


def test_symmetric_predication_cell_is_its_own_converse() -> None:
    cell = PredicationCell("alice", "knows-self", "alice")

    assert cell.converse() == cell
    assert predication_object_is_its_arrows(cell)


def test_yoneda_arrows_first_witness_bundles_the_lean_theorem_shape() -> None:
    witness = yoneda_arrows_first()

    assert witness.holds
    assert witness.category_laws
    assert witness.representable_functoriality
    assert witness.hom_recovery
    assert witness.full_faithful_on_homs
    assert witness.object_recovery
    assert witness.knowledge_initial_terminal
    assert witness.predication_converse_distinguished


def test_invalid_composition_endpoint_is_rejected() -> None:
    category = knowledge_presheaf_category()
    true_to_top = category.hom("true", "conflict")[0]
    false_to_top = category.hom("false", "conflict")[0]

    with pytest.raises(ValueError, match=r"left\.target"):
        category.compose(true_to_top, false_to_top)

    stray = Arrow("stray", "true", "none")
    with pytest.raises(KeyError):
        category.compose(stray, category.identity("none"))
