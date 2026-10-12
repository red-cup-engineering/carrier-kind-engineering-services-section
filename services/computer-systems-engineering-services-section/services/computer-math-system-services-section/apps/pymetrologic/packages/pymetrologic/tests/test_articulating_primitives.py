"""Primitive articulating carriers from RelMath.Mark and RelMath.Articulating."""

from __future__ import annotations

from pymetrologic import four
from pymetrologic.articulating_primitives import (
    ARTICULATION_CORNERS,
    KINDS,
    ArticulationCell,
    ArticulationPrimitiveWitness,
    Kind,
    Mark,
    Utterance,
    articulating_primitive_witness,
    articulation_phase_is_charge,
    corner_card_eq_four,
    corner_of_articulation_status,
    corner_status_roundtrip,
    initial_articulation_cell,
    kind_token_ne_claim,
    kind_two_kinds,
    mark_at,
    realize_corner,
)
from pymetrologic.quartet import CORNERS, Corner, charge_of_corner, corner_of_charge


def test_kind_has_exactly_two_distinct_positions() -> None:
    assert (Kind.token, Kind.claim) == KINDS
    assert all(kind_two_kinds(kind) for kind in Kind)
    assert kind_token_ne_claim()


def test_utterance_recovers_marks_by_position() -> None:
    token = Mark("identity-side")
    claim = Mark("content-side")
    utterance = Utterance(token, claim)

    assert mark_at(utterance, Kind.token) == token
    assert mark_at(utterance, Kind.claim) == claim
    assert mark_at(utterance, Kind.token) != mark_at(utterance, Kind.claim)


def test_articulation_status_classifies_four_corners() -> None:
    assert ARTICULATION_CORNERS == CORNERS
    assert corner_card_eq_four()
    assert corner_status_roundtrip()

    assert corner_of_articulation_status(False, False) is Corner.ABSURD
    assert corner_of_articulation_status(True, False) is Corner.POTENTIAL
    assert corner_of_articulation_status(False, True) is Corner.ACTIVE
    assert corner_of_articulation_status(True, True) is Corner.STABLE


def test_initial_cell_is_potential() -> None:
    utterance = Utterance(Mark("t"), Mark("c"))
    cell = initial_articulation_cell(utterance)

    assert isinstance(cell, ArticulationCell)
    assert cell.utterance == utterance
    assert cell.four_corner == (False, False)
    assert cell.corner is Corner.ABSURD
    assert articulation_phase_is_charge(cell)


def test_every_corner_is_realized_over_any_utterance() -> None:
    utterance = Utterance(Mark("who"), Mark("what"))
    bl = four()

    for corner in CORNERS:
        cell = realize_corner(utterance, corner)
        assert cell.corner is corner
        assert corner_of_charge(bl, charge_of_corner(bl, cell.corner)) is corner
        assert articulation_phase_is_charge(cell)


def test_articulating_primitive_witness_bundles_the_lean_laws() -> None:
    witness = articulating_primitive_witness()

    assert isinstance(witness, ArticulationPrimitiveWitness)
    assert witness.corner_cardinality == 4
    assert witness.holds
