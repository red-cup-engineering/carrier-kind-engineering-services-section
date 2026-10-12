"""Settling monotonicity, quiescence, and cosettling."""

from __future__ import annotations

from pymetrologic.settling_monotonicity_quiescence import (
    CosettlingWitness,
    SettlingMonotonicityQuiescenceWitness,
    cosettling_join_subsemilattice,
    cosettling_preimages,
    is_quiescent,
    orbit_constant_from,
    orbit_constant_iff_fixed,
    orbit_le_succ,
    orbit_monotone,
    sample_truth_join_closure,
    settle_least_quiescent,
    settle_quiescent,
    settled_value,
    settling_monotonicity_quiescence_witness,
)


def test_closure_orbit_ascends_and_is_monotone() -> None:
    lat, closure, seed = sample_truth_join_closure()

    assert orbit_le_succ(lat, closure, seed, 0)
    assert orbit_le_succ(lat, closure, seed, 1)
    assert orbit_monotone(lat, closure, seed, steps=4)


def test_quiescence_is_fixed_point_status() -> None:
    lat, closure, seed = sample_truth_join_closure()
    settled = settled_value(lat, closure, seed)

    assert is_quiescent(lat, closure, settled)
    assert orbit_constant_from(lat, closure, seed, 1, horizon=3)
    assert orbit_constant_iff_fixed(lat, closure, seed, 1, horizon=3)
    assert settle_quiescent(lat, closure, seed)
    assert settle_least_quiescent(lat, closure, seed)


def test_cosettling_preimages_have_top_and_join_closure() -> None:
    lat, closure, seed = sample_truth_join_closure()
    stable = settled_value(lat, closure, seed)
    preimages = cosettling_preimages(lat, closure, stable)
    witness = cosettling_join_subsemilattice(lat, closure, stable)

    assert isinstance(witness, CosettlingWitness)
    assert len(preimages) == witness.preimage_count
    assert stable in preimages
    assert witness.holds


def test_settling_monotonicity_quiescence_witness_bundles_the_lean_laws() -> None:
    witness = settling_monotonicity_quiescence_witness()

    assert isinstance(witness, SettlingMonotonicityQuiescenceWitness)
    assert witness.cosettling.preimage_count == 2
    assert witness.holds
