"""Tests for ``pyfars hook-dispatch`` — the single dispatcher verb shared
across every installed claude-code hook.

Covers: end-to-end witness emission for a plain hook record, the three
on-truncation policies (warn caps evidence and flags details; block
emits + exit 2; passthrough leaves bilattice axes unchanged), governance
sentinel semantics (record with `patterns:` only fires on positive
match; matched labels recorded structurally in details), root resolution
(``--root`` flag wins over $CLAUDE_PROJECT_DIR wins over CWD), and
record-load error surfacing (missing record, wrong runtime, bad regex).
"""
from __future__ import annotations

import io
import json
import os
import sys
from pathlib import Path

import pytest

from pyfars.cli.hook_dispatch import (
    HookDispatchError,
    _STDIN_CAP,
    _load_hook_record,
    _normalize_slug,
    _resolve_root,
    main,
    run,
)


def _write_hook(root: Path, slug: str, *, event: str = "PostToolUse",
                matcher: str = ".*", operator: str = "tool_use",
                truth: float = 1.0, evidence: float = 1.0,
                channel: str = "dispatch",
                on_truncation: str | None = None,
                patterns: list[dict] | None = None,
                runtime: str = "claude-code") -> Path:
    hooks_dir = root / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    truncation_line = (f"\non-truncation: {on_truncation}"
                       if on_truncation else "")
    patterns_block = ""
    if patterns:
        patterns_block = "\npatterns:"
        for p in patterns:
            patterns_block += f"\n  - regex: {p['regex']!r}"
            patterns_block += f"\n    label: {p.get('label', 'p')}"
    text = (
        "---\n"
        f"kind: hook\n"
        f"runtime: {runtime}\n"
        f"event: {event}\n"
        f"matcher: {matcher!r}\n"
        f"channel: {channel}{truncation_line}{patterns_block}\n"
        "witness:\n"
        f"  operator: {operator}\n"
        f"  truth: {truth}\n"
        f"  evidence: {evidence}\n"
        "---\n"
    )
    path = hooks_dir / f"{slug}.md"
    path.write_text(text, encoding="utf-8")
    return path


def _read_log(root: Path) -> list[dict]:
    log_dir = root / ".fars/event-log"
    out: list[dict] = []
    if not log_dir.is_dir():
        return out
    for p in sorted(log_dir.glob("*.jsonl")):
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                out.append(json.loads(line))
    return out


def _set_stdin(monkeypatch, payload: bytes) -> None:
    """Install a stdin replacement whose ``.buffer.read()`` returns payload."""
    class _BinStdin:
        buffer = io.BytesIO(payload)
    monkeypatch.setattr(sys, "stdin", _BinStdin())


# --- slug normalization + root resolution ----------------------------


def test_normalize_slug_strips_hook_prefix():
    assert _normalize_slug("hook:tool-use-success") == "tool-use-success"
    assert _normalize_slug("tool-use-success") == "tool-use-success"


def test_resolve_root_prefers_explicit(tmp_path, monkeypatch):
    monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(tmp_path / "env"))
    monkeypatch.chdir(tmp_path / ".." if tmp_path.parent.exists() else tmp_path)
    assert _resolve_root(str(tmp_path)) == tmp_path.resolve()


def test_resolve_root_uses_claude_project_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(tmp_path))
    assert _resolve_root(None) == tmp_path.resolve()


# --- load + validate -------------------------------------------------


def test_load_missing_record_raises(tmp_path):
    with pytest.raises(HookDispatchError, match="not found"):
        _load_hook_record(tmp_path, "nope")


def test_load_wrong_kind_raises(tmp_path):
    hooks_dir = tmp_path / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True)
    (hooks_dir / "x.md").write_text("---\nkind: note\n---\n", encoding="utf-8")
    with pytest.raises(HookDispatchError, match="wrong `kind"):
        _load_hook_record(tmp_path, "x")


def test_load_wrong_runtime_raises(tmp_path):
    _write_hook(tmp_path, "aider-thing", runtime="aider")
    with pytest.raises(HookDispatchError, match="claude-code dispatcher"):
        _load_hook_record(tmp_path, "aider-thing")


def test_load_invalid_regex_raises(tmp_path):
    _write_hook(tmp_path, "bad-regex",
                patterns=[{"regex": "(unclosed"}])
    with pytest.raises(HookDispatchError, match="not a.*valid regex"):
        _load_hook_record(tmp_path, "bad-regex")


def test_load_out_of_range_truth_raises(tmp_path):
    _write_hook(tmp_path, "h", truth=2.0)
    with pytest.raises(HookDispatchError, match="out of range"):
        _load_hook_record(tmp_path, "h")


# --- end-to-end emission --------------------------------------------


def test_run_emits_witness_with_bilattice_values_from_record(tmp_path, monkeypatch):
    # Round 14 / WOAH #5: PostToolUse + claude_tool_use is now rejected
    # by the dispatcher's kind-classification guardrail. The correct
    # PostToolUse operator is claude_tool_result (observation).
    _write_hook(tmp_path, "ok", truth=1.0, evidence=1.0, channel="dispatch",
                operator="claude_tool_result")
    _set_stdin(monkeypatch, b'{"tool":"Edit"}')
    rc = run(slug="ok", root=tmp_path)
    assert rc == 0
    [w] = _read_log(tmp_path)
    assert w["operator"] == "claude_tool_result"
    assert w["channel"] == "dispatch"
    assert w["origin"] == "claude-code-hook:ok"
    assert w["target"] == "claude-code:PostToolUse"
    # Default-1.0 axes are dropped from wire form (Witness.to_dict omits them).
    assert "truth" not in w
    assert "evidence" not in w
    assert w["details"]["payload-bytes"] == len(b'{"tool":"Edit"}')
    assert w["details"]["hook-slug"] == "ok"


def test_run_records_low_evidence_for_session_start(tmp_path, monkeypatch):
    _write_hook(tmp_path, "session", event="SessionStart",
                truth=1.0, evidence=0.5)
    _set_stdin(monkeypatch, b"")
    run(slug="session", root=tmp_path)
    [w] = _read_log(tmp_path)
    # Truth=1.0 stripped (default); evidence=0.5 retained.
    assert w.get("evidence") == 0.5


# --- truncation policies --------------------------------------------


def test_truncation_warn_caps_evidence_and_flags_details(tmp_path, monkeypatch):
    _write_hook(tmp_path, "warned", truth=1.0, evidence=1.0,
                on_truncation="warn")
    # Stdin > 1MB cap.
    _set_stdin(monkeypatch, b"x" * (_STDIN_CAP + 1024))
    rc = run(slug="warned", root=tmp_path)
    assert rc == 0
    [w] = _read_log(tmp_path)
    assert w["details"]["truncated"] is True
    assert w["details"]["truncation-policy"] == "warn"
    assert w["details"]["payload-bytes"] == _STDIN_CAP
    # Evidence capped at 0.5 (was 1.0).
    assert w.get("evidence") == 0.5


def test_truncation_warn_does_not_raise_evidence(tmp_path, monkeypatch):
    """If declared evidence is already < 0.5, warn must not RAISE it to 0.5."""
    _write_hook(tmp_path, "warned-low", truth=1.0, evidence=0.3,
                on_truncation="warn")
    _set_stdin(monkeypatch, b"x" * (_STDIN_CAP + 1))
    run(slug="warned-low", root=tmp_path)
    [w] = _read_log(tmp_path)
    assert w["evidence"] == 0.3


def test_truncation_block_emits_witness_and_returns_2(tmp_path, monkeypatch):
    _write_hook(tmp_path, "blocked", truth=1.0, evidence=1.0,
                on_truncation="block")
    _set_stdin(monkeypatch, b"x" * (_STDIN_CAP + 1))
    rc = run(slug="blocked", root=tmp_path)
    assert rc == 2
    [w] = _read_log(tmp_path)
    assert w["details"]["truncated"] is True
    assert w["details"]["truncation-policy"] == "block"


def test_truncation_passthrough_keeps_evidence(tmp_path, monkeypatch):
    _write_hook(tmp_path, "passthrough", truth=1.0, evidence=1.0,
                on_truncation="passthrough")
    _set_stdin(monkeypatch, b"x" * (_STDIN_CAP + 1))
    rc = run(slug="passthrough", root=tmp_path)
    assert rc == 0
    [w] = _read_log(tmp_path)
    # No evidence cap (default 1.0 stripped from wire) but truncated flag still set.
    assert "evidence" not in w
    assert w["details"]["truncated"] is True


def test_no_truncation_no_truncated_detail(tmp_path, monkeypatch):
    _write_hook(tmp_path, "small", on_truncation="warn")
    _set_stdin(monkeypatch, b"tiny")
    run(slug="small", root=tmp_path)
    [w] = _read_log(tmp_path)
    assert "truncated" not in w["details"]


# --- governance sentinel patterns -----------------------------------


def test_pattern_no_match_emits_no_witness(tmp_path, monkeypatch):
    """Sentinel semantics: records with `patterns:` only fire on a positive
    match. A non-matching payload must produce zero log entries."""
    _write_hook(tmp_path, "secrets",
                channel="governance", truth=0.0, evidence=1.0,
                patterns=[{"regex": "AKIA[A-Z0-9]{16}",
                           "label": "aws-access-key"}])
    _set_stdin(monkeypatch, b'{"tool":"Bash","input":"ls"}')
    rc = run(slug="secrets", root=tmp_path)
    assert rc == 0
    assert _read_log(tmp_path) == []


def test_pattern_match_emits_governance_witness_with_labels(tmp_path, monkeypatch):
    _write_hook(tmp_path, "secrets",
                channel="governance", truth=0.0, evidence=1.0,
                patterns=[
                    {"regex": "AKIA[A-Z0-9]{16}", "label": "aws-access-key"},
                    {"regex": "ghp_[A-Za-z0-9]{36}", "label": "github-token"},
                ])
    payload = b'{"tool":"Edit","input":"export AKS = AKIAABCDEFGHIJKLMNOP"}'
    _set_stdin(monkeypatch, payload)
    rc = run(slug="secrets", root=tmp_path)
    assert rc == 0
    [w] = _read_log(tmp_path)
    assert w["channel"] == "governance"
    # truth=0.0 IS retained on the wire (only default-1.0 is dropped).
    assert w["truth"] == 0.0
    # Labels recorded structurally; raw regex not on the wire (still on substrate record).
    assert w["details"]["matched-patterns"] == [{"label": "aws-access-key"}]


def test_sentinel_block_truncation_emits_and_returns_2_even_without_match(
        tmp_path, monkeypatch):
    """Governance-critical: a sentinel hook with `on-truncation: block` MUST
    refuse the operation when the visible portion of an oversized payload
    contains no match — the substrate cannot certify what it cannot see.
    Regression test for the prior ordering bug where the sentinel early-return
    fired before the truncation policy was consulted, defeating the
    governance-secret-scan exemplar's whole purpose."""
    _write_hook(tmp_path, "secrets",
                channel="governance", truth=0.0, evidence=1.0,
                on_truncation="block",
                patterns=[{"regex": "AKIA[A-Z0-9]{16}",
                           "label": "aws-access-key"}])
    # Oversized payload with no AWS-key shape in the first 1 MB.
    _set_stdin(monkeypatch, b"x" * (_STDIN_CAP + 1))
    rc = run(slug="secrets", root=tmp_path)
    assert rc == 2
    [w] = _read_log(tmp_path)
    assert w["channel"] == "governance"
    assert w["truth"] == 0.0
    assert w["details"]["truncated"] is True
    assert w["details"]["truncation-policy"] == "block"
    assert w["details"]["truncation-block-without-match"] is True
    # No matches recorded — the witness is a refusal, not a violation report.
    assert "matched-patterns" not in w["details"]


def test_sentinel_warn_truncation_no_match_stays_silent(tmp_path, monkeypatch):
    """The warn counterpart: a non-matching truncated sentinel under `warn`
    stays silent — emitting truth=0.0 with no observed match would lie."""
    _write_hook(tmp_path, "secrets",
                channel="governance", truth=0.0, evidence=1.0,
                on_truncation="warn",
                patterns=[{"regex": "AKIA[A-Z0-9]{16}", "label": "aws"}])
    _set_stdin(monkeypatch, b"x" * (_STDIN_CAP + 1))
    rc = run(slug="secrets", root=tmp_path)
    assert rc == 0
    assert _read_log(tmp_path) == []


def test_sentinel_block_truncation_with_match_records_both(tmp_path, monkeypatch):
    """When a sentinel `block` hook BOTH matches AND truncates, the witness
    carries the matched labels (it's a real violation) but NOT the
    truncation-block-without-match flag (block was decided by the match,
    not by the truncation)."""
    _write_hook(tmp_path, "secrets",
                channel="governance", truth=0.0, evidence=1.0,
                on_truncation="block",
                patterns=[{"regex": "AKIA[A-Z0-9]{16}", "label": "aws"}])
    payload = b"AKIAABCDEFGHIJKLMNOP" + b"x" * _STDIN_CAP
    _set_stdin(monkeypatch, payload)
    rc = run(slug="secrets", root=tmp_path)
    assert rc == 2
    [w] = _read_log(tmp_path)
    assert w["details"]["matched-patterns"] == [{"label": "aws"}]
    assert w["details"]["truncated"] is True
    assert "truncation-block-without-match" not in w["details"]


def test_pattern_records_multiple_matches_in_declaration_order(tmp_path, monkeypatch):
    _write_hook(tmp_path, "multi",
                channel="governance", truth=0.0, evidence=1.0,
                patterns=[
                    {"regex": "AAAA", "label": "first"},
                    {"regex": "BBBB", "label": "second"},
                ])
    _set_stdin(monkeypatch, b"BBBB AAAA BBBB")
    run(slug="multi", root=tmp_path)
    [w] = _read_log(tmp_path)
    assert w["details"]["matched-patterns"] == [
        {"label": "first"}, {"label": "second"},
    ]


# --- main() exit codes ----------------------------------------------


def test_main_returns_1_on_dispatch_error(tmp_path, monkeypatch, capsys):
    _set_stdin(monkeypatch, b"")
    rc = main(["nonexistent-slug", "--root", str(tmp_path)])
    assert rc == 1
    err = capsys.readouterr().err
    assert "hook record not found" in err


def test_main_passes_slug_through_normalize(tmp_path, monkeypatch):
    _write_hook(tmp_path, "alpha")
    _set_stdin(monkeypatch, b"")
    rc = main(["hook:alpha", "--root", str(tmp_path)])
    assert rc == 0
    assert len(_read_log(tmp_path)) == 1
