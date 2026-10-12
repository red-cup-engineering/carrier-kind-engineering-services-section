"""Predication hyperdoctrine witnesses (RelMath.Predicating.Hyperdoctrine)."""

from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.predication_hyperdoctrine import (
    BaseIso,
    ConverseHyperdoctrineWitness,
    beck_chevalley,
    cell_maps_commute,
    compose_cell_maps,
    converse_base_iso,
    converse_frobenius,
    converse_hyperdoctrine_witness,
    converse_reindex_self_inverse,
    galois_reindex,
    identity_cell_map,
    reindex_comp,
    reindex_id,
    reindex_meet_k,
    reindex_mono_k,
    reindex_valuation_k,
    sample_hyperdoctrine_cells,
    sample_hyperdoctrine_valuations,
    valuation_le_k,
    valuation_meet_k,
)
from pymetrologic.yoneda import (
    PredicationCell,
)


def test_converse_base_iso_is_involutive_on_sample_support() -> None:
    cells = sample_hyperdoctrine_cells()
    iso = converse_base_iso(cells)

    assert isinstance(iso, BaseIso)
    assert iso.valid
    assert iso.left_inverse
    assert iso.right_inverse
    assert iso.fwd[cells[0]] == cells[1]
    assert iso.fwd[cells[1]] == cells[0]


def test_reindexing_is_precomposition_and_contravariantly_functorial() -> None:
    bl = four()
    cells = sample_hyperdoctrine_cells()
    iso = converse_base_iso(cells)
    valuation = {cells[0]: bl.true, cells[1]: bl.false}

    assert reindex_valuation_k(iso.fwd, valuation, cells) == {
        cells[0]: bl.false,
        cells[1]: bl.true,
    }
    assert reindex_id(valuation)
    assert compose_cell_maps(iso.fwd, iso.bwd, cells) == identity_cell_map(cells)
    assert reindex_comp(iso.fwd, iso.bwd, valuation, cells)
    assert converse_reindex_self_inverse(valuation)


def test_reindexing_preserves_knowledge_order_and_meet() -> None:
    bl = four()
    cells = sample_hyperdoctrine_cells()
    iso = converse_base_iso(cells)
    low = {cells[0]: bl.none, cells[1]: bl.true}
    high = {cells[0]: bl.false, cells[1]: bl.conflict}

    assert valuation_le_k(low, high, cells)
    assert reindex_mono_k(iso.fwd, low, high, cells)
    assert reindex_meet_k(iso.fwd, low, high, cells)
    assert valuation_meet_k(low, high) == low


def test_converse_reindexing_is_its_own_galois_adjoint() -> None:
    cells = sample_hyperdoctrine_cells()
    iso = converse_base_iso(cells)
    samples = sample_hyperdoctrine_valuations(cells)

    assert all(galois_reindex(iso, left, right) for left in samples for right in samples)


def test_converse_frobenius_and_beck_chevalley_hold() -> None:
    cells = sample_hyperdoctrine_cells()
    iso = converse_base_iso(cells)
    identity = identity_cell_map(cells)
    samples = sample_hyperdoctrine_valuations(cells)

    assert all(converse_frobenius(left, right) for left in samples for right in samples)
    assert cell_maps_commute(identity, iso.fwd, cells)
    assert all(beck_chevalley(identity, iso.fwd, valuation, cells) for valuation in samples)


def test_converse_hyperdoctrine_witness_bundles_all_laws() -> None:
    witness = converse_hyperdoctrine_witness()

    assert isinstance(witness, ConverseHyperdoctrineWitness)
    assert witness.holds
    assert witness.base_iso
    assert witness.reindex_identity
    assert witness.reindex_composition
    assert witness.reindex_monotone
    assert witness.reindex_meet_preserving
    assert witness.converse_adjunction
    assert witness.converse_self_inverse
    assert witness.converse_frobenius
    assert witness.beck_chevalley


def test_validation_errors_are_explicit() -> None:
    cells = sample_hyperdoctrine_cells()
    orphan = PredicationCell("orphan", "addresses", "nobody")
    converse = converse_base_iso(cells)

    with pytest.raises(ValueError, match="inverse"):
        BaseIso(cells, converse.fwd, identity_cell_map(cells))

    with pytest.raises(ValueError, match="missing domain"):
        reindex_valuation_k({cells[0]: cells[1]}, {cells[1]: four().true}, cells)

    with pytest.raises(ValueError, match="finite cell support"):
        valuation_le_k({cells[0]: four().true}, {orphan: four().true})
