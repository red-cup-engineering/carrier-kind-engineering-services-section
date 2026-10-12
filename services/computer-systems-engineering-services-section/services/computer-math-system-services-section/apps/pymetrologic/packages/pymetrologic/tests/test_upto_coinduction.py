"""Up-to-closure coinduction (RelMath.Aperiodic.UpToClosureCoinduction)."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pymetrologic import BL, closure_step, four, knowledge_lattice
from pymetrologic.upto_coinduction import (
    bisim_iff_settle_eq,
    bisim_utc_holds,
    bisim_utc_orbit_holds,
    bisim_utc_settle_kernel_holds,
    bisim_utc_sound,
    cross_base_classification,
    geo_mld,
    geo_mld_iff_settle_eq,
    settle_closure_absorbs,
    settle_orbit_constant,
)

bl = four()
lat = knowledge_lattice(bl.L)
add_true: Callable[[BL[int]], BL[int]] = closure_step(lat, lambda x: x, bl.true)


def settled_kernel(left: BL[int], right: BL[int]) -> bool:
    return lat.eq(add_true(left), add_true(right))


def test_settling_absorbs_closure_and_is_constant_along_orbit() -> None:
    witness = settle_closure_absorbs(lat, add_true, bl.none)

    assert witness.holds
    assert witness.seed == bl.none
    assert witness.settled == bl.true
    assert settle_orbit_constant(lat, add_true, bl.none)
    assert settle_orbit_constant(lat, add_true, bl.false)


def test_bisimilarity_is_classified_by_settled_value() -> None:
    for left in lat.elements:
        for right in lat.elements:
            assert bisim_iff_settle_eq(lat, add_true, left, right)

    assert settled_kernel(bl.none, bl.true)
    assert not settled_kernel(bl.none, bl.false)


def test_settled_value_kernel_is_bisimulation_up_to_closure() -> None:
    assert bisim_utc_settle_kernel_holds(lat, add_true)
    assert bisim_utc_holds(lat, add_true, settled_kernel)
    assert bisim_utc_orbit_holds(lat, add_true, settled_kernel, bl.none, bl.true)

    witness = bisim_utc_sound(lat, add_true, settled_kernel, bl.none, bl.true)

    assert witness.holds
    assert witness.relation_agrees_on_settle
    assert witness.relation_closed_under_closure
    assert witness.related_orbits
    assert witness.sound


def test_relation_that_is_not_closed_under_joint_closure_is_not_utc() -> None:
    def same_unsettled_pair(left: BL[int], right: BL[int]) -> bool:
        return left == bl.none and right == bl.none

    assert not bisim_utc_holds(lat, add_true, same_unsettled_pair)

    witness = bisim_utc_sound(lat, add_true, same_unsettled_pair, bl.none, bl.none)
    assert not witness.holds
    assert witness.relation_agrees_on_settle
    assert not witness.relation_closed_under_closure
    assert not witness.related_orbits


def test_geometric_mld_is_exactly_settled_value_equality() -> None:
    assert geo_mld(lat, add_true, bl.none, bl.true)
    assert not geo_mld(lat, add_true, bl.none, bl.false)

    for left in lat.elements:
        for right in lat.elements:
            assert geo_mld_iff_settle_eq(lat, add_true, left, right)

    witness = cross_base_classification(lat, add_true, bl.none, bl.true)

    assert witness.holds
    assert witness.left == bl.none
    assert witness.right == bl.true
    assert witness.settled_left == bl.true
    assert witness.settled_right == bl.true
    assert witness.reflexive
    assert witness.symmetric
    assert witness.transitive


def test_up_to_closure_rejects_nonclosure_operator() -> None:
    def toggle(value: BL[int]) -> BL[int]:
        return bl.true if value == bl.none else bl.none

    with pytest.raises(ValueError, match="closure operator"):
        settle_closure_absorbs(lat, toggle, bl.none)

    with pytest.raises(ValueError, match="closure operator"):
        geo_mld(lat, toggle, bl.none, bl.true)
