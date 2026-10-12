"""Root predication carrier (RelMath.Predicating)."""

from __future__ import annotations

import pytest

from pymetrologic.articulating_primitives import (
    ArticulationCell,
    Mark,
    Utterance,
    initial_articulation_cell,
)
from pymetrologic.predicating import (
    PredicationCell,
    converse,
    converse_converse_holds,
    converse_seed_holds,
    object_projection,
    object_projection_idem_holds,
    predicating,
    predicating_root_witness,
    seed,
    specialize,
    specialize_comp_holds,
    specialize_id_holds,
    subject_projection,
    subject_projection_idem_holds,
)


def test_seed_is_reflexive_predication_cell() -> None:
    utterance = Utterance(Mark("alice"), Mark("knows"))
    cell = seed(utterance)

    assert cell == PredicationCell(utterance.token, utterance.claim, utterance.token)
    assert cell.subject == cell.object
    assert converse_seed_holds(utterance)


def test_predicating_only_accepts_potential_cell() -> None:
    # The potential corner (yes, no) — token articulated, claim not — is
    # predicating's domain (docs/history/corner-naming-convention.md: "Its
    # carrier PotentialCell is the told-true corner (yes, no) … not a
    # contentless (no, no) cell").
    utterance = Utterance(Mark("alice"), Mark("knows"))
    potential = ArticulationCell(utterance, token_articulated=True, claim_articulated=False)
    assert predicating(potential) == seed(utterance)

    # The absurd cell — no evidence at all — is not predicating's domain.
    with pytest.raises(ValueError, match="potential"):
        predicating(initial_articulation_cell(utterance))


def test_predication_generators_obey_root_laws() -> None:
    cell = PredicationCell(Mark("alice"), Mark("knows"), Mark("bob"))

    def predicate_map(mark: Mark) -> Mark:
        return Mark(f"{mark.surface}:specialized")

    assert converse(cell) == PredicationCell(cell.object, cell.predicate, cell.subject)
    assert converse(cell) != cell
    assert converse_converse_holds(cell)

    assert subject_projection(cell) == PredicationCell(cell.subject, cell.predicate, cell.subject)
    assert object_projection(cell) == PredicationCell(cell.object, cell.predicate, cell.object)
    assert subject_projection_idem_holds(cell)
    assert object_projection_idem_holds(cell)

    assert specialize(predicate_map, cell).predicate == Mark("knows:specialized")
    assert specialize_id_holds(cell)
    assert specialize_comp_holds(
        lambda mark: Mark(f"{mark.surface}:f"),
        lambda mark: Mark(f"{mark.surface}:g"),
        cell,
    )


def test_predicating_root_witness_holds() -> None:
    assert predicating_root_witness().holds
