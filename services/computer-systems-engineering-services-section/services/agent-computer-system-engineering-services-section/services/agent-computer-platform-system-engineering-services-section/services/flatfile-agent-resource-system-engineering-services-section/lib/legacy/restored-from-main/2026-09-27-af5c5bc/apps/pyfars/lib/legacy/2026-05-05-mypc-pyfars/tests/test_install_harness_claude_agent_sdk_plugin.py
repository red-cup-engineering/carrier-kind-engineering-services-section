"""Tests for the ``claude-agent-sdk-plugin`` PyFARS harness installer.

Covers: walker enumeration (SPEC-driven verbs return parameters,
_HELP-only verbs return empty params, unknown-everywhere skipped),
end-to-end install (plugin.json + per-verb commands written, frontmatter
correct, invocation block present, manifest exact), uninstall round-trip
(commands + plugin.json + manifest gone, empty dirs removed, refuses
manifest path traversal), and the PYFARS_PLUGIN_VERB_FILTER subset
mechanism for cheap test installs.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from pyfars.cli.install_harness import (
    HarnessInstallError,
    _claude_plugin_command_text,
    _claude_plugin_manifest_text,
    _install_claude_agent_sdk_plugin,
    _uninstall_claude_agent_sdk_plugin,
    _walk_verb_records,
)


def test_walk_includes_known_verbs(monkeypatch):
    """`validate` and `dispatch` are core verbs that exist in every
    FARS install. Walker must return them with non-empty descriptions."""
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "validate,dispatch")
    out = _walk_verb_records(verb_filter={"validate", "dispatch"})
    by_verb = {r["verb"]: r for r in out}
    assert set(by_verb) == {"validate", "dispatch"}
    for r in out:
        assert r["description"]
        assert r["module"]


def test_walk_filter_returns_empty_when_no_match():
    out = _walk_verb_records(verb_filter={"nonexistent-verb-xyz"})
    assert out == []


def test_walk_marks_spec_vs_help_only_verbs():
    """`help` itself has a SPEC; mark it. (We use the verb's own SPEC
    presence as the discriminator, not a substantive claim about the
    verb.)"""
    [r] = _walk_verb_records(verb_filter={"help"})
    assert r["has-spec"] is True
    assert isinstance(r["parameters"], list)


def test_command_text_has_frontmatter_and_invocation():
    verb = {
        "verb": "validate",
        "module": "validate",
        "description": "Validate a file's frontmatter against ASR rules.",
        "example": "pyfars validate path/to/file.md",
        "parameters": [
            {"name": "path", "kind": "positional", "required": True,
             "description": "file to validate"},
        ],
        "has-spec": True,
    }
    text = _claude_plugin_command_text(verb=verb)
    # Frontmatter
    assert text.startswith("---\n")
    assert "description: \"Validate" in text
    assert "allowed-tools: Bash(pyfars validate:*)" in text
    # Body
    assert "/pyfars-validate" in text
    assert "## Parameters" in text
    assert "`path` (positional, required)" in text
    assert "## Invocation" in text
    assert "pyfars validate $ARGUMENTS" in text


def test_command_text_omits_parameters_section_when_empty():
    verb = {
        "verb": "agents",
        "module": "agents",
        "description": "List registered agents.",
        "example": "pyfars agents",
        "parameters": [],
        "has-spec": False,
    }
    text = _claude_plugin_command_text(verb=verb)
    assert "## Parameters" not in text
    assert "## Invocation" in text


def test_command_text_escapes_quotes_in_description():
    verb = {
        "verb": "x",
        "module": "x",
        "description": 'Has a "quoted" word.',
        "example": "pyfars x",
        "parameters": [],
        "has-spec": False,
    }
    text = _claude_plugin_command_text(verb=verb)
    # Description appears in YAML frontmatter inside double quotes — must
    # escape internal quotes so the YAML stays parseable.
    assert 'description: "Has a \\"quoted\\" word."' in text


def test_manifest_text_is_valid_json_with_expected_keys():
    text = _claude_plugin_manifest_text(verb_count=42)
    parsed = json.loads(text)
    assert parsed["name"] == "pyfars-substrate"
    assert "42 verbs" in parsed["description"]
    assert parsed["version"] == "0.1.0"
    assert parsed["author"]["name"]


def test_install_writes_plugin_files_and_manifest(tmp_path, monkeypatch):
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "validate,help")
    target = tmp_path / ".claude/plugins/pyfars-substrate"
    count, manifest_path, entries = _install_claude_agent_sdk_plugin(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False,
    )
    assert count == 2
    # plugin.json present and parseable.
    plugin_json = target / ".claude-plugin/plugin.json"
    assert plugin_json.is_file()
    parsed = json.loads(plugin_json.read_text(encoding="utf-8"))
    assert parsed["name"] == "pyfars-substrate"
    # Per-verb commands written.
    for verb in ("validate", "help"):
        cmd = target / "commands" / f"{verb}.md"
        assert cmd.is_file()
        body = cmd.read_text(encoding="utf-8")
        assert body.startswith("---\n")
        assert f"pyfars {verb} $ARGUMENTS" in body
    # Manifest shape.
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["harness"] == "claude-agent-sdk-plugin"
    assert manifest["context-summary"]["verb-count"] == 2
    assert {e["verb"] for e in manifest["commands"]} == {"validate", "help"}


def test_install_with_filter_excluding_everything_raises(
        tmp_path, monkeypatch):
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "nonexistent-verb-xyz")
    with pytest.raises(HarnessInstallError, match="no FARS verbs"):
        _install_claude_agent_sdk_plugin(
            root=tmp_path,
            target=tmp_path / ".claude/plugins/pyfars-substrate",
            prefix="pyfars-", dry_run=False,
        )


def test_uninstall_round_trip_clean(tmp_path, monkeypatch):
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "validate,help")
    target = tmp_path / ".claude/plugins/pyfars-substrate"
    _install_claude_agent_sdk_plugin(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    removed, _ = _uninstall_claude_agent_sdk_plugin(
        root=tmp_path, target=target, dry_run=False)
    # Two commands + plugin.json.
    assert removed == 3
    assert not (target / "commands").exists()
    assert not (target / ".claude-plugin").exists()
    assert not (tmp_path / ".fars/harness-manifests/"
                "claude-agent-sdk-plugin.json").exists()


def test_uninstall_with_no_manifest_is_noop(tmp_path, capsys):
    removed, manifest_path = _uninstall_claude_agent_sdk_plugin(
        root=tmp_path,
        target=tmp_path / ".claude/plugins/pyfars-substrate",
        dry_run=False,
    )
    assert removed == 0
    assert manifest_path is None
    err = capsys.readouterr().err
    assert "nothing to uninstall" in err


def test_reinstall_prunes_stale_commands(tmp_path, monkeypatch):
    """Install with verbs A+B, then reinstall with only A. The command
    file for B must be gone — install is snapshot-based, not additive,
    so a verb removed from the registry between installs does not
    leave a stale slash command lingering in `.claude/plugins/.../commands/`."""
    target = tmp_path / ".claude/plugins/pyfars-substrate"
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "validate,help")
    _install_claude_agent_sdk_plugin(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    assert (target / "commands" / "validate.md").is_file()
    assert (target / "commands" / "help.md").is_file()
    # Now reinstall with only `validate`. The `help.md` from the first
    # install must be pruned by the snapshot-prune step.
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "validate")
    _install_claude_agent_sdk_plugin(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    assert (target / "commands" / "validate.md").is_file()
    assert not (target / "commands" / "help.md").exists(), (
        "stale command file from prior install was not pruned"
    )
    # Manifest reflects only the current install.
    manifest_path = (tmp_path /
                     ".fars/harness-manifests/claude-agent-sdk-plugin.json")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert {e["verb"] for e in manifest["commands"]} == {"validate"}


def test_verb_filter_is_ignored_outside_pytest(tmp_path, monkeypatch):
    """The PYFARS_PLUGIN_VERB_FILTER env var is a test-only knob; an
    ambient value in production environment must NOT silently produce
    a partial install. We simulate non-pytest by clearing
    PYTEST_CURRENT_TEST inside this test's subprocess scope."""
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "nonexistent-verb-xyz")
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    target = tmp_path / ".claude/plugins/pyfars-substrate"
    # If the filter were honored, this would raise (no matching verbs).
    # Because the filter is test-gated and we just removed the gate
    # variable, the install proceeds against the full verb registry.
    count, _, _ = _install_claude_agent_sdk_plugin(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    assert count > 5, (
        f"expected the full verb registry to be installed when "
        f"PYTEST_CURRENT_TEST is unset, got count={count}"
    )


def test_uninstall_refuses_path_traversal_in_manifest(
        tmp_path, monkeypatch, capsys):
    """Same containment guarantee as cline-workflows / claude-code-hooks
    uninstallers — refuses to follow `..` segments out of the repo root."""
    monkeypatch.setenv("PYFARS_PLUGIN_VERB_FILTER", "validate")
    target = tmp_path / ".claude/plugins/pyfars-substrate"
    _, manifest_path, _ = _install_claude_agent_sdk_plugin(
        root=tmp_path, target=target, prefix="pyfars-", dry_run=False)
    outside = tmp_path.parent / "victim-plugin.md"
    outside.write_text("do not delete me", encoding="utf-8")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["commands"].append({
        "verb": "evil",
        "module": "evil",
        "has-spec": False,
        "param-count": 0,
        "out-path": f"../{outside.name}",
        "bytes": 0,
    })
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    _uninstall_claude_agent_sdk_plugin(
        root=tmp_path, target=target, dry_run=False)
    assert outside.is_file(), (
        "uninstall traversed `..` and deleted outside file!"
    )
    err = capsys.readouterr().err
    assert "refusing to remove" in err
    outside.unlink()
