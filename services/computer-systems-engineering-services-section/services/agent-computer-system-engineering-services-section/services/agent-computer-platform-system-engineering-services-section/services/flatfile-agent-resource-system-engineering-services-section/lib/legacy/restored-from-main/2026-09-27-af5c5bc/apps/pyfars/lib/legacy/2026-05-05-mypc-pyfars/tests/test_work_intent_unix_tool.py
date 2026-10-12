from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from pyfars.cli import dispatch as dispatch_mod
from pyfars.cli.work import execute as execute_mod
from pyfars.cli.work import intake_intent as intake_mod


def _make_corpus(tmp_path: Path, monkeypatch) -> Path:
    (tmp_path / ".git").mkdir()
    (tmp_path / "tasks").mkdir()
    (tmp_path / "tools").mkdir()
    (tmp_path / "operations/engineering/records/work/dispatch").mkdir(parents=True)
    (tmp_path / "operations/engineering/records/work/execute").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)
    return tmp_path


def _write_task(root: Path, slug: str, body: str = "Task prompt.") -> Path:
    path = root / "tasks" / f"{slug}.md"
    path.write_text(
        "---\n"
        f"title: {slug}\n"
        f"slug: {slug}\n"
        "type: task\n"
        "kind: task\n"
        "status: open\n"
        "work-type: procedure\n"
        "requires-capabilities: [code-modification]\n"
        "requires-skills: [write-python]\n"
        "---\n\n"
        f"{body}\n",
        encoding="utf-8",
    )
    return path


def _write_unix_tool(root: Path, slug: str = "codex-cli") -> Path:
    path = root / "tools" / f"{slug}.md"
    path.write_text(
        "---\n"
        f"title: {slug}\n"
        "type: unix-tool\n"
        "kind: tool\n"
        "command: codex\n"
        "args: [exec, --skip-git-repo-check]\n"
        "stdin: prompt\n"
        "working-directory: .\n"
        "timeout-seconds: 60\n"
        "work-types: [procedure]\n"
        "provides-capabilities: [code-modification, repository-editing]\n"
        "skills: [write-python]\n"
        "---\n\n"
        "Local Codex CLI dispatch target.\n",
        encoding="utf-8",
    )
    return path


def test_dispatch_includes_unix_tool_dispatchables(tmp_path, monkeypatch):
    root = _make_corpus(tmp_path, monkeypatch)
    _write_task(root, "repair-pyfars")
    _write_unix_tool(root)

    out = dispatch_mod.run("repair-pyfars", root=root)

    assert out is not None
    assert out["ready"] is True
    assert any(
        row["agent"] == "codex-cli" and row["kind"] == "unix-tool"
        for row in out["eligible"]
    )


def test_work_execute_invokes_unix_tool_with_task_prompt(tmp_path, monkeypatch):
    root = _make_corpus(tmp_path, monkeypatch)
    _write_task(root, "repair-pyfars", body="Fix the dispatch loop.")
    _write_unix_tool(root)
    assignment = root / "operations/engineering/records/work/dispatch/assignment-demo.md"
    assignment.write_text(
        "---\n"
        "title: Assignment\n"
        "type: workitem\n"
        "kind: assignment\n"
        "assigns-task: repair-pyfars\n"
        "to-office: codex-cli\n"
        "---\n\n",
        encoding="utf-8",
    )
    seen = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        seen["input"] = kwargs.get("input")
        seen["cwd"] = kwargs.get("cwd")
        return SimpleNamespace(returncode=0, stdout="codex complete\n", stderr="")

    monkeypatch.setattr(execute_mod.subprocess, "run", fake_run)

    rc = execute_mod.run(["assignment-demo", "--root", str(root)])

    assert rc == 0
    assert seen["cmd"] == ["codex", "exec", "--skip-git-repo-check"]
    assert "Fix the dispatch loop." in seen["input"]
    assert seen["cwd"] == str(root)
    events = list((root / "operations/engineering/records/work/execute").glob(
        "execution-event-repair-pyfars-*.md"
    ))
    assert len(events) == 1
    text = events[0].read_text(encoding="utf-8")
    assert "tool-exit-code: 0" in text
    assert "codex complete" in text


def test_intake_intent_writes_planner_task_and_claims_source(tmp_path, monkeypatch):
    root = _make_corpus(tmp_path, monkeypatch)
    queue = root / "operations/engineering/triage/dispatch-intents"
    queue.mkdir(parents=True)
    intent = queue / "intent-demo.md"
    intent.write_text(
        "---\n"
        "title: Triage a PyFARS problem\n"
        "kind: dispatch-intent\n"
        "status: pending\n"
        "cited-slugs: [dispatch]\n"
        "claimed-by: null\n"
        "result-ref: null\n"
        "---\n\n"
        "# Triage a PyFARS problem\n\n"
        "## Intent\n\n"
        "Route this through planning before repair.\n",
        encoding="utf-8",
    )

    rc = intake_mod.run(["intent-demo", "--root", str(root), "--prefer", "free-planner"])

    assert rc == 0
    tasks = list((root / "operations/engineering/triage/dispatch-tasks").glob(
        "task-intent-demo-planner.md"
    ))
    assert len(tasks) == 1
    task_text = tasks[0].read_text(encoding="utf-8")
    assert "pipeline-stage: planner" in task_text
    assert "plan-decomposition" in task_text
    assert "prefer-dispatchable: free-planner" in task_text
    claimed_text = intent.read_text(encoding="utf-8")
    assert "status: claimed" in claimed_text
    assert "result-ref: task-intent-demo-planner" in claimed_text


def test_intake_intent_can_dispatch_executor_task(tmp_path, monkeypatch):
    root = _make_corpus(tmp_path, monkeypatch)
    queue = root / "operations/engineering/triage/dispatch-intents"
    queue.mkdir(parents=True)
    (queue / "intent-demo.md").write_text(
        "---\nkind: dispatch-intent\nstatus: pending\n---\n\n"
        "## Intent\n\nRepair PyFARS dispatch.\n",
        encoding="utf-8",
    )
    captured = {}

    def fake_auto_dispatch(argv):
        captured["argv"] = argv
        return 0

    monkeypatch.setattr(intake_mod.ad_mod, "run", fake_auto_dispatch)

    rc = intake_mod.run([
        "intent-demo", "--root", str(root), "--stage", "executor",
        "--prefer", "codex-cli", "--dispatch",
    ])

    assert rc == 0
    assert captured["argv"] == [
        "task-intent-demo-executor", "--root", str(root), "--prefer", "codex-cli",
    ]
    task = root / "operations/engineering/triage/dispatch-tasks/task-intent-demo-executor.md"
    assert "pipeline-stage: executor" in task.read_text(encoding="utf-8")
