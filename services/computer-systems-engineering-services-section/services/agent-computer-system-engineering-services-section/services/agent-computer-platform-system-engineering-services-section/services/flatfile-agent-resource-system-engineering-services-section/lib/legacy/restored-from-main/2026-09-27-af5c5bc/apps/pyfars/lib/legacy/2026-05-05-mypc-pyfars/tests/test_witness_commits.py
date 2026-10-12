"""Tests for ``pyfars witness-commits`` — the commit-as-witness materializer."""
from __future__ import annotations

import subprocess
from pathlib import Path

from pyfars.cli.witness_commits import _commit_to_witness, run
from pyfars.runtime.event_log import EventLog


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True,
                   capture_output=True)


def _bootstrap_repo(repo: Path) -> None:
    """Stand up a minimal git repo with an entity record and one commit."""
    repo.mkdir(parents=True, exist_ok=True)
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "test@example.invalid")
    _git(repo, "config", "user.name", "Test Author")
    # An entity-bound commit: add a library theorem file whose stem is a
    # multi-token kebab slug, so the bare-slug-in-message rule has a
    # candidate to resolve against (and the diff binds it directly).
    entity_dir = repo / "library" / "theorems"
    entity_dir.mkdir(parents=True)
    (entity_dir / "widget-soundness.md").write_text(
        "---\ntype: theorem\n---\n\n# Widget soundness\n",
        encoding="utf-8",
    )
    _git(repo, "add", "library/theorems/widget-soundness.md")
    _git(repo, "commit", "-q", "-m", "Add widget-soundness theorem")


def test_commit_to_witness_carries_binding_and_refs():
    commit = {
        "sha": "abc123",
        "date": "2026-05-03 10:00:00 +0000",
        "author": "alice",
        "subject": "Refine the widget",
        "msg_refs": ["task-foo"],
        "diff_entities_refined": ["widget-soundness"],
    }
    w = _commit_to_witness(commit, binding="task")
    assert w.operator == "commit"
    assert w.target == "abc123"
    assert w.after_hash == "abc123"
    assert w.before_hash is None
    assert w.agent == "alice"
    assert w.timestamp == "2026-05-03 10:00:00 +0000"
    assert w.details["binding"] == "task"
    assert w.details["msg_refs"] == ["task-foo"]
    assert w.details["diff_entities_refined"] == ["widget-soundness"]


def test_run_writes_one_witness_per_substantive_commit(tmp_path):
    repo = tmp_path / "repo"
    _bootstrap_repo(repo)
    report = run(root=repo, limit=10, dry_run=False)
    assert report["n_substantive"] == 1
    assert report["n_written"] == 1
    log = EventLog(root=repo)
    written = list(log.read_all())
    assert len(written) == 1
    assert written[0].operator == "commit"
    assert written[0].agent == "Test Author"
    # Diff observation must surface as the load-bearing binding even
    # though the commit message did not name the slug.
    assert written[0].details.get("diff_entities_drafted") == [
        "widget-soundness"
    ]


def test_run_is_idempotent(tmp_path):
    repo = tmp_path / "repo"
    _bootstrap_repo(repo)
    first = run(root=repo, limit=10, dry_run=False)
    second = run(root=repo, limit=10, dry_run=False)
    assert first["n_written"] == 1
    assert second["n_written"] == 0
    assert second["n_skipped_existing"] == 1
    log = EventLog(root=repo)
    assert log.count() == 1


def test_dry_run_writes_nothing(tmp_path):
    repo = tmp_path / "repo"
    _bootstrap_repo(repo)
    report = run(root=repo, limit=10, dry_run=True)
    assert report["n_written"] == 1
    log = EventLog(root=repo)
    assert log.count() == 0


def test_snapshot_and_merge_commits_are_skipped(tmp_path):
    repo = tmp_path / "repo"
    _bootstrap_repo(repo)
    # A snapshot-shaped commit (Replit auto-checkpoint signature).
    (repo / "noise.md").write_text("noise\n", encoding="utf-8")
    _git(repo, "add", "noise.md")
    _git(
        repo, "commit", "-q",
        "-m",
        "Saved your changes before starting work\n\n"
        "Replit-Commit-Checkpoint-Type: full_checkpoint\n",
    )
    report = run(root=repo, limit=10, dry_run=False)
    assert report["n_snapshot_skipped"] == 1
    # The substantive original commit is still witnessed.
    assert report["n_written"] == 1
