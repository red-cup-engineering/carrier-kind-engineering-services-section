"""Tests for kernel.event_log — the append-only SEAVT journal (Register A).
Deterministic day-partitioning, round-trips, and the append-only
introspection guarantee that no rewrite/truncate/delete API exists at all
(design spec S3.1, S11)."""

from __future__ import annotations

import inspect
import json
import re
from pathlib import Path

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.seavt import (
    decode_srn_atom,
    journal_line,
    log_path_for,
    seavt_of_line,
)

# The real, installed witness-journal-entry-service's own strict SRN
# grammar admits only bare ASCII-alphanumeric atoms for e/a/v — never a
# Tier A path's "/", an ni: URI's "/" and ";", or an operator name's "_".
_SRN_BARE_ATOM = re.compile(r"^[A-Za-z0-9]*$")

_FORBIDDEN_SUBSTRINGS = (
    "rewrite",
    "truncate",
    "delete",
    "remove",
    "clear",
    "overwrite",
    "unlink",
    "erase",
    "purge",
)


def _record(target: str, operator: str, record_id: str, timestamp: str) -> dict:
    return {
        "type": "Witness",
        "id": record_id,
        "operator": operator,
        "target": target,
        "timestamp": timestamp,
        "details": {},
    }


def test_no_rewrite_truncate_or_delete_api_exists() -> None:
    members = [
        name for name, _ in inspect.getmembers(EventLog) if not name.startswith("_")
    ]
    for name in members:
        lowered = name.lower()
        for forbidden in _FORBIDDEN_SUBSTRINGS:
            assert forbidden not in lowered, (
                f"EventLog.{name} looks like a rewrite/delete API"
            )


def test_append_creates_the_day_partitioned_file(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    record = _record(
        "concepts/alpha.md",
        "fm_add",
        "ni:///sha-256;" + "A" * 43,
        "2026-08-19T00:00:00Z",
    )
    log.append("witness", record)
    expected_path = log_path_for(tmp_path, "witness", record["timestamp"])
    assert expected_path.is_file()


def test_append_is_deterministic_day_partitioning(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    early = _record(
        "concepts/alpha.md",
        "fm_add",
        "ni:///sha-256;" + "A" * 43,
        "2026-08-19T00:00:00Z",
    )
    late = _record(
        "concepts/alpha.md",
        "fm_add",
        "ni:///sha-256;" + "B" * 43,
        "2026-08-20T00:00:00Z",
    )
    log.append("witness", early)
    log.append("witness", late)
    assert log_path_for(tmp_path, "witness", early["timestamp"]) != log_path_for(
        tmp_path, "witness", late["timestamp"]
    )
    assert (
        tmp_path / "data" / "logs" / "2026" / "08" / "19" / "witness.jsonl"
    ).is_file()
    assert (
        tmp_path / "data" / "logs" / "2026" / "08" / "20" / "witness.jsonl"
    ).is_file()


def test_append_and_read_channel_round_trips(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    first = _record(
        "concepts/alpha.md",
        "fm_add",
        "ni:///sha-256;" + "A" * 43,
        "2026-08-19T00:00:00Z",
    )
    second = _record(
        "concepts/beta.md",
        "fm_add",
        "ni:///sha-256;" + "B" * 43,
        "2026-08-19T01:00:00Z",
    )
    log.append("witness", first)
    log.append("witness", second)
    lines = list(log.read_channel("witness"))
    assert [seavt_of_line(line) for line in lines] == [
        seavt_of_line(journal_line(first)),
        seavt_of_line(journal_line(second)),
    ]
    assert [line["record"] for line in lines] == [first, second]


def test_read_channel_orders_across_days(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    day_one = _record(
        "x", "fm_add", "ni:///sha-256;" + "A" * 43, "2026-08-18T00:00:00Z"
    )
    day_two = _record(
        "x", "fm_add", "ni:///sha-256;" + "B" * 43, "2026-08-19T00:00:00Z"
    )
    log.append("witness", day_two)
    log.append("witness", day_one)
    ids = [line["record"]["id"] for line in log.read_channel("witness")]
    assert ids == [day_one["id"], day_two["id"]]


def test_read_channel_on_an_empty_log_is_empty(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    assert list(log.read_channel("witness")) == []


def test_read_channel_does_not_cross_channels(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    record = _record("x", "fm_add", "ni:///sha-256;" + "A" * 43, "2026-08-19T00:00:00Z")
    log.append("substrate", record)
    assert list(log.read_channel("witness")) == []
    assert len(list(log.read_channel("substrate"))) == 1


def test_append_only_lines_are_one_json_object_each(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    record = _record("x", "fm_add", "ni:///sha-256;" + "A" * 43, "2026-08-19T00:00:00Z")
    log.append("witness", record)
    path = log_path_for(tmp_path, "witness", record["timestamp"])
    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1


def test_a_real_witness_lands_on_disk_as_srn_conformant_e_a_v(tmp_path: Path) -> None:
    # Reproduces the exact defect: a real Tier A target ("concepts/alpha.md"),
    # an underscore-bearing operator ("fm_add"), and a real ni: content
    # identity are never, on their own, valid Three Dots and a Dash SRN
    # surfaces (a literal "/" or ";" is a grammar violation; a literal "_"
    # is the unconditional escape-hatch refusal) — the real, installed
    # witness-journal-entry-service that apps/fare/src/kernel/seavt.mjs
    # composes would refuse to read a row carrying any of them unencoded.
    # kernel/event_log.py's physical writer must SRN-encode e/a/v before
    # a line ever reaches disk, so the same directory stays readable by
    # JSFARS's real seavt()/readSeavt.
    log = EventLog(root=tmp_path)
    record = _record(
        "concepts/alpha.md",
        "fm_add",
        "ni:///sha-256;" + "A" * 43,
        "2026-08-19T00:00:00Z",
    )
    log.append("witness", record)

    path = log_path_for(tmp_path, "witness", record["timestamp"])
    on_disk = json.loads(path.read_text(encoding="utf-8").splitlines()[0])
    for field in ("e", "a", "v"):
        assert _SRN_BARE_ATOM.match(on_disk[field]), (
            f"{field}={on_disk[field]!r} is not an SRN-conformant bare atom"
        )
    assert on_disk["e"] != record["target"]
    assert on_disk["a"] != record["operator"]
    assert on_disk["v"] != record["id"]

    decoded = [decode_srn_atom(on_disk[field]) for field in ("e", "a", "v")]
    assert decoded == [record["target"], record["operator"], record["id"]]

    lines = list(log.read_channel("witness"))
    assert seavt_of_line(lines[0]) == {
        "e": record["target"],
        "a": record["operator"],
        "v": record["id"],
        "t": record["timestamp"],
    }


def test_append_refuses_non_witness_records(tmp_path):
    import pytest
    from pyfars.kernel.event_log import EventLog, NotAWitnessError

    log = EventLog(root=tmp_path)
    observation_shaped = {
        "accord": "memory",
        "proposition": "p",
        "witness_id": "ni:///sha-256;x",
        "agent": "a",
    }
    with pytest.raises(NotAWitnessError):
        log.append("main", observation_shaped)
    assert list(log.read_channel("main")) == []
    assert not list(tmp_path.glob("data/**/*.jsonl"))
