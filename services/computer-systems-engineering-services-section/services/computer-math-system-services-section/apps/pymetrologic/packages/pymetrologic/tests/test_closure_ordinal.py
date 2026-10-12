from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.closure_operator_fiber import (
    CHARGES,
)
from pymetrologic.closure_ordinal import (
    CHARGE_K_HEIGHT,
    ClosureOrdinalWitness,
    charge_inflationary,
    charge_iter,
    charge_iter_add_holds,
    charge_iter_fixed_of,
    charge_iter_mono_holds,
    charge_iter_stable,
    charge_kchain_height_holds,
    charge_map_value,
    charge_settled_fixed,
    charge_settled_is_omega_lub,
    charge_settles_by,
    charge_settles_by_three,
    closure_ordinal_witness,
    inflationary_charge_endomaps,
)
from pymetrologic.ordinal import is_finite, of_nat, to_nat


def _as_fn(mapping):
    def apply(x):
        return charge_map_value(mapping, x)

    return apply


def test_k_height_is_derived_as_the_finite_closure_ordinal() -> None:
    closure_ordinal = of_nat(CHARGE_K_HEIGHT)
    witness = closure_ordinal_witness()

    assert CHARGE_K_HEIGHT == len(CHARGES) - 1 == 3
    assert is_finite(closure_ordinal)
    assert to_nat(closure_ordinal) == 3
    assert isinstance(witness, ClosureOrdinalWitness)
    assert witness.k_height_eq_three
    assert witness.closure_ordinal_is_finite


def test_inflationary_endomaps_are_exhausted_and_settle_by_three() -> None:
    maps = inflationary_charge_endomaps()

    assert len(maps) == 16
    for mapping in maps:
        f = _as_fn(mapping)

        assert charge_inflationary(f)
        assert all(charge_settles_by_three(f, x) for x in CHARGES)
        assert all(charge_settles_by(f, x, CHARGE_K_HEIGHT) for x in CHARGES)
        assert all(charge_settled_fixed(f, x) for x in CHARGES)


def test_iteration_laws_hold_for_sample_strict_climb() -> None:
    bl = four()

    def f(x):
        return bl.join_k(x, bl.true)

    assert charge_iter(f, 0, bl.false) == bl.false
    assert charge_iter(f, 1, bl.false) == bl.conflict
    assert charge_iter(f, 4, bl.false) == bl.conflict
    assert charge_iter_add_holds(f, bl.false, 2, 3)
    assert charge_iter_mono_holds(f, bl.none, 0, CHARGE_K_HEIGHT)
    assert charge_iter_fixed_of(f, bl.conflict)
    assert charge_iter_stable(f, bl.false, CHARGE_K_HEIGHT + 2)


def test_knowledge_chain_height_forces_a_repeated_adjacent_link() -> None:
    assert charge_kchain_height_holds()


def test_settled_value_is_the_finite_omega_lub() -> None:
    for mapping in inflationary_charge_endomaps():
        f = _as_fn(mapping)

        assert all(charge_settled_is_omega_lub(f, x) for x in CHARGES)


def test_invalid_iteration_inputs_are_rejected() -> None:
    bl = four()

    def f(x):
        return x

    with pytest.raises(ValueError, match="nonnegative"):
        charge_iter(f, -1, bl.none)
    with pytest.raises(ValueError, match="k <= m"):
        charge_iter_mono_holds(f, bl.none, 2, 1)
    with pytest.raises(ValueError, match="at or after kHeight"):
        charge_iter_stable(f, bl.none, CHARGE_K_HEIGHT - 1)


def test_closure_ordinal_witness_bundles_all_lean_legs() -> None:
    witness = closure_ordinal_witness()

    assert witness.holds
    assert witness.k_height == 3
    assert witness.inflationary_endomaps_checked == 16
    assert witness.kchain_height
    assert witness.iter_step_le
    assert witness.iter_add
    assert witness.iter_fixed_of
    assert witness.settles_by_k_height
    assert witness.settled_fixed
    assert witness.omega_lub_collapses
