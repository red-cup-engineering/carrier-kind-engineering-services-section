"""Tests for the ``claude-code-hooks`` PyFARS harness installer.

Covers: walk-and-validate semantics (good records, bad event, missing
operator, out-of-range bilattice, malformed truncation policy / patterns
block), end-to-end install (writes single dispatcher shim + settings.json
+ manifest, exec-bit set, settings.json `hooks` block points every
command at the dispatcher with the slug appended), settings.json merge
(preserves peer keys), uninstall round-trip (dispatcher gone, prior
`hooks` block restored, manifest gone, hooks/ dir removed if empty),
and the legacy-manifest uninstall path (operator who installed under
the prior per-shim layout can still --uninstall after upgrading).
"""
from __future__ import annotations

import json
import stat
from pathlib import Path

import pytest

from pyfars.cli.install_harness import (
    HarnessInstallError,
    _DISPATCHER_SHIM_NAME,
    _build_hooks_settings_block,
    _dispatcher_script_text,
    _install_claude_code_hooks,
    _uninstall_claude_code_hooks,
    _walk_hook_records,
)


def _write_hook_record(root: Path, slug: str, *, event: str = "PostToolUse",
                       matcher: str | None = None, operator: str = "tool_use",
                       truth: float = 1.0, evidence: float = 1.0,
                       channel: str = "dispatch",
                       on_truncation: str | None = None,
                       patterns: list[dict] | None = None,
                       runtime: str | None = "claude-code") -> Path:
    hooks_dir = root / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    matcher_line = f"\nmatcher: {matcher!r}" if matcher is not None else ""
    runtime_line = f"\nruntime: {runtime}" if runtime is not None else ""
    truncation_line = (f"\non-truncation: {on_truncation}"
                       if on_truncation is not None else "")
    patterns_block = ""
    if patterns:
        patterns_block = "\npatterns:"
        for p in patterns:
            patterns_block += f"\n  - regex: {p['regex']!r}"
            if "label" in p:
                patterns_block += f"\n    label: {p['label']}"
    text = (
        "---\n"
        f"kind: hook\n"
        f"type: hook\n"
        f"slug: \"hook:{slug}\"{runtime_line}\n"
        f"event: {event}{matcher_line}\n"
        f"channel: {channel}{truncation_line}{patterns_block}\n"
        f"witness:\n"
        f"  operator: {operator}\n"
        f"  truth: {truth}\n"
        f"  evidence: {evidence}\n"
        "---\n"
        f"\n# {slug}\n"
    )
    path = hooks_dir / f"{slug}.md"
    path.write_text(text, encoding="utf-8")
    return path


def test_walk_returns_empty_when_dir_missing(tmp_path):
    assert _walk_hook_records(tmp_path) == []


def test_walk_skips_index_and_non_hook_kinds(tmp_path):
    hooks_dir = tmp_path / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True)
    (hooks_dir / "_index.md").write_text(
        "---\nkind: index\n---\n", encoding="utf-8")
    (hooks_dir / "note.md").write_text(
        "---\nkind: note\n---\n", encoding="utf-8")
    _write_hook_record(tmp_path, "real")
    out = _walk_hook_records(tmp_path)
    assert [h["slug"] for h in out] == ["real"]


def test_walk_rejects_unknown_event(tmp_path):
    _write_hook_record(tmp_path, "bad", event="MadeUpEvent")
    with pytest.raises(HarnessInstallError, match="not a recognized"):
        _walk_hook_records(tmp_path)


def test_walk_rejects_missing_operator(tmp_path):
    hooks_dir = tmp_path / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True)
    (hooks_dir / "noop.md").write_text(
        "---\nkind: hook\nruntime: claude-code\nevent: PostToolUse\n"
        "witness:\n  truth: 1.0\n---\n",
        encoding="utf-8",
    )
    with pytest.raises(HarnessInstallError, match="witness.operator"):
        _walk_hook_records(tmp_path)


def test_walk_skips_records_for_other_runtime(tmp_path):
    """A record targeting a different runtime (future Aider/Cursor) must
    be skipped silently — the walker is per-runtime by design."""
    _write_hook_record(tmp_path, "claude-one", runtime="claude-code")
    _write_hook_record(tmp_path, "aider-one", runtime="aider",
                       event="MadeUpAiderEvent")
    out = _walk_hook_records(tmp_path)
    assert [h["slug"] for h in out] == ["claude-one"]


def test_walk_skips_records_without_runtime(tmp_path):
    """A record without a runtime field is treated as a draft and skipped."""
    _write_hook_record(tmp_path, "draft", runtime=None)
    assert _walk_hook_records(tmp_path) == []


def test_walk_rejects_out_of_range_bilattice(tmp_path):
    _write_hook_record(tmp_path, "bad", truth=1.5)
    with pytest.raises(HarnessInstallError, match=r"witness\.truth=1\.5"):
        _walk_hook_records(tmp_path)


def test_walk_rejects_slug_with_shell_metacharacters(tmp_path):
    """Records sit on disk; filenames are user-controlled. The slug ends up
    interpolated into the settings.json command string, so the walker MUST
    reject any stem that could smuggle a quote/semicolon/backtick into the
    runtime's exec line. Charset enforced: lowercase alphanumerics + hyphens,
    no leading hyphen."""
    hooks_dir = tmp_path / "operations/engineering/hooks"
    hooks_dir.mkdir(parents=True)
    body = (
        "---\nkind: hook\nruntime: claude-code\n"
        "event: PostToolUse\nwitness:\n  operator: x\n  truth: 1.0\n  evidence: 1.0\n---\n"
    )
    # Inject characters that would break the `$DIR/dispatch.sh hook:<slug>`
    # interpolation: quote, semicolon, backtick, dollar.
    bad = hooks_dir / "evil; rm -rf .md"
    bad.write_text(body, encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="not a valid hook slug"):
        _walk_hook_records(tmp_path)
    bad.unlink()
    bad2 = hooks_dir / "Has-Caps.md"
    bad2.write_text(body, encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="not a valid hook slug"):
        _walk_hook_records(tmp_path)
    bad2.unlink()
    bad3 = hooks_dir / "-leading-hyphen.md"
    bad3.write_text(body, encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="not a valid hook slug"):
        _walk_hook_records(tmp_path)


def test_walk_rejects_unknown_truncation_policy(tmp_path):
    _write_hook_record(tmp_path, "bad", on_truncation="silent")
    with pytest.raises(HarnessInstallError, match="on-truncation="):
        _walk_hook_records(tmp_path)


def test_walk_accepts_known_truncation_policies(tmp_path):
    for pol in ("warn", "block", "passthrough"):
        _write_hook_record(tmp_path, f"ok-{pol}", on_truncation=pol)
    out = {h["slug"]: h["on-truncation"] for h in _walk_hook_records(tmp_path)}
    assert out == {"ok-warn": "warn", "ok-block": "block",
                   "ok-passthrough": "passthrough"}


def test_walk_default_truncation_policy_is_warn(tmp_path):
    _write_hook_record(tmp_path, "default")
    [h] = _walk_hook_records(tmp_path)
    assert h["on-truncation"] == "warn"


def test_walk_validates_pattern_regex_compiles(tmp_path):
    _write_hook_record(tmp_path, "bad-regex",
                       patterns=[{"regex": "(unbalanced", "label": "x"}])
    with pytest.raises(HarnessInstallError, match="not.*valid regex"):
        _walk_hook_records(tmp_path)


def test_walk_collects_patterns_in_declaration_order(tmp_path):
    _write_hook_record(tmp_path, "with-patterns", patterns=[
        {"regex": "AKIA[A-Z0-9]{16}", "label": "aws-access-key"},
        {"regex": "ghp_[A-Za-z0-9]{36}", "label": "github-token"},
    ])
    [h] = _walk_hook_records(tmp_path)
    assert [p["label"] for p in h["patterns"]] == [
        "aws-access-key", "github-token",
    ]


def test_install_writes_single_dispatcher_settings_and_manifest(tmp_path):
    _write_hook_record(tmp_path, "ok-success",
                       event="PostToolUse", truth=1.0, evidence=1.0)
    _write_hook_record(tmp_path, "ok-failure",
                       event="PostToolUseFailure", truth=0.0, evidence=1.0)
    target = tmp_path / ".claude"
    count, manifest_path, entries = _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False,
    )
    assert count == 2
    assert manifest_path is not None and manifest_path.is_file()
    # ONE dispatcher shim, executable, no per-record scripts.
    dispatcher = target / "hooks" / _DISPATCHER_SHIM_NAME
    assert dispatcher.is_file()
    assert dispatcher.stat().st_mode & stat.S_IXUSR
    text = dispatcher.read_text(encoding="utf-8")
    assert text.startswith("#!/usr/bin/env bash\n")
    assert 'exec pyfars hook-dispatch "$1"' in text
    # Per-record scripts no longer exist (regression: catch revival of
    # the per-shim fan-out that this refactor eliminated).
    assert not (target / "hooks" / "ok-success.sh").exists()
    assert not (target / "hooks" / "ok-failure.sh").exists()
    # settings.json: every command points at the single dispatcher with
    # the hook slug appended as positional arg 1.
    settings = json.loads((target / "settings.json").read_text(encoding="utf-8"))
    assert set(settings["hooks"].keys()) == {"PostToolUse", "PostToolUseFailure"}
    for buckets in settings["hooks"].values():
        assert len(buckets) == 1
        bucket = buckets[0]
        assert "matcher" not in bucket  # default `.*` omitted
        assert bucket["hooks"][0]["type"] == "command"
        cmd = bucket["hooks"][0]["command"]
        # CRITICAL: command path must include `.claude/` because the
        # runtime resolves against $CLAUDE_PROJECT_DIR (= repo root),
        # not against the .claude/ install target.
        assert cmd.startswith(
            f"$CLAUDE_PROJECT_DIR/.claude/hooks/{_DISPATCHER_SHIM_NAME}"
        )
        # Slug arg appended after a single space, prefixed with `hook:`.
        assert " hook:ok-" in cmd
    # Manifest: dispatcher path top-level, per-hook entries carry the
    # bilattice axes + truncation policy + sentinel-pattern declarations.
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["harness"] == "claude-code-hooks"
    assert manifest["dispatcher-path"].endswith(_DISPATCHER_SHIM_NAME)
    assert manifest["context-summary"]["hook-count"] == 2
    assert manifest["context-summary"]["events"] == [
        "PostToolUse", "PostToolUseFailure",
    ]
    assert manifest["context-summary"]["sentinel-hook-count"] == 0
    by_slug = {e["slug"]: e for e in manifest["hooks"]}
    assert by_slug["ok-success"]["truth"] == 1.0
    assert by_slug["ok-failure"]["truth"] == 0.0
    assert by_slug["ok-success"]["on-truncation"] == "warn"
    # Legacy per-record `out-path` field absent on new-format manifests.
    assert "out-path" not in by_slug["ok-success"]


def test_install_records_sentinel_patterns_in_manifest(tmp_path):
    _write_hook_record(tmp_path, "secrets",
                       event="PostToolUse",
                       channel="governance",
                       truth=0.0, evidence=1.0,
                       patterns=[
                           {"regex": "AKIA[A-Z0-9]{16}",
                            "label": "aws-access-key"},
                       ])
    target = tmp_path / ".claude"
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    manifest = json.loads(
        (tmp_path / ".fars/harness-manifests/claude-code-hooks.json")
        .read_text(encoding="utf-8")
    )
    assert manifest["context-summary"]["sentinel-hook-count"] == 1
    assert manifest["context-summary"]["channels"] == ["governance"]
    [secrets] = manifest["hooks"]
    assert secrets["patterns"] == [
        {"regex": "AKIA[A-Z0-9]{16}", "label": "aws-access-key"},
    ]


def test_install_refuses_to_overwrite_malformed_settings(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    target.mkdir()
    (target / "settings.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="not valid JSON"):
        _install_claude_code_hooks(
            root=tmp_path, target=target, prefix="pyfars-", dry_run=False)


def test_install_refuses_to_overwrite_non_object_settings(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    target.mkdir()
    (target / "settings.json").write_text("[1, 2, 3]", encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="not an object"):
        _install_claude_code_hooks(
            root=tmp_path, target=target, prefix="pyfars-", dry_run=False)


def test_install_preserves_peer_settings_keys(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    target.mkdir()
    (target / "settings.json").write_text(
        json.dumps({
            "permissions": {"allow": ["Bash(ls)"], "deny": []},
            "hooks": {"OldEvent": [{"hooks": []}]},
        }) + "\n",
        encoding="utf-8",
    )
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    after = json.loads((target / "settings.json").read_text(encoding="utf-8"))
    assert after["permissions"] == {"allow": ["Bash(ls)"], "deny": []}
    assert "OldEvent" not in after["hooks"]
    assert "PostToolUse" in after["hooks"]
    manifest = json.loads(
        (tmp_path / ".fars/harness-manifests/claude-code-hooks.json")
        .read_text(encoding="utf-8")
    )
    assert manifest["prior-hooks-block"] == {"OldEvent": [{"hooks": []}]}


def test_uninstall_restores_prior_hooks_block(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    target.mkdir()
    prior_settings = {
        "permissions": {"allow": [], "deny": []},
        "hooks": {"PreCompact": [{"hooks": [{"type": "command",
                                              "command": "echo prior"}]}]},
    }
    (target / "settings.json").write_text(
        json.dumps(prior_settings) + "\n", encoding="utf-8")
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    removed, _ = _uninstall_claude_code_hooks(
        root=tmp_path, target=target, dry_run=False)
    # 1 = the single dispatcher shim. (Hook records share it.)
    assert removed == 1
    assert not (target / "hooks" / _DISPATCHER_SHIM_NAME).exists()
    assert not (target / "hooks").exists()  # empty dir cleaned up
    after = json.loads((target / "settings.json").read_text(encoding="utf-8"))
    assert after == prior_settings
    assert not (tmp_path / ".fars/harness-manifests/claude-code-hooks.json").exists()


def test_uninstall_legacy_per_shim_manifest(tmp_path):
    """An operator who installed under the prior per-shim layout (one
    .sh per record + per-entry `out-path` in manifest) must be able to
    --uninstall after upgrading the harness without manual cleanup."""
    target = tmp_path / ".claude"
    hooks_dir = target / "hooks"
    hooks_dir.mkdir(parents=True)
    # Synthesize the prior layout's artifacts on disk.
    (hooks_dir / "legacy-a.sh").write_text("#!/usr/bin/env bash\n",
                                            encoding="utf-8")
    (hooks_dir / "legacy-b.sh").write_text("#!/usr/bin/env bash\n",
                                            encoding="utf-8")
    (target / "settings.json").write_text(json.dumps({"hooks": {}}),
                                          encoding="utf-8")
    manifest_dir = tmp_path / ".fars/harness-manifests"
    manifest_dir.mkdir(parents=True)
    (manifest_dir / "claude-code-hooks.json").write_text(json.dumps({
        "harness": "claude-code-hooks",
        "hooks": [
            {"slug": "legacy-a",
             "out-path": ".claude/hooks/legacy-a.sh"},
            {"slug": "legacy-b",
             "out-path": ".claude/hooks/legacy-b.sh"},
        ],
        "settings-path": ".claude/settings.json",
        "prior-hooks-block": None,
    }), encoding="utf-8")
    removed, _ = _uninstall_claude_code_hooks(
        root=tmp_path, target=target, dry_run=False)
    assert removed == 2
    assert not (hooks_dir / "legacy-a.sh").exists()
    assert not (hooks_dir / "legacy-b.sh").exists()


def test_uninstall_refuses_non_object_settings_and_keeps_manifest(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    manifest_path = tmp_path / ".fars/harness-manifests/claude-code-hooks.json"
    assert manifest_path.is_file()
    (target / "settings.json").write_text("[1, 2, 3]", encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="not an object"):
        _uninstall_claude_code_hooks(
            root=tmp_path, target=target, dry_run=False)
    assert manifest_path.is_file()


def test_uninstall_refuses_malformed_settings_and_keeps_manifest(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    manifest_path = tmp_path / ".fars/harness-manifests/claude-code-hooks.json"
    (target / "settings.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(HarnessInstallError, match="unreadable"):
        _uninstall_claude_code_hooks(
            root=tmp_path, target=target, dry_run=False)
    assert manifest_path.is_file()


def test_uninstall_removes_settings_when_no_prior_and_no_other_keys(tmp_path):
    _write_hook_record(tmp_path, "h1")
    target = tmp_path / ".claude"
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    _uninstall_claude_code_hooks(
        root=tmp_path, target=target, dry_run=False)
    assert not (target / "settings.json").exists()


def test_install_groups_two_hooks_on_same_event_distinct_matchers(tmp_path):
    _write_hook_record(tmp_path, "edits", event="PostToolUse",
                       matcher="Edit|Write")
    _write_hook_record(tmp_path, "bash", event="PostToolUse",
                       matcher="Bash")
    target = tmp_path / ".claude"
    _install_claude_code_hooks(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    settings = json.loads((target / "settings.json").read_text(encoding="utf-8"))
    buckets = settings["hooks"]["PostToolUse"]
    assert len(buckets) == 2
    matchers = sorted(b["matcher"] for b in buckets)
    assert matchers == ["Bash", "Edit|Write"]
    # Both buckets resolve through the same single dispatcher.
    for b in buckets:
        for hook in b["hooks"]:
            assert _DISPATCHER_SHIM_NAME in hook["command"]


def test_no_records_raises_clear_error(tmp_path):
    target = tmp_path / ".claude"
    with pytest.raises(HarnessInstallError, match="no hook records"):
        _install_claude_code_hooks(
            root=tmp_path, target=target, prefix="pyfars-", dry_run=False)


def test_uninstall_with_no_manifest_is_noop(tmp_path, capsys):
    removed, manifest_path = _uninstall_claude_code_hooks(
        root=tmp_path, target=tmp_path / ".claude", dry_run=False)
    assert removed == 0
    assert manifest_path is None
    err = capsys.readouterr().err
    assert "nothing to uninstall" in err


def test_dispatcher_shim_has_no_record_specific_text():
    """The single shim must be record-agnostic — adding a hook record
    must not require regenerating the shim. Regression test for the
    prior per-record code-injection surface (record content interpolated
    into a python heredoc)."""
    text = _dispatcher_script_text()
    # No hook-slug, no operator name, no bilattice values, no patterns.
    # Just bash bootstrap + exec of the dispatcher verb.
    assert "Witness(" not in text
    assert "operator=" not in text
    assert "truth=" not in text
    assert 'exec pyfars hook-dispatch "$1"' in text


def test_build_settings_block_omits_default_matcher():
    block = _build_hooks_settings_block(
        [{"event": "PostToolUse", "matcher": ".*", "slug": "x"}],
        ".claude/hooks/_pyfars-dispatch.sh")
    assert "matcher" not in block["PostToolUse"][0]


def test_build_settings_block_keeps_nondefault_matcher():
    block = _build_hooks_settings_block(
        [{"event": "PostToolUse", "matcher": "Edit", "slug": "x"}],
        ".claude/hooks/_pyfars-dispatch.sh")
    assert block["PostToolUse"][0]["matcher"] == "Edit"


def test_build_settings_block_command_appends_slug_arg():
    block = _build_hooks_settings_block(
        [{"event": "PostToolUse", "matcher": ".*", "slug": "alpha"}],
        ".claude/hooks/_pyfars-dispatch.sh")
    cmd = block["PostToolUse"][0]["hooks"][0]["command"]
    assert cmd == "$CLAUDE_PROJECT_DIR/.claude/hooks/_pyfars-dispatch.sh hook:alpha"
