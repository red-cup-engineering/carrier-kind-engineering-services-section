"""Dual predication hyperdoctrine witnesses."""

from __future__ import annotations

import pytest

from pymetrologic import classical_eq, four, paraconsistent_eq
from pymetrologic.orderswap import swap as charge_swap
from pymetrologic.predication_fibration import (
    sample_fibration_cells,
    sample_fibration_valuations,
)
from pymetrologic.predication_hyperdoctrine_dual import (
    DualAdjointSystemWitness,
    DualHyperdoctrineWitness,
    FiniteCellFibration,
    GaloisTransportWitness,
    beck_chevalley_dual,
    classical_eq_is_swap_paraconsistent,
    conj_cell_operator,
    dual_adjoint_system_witness,
    exists_k_cell,
    exists_t_cell,
    forall_k_cell,
    forall_t_cell,
    frobenius_dual,
    galois_k,
    galois_k_to_galois_t,
    galois_t,
    predication_hyperdoctrine_dual_witness,
    reindex_cell_fibration,
    sample_dual_cell_fibration,
    sample_dual_codomain_valuations,
    sample_dual_domain_valuations,
    two_equalities_one_diagonal,
    val_swap,
    val_swap_le_k_le_t,
    val_swap_le_t_le_k,
    valuation_le_t,
)


def test_sigma_lifts_to_valuation_order_iso() -> None:
    cells = sample_fibration_cells()
    samples = sample_fibration_valuations(cells)

    assert all(val_swap(val_swap(valuation)) == valuation for valuation in samples)
    assert all(
        val_swap_le_k_le_t(left, right, cells) and val_swap_le_t_le_k(left, right, cells)
        for left in samples
        for right in samples
    )


def test_galois_transport_for_converse_reindexing() -> None:
    cells = sample_fibration_cells()
    samples = sample_fibration_valuations(cells)
    cell_map = {cell: cell.converse() for cell in cells}

    def reindex(valuation):
        return {cell: valuation[cell_map[cell]] for cell in cells}

    transport = galois_k_to_galois_t(reindex, reindex, samples)

    assert isinstance(transport, GaloisTransportWitness)
    assert galois_k(reindex, reindex, samples, cells)
    assert galois_t(conj_cell_operator(reindex), conj_cell_operator(reindex), samples, cells)
    assert transport.holds


def test_dual_cell_fibration_quantifiers_and_sigma_transport() -> None:
    bl = four()
    fibration = sample_dual_cell_fibration()
    domain_val = sample_dual_domain_valuations(fibration)[4]
    codomain_val = sample_dual_codomain_valuations(fibration)[1]

    assert isinstance(fibration, FiniteCellFibration)
    assert fibration.mem_fiber
    assert set(reindex_cell_fibration(fibration, codomain_val)) == set(fibration.domain)
    assert all(value in bl.sample() for value in exists_k_cell(fibration, domain_val).values())
    assert all(value in bl.sample() for value in forall_k_cell(fibration, domain_val).values())
    assert val_swap(exists_k_cell(fibration, val_swap(domain_val))) == exists_t_cell(
        fibration,
        domain_val,
    )
    assert val_swap(forall_k_cell(fibration, val_swap(domain_val))) == forall_t_cell(
        fibration,
        domain_val,
    )


def test_dual_adjoint_system_witness_bundles_transport() -> None:
    witness = dual_adjoint_system_witness()

    assert isinstance(witness, DualAdjointSystemWitness)
    assert witness.holds
    assert witness.exists_k_adjunction
    assert witness.forall_k_adjunction
    assert witness.exists_t_adjunction
    assert witness.forall_t_adjunction
    assert witness.exists_transport
    assert witness.forall_transport
    assert witness.reindex_transport


def test_two_equalities_are_one_diagonal_under_sigma() -> None:
    pairs = ((0, 0), (0, 1), ("cell", "cell"), ("cell", "other"))

    assert all(classical_eq_is_swap_paraconsistent(left, right) for left, right in pairs)
    assert all(
        classical_eq(left, right) == charge_swap(paraconsistent_eq(left, right))
        for left, right in pairs
    )
    assert two_equalities_one_diagonal(pairs)


def test_dual_frobenius_and_beck_chevalley_hold() -> None:
    samples = sample_fibration_valuations()

    assert frobenius_dual(samples)
    assert beck_chevalley_dual(samples)


def test_dual_hyperdoctrine_witness_bundles_all_laws() -> None:
    witness = predication_hyperdoctrine_dual_witness()

    assert isinstance(witness, DualHyperdoctrineWitness)
    assert witness.holds
    assert witness.valuation_order_iso
    assert witness.galois_transport.holds
    assert witness.dual_adjoint_system.holds
    assert witness.two_equalities
    assert witness.frobenius_dual
    assert witness.beck_chevalley_dual


def test_validation_errors_are_explicit() -> None:
    cells = sample_fibration_cells()
    bad_base = {cell: cell for cell in cells[:-1]}

    with pytest.raises(ValueError, match="base map"):
        FiniteCellFibration(cells, cells, bad_base, {cell: (cell,) for cell in cells})

    with pytest.raises(ValueError, match="same finite cell support"):
        valuation_le_t({cells[0]: four().true}, {cells[1]: four().true})
