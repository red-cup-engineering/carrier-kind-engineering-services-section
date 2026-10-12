"""Executable witnesses for RelMath.Real.InternalReals."""

from __future__ import annotations

from fractions import Fraction

import pytest

from pymetrologic.reals import (
    InternalRealsCompletionWitness,
    cauchy_with_modulus_sample,
    diagonal_completion_sample,
    internal_reals_completion_witness,
    le_within_rational,
    rational_orbit_converges_sample,
    rational_ordered_field_fragment,
    real_identity_vclosure_scott_continuous,
    real_value_category_axioms,
    real_value_category_sample,
    within_rational,
)


def test_rational_le_within_matches_internal_reals_slack() -> None:
    assert le_within_rational(4, Fraction(1, 2), Fraction(3, 5))
    assert le_within_rational(4, Fraction(3, 5), Fraction(1, 2))
    assert within_rational(4, Fraction(1, 2), Fraction(3, 5))
    assert not le_within_rational(4, Fraction(1), Fraction(1, 2))

    with pytest.raises(ValueError, match="natural"):
        le_within_rational(-1, Fraction(0), Fraction(0))


def test_rational_ordered_field_fragment_is_exact() -> None:
    assert rational_ordered_field_fragment()
    assert rational_ordered_field_fragment((Fraction(-2), Fraction(0), Fraction(3, 2)))

    with pytest.raises(ValueError, match="nonempty"):
        rational_ordered_field_fragment(())


def test_rational_orbit_and_diagonal_completion_are_sampled_cauchy_claims() -> None:
    values = (Fraction(1), Fraction(4, 3), Fraction(7, 5), Fraction(18, 13))

    assert cauchy_with_modulus_sample(values, max_precision=1, modulus=lambda _k: 0)
    assert rational_orbit_converges_sample(2, depth=12, max_precision=5)
    assert diagonal_completion_sample(2, depth=12, max_precision=5)

    with pytest.raises(ValueError, match="depth"):
        rational_orbit_converges_sample(2, depth=3, max_precision=3)

    with pytest.raises(ValueError, match="nonempty"):
        cauchy_with_modulus_sample((), max_precision=0, modulus=lambda _k: 0)


def test_real_value_category_samples_the_internal_real_order() -> None:
    category = real_value_category_sample((Fraction(2, 3), Fraction(1, 3), Fraction(1)))

    assert category.bot == Fraction(0)
    assert category.lattice.elements == (Fraction(0), Fraction(1, 3), Fraction(2, 3), Fraction(1))
    assert category.lattice.join(Fraction(1, 3), Fraction(2, 3)) == Fraction(2, 3)
    assert category.lattice.meet(Fraction(1, 3), Fraction(2, 3)) == Fraction(1, 3)
    assert real_value_category_axioms((Fraction(1, 3), Fraction(2, 3), Fraction(1)))
    assert real_identity_vclosure_scott_continuous((Fraction(1, 3), Fraction(2, 3), Fraction(1)))

    with pytest.raises(ValueError, match="above real zero"):
        real_value_category_sample((Fraction(-1, 3), Fraction(0)))


def test_internal_reals_completion_witness_bundles_lean_surface() -> None:
    witness = internal_reals_completion_witness(2, depth=12, max_precision=5)

    assert isinstance(witness, InternalRealsCompletionWitness)
    assert witness.square_root_completion.final_approximation == Fraction(18, 13)
    assert witness.multiplication_socket.holds
    assert witness.value_category_axioms
    assert witness.identity_closure_scott_continuous
    assert witness.holds
