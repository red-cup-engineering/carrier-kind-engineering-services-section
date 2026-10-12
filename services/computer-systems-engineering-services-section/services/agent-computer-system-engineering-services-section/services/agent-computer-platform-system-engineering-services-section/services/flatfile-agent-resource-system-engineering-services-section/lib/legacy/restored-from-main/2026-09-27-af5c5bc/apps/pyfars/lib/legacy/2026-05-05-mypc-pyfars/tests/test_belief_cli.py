"""Tests for the ``pyfars belief`` CLI verb."""
from __future__ import annotations

import json

import pytest

from pyfars.cli import belief as belief_cli
from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog


def _seed_log(root, witnesses):
    log = EventLog(root)
    for w in witnesses:
        log.append(w)


def _w(target, truth=1.0, evidence=1.0, channel=None, key=None):
    details = {"key": key} if key else {}
    return make_witness("fm_set", target, None, "after",
                        details=details, channel=channel,
                        truth=truth, evidence=evidence)


def test_cli_kind_filter_restricts_to_one_operation_kind(tmp_path, capsys):
    """``--kind learning`` reads only learning-channel witnesses."""
    from pyfars.operator.witness import make_diagnosis_witness
    log = EventLog(tmp_path)
    log.append(_w("x", truth=1.0))  # mutation (fm_set)
    log.append(make_diagnosis_witness("x", cause="oom",
                                       failed_operator="fm_set"))  # learning
    # No --kind: both witnesses contribute, fm_set asserts t and
    # diagnose has truth=1.0 evidence=1.0 default → also t. Settled.
    rc = belief_cli.run(target="x", root=tmp_path)
    assert rc == 0
    capsys.readouterr()
    # --kind=learning: only the diagnose witness contributes.
    rc = belief_cli.run(target="x", root=tmp_path, kind="learning")
    assert rc == 0
    out = capsys.readouterr().out
    assert "diagnose" in out
    assert "fm_set" not in out
    assert "kind `learning`" in out
    # --kind=accounting: nothing matches → ⊥.
    rc = belief_cli.run(target="x", root=tmp_path, kind="accounting")
    assert rc == 4


def test_cli_kind_typo_returns_2(tmp_path, capsys):
    """Typoed --kind value rejected with exit 2 + stderr message."""
    rc = belief_cli.run(target="x", root=tmp_path, kind="Observation")
    assert rc == 2
    err = capsys.readouterr().err
    assert "not one of the seven" in err


def test_cli_markdown_table_includes_kind_column(tmp_path, capsys):
    """The per-vote table now carries the kind column (Round 14)."""
    _seed_log(tmp_path, [_w("x", truth=1.0)])
    rc = belief_cli.run(target="x", root=tmp_path)
    assert rc == 0
    out = capsys.readouterr().out
    assert "| kind |" in out  # header
    assert "`mutation`" in out  # value (fm_set classifies as mutation)


def test_cli_json_carries_kind_per_vote(tmp_path, capsys):
    """Each JSON vote now carries the kind tag."""
    _seed_log(tmp_path, [_w("x", truth=1.0)])
    rc = belief_cli.run(target="x", root=tmp_path, json=True)
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["votes"][0]["kind"] == "mutation"


def test_cli_exits_4_when_no_witness(tmp_path, capsys):
    rc = belief_cli.run(target="missing", root=tmp_path)
    assert rc == 4
    out = capsys.readouterr().out
    assert "no witnesses" in out
    assert "⊥" in out


def test_cli_exits_0_when_settled_true(tmp_path, capsys):
    _seed_log(tmp_path, [_w("x", truth=1.0)])
    rc = belief_cli.run(target="x", root=tmp_path)
    assert rc == 0
    out = capsys.readouterr().out
    assert "verdict" in out
    assert "`t`" in out


def test_cli_exits_3_when_contested(tmp_path, capsys):
    _seed_log(tmp_path, [_w("x", truth=1.0), _w("x", truth=0.0)])
    rc = belief_cli.run(target="x", root=tmp_path)
    assert rc == 3
    out = capsys.readouterr().out
    assert "⊤" in out


def test_cli_json_emits_machine_payload(tmp_path, capsys):
    _seed_log(tmp_path, [_w("x", truth=1.0), _w("x", truth=0.0)])
    rc = belief_cli.run(target="x", root=tmp_path, json=True)
    assert rc == 3
    payload = json.loads(capsys.readouterr().out)
    assert payload["target"] == "x"
    assert payload["value"] == "top"
    assert payload["symbol"] == "⊤"
    assert payload["is_settled"] is True
    assert payload["is_consistent"] is False
    assert len(payload["votes"]) == 2


def test_cli_json_carries_full_witness_payload_for_replay(tmp_path, capsys):
    """JSON artifact preserves enough per-vote data that an auditor can
    replay the cell's evolution without the original event log."""
    _seed_log(tmp_path, [_w("x", truth=1.0, key="title")])
    rc = belief_cli.run(target="x", root=tmp_path, json=True)
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    vote = payload["votes"][0]
    # Replay-critical fields must be present.
    for field in ("operator", "target", "before_hash", "after_hash",
                  "details", "timestamp", "truth", "evidence"):
        assert field in vote, f"replay-critical field missing from JSON: {field}"
    assert vote["details"] == {"key": "title"}
    assert vote["target"] == "x"


def test_cli_attribute_scope_filters_to_details_key(tmp_path, capsys):
    _seed_log(tmp_path, [
        _w("x", truth=1.0, key="title"),
        _w("x", truth=0.0, key="description"),
    ])
    rc = belief_cli.run(target="x", attribute="title", root=tmp_path,
                        json=True)
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["attribute"] == "title"
    assert payload["value"] == "true"
    assert len(payload["votes"]) == 1


def test_cli_channel_filter_restricts_stream(tmp_path, capsys):
    _seed_log(tmp_path, [
        _w("x", truth=1.0, channel="substrate"),
        _w("x", truth=0.0, channel="governance"),
    ])
    rc = belief_cli.run(target="x", channel="governance", root=tmp_path,
                        json=True)
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["value"] == "false"
    assert payload["channel"] == "governance"


def test_cli_bad_root_exits_2(tmp_path, capsys):
    bad = tmp_path / "does-not-exist"
    rc = belief_cli.run(target="x", root=bad)
    assert rc == 2
