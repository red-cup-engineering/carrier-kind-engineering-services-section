"""Tests for kernel.seavt — the Tier B record <-> SEAVT row mapping and
the physical journal-path law ported from witness-journal-log-service's
real, installed ``logPathFor``/``journalDateFor``."""

from __future__ import annotations

import re
from pathlib import Path

from pyfars.kernel.seavt import (
    decode_srn_atom,
    encode_srn_atom,
    journal_date_for,
    journal_line,
    log_path_for,
    record_to_seavt,
    seavt_of_line,
    seavt_row,
)

# The real, installed witness-journal-entry-service's own strict SRN
# grammar (Atom's character class, re-verified against
# punctuated-name-derivation-service's source): a bare atom is a maximal
# run of ASCII alphanumerics; nothing else survives as one atom.
_SRN_BARE_ATOM = re.compile(r"^[A-Za-z0-9]*$")


def test_journal_date_for_extracts_the_leading_date() -> None:
    assert journal_date_for("2026-08-19T00:00:00Z") == "2026-08-19"


def test_journal_date_for_falls_back_on_a_malformed_time() -> None:
    assert journal_date_for("not-a-timestamp") == "0000-00-00"
    assert journal_date_for(12345) == "0000-00-00"


def test_log_path_for_is_year_month_day_partitioned() -> None:
    path = log_path_for("/root", "witness", "2026-08-19T00:00:00Z")
    assert path == Path("/root/data/logs/2026/08/19/witness.jsonl")


def test_log_path_for_deterministic_across_calls() -> None:
    at = "2026-08-19T12:34:56Z"
    assert log_path_for("/root", "witness", at) == log_path_for("/root", "witness", at)


def test_seavt_row_shape() -> None:
    row = seavt_row("concepts/alpha.md", "fm_add", "ni:///sha-256;" + "A" * 43, "2026-08-19T00:00:00Z")
    assert row == {
        "e": "concepts/alpha.md",
        "a": "fm_add",
        "v": "ni:///sha-256;" + "A" * 43,
        "t": "2026-08-19T00:00:00Z",
    }


def test_record_to_seavt_projects_target_operator_id_timestamp() -> None:
    record = {
        "type": "Witness",
        "id": "ni:///sha-256;" + "B" * 43,
        "operator": "fm_add",
        "target": "concepts/alpha.md",
        "timestamp": "2026-08-19T00:00:00Z",
    }
    assert record_to_seavt(record) == {
        "e": "concepts/alpha.md",
        "a": "fm_add",
        "v": "ni:///sha-256;" + "B" * 43,
        "t": "2026-08-19T00:00:00Z",
    }


def test_journal_line_carries_seavt_quad_and_full_record() -> None:
    record = {
        "type": "Witness",
        "id": "ni:///sha-256;" + "C" * 43,
        "operator": "fm_add",
        "target": "concepts/alpha.md",
        "timestamp": "2026-08-19T00:00:00Z",
        "details": {"field": "depends-on"},
    }
    line = journal_line(record)
    assert seavt_of_line(line) == record_to_seavt(record)
    assert line["record"] == record
    assert line["record"] is not record  # a defensive copy, not an alias


def test_seavt_of_line_ignores_extra_fields() -> None:
    line = {"e": "x", "a": "y", "v": "z", "t": "2026-08-19T00:00:00Z", "record": {"anything": True}}
    assert seavt_of_line(line) == {"e": "x", "a": "y", "v": "z", "t": "2026-08-19T00:00:00Z"}


def test_encode_decode_srn_atom_round_trips_a_real_tier_a_target_and_ni_uri() -> None:
    for raw in (
        "concepts/alpha.md",
        "fm_add",
        "ni:///sha-256;" + "A" * 43,
        "",
        "façade; semicolons/slashes_underscores",
    ):
        assert decode_srn_atom(encode_srn_atom(raw)) == raw


def test_encode_srn_atom_always_yields_a_bare_srn_atom() -> None:
    # The real, installed witness-journal-entry-service's own grammar
    # (re-verified: punctuated-name-derivation-service's ATOM_CHAR) admits
    # only ASCII-alphanumeric bare atoms — no "/", ";", or "_" survives.
    # Neither a real Tier A path nor a real ni: URI is one on its own; hex
    # spelling always is.
    for raw in ("concepts/alpha.md", "fm_add", "ni:///sha-256;" + "A" * 43):
        assert _SRN_BARE_ATOM.match(encode_srn_atom(raw))
