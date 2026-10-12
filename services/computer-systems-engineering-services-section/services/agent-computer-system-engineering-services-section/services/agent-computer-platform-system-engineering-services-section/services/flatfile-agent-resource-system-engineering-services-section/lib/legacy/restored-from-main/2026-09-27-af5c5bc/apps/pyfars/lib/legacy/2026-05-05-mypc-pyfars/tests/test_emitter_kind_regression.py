"""Regression tests pinning the persisted ``kind`` of every direct
``Witness(...)`` emission site outside the ``make_witness`` helper.

Round 14 / WOAH #5 — the architect flagged that ``witness_commits``,
``receive``, and ``hook_dispatch`` construct ``Witness`` directly
(rather than via ``make_witness``), bypassing the operator → kind
classifier. They now pass ``kind=classify(...)`` explicitly; these
tests guard against future regression — if anyone removes the
explicit kind pass and lets the field default to ``"mutation"`` ride
through, the assertions here fail.

These exercise the full write path (witness → JSONL → from_dict
round trip), not just classify(), so a bug at any layer surfaces."""
from __future__ import annotations

import io
import sys
from pathlib import Path

from pyfars.operator.witness import Witness
from pyfars.runtime.event_log import EventLog


# -- witness_commits.py: git commit witnesses must persist as observation -


def test_witness_commits_persists_observation_kind():
    from pyfars.cli import witness_commits

    fake_commit = {
        "sha": "abc123",
        "subject": "test commit",
        "date": "2026-05-03T00:00:00Z",
        "author": "tester",
        "diff_entities_drafted": ["library/notes/foo.md"],
        "msg_refs": [],
    }
    w = witness_commits._commit_to_witness(fake_commit,
                                           binding="diff_entities_drafted")
    assert w.operator == "commit"
    assert w.kind == "observation"

    # Round-trip through to_dict/from_dict (the actual EventLog write
    # path) to catch wire-form bugs that bypass the in-memory object.
    payload = w.to_dict()
    assert payload["kind"] == "observation"
    w2 = Witness.from_dict(payload)
    assert w2.kind == "observation"


# -- receive.py: receive_message must persist as mutation -----------------


def test_receive_message_persists_mutation_kind(tmp_path):
    from pyfars.cli import receive

    rc = receive.run(
        from_="alice@example.org",
        subject="hello",
        content="hi there",
        root=tmp_path,
    )
    assert rc == 0
    log = EventLog(tmp_path)
    received = list(log.read_all(operator="receive_message"))
    assert len(received) == 1
    assert received[0].kind == "mutation"


# -- hook_dispatch.py: kind classified from hook channel ------------------


def _write_hook_record(root: Path, slug: str, *, operator: str,
                       channel: str, event: str = "PreToolUse") -> None:
    """Create a hook markdown record matching the dispatcher's expected shape."""
    hooks_dir = root / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    fm = (
        "---\n"
        "kind: hook\n"
        "runtime: claude-code\n"
        f"event: {event}\n"
        "matcher: .*\n"
        f"channel: {channel}\n"
        "witness:\n"
        f"  operator: {operator}\n"
        "  truth: 1.0\n"
        "  evidence: 1.0\n"
        "on-truncation: warn\n"
        "---\n"
        "Test hook fixture.\n"
    )
    (hooks_dir / f"{slug}.md").write_text(fm, encoding="utf-8")


def _stub_stdin(monkeypatch, payload: str = "test payload") -> None:
    """Replace stdin with a controlled bytestream so dispatcher reads deterministically."""
    monkeypatch.setattr(sys, "stdin",
                        io.TextIOWrapper(io.BytesIO(payload.encode("utf-8"))))


def test_hook_dispatch_classifies_via_channel(tmp_path, monkeypatch):
    """Captain-defined hook operator on a known channel → classified via channel.

    A hook operator absent from OPERATOR_KIND is classified by the
    ``classify(operator, channel)`` channel-fallback rule. The dispatch
    channel maps to ``guard`` per CHANNEL_KIND."""
    from pyfars.cli import hook_dispatch

    _write_hook_record(tmp_path, "captain-guard",
                       operator="captain_custom_admissibility_check",
                       channel="dispatch")
    _stub_stdin(monkeypatch, "benign payload")

    rc = hook_dispatch.run(slug="captain-guard", root=tmp_path)
    assert rc == 0  # no patterns, no block

    log = EventLog(tmp_path)
    ws = list(log.read_all(operator="captain_custom_admissibility_check"))
    assert len(ws) == 1
    # channel "dispatch" → kind "guard" via CHANNEL_KIND fallback.
    assert ws[0].kind == "guard"


def test_hook_dispatch_classifies_known_operator_via_registry(tmp_path,
                                                               monkeypatch):
    """Registry beats channel-fallback when both apply.

    ``claude_session_start`` is in OPERATOR_KIND as ``observation``.
    The hook record places it on the ``dispatch`` channel (which would
    fall back to ``guard``); the registry must win."""
    from pyfars.cli import hook_dispatch

    _write_hook_record(tmp_path, "claude-session",
                       operator="claude_session_start",
                       channel="dispatch",
                       event="SessionStart")
    _stub_stdin(monkeypatch, "session start payload")

    hook_dispatch.run(slug="claude-session", root=tmp_path)

    log = EventLog(tmp_path)
    ws = list(log.read_all(operator="claude_session_start"))
    assert len(ws) == 1
    assert ws[0].kind == "observation"  # registry beats channel-fallback


def test_cline_witness_script_uses_make_witness(tmp_path):
    """Generated ``.fars/cline-witness.sh`` routes through ``make_witness``.

    The cline-workflows harness emits a bash script that appends a
    witness after every runbook step by routing through ``pyfars
    witness``. The CLI uses ``make_witness`` internally, so emitted
    witnesses are classified by operator/channel rather than riding the
    field default.

    This test asserts the generated script's textual content rather
    than executing it (the bash + python3 round-trip is exercised by
    the cline-workflows install integration test elsewhere)."""
    from pyfars.cli.install_harness import _cline_witness_helper_text

    script = _cline_witness_helper_text()
    # Must route through the installed CLI, not direct construction.
    assert "exec pyfars witness" in script
    # Must NOT import Witness directly (the regression we're guarding).
    assert "from pyfars.operator.witness import Witness" not in script
    # The dispatch channel telegraph must still be present so
    # classify() routes via channel-fallback to "guard".
    assert "--channel  dispatch" in script


def test_hook_dispatch_rejects_post_tool_use_with_guard_operator(tmp_path,
                                                                   monkeypatch):
    """Validation guardrail: PostToolUse + claude_tool_use is rejected.

    claude_tool_use is registered as guard (the PreToolUse
    admissibility decision). A PostToolUse hook using that operator
    would persist as guard — incorrect — so the dispatcher fails loud
    with a HookDispatchError pointing at the misnamed operator."""
    from pyfars.cli import hook_dispatch
    from pyfars.cli.hook_dispatch import HookDispatchError

    _write_hook_record(tmp_path, "bad-post-tool",
                       operator="claude_tool_use",   # WRONG for PostToolUse
                       channel="dispatch",
                       event="PostToolUse")
    _stub_stdin(monkeypatch, "anything")

    try:
        hook_dispatch.run(slug="bad-post-tool", root=tmp_path)
    except HookDispatchError as exc:
        msg = str(exc)
        assert "claude_tool_use" in msg
        assert "claude_tool_result" in msg
        assert "PostToolUse" in msg
        return
    raise AssertionError("expected HookDispatchError on PostToolUse + claude_tool_use")


def test_hook_dispatch_rejects_post_tool_use_failure_with_guard_operator(
        tmp_path, monkeypatch):
    """The guardrail also fires on event=PostToolUseFailure (prefix match).

    The guardrail uses ``event_str.startswith("PostToolUse")`` to
    cover both PostToolUse and PostToolUseFailure with one rule.
    This test pins that prefix behavior so a future change from
    startswith to equality does not silently let PostToolUseFailure
    through misclassified."""
    from pyfars.cli import hook_dispatch
    from pyfars.cli.hook_dispatch import HookDispatchError

    _write_hook_record(tmp_path, "bad-post-tool-failure",
                       operator="claude_tool_use",   # WRONG for PostToolUseFailure
                       channel="dispatch",
                       event="PostToolUseFailure")
    _stub_stdin(monkeypatch, "anything")

    try:
        hook_dispatch.run(slug="bad-post-tool-failure", root=tmp_path)
    except HookDispatchError as exc:
        assert "PostToolUseFailure" in str(exc)
        assert "claude_tool_result" in str(exc)
        return
    raise AssertionError(
        "expected HookDispatchError on PostToolUseFailure + claude_tool_use")


def test_hook_dispatch_accepts_post_tool_use_with_observation_operator(
        tmp_path, monkeypatch):
    """The corrected pairing: PostToolUse + claude_tool_result → observation."""
    from pyfars.cli import hook_dispatch

    _write_hook_record(tmp_path, "ok-post-tool",
                       operator="claude_tool_result",
                       channel="dispatch",
                       event="PostToolUse")
    _stub_stdin(monkeypatch, "anything")
    hook_dispatch.run(slug="ok-post-tool", root=tmp_path)

    log = EventLog(tmp_path)
    ws = list(log.read_all(operator="claude_tool_result"))
    assert len(ws) == 1
    assert ws[0].kind == "observation"


def test_hook_dispatch_classifies_governance_secret_match(tmp_path, monkeypatch):
    """Governance secret-scan hook — ``governance_secret_match`` → guard."""
    from pyfars.cli import hook_dispatch

    _write_hook_record(tmp_path, "secret-scan",
                       operator="governance_secret_match",
                       channel="governance")
    _stub_stdin(monkeypatch, "no secrets here")

    hook_dispatch.run(slug="secret-scan", root=tmp_path)

    log = EventLog(tmp_path)
    ws = list(log.read_all(operator="governance_secret_match"))
    assert len(ws) == 1
    assert ws[0].kind == "guard"
