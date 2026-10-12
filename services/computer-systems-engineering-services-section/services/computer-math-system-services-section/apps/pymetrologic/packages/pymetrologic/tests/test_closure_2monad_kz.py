"""Closure 2-monad KZ witnesses."""

from __future__ import annotations

import pytest

from pymetrologic import BL, closure_step, four, knowledge_lattice
from pymetrologic.closure_2monad_kz import (
    ClAlgebraPropertyWitness,
    Closure2MonadKZWitness,
    closed_algebra_structures,
    closure_2monad_kz_witness,
    closure_algebra_property_like,
    closure_kz_lax_idempotent,
    is_cl_algebra,
    kz_inequality,
    sample_closure_2monad_kz_witness,
    strict_regime_mu_identity,
)


def test_closure_kz_lax_idempotent_bundles_unit_mu_triangles() -> None:
    bl = four()
    lat = knowledge_lattice(bl.L)
    closure = closure_step(lat, lambda value: value, bl.true)
    witness = closure_kz_lax_idempotent(lat, closure)

    assert isinstance(witness, Closure2MonadKZWitness)
    assert witness.holds
    assert witness.unit_inflation
    assert witness.multiplication_collapse
    assert witness.triangle_cl_eta
    assert witness.triangle_eta_cl
    assert witness.kz_inequality
    assert witness.no_lax_slack
    assert witness.regime_mu_identity
    assert all(kz_inequality(lat, closure, point) for point in lat.elements)
    assert strict_regime_mu_identity(lat, closure)


def test_closure_algebra_is_property_like_fixed_point_status() -> None:
    bl = four()
    lat = knowledge_lattice(bl.L)
    closure = closure_step(lat, lambda value: value, bl.true)
    witness = closure_algebra_property_like(lat, closure)
    structures = closed_algebra_structures(lat, closure)

    assert isinstance(witness, ClAlgebraPropertyWitness)
    assert witness.holds
    assert set(witness.fixed_points) == {bl.true, bl.conflict}
    assert structures[bl.true] == ("identity",)
    assert structures[bl.conflict] == ("identity",)
    assert structures[bl.none] == ()
    assert structures[bl.false] == ()
    assert is_cl_algebra(lat, closure, bl.true)
    assert not is_cl_algebra(lat, closure, bl.none)


def test_combined_sample_witness_uses_four_knowledge_lattice() -> None:
    kz, algebra = sample_closure_2monad_kz_witness()

    assert kz.holds
    assert algebra.holds
    assert set(algebra.fixed_points) == {BL(1, 0), BL(1, 1)}


def test_closure_2monad_kz_witness_returns_both_layers() -> None:
    bl = four()
    lat = knowledge_lattice(bl.L)
    closure = closure_step(lat, lambda value: value, bl.true)
    kz, algebra = closure_2monad_kz_witness(lat, closure)

    assert kz.holds
    assert algebra.holds


def test_nonclosure_is_rejected_explicitly() -> None:
    bl = four()
    lat = knowledge_lattice(bl.L)

    def retract_top(value: BL[int]) -> BL[int]:
        return bl.none if value == bl.conflict else bl.conflict

    with pytest.raises(ValueError, match="finite closure"):
        closure_kz_lax_idempotent(lat, retract_top)

    with pytest.raises(ValueError, match="finite closure"):
        closure_algebra_property_like(lat, retract_top)
