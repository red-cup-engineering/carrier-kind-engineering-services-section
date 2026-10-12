"""Lawvere-harmonic cohomology bridge (RelMath.Cohomology.LawvereHarmonicCohomology)."""

from __future__ import annotations

from collections.abc import Callable
from typing import cast

import pytest

from pymetrologic import BL, closure_step, four, knowledge_lattice
from pymetrologic.calculus import Assignment, PredicationSheaf, triangle_sheaf
from pymetrologic.harmonic_cohomology import (
    designated_values,
    lawvere_harmonic_section_classifying_invariant_zero,
)
from pymetrologic.regimes import (
    ClosureRegime,
)

bl = four()
lat = knowledge_lattice(bl.L)
add_true: Callable[[BL[int]], BL[int]] = closure_step(lat, lambda x: x, bl.true)


def _encoded(a: str, b: str, c: str) -> tuple[PredicationSheaf, Assignment[object, object]]:
    sheaf, assignment = triangle_sheaf(a, b, c).to_predication_sheaf()
    return cast(PredicationSheaf, sheaf), cast(Assignment[object, object], assignment)


def test_lawvere_harmonic_section_has_zero_classifying_invariant() -> None:
    sheaf, assignment = _encoded("0", "0", "0")

    witness = lawvere_harmonic_section_classifying_invariant_zero(
        lat,
        add_true,
        bl.none,
        sheaf,
        assignment,
        ClosureRegime.strict,
    )

    assert witness.holds
    assert witness.harmonic_value == bl.true
    assert witness.classifying_invariant.is_zero
    assert witness.h0_extent == 6
    assert len(designated_values(sheaf, witness.global_section.section)) == 6


def test_scott_flat_regime_has_the_same_zero_bridge() -> None:
    sheaf, assignment = _encoded("1", "1", "1")

    witness = lawvere_harmonic_section_classifying_invariant_zero(
        lat,
        add_true,
        bl.none,
        sheaf,
        assignment,
        ClosureRegime.scott,
    )

    assert witness.holds
    assert witness.flat_regime
    assert witness.cocycle
    assert witness.coboundary
    assert witness.unique_global_section


def test_conflicted_assignment_is_not_the_zero_harmonic_bridge() -> None:
    sheaf, assignment = _encoded("0", "1", "0")

    witness = lawvere_harmonic_section_classifying_invariant_zero(
        lat,
        add_true,
        bl.none,
        sheaf,
        assignment,
        ClosureRegime.strict,
    )

    assert not witness.holds
    assert witness.harmonic
    assert not witness.cocycle
    assert not witness.coboundary
    assert not witness.unique_global_section


def test_curved_regime_is_out_of_scope_for_zero_class_theorem() -> None:
    sheaf, assignment = _encoded("0", "0", "0")

    with pytest.raises(ValueError, match="flat regimes"):
        lawvere_harmonic_section_classifying_invariant_zero(
            lat,
            add_true,
            bl.none,
            sheaf,
            assignment,
            ClosureRegime.aperiodic,
        )
