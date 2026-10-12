"""Lax-idempotence slack diagnosis (RelMath.Closure.LaxSlackDiagnosis)."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import BL, closure_step, four, knowledge_lattice
from pymetrologic.lax_slack import (
    FiniteRelation,
    closure_no_lax_slack,
    has_lax_slack,
    is_antisymmetric,
    is_inflationary_relation,
    kz_iff_strict_of_antisymm,
    kz_inequality_at,
    lax_slack_witness,
    strict_idempotent_at,
)

bl = four()
lat = knowledge_lattice(bl.L)
add_true: Callable[[BL[int]], BL[int]] = closure_step(lat, lambda x: x, bl.true)


def test_kz_inequality_collapses_to_strict_idempotence_on_four() -> None:
    rel = FiniteRelation(lat.elements, lat.leq)
    witnesses = kz_iff_strict_of_antisymm(rel, add_true)

    assert is_antisymmetric(rel)
    assert is_inflationary_relation(rel, add_true)
    assert all(witness.forced_by_antisymmetry for witness in witnesses)
    assert all(witness.kz_inequality == witness.strict_idempotent for witness in witnesses)
    assert all(kz_inequality_at(rel, add_true, x) for x in lat.elements)
    assert all(strict_idempotent_at(add_true, x) for x in lat.elements)


def test_closure_on_thin_lattice_has_no_lax_slack() -> None:
    rel = FiniteRelation(lat.elements, lat.leq)

    assert closure_no_lax_slack(lat, add_true)
    assert not has_lax_slack(rel, add_true)


def test_genuine_lax_slack_witnesses_antisymmetry_failure() -> None:
    rel = FiniteRelation(("a", "b"), lambda _left, _right: True)

    def flip(x: str) -> str:
        return "b" if x == "a" else "a"

    witness = lax_slack_witness(rel, flip, "a")

    assert not is_antisymmetric(rel)
    assert is_inflationary_relation(rel, flip)
    assert witness.holds
    assert witness.once == "b"
    assert witness.twice == "a"
    assert witness.antisymmetry_failure
    assert has_lax_slack(rel, flip)


def test_kz_strict_comparison_rejects_non_antisymmetric_carrier() -> None:
    rel = FiniteRelation(("a", "b"), lambda _left, _right: True)

    with pytest.raises(ValueError, match="antisymmetric"):
        kz_iff_strict_of_antisymm(rel, lambda x: x)


def test_closure_no_lax_slack_rejects_nonclosure_operator() -> None:
    def retract_top(x: BL[int]) -> BL[int]:
        return bl.none if x == bl.conflict else bl.conflict

    with pytest.raises(ValueError, match="closure"):
        closure_no_lax_slack(lat, retract_top)
