"""``pyfars work tick`` — one heartbeat tick of the work cycle.

Generic, corpus-wide. One invocation does at most one (task → endpoint →
draft) round-trip:

  1. Pick the highest-priority eligible task across the corpus (using the
     same ranking ``pyfars next`` exposes; no ``--as`` filter so any open
     task with deps satisfied is fair game).
  2. Call ``pyfars work auto-dispatch`` against it. The endpoint receives
     the task body as its prompt.
  3. Locate the new execution-event, hand it to ``pyfars work ingest``,
     which extracts the two-block reply and writes a draft under
     ``<root>/.fars/drafts/``.
  4. On successful ingest, set the task's ``status`` to ``completed`` and
     record the draft path in its frontmatter (``--keep-status`` skips this).

Idle (no eligible task) exits 0 silently — the design assumption is the
verb runs on a timer, and "nothing to do" is the steady state.

Failure modes leave the task open so the next tick can retry:
  - dispatch errors (no eligible endpoint, HTTP failure, malformed
    endpoint record) — auto-dispatch's own non-zero exit code surfaces;
  - ingest errors (reply-contract violation) — ingest emits an
    ``ingest-failure`` observation and tick exits non-zero, leaving
    the task open for human inspection of the failure record.

This verb does not loop. Run it from cron, systemd-timer, or a shell
loop — choosing the cadence is the operator's concern, not the
substrate's.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

from pyfars.cli._runner import as_directory
from pyfars.cli.next_ import _walk_tasks, _ready, _matches
from pyfars.cli.work import auto_dispatch as ad_mod
from pyfars.cli.work import ingest as ingest_mod
from pyfars.cli.work._emit import _records_base, now_iso
from pyfars.substrate.parse.frontmatter import parse as parse_fm


def _pick_next_task(root: Path, scope: Path | None) -> dict | None:
    """Return the top-ranked open task, or None if the corpus is idle.

    Uses ``next.py``'s walker + readiness logic without an agent filter,
    so any open task with dependencies satisfied is eligible. Ranking:
    priority desc, then slug for a stable tie-break.
    """
    tasks = _walk_tasks(root)
    if scope is not None:
        scope = scope.resolve()
        tasks = [t for t in tasks if scope in t["path"].resolve().parents
                 or t["path"].resolve() == scope]

    by_slug = {f"task:{t['path'].stem}": t["fm"] for t in tasks}
    for t in tasks:
        s = t["fm"].get("slug")
        if s:
            by_slug[str(s)] = t["fm"]

    candidates: list[dict] = []
    for t in tasks:
        fm = t["fm"]
        if fm.get("status") != "open":
            continue
        ready, _why = _ready(fm, by_slug)
        if not ready:
            continue
        ok, _why = _matches(fm, agent=None, extra_caps=set(), extra_skills=set())
        if not ok:
            continue
        candidates.append({
            "slug": t["path"].stem,
            "title": fm.get("title") or t["path"].stem,
            "path": t["path"],
            "priority": int(fm.get("priority") or 3),
            "fm": fm,
        })

    candidates.sort(key=lambda c: (-c["priority"], c["slug"]))
    return candidates[0] if candidates else None


def _newest_execution_event(task_slug: str) -> Path | None:
    base = _records_base() / "execute"
    if not base.is_dir():
        return None
    matches = sorted(base.glob(f"execution-event-{task_slug}-*.md"))
    return matches[-1] if matches else None


def _mark_task_completed(task_path: Path, draft: Path, root: Path) -> None:
    """In-place rewrite the task file with ``status: completed``.

    Preserves field order via the parser's emit; injects ``completed-at``
    and ``produced-draft`` (relative to root). The file is otherwise left
    alone — body unchanged.
    """
    text = task_path.read_text(encoding="utf-8")
    fm, body = parse_fm(text)
    if not isinstance(fm, dict):
        return  # malformed; let validate flag it
    fm["status"] = "completed"
    fm["completed-at"] = now_iso()
    fm["produced-draft"] = str(draft.relative_to(root))
    fm_text = yaml.safe_dump(fm, sort_keys=False,
                             default_flow_style=False, allow_unicode=True)
    task_path.write_text(f"---\n{fm_text}---\n{body}", encoding="utf-8")


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work tick")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    ap.add_argument("--scope", default=None,
                    help="restrict task search to this subtree (relative or absolute)")
    ap.add_argument("--prefer", default=None,
                    help="prefer this endpoint slug at dispatch time")
    ap.add_argument("--keep-status", action="store_true",
                    help="do not flip task status to completed after ingest")
    ap.add_argument("--dry-run", action="store_true",
                    help="report the task that would be ticked; do not dispatch")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work tick")
    if root is None:
        return 2
    scope = (root / args.scope).resolve() if args.scope else None

    pick = _pick_next_task(root, scope)
    if pick is None:
        print("pyfars work tick: idle (no eligible task)")
        return 0

    print(f"pyfars work tick: selected {pick['slug']}  "
          f"(priority={pick['priority']})")
    if args.dry_run:
        print(f"  path: {pick['path'].relative_to(root)}")
        return 0

    ad_argv = [pick["slug"], "--root", str(root)]
    prefer = args.prefer or pick["fm"].get("prefer-endpoint")
    if prefer:
        ad_argv += ["--prefer", str(prefer)]
    rc = ad_mod.run(ad_argv)
    if rc != 0:
        print(f"pyfars work tick: auto-dispatch returned {rc}; task left open",
              file=sys.stderr)
        return rc

    ev_path = _newest_execution_event(pick["slug"])
    if ev_path is None:
        print(f"pyfars work tick: dispatch claimed success but no execution-event "
              f"for {pick['slug']!r} found", file=sys.stderr)
        return 1

    ev_slug = ev_path.stem
    result = ingest_mod.ingest(ev_slug, root)
    if not result["ok"]:
        print(f"pyfars work tick: ingest failed: {result['reason']}",
              file=sys.stderr)
        if "failure" in result:
            print(f"  failure record: {result['failure']}", file=sys.stderr)
        return 1

    print(f"pyfars work tick: draft -> {result['draft'].relative_to(root)}")

    if not args.keep_status:
        _mark_task_completed(pick["path"], result["draft"], root)
        print(f"pyfars work tick: marked {pick['slug']} completed")

    return 0
