"""Tests for ``pyfars work tick`` (the work-cycle heartbeat).

The dispatch path makes a real HTTPS call against an LLM endpoint, so we
test tick at two levels:

  1. Pure: the task picker and ``--dry-run`` path — no network.
  2. End-to-end with the dispatch path stubbed out — confirms ingest is
     wired and the task is marked completed.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from pyfars.cli.work import tick as tick_mod


def _make_corpus(tmp_path: Path) -> Path:
    (tmp_path / "flake.nix").write_text("# marker\n")
    (tmp_path / ".git").mkdir()
    (tmp_path / "operations/engineering/records/work/execute").mkdir(parents=True)
    (tmp_path / "operations/engineering/records/work/track").mkdir(parents=True)
    (tmp_path / "tasks").mkdir()
    return tmp_path


def _write_task(corpus: Path, slug: str, status: str = "open",
                priority: int = 5, **extra) -> Path:
    fm_lines = [
        f"title: 'Task {slug}'",
        "type: task",
        "kind: task",
        f"status: {status}",
        f"priority: {priority}",
    ]
    for k, v in extra.items():
        fm_lines.append(f"{k}: {v}")
    p = corpus / "tasks" / f"{slug}.md"
    p.write_text(
        "---\n" + "\n".join(fm_lines) + "\n---\n\nTask body.\n",
        encoding="utf-8",
    )
    return p


def test_pick_next_task_returns_highest_priority(tmp_path: Path):
    corpus = _make_corpus(tmp_path)
    _write_task(corpus, "low", priority=2)
    _write_task(corpus, "high", priority=9)
    _write_task(corpus, "mid", priority=5)
    pick = tick_mod._pick_next_task(corpus, scope=None)
    assert pick is not None
    assert pick["slug"] == "high"


def test_pick_next_task_skips_non_open(tmp_path: Path):
    corpus = _make_corpus(tmp_path)
    _write_task(corpus, "done-task", status="done", priority=9)
    _write_task(corpus, "open-task", status="open", priority=1)
    pick = tick_mod._pick_next_task(corpus, scope=None)
    assert pick is not None
    assert pick["slug"] == "open-task"


def test_pick_next_task_returns_none_when_idle(tmp_path: Path):
    corpus = _make_corpus(tmp_path)
    _write_task(corpus, "done-1", status="done")
    assert tick_mod._pick_next_task(corpus, scope=None) is None


def test_pick_next_task_honors_scope(tmp_path: Path):
    corpus = _make_corpus(tmp_path)
    (corpus / "tasks/a").mkdir()
    (corpus / "tasks/b").mkdir()
    (corpus / "tasks/a/x.md").write_text(
        "---\ntype: task\nkind: task\nstatus: open\npriority: 9\n---\n\n",
        encoding="utf-8",
    )
    (corpus / "tasks/b/y.md").write_text(
        "---\ntype: task\nkind: task\nstatus: open\npriority: 1\n---\n\n",
        encoding="utf-8",
    )
    pick = tick_mod._pick_next_task(corpus, scope=corpus / "tasks/b")
    assert pick is not None
    assert pick["slug"] == "y"


def test_run_idle_exits_zero(tmp_path: Path, monkeypatch, capsys):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    rc = tick_mod.run(["--root", str(corpus)])
    assert rc == 0
    assert "idle" in capsys.readouterr().out


def test_run_dry_run_does_not_dispatch(tmp_path: Path, monkeypatch, capsys):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    _write_task(corpus, "demo-task", priority=5)
    called = {"n": 0}

    def fake_ad_run(_argv):
        called["n"] += 1
        return 0

    monkeypatch.setattr(tick_mod.ad_mod, "run", fake_ad_run)
    rc = tick_mod.run(["--root", str(corpus), "--dry-run"])
    assert rc == 0
    assert called["n"] == 0
    out = capsys.readouterr().out
    assert "demo-task" in out


def test_run_full_cycle_marks_task_completed(tmp_path: Path, monkeypatch, capsys):
    """Stub auto-dispatch to drop a conforming execution-event; expect tick to
    ingest it and mark the task completed."""
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    task_path = _write_task(corpus, "demo-task", priority=5)
    completion = (
        "```yaml\nkind: skill\ntitle: produced\n```\n\n"
        "```markdown\n# produced\nbody\n```\n"
    )

    def fake_ad_run(argv):
        # mimic auto-dispatch by writing an execution-event with completion
        ev = corpus / (
            "operations/engineering/records/work/execute/"
            "execution-event-demo-task-20260504100000-abcd.md"
        )
        ev.write_text(
            "---\n"
            "title: 'ExecutionEvent: demo-task completed'\n"
            "type: workitem\n"
            "kind: execution-event\n"
            "is-a: execution-event\n"
            "concerns-task: demo-task\n"
            "under-assignment: assignment-demo\n"
            "by-office: cerebras\n"
            "at: '2026-05-04T10:00:00Z'\n"
            "state-change: completed\n"
            "---\n\n"
            f"Body.\n\n## Completion\n\n{completion}\n",
            encoding="utf-8",
        )
        return 0

    monkeypatch.setattr(tick_mod.ad_mod, "run", fake_ad_run)
    rc = tick_mod.run(["--root", str(corpus)])
    assert rc == 0
    # task marked completed
    text = task_path.read_text(encoding="utf-8")
    assert "status: completed" in text
    assert "completed-at:" in text
    assert "produced-draft:" in text
    # draft exists under .fars/drafts/
    drafts = list((corpus / ".fars/drafts").glob("*.md"))
    assert len(drafts) == 1


def test_run_keep_status_does_not_flip(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    task_path = _write_task(corpus, "demo-task", priority=5)
    completion = (
        "```yaml\nkind: skill\ntitle: t\n```\n\n```markdown\nb\n```\n"
    )

    def fake_ad_run(argv):
        ev = corpus / (
            "operations/engineering/records/work/execute/"
            "execution-event-demo-task-20260504100000-abcd.md"
        )
        ev.write_text(
            "---\nkind: execution-event\nis-a: execution-event\n"
            "concerns-task: demo-task\nunder-assignment: a\nby-office: x\n"
            "at: 't'\nstate-change: completed\n---\n\n"
            f"## Completion\n\n{completion}\n",
            encoding="utf-8",
        )
        return 0

    monkeypatch.setattr(tick_mod.ad_mod, "run", fake_ad_run)
    rc = tick_mod.run(["--root", str(corpus), "--keep-status"])
    assert rc == 0
    assert "status: open" in task_path.read_text(encoding="utf-8")


def test_run_passes_prefer_endpoint_from_frontmatter(tmp_path: Path, monkeypatch):
    """A task carrying ``prefer-endpoint`` should propagate it to auto-dispatch."""
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    _write_task(corpus, "demo-task", priority=5,
                **{"prefer-endpoint": "nvidia-nim-llama-3-3-70b"})

    captured = {"argv": None}

    def fake_ad_run(argv):
        captured["argv"] = argv
        ev = corpus / (
            "operations/engineering/records/work/execute/"
            "execution-event-demo-task-20260504100000-abcd.md"
        )
        ev.write_text(
            "---\nkind: execution-event\nis-a: execution-event\n"
            "concerns-task: demo-task\nunder-assignment: a\nby-office: x\n"
            "at: 't'\nstate-change: completed\n---\n\n"
            "## Completion\n\n```yaml\nkind: skill\ntitle: t\n```\n\n"
            "```markdown\nb\n```\n",
            encoding="utf-8",
        )
        return 0

    monkeypatch.setattr(tick_mod.ad_mod, "run", fake_ad_run)
    rc = tick_mod.run(["--root", str(corpus)])
    assert rc == 0
    assert "--prefer" in captured["argv"]
    idx = captured["argv"].index("--prefer")
    assert captured["argv"][idx + 1] == "nvidia-nim-llama-3-3-70b"


def test_run_cli_prefer_overrides_frontmatter(tmp_path: Path, monkeypatch):
    """``--prefer`` on the CLI wins over ``prefer-endpoint`` in the task fm."""
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    _write_task(corpus, "demo-task", priority=5,
                **{"prefer-endpoint": "frontmatter-pick"})

    captured = {"argv": None}

    def fake_ad_run(argv):
        captured["argv"] = argv
        ev = corpus / (
            "operations/engineering/records/work/execute/"
            "execution-event-demo-task-20260504100000-abcd.md"
        )
        ev.write_text(
            "---\nkind: execution-event\nis-a: execution-event\n"
            "concerns-task: demo-task\nunder-assignment: a\nby-office: x\n"
            "at: 't'\nstate-change: completed\n---\n\n"
            "## Completion\n\n```yaml\nkind: skill\ntitle: t\n```\n\n"
            "```markdown\nb\n```\n",
            encoding="utf-8",
        )
        return 0

    monkeypatch.setattr(tick_mod.ad_mod, "run", fake_ad_run)
    rc = tick_mod.run(["--root", str(corpus), "--prefer", "cli-pick"])
    assert rc == 0
    idx = captured["argv"].index("--prefer")
    assert captured["argv"][idx + 1] == "cli-pick"


def test_run_dispatch_failure_leaves_task_open(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    task_path = _write_task(corpus, "demo-task", priority=5)
    monkeypatch.setattr(tick_mod.ad_mod, "run", lambda argv: 4)
    rc = tick_mod.run(["--root", str(corpus)])
    assert rc == 4
    assert "status: open" in task_path.read_text(encoding="utf-8")


def test_run_ingest_failure_leaves_task_open(tmp_path: Path, monkeypatch):
    corpus = _make_corpus(tmp_path)
    monkeypatch.chdir(corpus)
    task_path = _write_task(corpus, "demo-task", priority=5)

    def fake_ad_run(argv):
        ev = corpus / (
            "operations/engineering/records/work/execute/"
            "execution-event-demo-task-20260504100000-abcd.md"
        )
        ev.write_text(
            "---\nkind: execution-event\nis-a: execution-event\n"
            "concerns-task: demo-task\nunder-assignment: a\nby-office: x\n"
            "at: 't'\nstate-change: completed\n---\n\n"
            "## Completion\n\nNo fenced blocks at all.\n",
            encoding="utf-8",
        )
        return 0

    monkeypatch.setattr(tick_mod.ad_mod, "run", fake_ad_run)
    rc = tick_mod.run(["--root", str(corpus)])
    assert rc == 1
    assert "status: open" in task_path.read_text(encoding="utf-8")
    # ingest-failure observation written
    failures = list(
        (corpus / "operations/engineering/records/work/track").glob(
            "observation-ingest-failure-*"
        )
    )
    assert len(failures) == 1
