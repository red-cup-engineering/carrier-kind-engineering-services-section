"""FCA-Lambek circle (RelMath.Order.FCALambekCircle)."""

from __future__ import annotations

from pymetrologic.fca_lambek import (
    boolean_lambek_algebra,
    concept_lattice_is_complete,
    fca_closure_is_settling_closure,
    fca_lambek_circle,
    lambek_biresiduation,
    lambek_commutative_collapse,
    sample_context,
)


def test_boolean_residuated_lattice_is_lambek_algebra() -> None:
    alg = boolean_lambek_algebra()

    assert alg.elements == ("0", "1")
    assert alg.unit == "1"
    assert alg.associative
    assert alg.unit_laws
    assert alg.commutative
    assert alg.dot("1", "1") == "1"
    assert alg.dot("1", "0") == "0"
    assert alg.lres("1", "0") == "0"
    assert alg.lres("0", "0") == "1"
    assert alg.rres("0", "1") == "0"


def test_lambek_biresiduation_derives_substructural_laws() -> None:
    witness = lambek_biresiduation()

    assert witness.holds
    assert witness.left_adjunction
    assert witness.right_adjunction
    assert witness.left_modus_ponens
    assert witness.right_modus_ponens
    assert witness.dot_mono_left
    assert witness.dot_mono_right
    assert witness.lres_mono_numerator
    assert witness.lres_antitone_denominator
    assert witness.rres_mono_numerator
    assert witness.rres_antitone_denominator
    assert witness.unit_residuals


def test_commutative_lambek_collapse_has_one_implication() -> None:
    witness = lambek_commutative_collapse()

    assert witness.holds
    assert witness.commutative
    assert witness.residuals_coincide
    assert witness.single_adjunction


def test_fca_derivation_closure_is_settling_closure_shape() -> None:
    extensive, monotone, idempotent = fca_closure_is_settling_closure(sample_context())

    assert extensive
    assert monotone
    assert idempotent


def test_fca_concepts_form_finite_complete_lattice() -> None:
    assert concept_lattice_is_complete(sample_context())


def test_fca_lambek_circle_bundles_the_three_proved_edges() -> None:
    witness = fca_lambek_circle()

    assert witness.holds
    assert witness.fca_closure_extensive
    assert witness.fca_closure_monotone
    assert witness.fca_closure_idempotent
    assert witness.concept_lattice_complete
    assert witness.lambek_biresiduation.holds
    assert witness.lambek_commutative_collapse.holds
    assert witness.wurm_completeness_documented_not_formalized
