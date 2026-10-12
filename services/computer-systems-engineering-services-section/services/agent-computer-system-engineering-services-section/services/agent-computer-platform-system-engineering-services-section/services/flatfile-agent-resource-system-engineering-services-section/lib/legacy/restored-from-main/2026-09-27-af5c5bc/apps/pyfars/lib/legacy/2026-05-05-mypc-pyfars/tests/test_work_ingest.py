"""Tests for ``pyfars work ingest`` (the reply-contract → draft pipeline)."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from pyfars.cli.work.ingest import IngestError, ingest, parse_reply, run


# --- pure parse tests -------------------------------------------------------

def test_parse_reply_extracts_two_blocks():
    text = (
        "Some preamble.\n\n"
        "```yaml\n"
        "title: Foo\n"
        "kind: skill\n"
        "```\n\n"
        "```markdown\n"
        "# Foo\n\nBody here.\n"
        "```\n"
    )
    fm, body = parse_reply(text)
    assert fm == {"title": "Foo", "kind": "skill"}
    assert body == "# Foo\n\nBody here.\n"


def test_parse_reply_uses_first_yaml_and_first_markdown():
    text = (
        "```yaml\nkind: a\n```\n"
        "```yaml\nkind: b\n```\n"
        "```markdown\nFirst.\n```\n"
        "```markdown\nSecond.\n```\n"
    )
    fm, body = parse_reply(text)
    assert fm == {"kind": "a"}
    assert body == "First.\n"


def test_parse_reply_after_completion_heading_only():
    text = (
        "Pre.\n\n## Completion\n\n"
        "```yaml\nkind: x\n```\n\n"
        "```markdown\nb\n```\n"
    )
    fm, body = parse_reply(text)
    assert fm == {"kind": "x"}
    assert body == "b\n"


def test_parse_reply_missing_yaml_raises():
    with pytest.raises(IngestError, match="yaml"):
        parse_reply("```markdown\nbody\n```")


def test_parse_reply_missing_markdown_raises():
    with pytest.raises(IngestError, match="markdown"):
        parse_reply("```yaml\nkind: x\n```")


def test_parse_reply_yaml_must_be_mapping():
    with pytest.raises(IngestError, match="mapping"):
        parse_reply("```yaml\n- a\n- b\n```\n```markdown\nb\n```")


def test_parse_reply_markdown_before_yaml_rejected():
    text = "```markdown\nb\n```\n```yaml\nkind: x\n```"
    with pytest.raises(IngestError, match="before"):
        parse_reply(text)


# --- end-to-end ingest with a fake corpus ----------------------------------

def _make_corpus(tmp_path: Path) -> Path:
    """Build the minimum shape ingest needs: flake.nix marker, .git, and the
    records-dir tree the execution-event lives in."""
    (tmp_path / "flake.nix").write_text("# marker\n")
    (tmp_path / ".git").mkdir()
    (tmp_path / "operations/engineering/records/work/execute").mkdir(parents=True)
    (tmp_path / "operations/engineering/records/work/track").mkdir(parents=True)
    return tmp_path


def _write_execution_event(corpus: Path, slug: str, completion_blocks: str,
                           **fm_extras) -> Path:
    fm_lines = [
        "title: 'ExecutionEvent: demo'",
        "type: workitem",
        "kind: execution-event",
        "is-a: execution-event",
        "concerns-task: demo-task",
        "under-assignment: demo-assignment",
        "by-office: cerebras",
        "at: '2026-05-04T10:00:00Z'",
        "state-change: completed",
    ]
    for k, v in fm_extras.items():
        fm_lines.append(f"{k}: {v}")
    text = (
        "---\n" + "\n".join(fm_lines) + "\n---\n\n"
        f"Execution event body.\n\n## Completion\n\n{completion_blocks}\n"
    )
    p = corpus / f"operations/engineering/records/work/execute/{slug}.md"
    p.write_text(text, encoding="utf-8")
    return p


def test_ingest_writes_draft_with_provenance(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    completion = (
        "```yaml\n"
        "title: A new skill\n"
        "kind: skill\n"
        "status: ready\n"
        "```\n\n"
        "```markdown\n"
        "# A new skill\n\nDoes a thing.\n"
        "```\n"
    )
    _write_execution_event(corpus, "execution-event-demo-task-20260504-aaaa", completion)
    result = ingest("execution-event-demo-task-20260504-aaaa", corpus)
    assert result["ok"] is True
    draft = result["draft"]
    assert draft.exists()
    assert draft.parent == corpus / ".fars/drafts"
    text = draft.read_text(encoding="utf-8")
    assert "produced-by: dispatch-ingest" in text
    assert "produced-from: execution-event-demo-task-20260504-aaaa" in text
    assert "produced-at:" in text
    assert "title: A new skill" in text
    assert "# A new skill" in text


def test_ingest_failure_writes_observation(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    completion = "Just prose. No fenced blocks at all."
    _write_execution_event(corpus, "execution-event-demo-task-20260504-bbbb", completion)
    result = ingest("execution-event-demo-task-20260504-bbbb", corpus)
    assert result["ok"] is False
    assert "yaml" in result["reason"]
    failure = result["failure"]
    assert failure.exists()
    failure_text = failure.read_text(encoding="utf-8")
    assert "kind: observation" in failure_text
    assert "ingest-failure" in failure.name
    # the source execution-event must be untouched
    src = corpus / "operations/engineering/records/work/execute/execution-event-demo-task-20260504-bbbb.md"
    assert "## Completion" in src.read_text()


def test_ingest_unknown_event_returns_not_found(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    result = ingest("execution-event-nope-20260504-zzzz", corpus)
    assert result["ok"] is False
    assert "not found" in result["reason"]


def test_ingest_rejects_non_execution_event(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    p = corpus / "operations/engineering/records/work/execute/some-task.md"
    p.write_text(
        "---\nkind: task\ntitle: hi\n---\n\nbody\n", encoding="utf-8"
    )
    result = ingest("some-task", corpus)
    assert result["ok"] is False
    assert "execution-event" in result["reason"]


def test_run_cli_returns_zero_on_success(tmp_path: Path, monkeypatch, capsys):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    completion = (
        "```yaml\nkind: skill\ntitle: t\n```\n\n```markdown\nbody\n```\n"
    )
    _write_execution_event(corpus, "execution-event-demo-task-20260504-cccc", completion)
    rc = run(["execution-event-demo-task-20260504-cccc", "--root", str(corpus)])
    assert rc == 0
    out = capsys.readouterr().out
    assert "wrote" in out


def test_run_cli_returns_nonzero_on_failure(tmp_path: Path, monkeypatch, capsys):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    _write_execution_event(corpus, "execution-event-demo-task-20260504-dddd",
                           "no blocks here")
    rc = run(["execution-event-demo-task-20260504-dddd", "--root", str(corpus)])
    assert rc == 1
