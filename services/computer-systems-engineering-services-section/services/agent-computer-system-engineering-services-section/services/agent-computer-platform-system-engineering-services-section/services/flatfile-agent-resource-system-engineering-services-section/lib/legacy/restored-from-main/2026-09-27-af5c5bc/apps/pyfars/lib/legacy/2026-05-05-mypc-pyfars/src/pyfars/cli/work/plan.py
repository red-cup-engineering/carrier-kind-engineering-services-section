"""``pyfars work plan <task-slug>`` — emit a plan-spoke task-cell-system creation event.

Per the predicated-work substrate (objects/task-cell-system.md), a task-cell-
system T = (G_T, S_T, v^T_0) enters the substrate as an increment u_τ that
asserts T's schema cells at **t** and its goal cells at ⊥. This verb reads an
existing task note's frontmatter and emits the corresponding plan-spoke JSONL
event so the substrate's event log has a record of the task's introduction
into the operations base.

Unlike the post-planning spoke verbs, this does not create a new entity — the
task already exists as a markdown note. The verb only writes the plan-spoke
event that records the task-cell-system creation increment.
"""
from __future__ import annotations

import argparse
import sys

from pyfars.cli._runner import as_directory
from pyfars.cli.work._emit import now_iso, write_spoke_event
from pyfars.cli.work._resolve import load, resolve


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work plan")
    ap.add_argument("task", help="task slug to register as a plan-stage emission")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work plan")
    if root is None:
        return 2

    sub = load(root)
    note = resolve(sub, args.task)
    if note is None:
        print(f"pyfars work plan: task {args.task!r} not found", file=sys.stderr)
        return 1

    fm = note.fm
    at = now_iso()
    entity = f"task:{args.task}"

    # Schema cells per task-cell-system.md: has-goal, requires-capability,
    # decomposes-into are at **t** at creation; goal cells (completed-by,
    # produced-deliverable) start at ⊥ until execution settles them.
    increments = [
        {"e": entity, "p": "is-a", "o": "task-cell-system", "v": "t"},
    ]
    if fm.get("title"):
        increments.append({"e": entity, "p": "has-goal", "o": fm["title"], "v": "t"})
    for cap in (fm.get("requires-capabilities") or []):
        increments.append({"e": entity, "p": "requires-capability", "o": cap, "v": "t"})
    for skill in (fm.get("requires-skills") or []):
        increments.append({"e": entity, "p": "requires-skill", "o": skill, "v": "t"})
    for sub_slug in (fm.get("subtasks") or []):
        increments.append({"e": entity, "p": "decomposes-into", "o": sub_slug, "v": "t"})
    for dep in (fm.get("depends-on") or []):
        increments.append({"e": entity, "p": "depends-on", "o": dep, "v": "t"})
    if fm.get("work-type"):
        increments.append({"e": entity, "p": "work-type", "o": fm["work-type"], "v": "t"})
    # Goal cells initially at ⊥
    increments.append({"e": entity, "p": "completed-by", "o": None, "v": "⊥"})

    log = write_spoke_event("plan", args.task, {
        "at": at,
        "kind": "task-cell-system-creation",
        "work-item": args.task,
        "entity": entity,
        "increments": increments,
    })
    print(f"pyfars work plan: wrote {log}")
    return 0
