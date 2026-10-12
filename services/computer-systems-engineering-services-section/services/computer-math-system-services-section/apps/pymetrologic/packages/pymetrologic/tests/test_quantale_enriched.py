"""Quantale-enriched sheaf core over FOUR."""

from __future__ import annotations

import pytest

from pymetrologic import BL, four
from pymetrologic.quantale_enriched import (
    charge_mul_img,
    charge_quantale_laws,
    charge_s_sup,
    discrete_qcat,
    h0_laplacian_fixed_points,
    identity_qfunctor,
    one_obj_qcat,
    q_fuzzy_equivalence_composes,
    q_laplacian,
    qcat_is_quantale_category,
    qfunctor_compose,
)


def test_charge_supremum_is_knowledge_join_over_selected_charges() -> None:
    bl = four()

    assert charge_s_sup(()) == bl.none
    assert charge_s_sup((bl.true, bl.false)) == bl.conflict
    assert charge_s_sup((bl.none, bl.true)) == bl.true
    assert charge_s_sup((bl.false, bl.conflict)) == bl.conflict

    with pytest.raises(ValueError, match="not one of Belnap FOUR"):
        charge_s_sup((BL(2, 0),))


def test_charge_quantale_laws_hold_by_finite_exhaustion() -> None:
    witness = charge_quantale_laws()

    assert witness.holds
    assert witness.assoc
    assert witness.commutative
    assert witness.unit
    assert witness.s_sup_upper
    assert witness.s_sup_least
    assert witness.mul_s_sup_distributes
    assert witness.mul_mono


def test_meet_distributes_over_charge_supremum_image() -> None:
    bl = four()
    selected = (bl.true, bl.conflict)

    assert charge_mul_img(bl.false, selected) == (bl.none, bl.false)
    assert bl.meet_k(bl.false, charge_s_sup(selected)) == charge_s_sup(
        charge_mul_img(bl.false, selected)
    )


def test_one_object_and_discrete_qcategories_are_valid() -> None:
    one = one_obj_qcat()
    discrete = discrete_qcat(("x", "y"))

    assert one.valid
    assert discrete.valid
    assert one.hom("unit", "unit") == four().conflict
    assert discrete.hom("x", "x") == four().conflict
    assert discrete.hom("x", "y") == four().none


def test_qfunctor_identity_and_composition_preserve_homs() -> None:
    category = discrete_qcat(("x", "y"))
    identity = identity_qfunctor(category)
    composite = qfunctor_compose(identity, identity)

    assert identity.preserves_homs
    assert composite.preserves_homs
    assert composite.map("x") == "x"


def test_qcategory_theory_and_fuzzy_equivalence_composition_witnesses() -> None:
    qcat = qcat_is_quantale_category()
    fuzzy = q_fuzzy_equivalence_composes()

    assert qcat.holds
    assert fuzzy.holds
    assert fuzzy.composite_grade == four().none
    assert fuzzy.expected_grade == four().none
    assert fuzzy.grade_one_strict_source
    assert fuzzy.grade_one_strict_target


def test_h0_qcohomology_is_laplacian_fixed_points() -> None:
    bl = four()

    true_weight = h0_laplacian_fixed_points(bl.true)
    false_weight = h0_laplacian_fixed_points(bl.false)
    top_weight = h0_laplacian_fixed_points(bl.conflict)

    assert true_weight.holds
    assert true_weight.fixed_points == (bl.none, bl.true)
    assert false_weight.holds
    assert false_weight.fixed_points == (bl.none, bl.false)
    assert top_weight.holds
    assert set(top_weight.fixed_points) == set((bl.none, bl.false, bl.true, bl.conflict))
    assert q_laplacian(bl.true, bl.conflict) == bl.true
