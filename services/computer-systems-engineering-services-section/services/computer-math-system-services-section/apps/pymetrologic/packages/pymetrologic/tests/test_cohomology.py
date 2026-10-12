"""Settling cohomology H⁰/H¹ (RelMath.Cohomology.SettlingCohomologyH1).

H⁰ = the designated-cell count; H¹ vanishes ⟺ the local sections glue into one
global section (cascade settling); cohomology is trivial above degree 1.
"""

from __future__ import annotations

from pymetrologic.calculus import (
    h0,
    h0_designated_count,
    h1_obstruction,
    h1_vanishes,
    hn_trivial_above_one,
    inconsistency_count,
    knowledge_designated_count,
    triangle_sheaf,
)


def _encoded(a: str, b: str, c: str) -> tuple[object, object]:
    return triangle_sheaf(a, b, c).to_predication_sheaf()


def test_h1_vanishes_iff_the_sections_glue() -> None:
    sheaf, assignment = _encoded("0", "0", "0")  # consistent
    assert h1_vanishes(sheaf, assignment)  # type: ignore[arg-type]
    assert h1_obstruction(sheaf, assignment) == {}  # type: ignore[arg-type]

    sheaf2, assignment2 = _encoded("0", "1", "0")  # the dissenter breaks gluing
    assert not h1_vanishes(sheaf2, assignment2)  # type: ignore[arg-type]
    assert h1_obstruction(sheaf2, assignment2)  # type: ignore[arg-type]


def test_h0_is_a_positive_designated_count_when_glued() -> None:
    sheaf, assignment = _encoded("0", "0", "0")
    section = h0(sheaf, assignment).section  # type: ignore[arg-type]
    # Every vertex and every edge settles to a designated (= true) value at "0".
    assert h0_designated_count(sheaf, section) == 6  # type: ignore[arg-type]


def test_cohomology_is_trivial_above_degree_one() -> None:
    assert not hn_trivial_above_one(0)
    assert not hn_trivial_above_one(1)
    assert hn_trivial_above_one(2)
    assert hn_trivial_above_one(5)


def test_inconsistency_sheaf_is_zero_iff_consistent() -> None:
    sheaf, assignment = _encoded("0", "0", "0")  # consistent — no ⊤ cells
    section = h0(sheaf, assignment).section  # type: ignore[arg-type]
    assert inconsistency_count(sheaf, section) == 0  # type: ignore[arg-type]

    sheaf2, assignment2 = _encoded("0", "1", "0")  # inconsistent — ⊤ cells appear
    section2 = h0(sheaf2, assignment2).section  # type: ignore[arg-type]
    assert inconsistency_count(sheaf2, section2) > 0  # type: ignore[arg-type]


def test_knowledge_side_splits_as_truth_plus_inconsistency() -> None:
    # The SES 0 → F^(t) → F^(k) → F^(⊤) → 0: the knowledge count is the disjoint
    # sum of the truth side and the inconsistency side.
    for a, b, c in (("0", "0", "0"), ("0", "1", "0"), ("1", "0", "1")):
        sheaf, assignment = _encoded(a, b, c)
        section = h0(sheaf, assignment).section  # type: ignore[arg-type]
        k = knowledge_designated_count(sheaf, section)  # type: ignore[arg-type]
        t = h0_designated_count(sheaf, section)  # type: ignore[arg-type]
        top = inconsistency_count(sheaf, section)  # type: ignore[arg-type]
        assert k == t + top
