"""Tests for kernel.witness — the seventh Tier B type, foreign to
kernel.record_types (see test_record_types.py), and the witness pipeline
itself (design spec S5, steps 1-10, registers A and B)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.four import NotOneWitError
from pyfars.kernel.identity import identity, identity_of_record
from pyfars.kernel.seavt import log_path_for
from pyfars.kernel.witness import make_witness, record_witness, validate_witness

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_VECTORS_PATH = _SECTION_ROOT / "lib" / "conformance" / "record-vectors.json"

with _VECTORS_PATH.open(encoding="utf-8") as _handle:
    _VECTOR = next(v for v in json.load(_handle)["vectors"] if v["type"] == "Witness")


def test_valid_vector_is_accepted_and_id_round_trips() -> None:
    record = _VECTOR["valid"]
    validate_witness(record)
    assert record["id"] == identity_of_record(dict(record))


def test_invalid_vector_is_a_tamper_case() -> None:
    with pytest.raises(ValueError, match="content identity mismatch"):
        validate_witness(_VECTOR["invalid"])


def test_constructed_witness_round_trips() -> None:
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
    record = witness.to_record()
    assert record["id"] == identity_of_record(dict(record))
    validate_witness(record)


def test_missing_conveys_authority_fails() -> None:
    record = dict(_VECTOR["valid"])
    del record["conveys_authority"]
    with pytest.raises(ValueError, match="'conveys_authority'"):
        validate_witness(record)


def test_conveys_authority_true_is_rejected() -> None:
    record = dict(_VECTOR["valid"])
    record["conveys_authority"] = True
    with pytest.raises(ValueError, match="must be False"):
        validate_witness(record)


def test_invalid_kind_is_rejected() -> None:
    record = dict(_VECTOR["valid"])
    record["kind"] = "not-a-real-kind"
    with pytest.raises(ValueError, match="invalid operation kind"):
        validate_witness(record)


def test_non_witness_type_is_rejected() -> None:
    with pytest.raises(ValueError, match="not a Witness record"):
        validate_witness({"type": "Office"})


# -- make_witness's own Register B gate -----------------------------------


def _make_witness_with(four_before: tuple[bool, bool], four_after: tuple[bool, bool]) -> None:
    make_witness(
        operator="fm_add",
        target="x",
        before_digest=None,
        after_digest=None,
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=four_before,
        four_after=four_after,
        channel="substrate",
    )


def test_make_witness_rejects_a_decrement_before_minting_anything() -> None:
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        _make_witness_with((True, False), (False, False))


def test_make_witness_rejects_a_two_bit_jump_before_minting_anything() -> None:
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        _make_witness_with((False, False), (True, True))


def test_make_witness_rejects_a_no_op_before_minting_anything() -> None:
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        _make_witness_with((True, False), (True, False))


# -- the witness pipeline: registers A and B (record_witness) ------------


def test_record_witness_computes_digests_kind_and_appends(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    witness = record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/alpha.md",
        before="old body",
        after="new body",
        four_after=(True, False),
        details={"field": "depends-on"},
        agent="morgan",
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
    )
    assert witness.before_digest == identity("old body")
    assert witness.after_digest == identity("new body")
    assert witness.kind == "mutation"
    assert witness.four_before == (False, False)
    assert witness.four_after == (True, False)
    validate_witness(witness.to_record())
    lines = list(log.read_channel("substrate"))
    assert [line["record"] for line in lines] == [witness.to_record()]


def test_record_witness_with_no_prior_target_has_no_before_digest(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    witness = record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/new.md",
        after="new body",
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
    )
    assert witness.before_digest is None


def test_record_witness_folds_prior_witnesses_into_four_before(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    prior = make_witness(
        operator="fm_add",
        target="concepts/alpha.md",
        before_digest=None,
        after_digest="d1",
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=(False, False),
        four_after=(True, False),
        channel="substrate",
    )
    witness = record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/alpha.md",
        after="body",
        four_after=(True, True),
        timestamp="2026-08-19T00:00:01Z",
        channel="substrate",
        prior_witnesses=[prior],
    )
    assert witness.four_before == (True, False)
    assert witness.four_after == (True, True)


def test_record_witness_rejects_a_decrement_and_writes_nothing(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    prior = make_witness(
        operator="fm_add",
        target="x",
        before_digest=None,
        after_digest="d1",
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=(False, False),
        four_after=(True, False),
        channel="substrate",
    )
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        record_witness(
            event_log=log,
            operator="fm_add",
            target="x",
            after="body",
            four_after=(False, False),
            timestamp="2026-08-19T00:00:01Z",
            channel="substrate",
            prior_witnesses=[prior],
        )
    assert not log_path_for(tmp_path, "substrate", "2026-08-19T00:00:01Z").exists()


def test_record_witness_rejects_a_two_bit_jump_and_writes_nothing(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        record_witness(
            event_log=log,
            operator="fm_add",
            target="x",
            after="body",
            four_after=(True, True),
            timestamp="2026-08-19T00:00:00Z",
            channel="substrate",
        )
    assert not log_path_for(tmp_path, "substrate", "2026-08-19T00:00:00Z").exists()


def test_record_witness_rejects_a_no_op_and_writes_nothing(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    prior = make_witness(
        operator="fm_add",
        target="x",
        before_digest=None,
        after_digest="d1",
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=(False, False),
        four_after=(True, False),
        channel="substrate",
    )
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        record_witness(
            event_log=log,
            operator="fm_add",
            target="x",
            after="body",
            four_after=(True, False),
            timestamp="2026-08-19T00:00:01Z",
            channel="substrate",
            prior_witnesses=[prior],
        )
    assert not log_path_for(tmp_path, "substrate", "2026-08-19T00:00:01Z").exists()


def test_record_witness_appends_to_the_real_event_log(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    witness = record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/alpha.md",
        after="body",
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
    )
    lines = list(log.read_channel("substrate"))
    assert len(lines) == 1
    assert lines[0]["record"] == witness.to_record()
    assert lines[0]["v"] == witness.id
