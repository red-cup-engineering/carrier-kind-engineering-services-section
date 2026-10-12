"""``pyfars witness-commits`` — materialize commit bindings into the witness chain.

The verb closes the loop the [commit-as-witness](../../../../../../library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/commit-as-witness.md)
substrate-bridge specifies. ``pyfars audit-commits`` *reports* the
binding partition; this verb *writes* the bindings into
``<root>/.fars/event-log/`` as one ``Witness`` per substantive
commit, so commit history stops bypassing the audit primitive every
other operator flows through.

Per [witness-as-increment](../../../../../../library/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/witness-as-increment.md),
each witness corresponds to an increment cell at a stage. The cell
shape is determined by the commit's class and binding source:

  - **Substantive task-bound**:
    ``⟨task, advanced-by, commit⟩ = t``, plus the diff-derived
    drafted/refined/retracted entries on the changed task records.
  - **Substantive entity-only-bound**:
    ``⟨entity, drafted-by | refined-by | retracted-by, author⟩ = t``
    on each affected entity slug — the *aim-generative* layer the
    work-orchestration spec's task records do not natively cover.
  - **Substantive unbound**: the degenerate
    ``⟨commit-record, sha, exists⟩ = t``. Recorded so the witness
    chain remains complete; the report still flags these as the
    operational worklist.

Snapshot and merge commits are not written: they carry no operational
evidence beyond *something happened*, and writing them would dilute the
event log's signal-to-noise.

Idempotent. Reads the existing event log first and skips any commit
whose SHA already appears as a ``commit`` operator's target. Safe to
run on every session start; safe to run from a CI hook.
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.analyze.commit_witness_coverage import analyze
from pyfars.operator.witness import Witness
from pyfars.render.json_dump import dump as render_json
from pyfars.runtime.event_log import EventLog
from pyfars.spec import Parameter, VerbSpec, make_argparse


SPEC = VerbSpec(
    name="witness-commits",
    description=(
        "Materialize commit-as-witness bindings into the FARS event log."
    ),
    example="pyfars witness-commits --limit 200",
    notes=(
        "Walks `git log` via the audit-commits analyzer, then for each "
        "substantive commit appends one Witness to "
        "<root>/.fars/event-log/. Idempotent: commits whose SHA already "
        "appears as a `commit` operator's target are skipped. Snapshot "
        "and merge commits are not written. Use --dry-run to preview "
        "without touching the log."
    ),
    output=(
        "Markdown summary of witnesses written, witnesses skipped, "
        "and commits ignored by class. With --json emits the structured "
        "report instead."
    ),
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="corpus root (default: CWD)"),
        Parameter(name="limit", kind="flag", type=int, default=200,
                  short="-n",
                  description="how many recent commits to scan (default 200)"),
        Parameter(name="dry_run", kind="store_true",
                  description="preview without appending to the event log"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def _existing_commit_shas(log: EventLog) -> set[str]:
    """Return SHAs already witnessed under operator==``commit``.

    Used for idempotency: if a commit's SHA appears as a prior
    ``commit``-operator witness target, we don't append a duplicate.
    """
    seen: set[str] = set()
    for w in log.read_all():
        if w.operator == "commit":
            seen.add(w.target)
    return seen


def _commit_to_witness(
    commit: dict,
    *,
    binding: str,  # "task" | "entity" | "unbound"
) -> Witness:
    """Build the Witness for one substantive commit dict from analyze().

    The commit dict is the ``_short() | _bindings()`` shape returned
    inside ``task_bound`` / ``entity_only_bound`` / ``substantive_unbound``
    lists by ``commit_witness_coverage.analyze``.
    """
    sha = commit["sha"]
    details: dict = {
        "binding": binding,
        "subject": commit.get("subject", ""),
        "commit_date": commit.get("date", ""),
    }
    msg_refs = commit.get("msg_refs") or []
    if msg_refs:
        details["msg_refs"] = list(msg_refs)
    for key in (
        "diff_entities_drafted", "diff_entities_refined",
        "diff_entities_retracted",
        "diff_tasks_drafted", "diff_tasks_refined", "diff_tasks_retracted",
    ):
        items = commit.get(key) or []
        if items:
            details[key] = list(items)

    # The commit IS the after-state; there is no in-process before/after
    # the way operator-driven witnesses have. Encoding the SHA as
    # after_hash gives auditors a deterministic content anchor without
    # claiming a fictional before-hash.
    # Direct Witness construction (we override timestamp with the
    # commit's own date rather than now_iso); kind is passed explicitly
    # so we don't depend on the field's default and so future changes
    # to the registry / classifier are picked up here automatically.
    from pyfars.operator.kind import classify
    return Witness(
        operator="commit",
        target=sha,
        before_hash=None,
        after_hash=sha,
        details=details,
        timestamp=commit.get("date", ""),
        agent=commit.get("author") or None,
        kind=classify("commit"),
    )


def run(*, root: Path | str = ".", limit: int = 200,
        dry_run: bool = False) -> dict:
    """Compute and (unless ``dry_run``) write commit witnesses.

    Pure-ish callable for ``pyfars.api`` / MCP. The only side effect when
    ``dry_run=False`` is appending JSONL lines under
    ``<root>/.fars/event-log/``.
    """
    report = analyze(root=root, limit=limit)
    log = EventLog(root=Path(report["root"]))
    seen = _existing_commit_shas(log)

    written: list[dict] = []
    skipped_existing: list[dict] = []

    def _consider(commit: dict, binding: str) -> None:
        if commit["sha"] in seen:
            skipped_existing.append({
                "sha": commit["sha"],
                "subject": commit.get("subject", ""),
                "binding": binding,
            })
            return
        witness = _commit_to_witness(commit, binding=binding)
        if not dry_run:
            log.append(witness)
            seen.add(commit["sha"])
        written.append({
            "sha": commit["sha"],
            "subject": commit.get("subject", ""),
            "binding": binding,
            "agent": commit.get("author"),
        })

    for c in report.get("task_bound", []):
        _consider(c, "task")
    for c in report.get("entity_only_bound", []):
        _consider(c, "entity")
    for c in report.get("substantive_unbound", []):
        _consider(c, "unbound")

    return {
        "root": report["root"],
        "dry_run": dry_run,
        "n_commits_scanned": report["n_commits_scanned"],
        "n_substantive": report["n_substantive"],
        "n_snapshot_skipped": report["n_snapshot"],
        "n_merge_skipped": report["n_merge"],
        "n_written": len(written),
        "n_skipped_existing": len(skipped_existing),
        "written": written,
        "skipped_existing": skipped_existing,
        "coverage_ratio": report.get("coverage_ratio", 0.0),
        "n_substantive_unbound": report.get("n_substantive_unbound", 0),
    }


def render_markdown(report: dict) -> str:
    """Render the run() output as a human-readable markdown summary."""
    lines: list[str] = []
    lines.append("# Commit-witness materialization")
    lines.append("")
    lines.append(f"- Root: `{report['root']}`")
    mode = "DRY RUN — no writes" if report["dry_run"] else "writing to event log"
    lines.append(f"- Mode: **{mode}**")
    lines.append(
        f"- Commits scanned: **{report['n_commits_scanned']}** "
        f"(substantive {report['n_substantive']}, "
        f"snapshot {report['n_snapshot_skipped']} skipped, "
        f"merge {report['n_merge_skipped']} skipped)"
    )
    lines.append(
        f"- Witnesses written: **{report['n_written']}** "
        f"(already-witnessed skipped: {report['n_skipped_existing']})"
    )
    lines.append(
        f"- Substrate worklist (substantive-unbound): "
        f"**{report['n_substantive_unbound']}** "
        f"(coverage {report['coverage_ratio']:.0%})"
    )
    lines.append("")

    by_binding: dict[str, list[dict]] = {"task": [], "entity": [], "unbound": []}
    for entry in report.get("written", []):
        by_binding.setdefault(entry["binding"], []).append(entry)

    for binding in ("task", "entity", "unbound"):
        items = by_binding.get(binding) or []
        if not items:
            continue
        label = {
            "task": "Task-bound witnesses",
            "entity": "Entity-only-bound witnesses",
            "unbound": "Unbound witnesses (degenerate cell)",
        }[binding]
        lines.append(f"## {label} ({len(items)})")
        lines.append("")
        for entry in items[:25]:
            agent = entry.get("agent") or "-"
            lines.append(
                f"- `{entry['sha']}` [{agent}] {entry['subject']}"
            )
        if len(items) > 25:
            lines.append(f"- ...and {len(items) - 25} more")
        lines.append("")

    if report["n_skipped_existing"]:
        lines.append(
            f"## Idempotent skips ({report['n_skipped_existing']})"
        )
        lines.append("")
        lines.append(
            "These commits already carry a `commit` witness from a "
            "prior run; nothing was appended."
        )
        lines.append("")

    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    try:
        report = run(root=args.root, limit=args.limit, dry_run=args.dry_run)
    except RuntimeError as exc:
        print(f"pyfars witness-commits: {exc}", file=sys.stderr)
        return 2

    if args.json:
        sys.stdout.write(render_json(report))
        return 0

    sys.stdout.write(render_markdown(report))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
