"""Commit-as-witness coverage analysis.

Walks ``git log`` for a corpus root, parses each commit message for
references under the pinned rules (see
``library/.../flatfile-agentic-resource-system/concepts/commit-as-witness.md``),
also reads each commit's ``--name-status`` diff to discover *substrate-
observed* bindings (changed files whose path stems are in the entity or
task index), and returns a structured coverage report.

Each commit gets two orthogonal classifications:

* **commit_class** — ``substantive`` (real agent work), ``snapshot``
  (Replit auto-checkpoints / "Saved your changes" commits whose only
  evidence is *something happened*), or ``merge`` (branch merges, which
  carry no new operational evidence beyond the commits they reconcile).
* **binding** — for substantive commits, whether the message *or the
  diff* names a *task* slug (work-orchestration evidence) or a *library
  entity* slug (research-as-witness evidence). The two binding sources
  are complementary: the message is the agent's *claim*, the diff is the
  substrate's *observation*. Per ``witness-as-increment``, the
  observation is the stronger witness; this analyzer treats it as
  load-bearing rather than auxiliary.

The unbound substantive commits are the operational worklist.

Pure function. No side effects beyond ``git log`` invocation. The CLI
wrapper at ``pyfars.cli.audit_commits`` renders this output.
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


# Task-binding rules (message-text). Order is significant: the first
# match per commit determines the binding kind reported to the user.
# Multiple matches per commit are all recorded in `refs`.
_TASK_NUMBER = re.compile(r"\bTask\s*#(\d+)\b", re.IGNORECASE)
_TASK_SLUG = re.compile(r"\btask-([a-z0-9][a-z0-9-]*)\b")
_TASK_PATH = re.compile(
    r"\b(?:\.local|operations/[^\s]+)/tasks/([a-z0-9][a-z0-9-]*)\.md\b"
)

# Entity-slug candidates: backtick-wrapped slugs and bare slug-shaped
# tokens. Filtered against the entity-slug set discovered under the
# library/ and operations/command/ trees so common false positives
# ("claude-code", "github-com") are dropped unless they are real corpus
# slugs.
_BACKTICK_SLUG = re.compile(r"`([a-z][a-z0-9-]{2,})`")
# Bare slugs must contain at least one hyphen to count. This filters
# common nouns ("system", "agent", "true") that happen to be filename
# stems of corpus entities but whose mention in prose is almost never a
# deliberate witness binding. Multi-word kebab tokens
# ("consensus-as-h0-construction", "cluster-as-replica-cover") survive.
_BARE_SLUG = re.compile(
    r"(?<![A-Za-z0-9/_.`-])([a-z][a-z0-9]*(?:-[a-z0-9]+)+)(?![A-Za-z0-9/_.`])"
)

# Replit-injected snapshot signature. The "Saved your changes" subject
# alone is fragile, but combined with the trailer this is reliable.
_SNAPSHOT_SUBJECT = "Saved your changes before starting work"
_SNAPSHOT_TRAILER = "Replit-Commit-Checkpoint-Type: full_checkpoint"

# Path-shape recognition for diff-binding. A changed file is a *task
# record* if its path matches one of the task-record shapes; otherwise
# it is a candidate *entity record* if it lives under one of the entity
# roots and is a content markdown file (not _index.md, not under a
# tasks/ segment).
_TASK_PATH_SHAPE = re.compile(
    r"^(?:\.local/tasks|operations/[^/]+(?:/[^/]+)*?/tasks)/([a-z0-9][a-z0-9-]*)\.md$"
)


@dataclass(frozen=True)
class CommitRecord:
    """One commit's parsed witness candidacy.

    Message-derived refs come from parsing the subject + body. Diff-
    derived refs come from ``git --name-status`` for the same commit and
    are partitioned by change kind (added / modified / deleted), which
    in turn determines the increment-cell predicate
    (``drafted-by`` / ``refined-by`` / ``retracted-by``).
    """
    sha: str
    short_sha: str
    author: str
    date: str
    subject: str
    commit_class: str  # "substantive" | "snapshot" | "merge"
    refs_number: tuple[str, ...] = field(default_factory=tuple)
    refs_slug: tuple[str, ...] = field(default_factory=tuple)
    refs_path: tuple[str, ...] = field(default_factory=tuple)
    refs_entity: tuple[str, ...] = field(default_factory=tuple)
    # Diff-derived (substrate-observed) bindings. Each tuple holds the
    # entity/task slug; the change kind is the field name.
    diff_entities_drafted: tuple[str, ...] = field(default_factory=tuple)
    diff_entities_refined: tuple[str, ...] = field(default_factory=tuple)
    diff_entities_retracted: tuple[str, ...] = field(default_factory=tuple)
    diff_tasks_drafted: tuple[str, ...] = field(default_factory=tuple)
    diff_tasks_refined: tuple[str, ...] = field(default_factory=tuple)
    diff_tasks_retracted: tuple[str, ...] = field(default_factory=tuple)

    @property
    def task_bound_message(self) -> bool:
        return bool(self.refs_number or self.refs_slug or self.refs_path)

    @property
    def entity_bound_message(self) -> bool:
        return bool(self.refs_entity)

    @property
    def task_bound_diff(self) -> bool:
        return bool(self.diff_tasks_drafted
                    or self.diff_tasks_refined
                    or self.diff_tasks_retracted)

    @property
    def entity_bound_diff(self) -> bool:
        return bool(self.diff_entities_drafted
                    or self.diff_entities_refined
                    or self.diff_entities_retracted)

    @property
    def task_bound(self) -> bool:
        return self.task_bound_message or self.task_bound_diff

    @property
    def entity_bound(self) -> bool:
        return self.entity_bound_message or self.entity_bound_diff

    @property
    def bound(self) -> bool:
        return self.task_bound or self.entity_bound

    @property
    def all_refs(self) -> tuple[str, ...]:
        out: list[str] = []
        out.extend(f"#{n}" for n in self.refs_number)
        out.extend(f"task-{s}" for s in self.refs_slug)
        out.extend(self.refs_path)
        out.extend(self.refs_entity)
        return tuple(out)

    @property
    def all_diff_entities(self) -> tuple[str, ...]:
        return tuple(sorted(set(
            self.diff_entities_drafted
            + self.diff_entities_refined
            + self.diff_entities_retracted
        )))

    @property
    def all_diff_tasks(self) -> tuple[str, ...]:
        return tuple(sorted(set(
            self.diff_tasks_drafted
            + self.diff_tasks_refined
            + self.diff_tasks_retracted
        )))


def _classify(subject: str, body: str, n_parents: int) -> str:
    """Return ``substantive`` | ``snapshot`` | ``merge`` for one commit.

    Merge classification uses commit topology (``n_parents > 1``), not
    subject text, so a substantive commit whose subject happens to start
    with "Merge ..." is not misclassified.
    """
    if n_parents > 1:
        return "merge"
    if _SNAPSHOT_SUBJECT in subject and _SNAPSHOT_TRAILER in body:
        return "snapshot"
    return "substantive"


def _resolve_git_root(start: Path) -> Path:
    """Walk up to the nearest git working tree root.

    The verb is useful from any subdirectory of the corpus, but task and
    entity records live at fixed paths from the *repo* root. If
    ``start`` is itself a git repo we keep it; otherwise we walk up
    until we find ``.git/`` and use that. Falls back to ``start`` if no
    repo is found (the subprocess will then fail explicitly).
    """
    p = start.resolve()
    for cand in (p, *p.parents):
        if (cand / ".git").exists():
            return cand
    return p


def _git_log(root: Path, limit: int, entity_slugs: set[str],
             task_slugs: set[str]) -> list[CommitRecord]:
    """Run ``git log`` and parse one record per commit.

    Two pieces of information are pulled per commit:

    1. The structured commit metadata (sha, author, date, subject,
       body, parent count) via a custom ``--format`` with ``\\x1f``
       field separators and ``\\x1e`` record separators.
    2. The ``--name-status`` diff for the *same* commit window via a
       parallel ``git log`` call. The two outputs iterate the commit
       set in the same order, so we zip them to build per-commit diff
       file lists.

    The two-call shape avoids the format-vs-name-status interleaving
    parsing problem while keeping subprocess overhead at exactly two
    forks regardless of how many commits are scanned.
    """
    fmt = "%H%x1f%h%x1f%an%x1f%ai%x1f%P%x1f%s%x1f%b%x1e"
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "log", f"-n{limit}", f"--format={fmt}"],
            capture_output=True, text=True, check=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise RuntimeError(f"git log failed under {root}: {exc}") from exc

    # Per-commit diff: A/M/D status + path. Use a sentinel format so we
    # can find each commit's record boundary.
    try:
        diff_proc = subprocess.run(
            ["git", "-C", str(root), "log", f"-n{limit}",
             "--format=%x00%H", "--name-status", "--no-renames"],
            capture_output=True, text=True, check=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise RuntimeError(f"git log --name-status failed under {root}: {exc}") from exc

    diff_by_sha = _parse_namestatus(diff_proc.stdout)

    records: list[CommitRecord] = []
    for raw in proc.stdout.split("\x1e"):
        raw = raw.strip("\n")
        if not raw:
            continue
        parts = raw.split("\x1f")
        if len(parts) < 7:
            continue
        sha, short, author, date, parents, subject, body = parts[:7]
        n_parents = len(parents.split()) if parents.strip() else 0
        text = f"{subject}\n{body}"

        refs_number = tuple(sorted(set(_TASK_NUMBER.findall(text))))
        refs_slug = tuple(sorted(set(_TASK_SLUG.findall(text))))
        refs_path = tuple(sorted(set(_TASK_PATH.findall(text))))

        # Entity refs from message: union of backtick-wrapped and bare
        # slug-shaped tokens that match a discovered entity slug.
        candidates: set[str] = set(_BACKTICK_SLUG.findall(text))
        candidates.update(_BARE_SLUG.findall(text))
        slug_dropouts = set(refs_slug)
        refs_entity = tuple(sorted(
            s for s in candidates
            if s in entity_slugs and s not in slug_dropouts
        ))

        # Diff-derived bindings. Walk this commit's name-status entries
        # and partition by (kind, target-set). Tasks are matched by
        # path-shape; entities by stem-in-entity-index after excluding
        # the task-record paths so the same file isn't double-counted.
        ents_d: set[str] = set()
        ents_r: set[str] = set()
        ents_x: set[str] = set()
        tasks_d: set[str] = set()
        tasks_r: set[str] = set()
        tasks_x: set[str] = set()
        for status, path in diff_by_sha.get(sha, ()):
            task_match = _TASK_PATH_SHAPE.match(path)
            if task_match:
                slug = task_match.group(1)
                if slug not in task_slugs:
                    # Task record may be new — added paths whose stem
                    # isn't yet in the index still count if shape
                    # matches; the slug index is for *resolution*, not
                    # for filtering shape matches.
                    pass
                if status == "A":
                    tasks_d.add(slug)
                elif status == "D":
                    tasks_x.add(slug)
                else:  # M, T, C, etc. all read as refinement
                    tasks_r.add(slug)
                continue
            # Entity candidates: any markdown under an entity root, by
            # stem. Skip _index.md and underscore-prefixed stems.
            if not path.endswith(".md"):
                continue
            stem = path.rsplit("/", 1)[-1][:-3]
            if stem.startswith("_"):
                continue
            if stem not in entity_slugs:
                continue
            if status == "A":
                ents_d.add(stem)
            elif status == "D":
                ents_x.add(stem)
            else:
                ents_r.add(stem)

        records.append(CommitRecord(
            sha=sha,
            short_sha=short,
            author=author,
            date=date,
            subject=subject.strip(),
            commit_class=_classify(subject, body, n_parents),
            refs_number=refs_number,
            refs_slug=refs_slug,
            refs_path=refs_path,
            refs_entity=refs_entity,
            diff_entities_drafted=tuple(sorted(ents_d)),
            diff_entities_refined=tuple(sorted(ents_r - ents_d)),
            diff_entities_retracted=tuple(sorted(ents_x)),
            diff_tasks_drafted=tuple(sorted(tasks_d)),
            diff_tasks_refined=tuple(sorted(tasks_r - tasks_d)),
            diff_tasks_retracted=tuple(sorted(tasks_x)),
        ))
    return records


def _parse_namestatus(output: str) -> dict[str, list[tuple[str, str]]]:
    """Parse ``git log --format='%x00%H' --name-status`` output.

    Each commit block starts with a NUL-prefixed sha line; subsequent
    lines until the next NUL are name-status rows of the form
    ``<status>\\t<path>`` (or for renames, ``<status>\\t<old>\\t<new>``,
    but we run with ``--no-renames`` so renames decompose to D+A).
    """
    out: dict[str, list[tuple[str, str]]] = {}
    current: str | None = None
    for line in output.split("\n"):
        if not line:
            continue
        if line.startswith("\x00"):
            current = line[1:].strip()
            out.setdefault(current, [])
            continue
        if current is None:
            continue
        cols = line.split("\t")
        if len(cols) < 2:
            continue
        status = cols[0].strip()
        # Reduce multi-letter statuses (e.g. "A100", "M075") to first
        # letter — git only emits the prefix for renames/copies, which
        # we suppress with --no-renames, but be defensive.
        kind = status[:1] if status else ""
        path = cols[-1].strip()
        if not kind or not path:
            continue
        out[current].append((kind, path))
    return out


def _list_task_records(root: Path) -> list[str]:
    """Return slugs of every task record discoverable under ``root``."""
    slugs: set[str] = set()
    local = root / ".local" / "tasks"
    if local.is_dir():
        for p in local.glob("*.md"):
            if p.stem.startswith("_"):
                continue
            slugs.add(p.stem)
    ops = root / "operations"
    if ops.is_dir():
        for p in ops.glob("**/tasks/*.md"):
            if p.stem.startswith("_"):
                continue
            slugs.add(p.stem)
    return sorted(slugs)


def _list_entity_slugs(root: Path, entity_roots: tuple[Path, ...]) -> set[str]:
    """Return the slug set the entity-binding rule resolves against.

    Walks each ``entity_root`` for ``*.md`` files and takes filename
    stems. Excludes ``_index`` and other underscore-prefixed names.
    Excludes the ``tasks/`` subdirectories since those slugs are
    accounted for by the task-binding rules.
    """
    slugs: set[str] = set()
    for er in entity_roots:
        base = root / er
        if not base.is_dir():
            continue
        for p in base.glob("**/*.md"):
            if p.stem.startswith("_"):
                continue
            if "tasks" in p.parts:
                continue
            slugs.add(p.stem)
    return slugs


def _resolve_task_number(n: str, task_slugs: set[str]) -> str | None:
    """Map ``Task #N`` → ``task-<N>`` when a record by that slug exists."""
    candidate = f"task-{n}"
    return candidate if candidate in task_slugs else None


def analyze(
    root: Path | str = ".",
    *,
    limit: int = 200,
    entity_roots: tuple[str, ...] = ("library", "operations/command"),
) -> dict:
    """Compute commit-as-witness coverage for the corpus at ``root``.

    If ``root`` is not itself a git working tree, walks up to the
    nearest enclosing one. This lets the verb be invoked from any
    subdirectory while still resolving task/entity records relative to
    the repo root (where ``.local/tasks/``, ``library/``, and
    ``operations/`` actually live).
    """
    root_path = _resolve_git_root(Path(root).resolve())
    entity_slugs = _list_entity_slugs(
        root_path, tuple(Path(er) for er in entity_roots)
    )
    task_slugs = _list_task_records(root_path)
    task_slug_set = set(task_slugs)
    commits = _git_log(root_path, limit, entity_slugs, task_slug_set)

    by_class: dict[str, list[CommitRecord]] = {
        "substantive": [], "snapshot": [], "merge": [],
    }
    for c in commits:
        by_class[c.commit_class].append(c)

    substantive = by_class["substantive"]
    task_bound = [c for c in substantive if c.task_bound]
    entity_only = [c for c in substantive if c.entity_bound and not c.task_bound]
    unbound = [c for c in substantive if not c.bound]

    # Source breakdown: how each binding was earned. A commit can be
    # bound by message AND diff (the strongest case); we count the
    # weakest source it has so an operator can see whether the prose
    # discipline is improving over time.
    n_msg_only_task = sum(
        1 for c in substantive
        if c.task_bound_message and not c.task_bound_diff
    )
    n_diff_only_task = sum(
        1 for c in substantive
        if c.task_bound_diff and not c.task_bound_message
    )
    n_both_task = sum(
        1 for c in substantive
        if c.task_bound_message and c.task_bound_diff
    )
    n_msg_only_entity = sum(
        1 for c in substantive
        if c.entity_bound_message and not c.entity_bound_diff
    )
    n_diff_only_entity = sum(
        1 for c in substantive
        if c.entity_bound_diff and not c.entity_bound_message
    )
    n_both_entity = sum(
        1 for c in substantive
        if c.entity_bound_message and c.entity_bound_diff
    )

    witnessed_task_slugs: set[str] = set()
    witnessed_entity_slugs: set[str] = set()
    unresolved_numbers: dict[str, list[str]] = {}
    for c in substantive:
        witnessed_task_slugs.update(c.refs_slug)
        witnessed_task_slugs.update(c.refs_path)
        witnessed_task_slugs.update(c.all_diff_tasks)
        witnessed_entity_slugs.update(c.refs_entity)
        witnessed_entity_slugs.update(c.all_diff_entities)
        for n in c.refs_number:
            resolved = _resolve_task_number(n, task_slug_set)
            if resolved is not None:
                witnessed_task_slugs.add(resolved)
            else:
                unresolved_numbers.setdefault(n, []).append(c.short_sha)

    silent_tasks = [s for s in task_slugs if s not in witnessed_task_slugs]
    n_substantive = len(substantive)
    coverage = (
        (len(task_bound) + len(entity_only)) / n_substantive
        if n_substantive else 0.0
    )

    def _short(c: CommitRecord) -> dict:
        return {
            "sha": c.short_sha,
            "date": c.date,
            "author": c.author,
            "subject": c.subject,
        }

    def _bindings(c: CommitRecord) -> dict:
        return {
            "msg_refs": list(c.all_refs),
            "diff_entities_drafted": list(c.diff_entities_drafted),
            "diff_entities_refined": list(c.diff_entities_refined),
            "diff_entities_retracted": list(c.diff_entities_retracted),
            "diff_tasks_drafted": list(c.diff_tasks_drafted),
            "diff_tasks_refined": list(c.diff_tasks_refined),
            "diff_tasks_retracted": list(c.diff_tasks_retracted),
        }

    return {
        "root": str(root_path),
        "n_commits_scanned": len(commits),
        "n_snapshot": len(by_class["snapshot"]),
        "n_merge": len(by_class["merge"]),
        "n_substantive": n_substantive,
        "n_task_bound": len(task_bound),
        "n_entity_only_bound": len(entity_only),
        "n_substantive_unbound": len(unbound),
        "coverage_ratio": coverage,
        "binding_sources": {
            "task_message_only": n_msg_only_task,
            "task_diff_only": n_diff_only_task,
            "task_message_and_diff": n_both_task,
            "entity_message_only": n_msg_only_entity,
            "entity_diff_only": n_diff_only_entity,
            "entity_message_and_diff": n_both_entity,
        },
        "n_task_records": len(task_slugs),
        "n_witnessed_task_slugs": len(witnessed_task_slugs & task_slug_set),
        "n_silent_task_records": len(silent_tasks),
        "n_witnessed_entity_slugs": len(witnessed_entity_slugs),
        "unresolved_task_numbers": [
            {"number": n, "commits": sorted(set(shas))}
            for n, shas in sorted(unresolved_numbers.items(),
                                  key=lambda kv: int(kv[0]))
        ],
        "task_bound": [
            {**_short(c), **_bindings(c)} for c in task_bound
        ],
        "entity_only_bound": [
            {**_short(c), **_bindings(c)} for c in entity_only
        ],
        "substantive_unbound": [_short(c) for c in unbound],
        "snapshot_commits": [_short(c) for c in by_class["snapshot"]],
        "merge_commits": [_short(c) for c in by_class["merge"]],
        "silent_task_records": silent_tasks,
    }


def _fmt_diff_witnesses(c: dict) -> str:
    """Render a commit's diff-derived bindings as a compact one-liner."""
    parts: list[str] = []
    for label, key in (
        ("drafted", "diff_entities_drafted"),
        ("refined", "diff_entities_refined"),
        ("retracted", "diff_entities_retracted"),
    ):
        items = c.get(key) or []
        if items:
            shown = ", ".join(f"`{e}`" for e in items[:4])
            more = f" (+{len(items) - 4})" if len(items) > 4 else ""
            parts.append(f"{label} {shown}{more}")
    for label, key in (
        ("task-drafted", "diff_tasks_drafted"),
        ("task-refined", "diff_tasks_refined"),
        ("task-retracted", "diff_tasks_retracted"),
    ):
        items = c.get(key) or []
        if items:
            shown = ", ".join(f"`{e}`" for e in items[:4])
            more = f" (+{len(items) - 4})" if len(items) > 4 else ""
            parts.append(f"{label} {shown}{more}")
    return "; ".join(parts)


def render_markdown(report: dict) -> str:
    """Render the analyze() output as a human-readable markdown report."""
    lines: list[str] = []
    lines.append("# Commit-as-witness coverage")
    lines.append("")
    lines.append(f"- Root: `{report['root']}`")
    lines.append(f"- Commits scanned: **{report['n_commits_scanned']}** "
                 f"(substantive {report['n_substantive']}, "
                 f"snapshot {report['n_snapshot']}, "
                 f"merge {report['n_merge']})")
    lines.append(
        f"- Substantive commits bound to a task: **{report['n_task_bound']}**"
    )
    lines.append(
        f"- Substantive commits bound only to library entities: "
        f"**{report['n_entity_only_bound']}**"
    )
    lines.append(
        f"- Substantive commits with no binding (worklist): "
        f"**{report['n_substantive_unbound']}** "
        f"(coverage {report['coverage_ratio']:.0%})"
    )
    lines.append("")

    bs = report.get("binding_sources") or {}
    if bs:
        lines.append("## Binding sources")
        lines.append("")
        lines.append(
            "Per `witness-as-increment`, the diff is the substrate-observed "
            "witness; the message is the agent's claim. Both are recorded; "
            "this table shows which source carried each binding."
        )
        lines.append("")
        lines.append("| Binding | Message only | Diff only | Both |")
        lines.append("|---|---:|---:|---:|")
        lines.append(
            f"| Task | {bs.get('task_message_only', 0)} | "
            f"{bs.get('task_diff_only', 0)} | "
            f"{bs.get('task_message_and_diff', 0)} |"
        )
        lines.append(
            f"| Entity | {bs.get('entity_message_only', 0)} | "
            f"{bs.get('entity_diff_only', 0)} | "
            f"{bs.get('entity_message_and_diff', 0)} |"
        )
        lines.append("")

    lines.append(
        f"- Task records discoverable: **{report['n_task_records']}**"
    )
    lines.append(
        f"- Task records witnessed by ≥1 commit: "
        f"**{report['n_witnessed_task_slugs']}**"
    )
    lines.append(
        f"- Silent task records (no witnessing commit): "
        f"**{report['n_silent_task_records']}**"
    )
    lines.append(
        f"- Library entity slugs witnessed: "
        f"**{report['n_witnessed_entity_slugs']}**"
    )
    lines.append("")

    if report["substantive_unbound"]:
        lines.append("## Substantive commits without a binding")
        lines.append("")
        lines.append("These are the operational worklist: real agent work "
                     "the substrate cannot bind to any task or library "
                     "entity, neither by message nor by diff. See "
                     "`flatfile-agentic-resource-system/concepts/"
                     "commit-as-witness.md` for the binding rules and what "
                     "the increment cells should look like.")
        lines.append("")
        for c in report["substantive_unbound"]:
            lines.append(f"- `{c['sha']}` {c['date']} — {c['subject']}")
        lines.append("")

    if report.get("unresolved_task_numbers"):
        lines.append("## Unresolved `Task #N` references")
        lines.append("")
        lines.append("Numeric task references whose `task-<N>` slug does not "
                     "match any discoverable task record. The captain's "
                     "project-task numbering is external to the substrate; "
                     "binding these requires either a numbering convention "
                     "or a manual map.")
        lines.append("")
        for u in report["unresolved_task_numbers"]:
            shas = ", ".join(f"`{s}`" for s in u["commits"])
            lines.append(f"- `Task #{u['number']}` (in {shas})")
        lines.append("")

    if report["entity_only_bound"]:
        lines.append("## Entity-bound commits (no task ref, but witness "
                     "library entities)")
        lines.append("")
        lines.append("Substantive commits that witness library entities — "
                     "either by naming the entity slug in the message, or "
                     "by adding/modifying/deleting the entity's file in "
                     "the diff. The diff-derived bindings are the stronger "
                     "witness; they correspond directly to "
                     "`<entity, drafted-by | refined-by | retracted-by, A>=t` "
                     "increments.")
        lines.append("")
        for c in report["entity_only_bound"]:
            line = f"- `{c['sha']}` {c['date']} — {c['subject']}"
            diff_part = _fmt_diff_witnesses(c)
            if diff_part:
                line += f"  diff: {diff_part}"
            msg_ents = [r for r in (c.get("msg_refs") or [])
                        if not r.startswith("#") and not r.startswith("task-")
                        and not r.startswith(".local/")
                        and not r.startswith("operations/")]
            if msg_ents:
                shown = ", ".join(f"`{e}`" for e in msg_ents[:4])
                more = f" (+{len(msg_ents) - 4})" if len(msg_ents) > 4 else ""
                line += f"  msg: {shown}{more}"
            lines.append(line)
        lines.append("")

    if report["silent_task_records"]:
        lines.append("## Silent task records")
        lines.append("")
        lines.append("Task records whose slug appears in no commit message "
                     "*and* whose file is touched by no commit in the "
                     "scanned window. Either the work has not happened, or "
                     "it happened entirely outside the substrate.")
        lines.append("")
        for s in report["silent_task_records"][:50]:
            lines.append(f"- `{s}`")
        if len(report["silent_task_records"]) > 50:
            lines.append(
                f"- … and {len(report['silent_task_records']) - 50} more"
            )
        lines.append("")

    if report["task_bound"]:
        lines.append("## Task-bound commits")
        lines.append("")
        for c in report["task_bound"]:
            refs = ", ".join(c.get("msg_refs") or []) or "—"
            line = f"- `{c['sha']}` {c['date']} — {c['subject']}  msg: ({refs})"
            diff_part = _fmt_diff_witnesses(c)
            if diff_part:
                line += f"  diff: {diff_part}"
            lines.append(line)
        lines.append("")

    return "\n".join(lines)
