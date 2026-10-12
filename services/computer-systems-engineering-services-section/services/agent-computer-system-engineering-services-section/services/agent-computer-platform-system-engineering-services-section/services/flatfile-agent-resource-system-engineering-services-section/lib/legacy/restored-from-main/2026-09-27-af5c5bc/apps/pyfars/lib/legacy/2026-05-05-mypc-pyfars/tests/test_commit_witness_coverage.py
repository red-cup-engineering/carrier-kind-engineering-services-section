"""Tests for pyfars.analyze.commit_witness_coverage.

The analyzer parses commit messages for four reference shapes
(``Task #N``, ``task-<slug>``, ``.../tasks/<slug>.md`` paths, and bare
or backticked library-entity slugs), classifies commits as
``substantive``, ``snapshot``, or ``merge``, and emits a coverage
report. These tests pin the parser, the classifier, and the report
shape against a fabricated git repo.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

from pyfars.analyze.commit_witness_coverage import (
    CommitRecord,
    _classify,
    analyze,
    render_markdown,
)


def _git(root: Path, *args: str, env_extra: dict | None = None) -> str:
    env = {
        "GIT_AUTHOR_NAME": "Test", "GIT_AUTHOR_EMAIL": "t@example.com",
        "GIT_COMMITTER_NAME": "Test", "GIT_COMMITTER_EMAIL": "t@example.com",
        "GIT_AUTHOR_DATE": "2026-01-01T00:00:00",
        "GIT_COMMITTER_DATE": "2026-01-01T00:00:00",
        "HOME": str(root),
        "PATH": os.environ.get("PATH", ""),
    }
    if env_extra:
        env.update(env_extra)
    return subprocess.check_output(
        ["git", "-C", str(root), *args], text=True, env=env,
    )


def _commit(root: Path, message: str, file_rel: str = "f.md", body: str = "x") -> None:
    p = root / file_rel
    p.parent.mkdir(parents=True, exist_ok=True)
    # Each commit must change something; append a unique line.
    with p.open("a", encoding="utf-8") as fh:
        fh.write(message + "\n")
    _git(root, "add", str(p.relative_to(root)))
    _git(root, "commit", "-m", message)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    _git(tmp_path, "init", "-q", "-b", "main")
    _git(tmp_path, "config", "user.email", "t@example.com")
    _git(tmp_path, "config", "user.name", "Test")

    # Seed commit: a single neutral file. The seed must NOT carry any
    # message-binding or diff-binding so per-test counts remain a clean
    # "+1 from this test's commit" delta.
    (tmp_path / "README.md").write_text("seed\n", encoding="utf-8")
    _git(tmp_path, "add", "README.md")
    _git(tmp_path, "commit", "-m", "seed")

    # Library entity (theorem) the substrate can bind against. Created
    # *after* the seed commit so it's untracked-then-tracked only when
    # an individual test commits it; the file's mere presence on disk
    # makes its slug discoverable to the entity index.
    (tmp_path / "library" / "theorems").mkdir(parents=True)
    (tmp_path / "library" / "theorems" / "consensus-as-h0-construction.md").write_text(
        "---\nkind: theorem\n---\nx\n", encoding="utf-8"
    )

    # Task records on disk for resolution; not committed by the seed.
    (tmp_path / "operations" / "command" / "projects" / "p" / "tasks").mkdir(
        parents=True
    )
    (tmp_path / "operations" / "command" / "projects" / "p" / "tasks"
     / "task-99.md").write_text("---\nkind: task\n---\nx\n", encoding="utf-8")
    (tmp_path / "operations" / "command" / "projects" / "p" / "tasks"
     / "first-coverage-pass.md").write_text(
        "---\nkind: task\n---\nx\n", encoding="utf-8"
    )
    return tmp_path


def test_classify_snapshot():
    body = "Replit-Commit-Author: Agent\nReplit-Commit-Checkpoint-Type: full_checkpoint\n"
    assert _classify(
        "Saved your changes before starting work", body, n_parents=1
    ) == "snapshot"


def test_classify_merge_by_parent_count():
    # Topology-based: a single-parent commit whose subject happens to
    # start with "Merge" is NOT a merge.
    assert _classify("Merge two algorithms into one", "", n_parents=1) == "substantive"
    assert _classify("anything at all", "", n_parents=2) == "merge"


def test_classify_substantive():
    assert _classify("Add a new theorem", "body", n_parents=1) == "substantive"


def test_substantive_subject_starting_with_merge_is_not_merge(repo):
    # Real corpus regression: "Merge two concepts" or "Merge proofs" are
    # legitimate substantive commits, not merge commits.
    _commit(repo, "Merge two algorithms in `consensus-as-h0-construction`")
    rep = analyze(repo, limit=10)
    assert rep["n_merge"] == 0
    assert rep["n_substantive"] >= 1
    assert rep["n_entity_only_bound"] == 1


def test_task_and_entity_in_same_commit(repo):
    # A commit may be both task-bound and entity-bound; counts are
    # orthogonal but the report assigns the commit to task_bound (not
    # double-counted in entity_only).
    _commit(
        repo,
        "advance task-first-coverage-pass: prove `consensus-as-h0-construction`",
    )
    rep = analyze(repo, limit=10)
    assert rep["n_task_bound"] == 1
    assert rep["n_entity_only_bound"] == 0  # task binding takes precedence in the partition
    assert rep["n_witnessed_entity_slugs"] == 1  # but entity is still witnessed


def test_diff_binding_drafts_new_entity(repo):
    # A commit whose message names no slug but whose diff *adds* an
    # entity file at a known stem is entity-bound by the diff, with
    # the entity recorded as drafted.
    new_entity = repo / "library" / "theorems" / "freshly-proved-claim.md"
    new_entity.write_text("---\nkind: theorem\n---\nproof body\n", encoding="utf-8")
    _git(repo, "add", str(new_entity.relative_to(repo)))
    _git(repo, "commit", "-m", "Prove a fresh result about ordinals")
    rep = analyze(repo, limit=10)
    assert rep["n_entity_only_bound"] == 1
    assert rep["n_task_bound"] == 0
    bs = rep["binding_sources"]
    assert bs["entity_diff_only"] == 1
    assert bs["entity_message_only"] == 0
    eb = rep["entity_only_bound"][0]
    assert "freshly-proved-claim" in eb["diff_entities_drafted"]


def test_diff_binding_refines_existing_entity(repo):
    existing = repo / "library" / "theorems" / "consensus-as-h0-construction.md"
    # First track the entity in its own commit, then a separate commit
    # that modifies it. Only the second is a refinement.
    _git(repo, "add", str(existing.relative_to(repo)))
    _git(repo, "commit", "-m", "Track an existing theorem file under git")
    existing.write_text(
        "---\nkind: theorem\n---\nrevised body\n", encoding="utf-8"
    )
    _git(repo, "add", str(existing.relative_to(repo)))
    _git(repo, "commit", "-m", "Tighten exposition of the main theorem")
    rep = analyze(repo, limit=10)
    # Two entity-bound commits now: the initial add (drafted) and the
    # modify (refined). Find the refinement explicitly.
    refines = [c for c in rep["entity_only_bound"]
               if "consensus-as-h0-construction" in c["diff_entities_refined"]]
    assert len(refines) == 1
    assert refines[0]["diff_entities_drafted"] == []


def test_diff_binding_task_record_drafted(repo):
    # Adding a new task record file under operations/.../tasks/ binds
    # the commit to that task by diff.
    task_dir = repo / "operations" / "command" / "projects" / "p" / "tasks"
    new_task = task_dir / "newly-opened-task.md"
    new_task.write_text("---\nkind: task\n---\nbody\n", encoding="utf-8")
    _git(repo, "add", str(new_task.relative_to(repo)))
    _git(repo, "commit", "-m", "Open a task for upcoming work")
    rep = analyze(repo, limit=10)
    assert rep["n_task_bound"] == 1
    tb = rep["task_bound"][0]
    assert "newly-opened-task" in tb["diff_tasks_drafted"]


def test_diff_binding_does_not_double_count(repo):
    # When message and diff both bind the same entity, count both
    # sources but produce a single bound commit.
    existing = repo / "library" / "theorems" / "consensus-as-h0-construction.md"
    existing.write_text(
        "---\nkind: theorem\n---\nrevised\n", encoding="utf-8"
    )
    _git(repo, "add", str(existing.relative_to(repo)))
    _git(repo, "commit", "-m", "Refine `consensus-as-h0-construction`")
    rep = analyze(repo, limit=10)
    assert rep["n_entity_only_bound"] == 1
    bs = rep["binding_sources"]
    assert bs["entity_message_and_diff"] == 1
    assert bs["entity_message_only"] == 0
    assert bs["entity_diff_only"] == 0


def test_resolve_git_root_walks_up(repo):
    # Invoking from a subdirectory should still find the repo root and
    # resolve task/entity records from there.
    sub = repo / "operations" / "command" / "projects" / "p" / "tasks"
    rep = analyze(sub, limit=10)
    # The seed commit is the only substantive one; report.root should
    # be the repo, not the subdirectory.
    assert rep["root"] == str(repo)
    assert rep["n_task_records"] >= 2


def test_task_number_binding(repo):
    _commit(repo, "fix something for Task #99")
    rep = analyze(repo, limit=10)
    assert rep["n_task_bound"] == 1
    assert rep["n_substantive_unbound"] == 1  # the seed commit


def test_task_slug_binding(repo):
    _commit(repo, "advance task-first-coverage-pass")
    rep = analyze(repo, limit=10)
    assert rep["n_task_bound"] == 1


def test_entity_slug_binding_backticked(repo):
    _commit(repo, "Prove `consensus-as-h0-construction`")
    rep = analyze(repo, limit=10)
    assert rep["n_entity_only_bound"] == 1
    assert rep["n_task_bound"] == 0
    msg_refs = rep["entity_only_bound"][0]["msg_refs"]
    assert "consensus-as-h0-construction" in msg_refs


def test_entity_slug_binding_bare(repo):
    _commit(repo, "Add consensus-as-h0-construction theorem")
    rep = analyze(repo, limit=10)
    assert rep["n_entity_only_bound"] == 1


def test_unknown_slug_not_bound(repo):
    _commit(repo, "Update some-random-token that-is-not-a-slug")
    rep = analyze(repo, limit=10)
    assert rep["n_substantive_unbound"] == 2  # this + seed


def test_snapshot_excluded_from_substantive(repo, tmp_path):
    # A snapshot commit must not show up in substantive worklist.
    snapshot_msg = (
        "Saved your changes before starting work\n\n"
        "Replit-Commit-Author: Agent\n"
        "Replit-Commit-Checkpoint-Type: full_checkpoint\n"
    )
    _commit(repo, snapshot_msg)
    rep = analyze(repo, limit=10)
    assert rep["n_snapshot"] == 1
    # Seed commit is the only substantive one
    assert rep["n_substantive"] == 1
    assert rep["n_substantive_unbound"] == 1


def test_merge_excluded_from_substantive(repo):
    # Create a divergent branch (distinct files to avoid conflict) and
    # merge it with --no-ff so a real merge commit lands.
    _git(repo, "checkout", "-q", "-b", "feat")
    _commit(repo, "feat work", file_rel="feat-only.md")
    _git(repo, "checkout", "-q", "main")
    _commit(repo, "main work", file_rel="main-only.md")
    _git(repo, "merge", "--no-ff", "-m", "Merge branch 'feat'", "feat")
    rep = analyze(repo, limit=10)
    assert rep["n_merge"] == 1


def test_render_markdown_smoke(repo):
    _commit(repo, "Prove `consensus-as-h0-construction`")
    rep = analyze(repo, limit=10)
    md = render_markdown(rep)
    assert "Commit-as-witness coverage" in md
    assert "Entity-bound commits" in md
    assert "consensus-as-h0-construction" in md


def test_record_bound_aliases():
    c = CommitRecord(sha="x", short_sha="x", author="a", date="d",
                     subject="s", commit_class="substantive",
                     refs_entity=("alpha",))
    assert c.entity_bound is True
    assert c.task_bound is False
    assert c.bound is True
