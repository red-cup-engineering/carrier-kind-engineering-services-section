"""Tests for kernel.record_types — the six Tier B types it owns
(Witness is foreign, see test_witness.py) and its
validate_record/verify_records split."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pyfars.kernel import record_types
from pyfars.kernel.identity import identity_of_record
from pyfars.kernel.record_types import (
    make_correction_record,
    make_observation,
    make_office,
    make_officer_installation,
    make_session,
    make_status_event,
    validate_record,
    verify_records,
)
from pyfars.kernel.witness import make_witness

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_VECTORS_PATH = _SECTION_ROOT / "lib" / "conformance" / "record-vectors.json"


def _load_vectors() -> dict[str, Any]:
    with _VECTORS_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


_DOCUMENT = _load_vectors()
_VECTORS = _DOCUMENT["vectors"]
_GUARD_WITNESS = _DOCUMENT["support"]["guardWitness"]

# Witness is foreign to this module (owned by kernel/witness.py, see
# test_witness.py) — these vectors exercise only the six types
# record_types.validate_record owns.
_OWNED_VECTORS = [v for v in _VECTORS if v["type"] != "Witness"]


# -- shared conformance vectors: valid accepted, invalid rejected --------


@pytest.mark.parametrize("vector", _OWNED_VECTORS, ids=lambda v: v["name"])
def test_valid_vector_is_accepted_and_id_round_trips(vector: dict[str, Any]) -> None:
    record = vector["valid"]
    validate_record(record)
    assert record["id"] == identity_of_record(dict(record))


@pytest.mark.parametrize("vector", _OWNED_VECTORS, ids=lambda v: v["name"])
def test_invalid_vector_is_rejected(vector: dict[str, Any]) -> None:
    with pytest.raises((ValueError, TypeError)):
        validate_record(vector["invalid"])


def test_all_seven_tier_b_types_are_covered() -> None:
    assert {v["type"] for v in _VECTORS} == {
        "Witness",
        "Observation",
        "CorrectionRecord",
        "StatusEvent",
        "Office",
        "OfficerInstallation",
        "Session",
    }


def test_shared_vectors_cross_validate_together() -> None:
    records = [v["valid"] for v in _VECTORS] + [_GUARD_WITNESS]
    summary = verify_records(records)
    assert summary["ok"] is True
    assert summary["records"] == len(records)


# -- constructors: id = identity_of_record(body) round-trip --------------


def _make_all() -> dict[str, Any]:
    witness = make_witness(
        operator="fm_add",
        target="concepts/alpha.md",
        before_digest=None,
        after_digest="sha256:" + "a" * 64,
        details={"field": "depends-on"},
        agent="morgan",
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=(False, False),
        four_after=(True, False),
        channel="substrate",
    )
    guard = make_witness(
        operator="dispatch",
        target="offices/librarian",
        before_digest=None,
        after_digest=None,
        details={},
        agent="morgan",
        timestamp="2026-08-19T00:00:01Z",
        kind="guard",
        four_before=(False, False),
        four_after=(True, False),
        channel="governance",
    )
    observation = make_observation(
        accord="memory",
        proposition="alpha exists",
        witness_id=witness.id,
        agent="morgan",
    )
    correction = make_correction_record(
        target=witness.id, replacement=witness.id, reason="typo"
    )
    status = make_status_event(target=witness.id, transition="revocation")
    office = make_office(slug="librarian", scope="corpus", duties=["curate"])
    installation = make_officer_installation(
        office=office.id,
        officer="morgan",
        as_role="librarian",
        constitution="constitution:librarian-v1",
        authorizing_act=guard.id,
    )
    session = make_session(office=office.id)
    return {
        "Witness": witness,
        "guard": guard,
        "Observation": observation,
        "CorrectionRecord": correction,
        "StatusEvent": status,
        "Office": office,
        "OfficerInstallation": installation,
        "Session": session,
    }


@pytest.mark.parametrize(
    "key",
    [
        "Observation",
        "CorrectionRecord",
        "StatusEvent",
        "Office",
        "OfficerInstallation",
        "Session",
    ],
)
def test_constructed_record_id_round_trips(key: str) -> None:
    record = _make_all()[key].to_record()
    assert record["id"] == identity_of_record(dict(record))
    validate_record(record)


def test_constructed_records_cross_validate() -> None:
    records = _make_all()
    verify_records(
        [
            records["Witness"].to_record(),
            records["guard"].to_record(),
            records["Observation"].to_record(),
            records["CorrectionRecord"].to_record(),
            records["StatusEvent"].to_record(),
            records["Office"].to_record(),
            records["OfficerInstallation"].to_record(),
            records["Session"].to_record(),
        ]
    )


# -- tamper-detection ------------------------------------------------------


# One field per type whose own shape validator accepts the tampered
# replacement value unchanged, so tampering it in isolation surfaces
# solely as a content-identity mismatch rather than tripping a more
# specific shape check (a content-identity URI, an enum, or a
# fixed-value authority-withholding boolean) first.
_SAFE_TO_TAMPER = {
    "Observation": ("proposition", "TAMPERED"),
    "CorrectionRecord": ("reason", "TAMPERED"),
    "StatusEvent": ("transition", "suspension"),
    "Office": ("slug", "TAMPERED"),
    "OfficerInstallation": ("officer", "TAMPERED"),
    "Session": ("office", "TAMPERED"),
}


@pytest.mark.parametrize("vector", _OWNED_VECTORS, ids=lambda v: v["name"])
def test_tampering_a_field_after_construction_is_caught(
    vector: dict[str, Any],
) -> None:
    field, replacement = _SAFE_TO_TAMPER[vector["type"]]
    tampered = dict(vector["valid"])
    tampered[field] = replacement
    with pytest.raises(ValueError, match="content identity mismatch"):
        validate_record(tampered)


# -- missing authority-withholding boolean fails --------------------------


@pytest.mark.parametrize(
    "record_type,field",
    [
        ("CorrectionRecord", "invalidates_prior_for_use"),
        ("StatusEvent", "conveys_authority"),
        ("Office", "conveys_incumbency"),
        ("OfficerInstallation", "conveys_authority"),
    ],
)
def test_missing_authority_withholding_boolean_fails(
    record_type: str, field: str
) -> None:
    vector = next(v for v in _VECTORS if v["type"] == record_type)
    record = dict(vector["valid"])
    del record[field]
    with pytest.raises(ValueError, match=f"{field!r}"):
        validate_record(record)


# -- only OfficerInstallation may set conveys_authority: true -------------


def test_status_event_rejects_conveys_authority_true_directly() -> None:
    vector = next(v for v in _VECTORS if v["type"] == "StatusEvent")
    record = dict(vector["valid"])
    record["conveys_authority"] = True
    with pytest.raises(ValueError, match="must be False"):
        validate_record(record)


@pytest.mark.parametrize(
    "record_type", ["Observation", "CorrectionRecord", "Office", "Session"]
)
def test_only_officer_installation_may_convey_authority(record_type: str) -> None:
    vector = next(v for v in _VECTORS if v["type"] == record_type)
    record = dict(vector["valid"])
    record["conveys_authority"] = True
    with pytest.raises(ValueError, match="only OfficerInstallation"):
        validate_record(record)


def test_officer_installation_may_convey_authority() -> None:
    vector = next(v for v in _VECTORS if v["type"] == "OfficerInstallation")
    validate_record(vector["valid"])
    assert vector["valid"]["conveys_authority"] is True


# -- cross-validation ------------------------------------------------------


def test_observation_with_unresolved_witness_is_rejected() -> None:
    observation = make_observation(
        accord="memory",
        proposition="p",
        witness_id="ni:///sha-256;" + "A" * 43,
        agent=None,
    )
    with pytest.raises(ValueError, match="unresolved"):
        verify_records([observation.to_record()])


def test_officer_installation_authorizing_act_must_be_guard_or_accounting() -> None:
    witness = make_witness(
        operator="fm_add",
        target="x",
        before_digest=None,
        after_digest=None,
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=(False, False),
        four_after=(True, False),
        channel="substrate",
    )
    office = make_office(slug="librarian", scope="corpus")
    installation = make_officer_installation(
        office=office.id,
        officer="morgan",
        as_role="librarian",
        constitution="c",
        authorizing_act=witness.id,
    )
    with pytest.raises(ValueError, match="guard or accounting"):
        verify_records(
            [witness.to_record(), office.to_record(), installation.to_record()]
        )


def test_officer_installation_office_must_resolve() -> None:
    guard = make_witness(
        operator="dispatch",
        target="x",
        before_digest=None,
        after_digest=None,
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="guard",
        four_before=(False, False),
        four_after=(True, False),
        channel="governance",
    )
    installation = make_officer_installation(
        office="ni:///sha-256;" + "A" * 43,
        officer="morgan",
        as_role="librarian",
        constitution="c",
        authorizing_act=guard.id,
    )
    with pytest.raises(ValueError, match="unresolved Office"):
        verify_records([guard.to_record(), installation.to_record()])


def test_session_office_must_resolve_when_present() -> None:
    session = make_session(office="ni:///sha-256;" + "A" * 43)
    with pytest.raises(ValueError, match="unresolved Office"):
        verify_records([session.to_record()])


def test_session_with_no_office_needs_no_resolution() -> None:
    session = make_session()
    verify_records([session.to_record()])


def test_duplicate_content_identity_is_rejected() -> None:
    session = make_session()
    with pytest.raises(ValueError, match="duplicate"):
        verify_records([session.to_record(), session.to_record()])


# -- citation fields must be content-identity URIs, not any string --------


@pytest.mark.parametrize(
    "record_type,field",
    [
        ("Observation", "witness_id"),
        ("CorrectionRecord", "target"),
        ("CorrectionRecord", "replacement"),
        ("StatusEvent", "target"),
        ("OfficerInstallation", "office"),
        ("OfficerInstallation", "authorizing_act"),
    ],
)
def test_citation_field_rejects_a_non_uri_string(record_type: str, field: str) -> None:
    vector = next(v for v in _VECTORS if v["type"] == record_type)
    record = dict(vector["valid"])
    record[field] = "not-a-content-identity"
    with pytest.raises(ValueError, match="content identity"):
        validate_record(record)


def test_status_event_supersedes_and_successor_reject_a_non_uri_string() -> None:
    vector = next(v for v in _VECTORS if v["type"] == "StatusEvent")
    for field in ("supersedes", "successor"):
        record = dict(vector["valid"])
        record[field] = "not-a-content-identity"
        with pytest.raises(ValueError, match="content identity"):
            validate_record(record)


# -- supersession requires a successor -------------------------------------


def test_supersession_status_event_without_successor_is_rejected() -> None:
    off = make_office(slug="steward", scope="corpus")
    event = make_status_event(target=off.id, transition="supersession")
    with pytest.raises(ValueError, match="supersession requires a successor"):
        validate_record(event.to_record())


def test_supersession_status_event_with_successor_is_accepted() -> None:
    off = make_office(slug="steward", scope="corpus")
    prior = make_status_event(target=off.id, transition="suspension")
    event = make_status_event(
        target=off.id, transition="supersession", successor=prior.id
    )
    validate_record(event.to_record())


# -- cross-validation: CorrectionRecord and StatusEvent supersession -------


def test_verify_records_requires_correction_target_and_replacement_same_type() -> None:
    off = make_office(slug="steward", scope="corpus")
    witness = make_witness(
        operator="dispatch",
        target="x",
        before_digest=None,
        after_digest=None,
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="guard",
        four_before=(False, False),
        four_after=(True, False),
        channel="governance",
    )
    obs = make_observation(
        accord="a", proposition="p", witness_id=witness.id, agent="morgan"
    )
    correction = make_correction_record(
        target=off.id, replacement=obs.id, reason="wrong type"
    )
    with pytest.raises(ValueError, match="not the same type"):
        verify_records(
            [
                witness.to_record(),
                off.to_record(),
                obs.to_record(),
                correction.to_record(),
            ]
        )


def test_verify_records_chains_status_event_supersedes_on_the_same_target() -> None:
    off = make_office(slug="steward", scope="corpus")
    first = make_status_event(target=off.id, transition="suspension")
    second = make_status_event(
        target=off.id, transition="reinstatement", supersedes=first.id
    )
    summary = verify_records(
        [off.to_record(), first.to_record(), second.to_record()]
    )
    assert summary["ok"] is True


def test_verify_records_rejects_supersedes_pointing_at_a_different_target() -> None:
    off = make_office(slug="steward", scope="corpus")
    other = make_office(slug="other", scope="corpus")
    first = make_status_event(target=off.id, transition="suspension")
    second = make_status_event(
        target=other.id, transition="reinstatement", supersedes=first.id
    )
    with pytest.raises(ValueError, match="same target"):
        verify_records(
            [off.to_record(), other.to_record(), first.to_record(), second.to_record()]
        )


def test_verify_records_resolves_correction_record_replacement() -> None:
    off = make_office(slug="steward", scope="corpus")
    replacement = make_office(slug="steward-v2", scope="corpus")
    correction = make_correction_record(
        target=off.id, replacement=replacement.id, reason="renamed"
    )
    summary = verify_records(
        [off.to_record(), replacement.to_record(), correction.to_record()]
    )
    assert summary["ok"] is True


def test_verify_records_rejects_an_unresolved_correction_replacement() -> None:
    off = make_office(slug="steward", scope="corpus")
    correction = make_correction_record(
        target=off.id, replacement="ni:///sha-256;" + "A" * 43, reason="renamed"
    )
    with pytest.raises(ValueError, match="unresolved"):
        verify_records([off.to_record(), correction.to_record()])


def test_unknown_record_type_is_rejected() -> None:
    with pytest.raises(ValueError, match="not a Tier B record type"):
        validate_record({"type": "Flatfile", "id": "whatever"})


# -- StatusEvent supersedes chains: forward-only and acyclic ---------------


def test_verify_records_accepts_a_three_hop_supersedes_chain() -> None:
    off = make_office(slug="steward", scope="corpus")
    first = make_status_event(target=off.id, transition="suspension")
    second = make_status_event(
        target=off.id, transition="reinstatement", supersedes=first.id
    )
    third = make_status_event(
        target=off.id, transition="revocation", supersedes=second.id
    )
    summary = verify_records(
        [off.to_record(), first.to_record(), second.to_record(), third.to_record()]
    )
    assert summary["ok"] is True


def test_status_event_ancestors_walks_a_forward_only_chain_without_error() -> None:
    index = {
        "a": {"id": "a", "type": "StatusEvent", "target": "t", "supersedes": None},
        "b": {"id": "b", "type": "StatusEvent", "target": "t", "supersedes": "a"},
        "c": {"id": "c", "type": "StatusEvent", "target": "t", "supersedes": "b"},
    }
    record_types._status_event_ancestors(index, index["c"])


def test_status_event_ancestors_rejects_a_direct_two_node_cycle() -> None:
    index = {
        "a": {"id": "a", "type": "StatusEvent", "target": "t", "supersedes": "b"},
        "b": {"id": "b", "type": "StatusEvent", "target": "t", "supersedes": "a"},
    }
    with pytest.raises(ValueError, match="not acyclic"):
        record_types._status_event_ancestors(index, index["a"])


def test_status_event_ancestors_rejects_a_longer_cycle() -> None:
    index = {
        "a": {"id": "a", "type": "StatusEvent", "target": "t", "supersedes": "b"},
        "b": {"id": "b", "type": "StatusEvent", "target": "t", "supersedes": "c"},
        "c": {"id": "c", "type": "StatusEvent", "target": "t", "supersedes": "a"},
    }
    with pytest.raises(ValueError, match="not acyclic"):
        record_types._status_event_ancestors(index, index["a"])
