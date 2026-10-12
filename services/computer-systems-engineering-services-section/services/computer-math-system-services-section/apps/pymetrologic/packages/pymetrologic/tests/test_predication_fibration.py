"""Predication fibration witnesses (RelMath.Predicating.PredicationFibration)."""

from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.predication_fibration import (
    BilatticeHomWitness,
    FibrationGeneratorWitness,
    GrothendieckTransposeWitness,
    PredicationFibrationTheoremWitness,
    PredicationFibrationWitness,
    converse_cell_map,
    fibration_fusion,
    fibration_generator_action_witness,
    fibration_join_k,
    fibration_join_t,
    fibration_meet_k,
    fibration_meet_t,
    fibration_negate,
    fibration_residual,
    fibration_specialization,
    fibration_specialization_map,
    fibration_witness,
    grothendieck_transpose_witness,
    object_projection_cell_map,
    predication_fibration_witness,
    reindex_is_bilattice_homomorphism,
    reindex_preserves_fusion,
    reindex_preserves_join_k,
    reindex_preserves_join_t,
    reindex_preserves_meet_k,
    reindex_preserves_meet_t,
    reindex_preserves_negate,
    reindex_preserves_residual,
    sample_fibration_cells,
    sample_fibration_valuations,
    subject_projection_cell_map,
)
from pymetrologic.predication_hyperdoctrine import (
    reindex_valuation_k,
)
from pymetrologic.yoneda import (
    PredicationCell,
)


def test_sample_support_is_closed_under_the_four_generators() -> None:
    cells = sample_fibration_cells()
    support = set(cells)
    converse = converse_cell_map(cells)
    subject = subject_projection_cell_map(cells)
    object_ = object_projection_cell_map(cells)
    specialize = fibration_specialization_map(cells)

    assert len(cells) == 8
    assert set(converse) == support
    assert set(converse.values()) == support
    assert set(subject.values()) <= support
    assert set(object_.values()) <= support
    assert set(specialize.values()) <= support
    assert all(converse[converse[cell]] == cell for cell in cells)


def test_pointwise_fiber_operations_match_four() -> None:
    bl = four()
    cells = sample_fibration_cells()
    left = {cell: bl.true for cell in cells}
    right = {cell: bl.false for cell in cells}

    assert all(value == bl.none for value in fibration_meet_k(left, right).values())
    assert all(value == bl.conflict for value in fibration_join_k(left, right).values())
    assert all(value == bl.false for value in fibration_meet_t(left, right).values())
    assert all(value == bl.true for value in fibration_join_t(left, right).values())
    assert all(value == bl.false for value in fibration_negate(left).values())
    assert fibration_fusion(left, right) == fibration_meet_t(left, right)
    assert all(value == bl.false for value in fibration_residual(left, right).values())


def test_generator_reindexing_is_precomposition() -> None:
    bl = four()
    cells = sample_fibration_cells()
    valuation = {
        cell: (bl.conflict if cell.predicate.endswith("specialized") else bl.true) for cell in cells
    }
    subject = subject_projection_cell_map(cells)
    specialize = fibration_specialization_map(cells)

    assert reindex_valuation_k(subject, valuation, cells) == {
        cell: valuation[PredicationCell(cell.subject, cell.predicate, cell.subject)]
        for cell in cells
    }
    assert reindex_valuation_k(specialize, valuation, cells) == {
        cell: valuation[
            PredicationCell(cell.subject, fibration_specialization(cell.predicate), cell.object)
        ]
        for cell in cells
    }


def test_reindexing_preserves_all_bilattice_residuated_operations() -> None:
    cells = sample_fibration_cells()
    samples = sample_fibration_valuations(cells)
    converse = converse_cell_map(cells)

    for left in samples:
        assert reindex_preserves_negate(converse, left, cells)
        for right in samples:
            assert reindex_preserves_meet_k(converse, left, right, cells)
            assert reindex_preserves_join_k(converse, left, right, cells)
            assert reindex_preserves_meet_t(converse, left, right, cells)
            assert reindex_preserves_join_t(converse, left, right, cells)
            assert reindex_preserves_fusion(converse, left, right, cells)
            assert reindex_preserves_residual(converse, left, right, cells)


def test_witness_bundles_hold() -> None:
    cells = sample_fibration_cells()
    samples = sample_fibration_valuations(cells)
    converse = converse_cell_map(cells)

    generators = fibration_generator_action_witness(samples)
    fibration = fibration_witness(samples)
    hom = reindex_is_bilattice_homomorphism(converse, samples)
    transpose = grothendieck_transpose_witness(samples)
    theorem = predication_fibration_witness(samples)

    assert isinstance(generators, FibrationGeneratorWitness)
    assert isinstance(fibration, PredicationFibrationWitness)
    assert isinstance(hom, BilatticeHomWitness)
    assert isinstance(transpose, GrothendieckTransposeWitness)
    assert isinstance(theorem, PredicationFibrationTheoremWitness)
    assert generators.holds
    assert fibration.holds
    assert hom.holds
    assert transpose.holds
    assert theorem.holds


def test_cell_map_validation_is_explicit() -> None:
    cell = PredicationCell("speaker", "addresses", "listener")

    with pytest.raises(ValueError, match="outside the finite support"):
        converse_cell_map((cell,))
