"""``pyfars work assign <task-slug> <office-slug>`` — emit a dispatch-stage Assignment.

Per Part II §12 of pyfars-algebraic-readings-of-work-terms, an Assignment is its
own substrate entity, not a predicate on the task. Walks from a task to its
assignments via reverse-edges on `assigns-task`.
"""
from __future__ import annotations

import argparse
import sys

from pyfars.cli.work._emit import (
    mint_slug, now_iso, write_spoke_event, write_workitem,
)


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work assign")
    ap.add_argument("task", help="task slug being assigned")
    ap.add_argument("office", help="office (or endpoint) slug receiving the assignment")
    ap.add_argument("--from-sender", default="dispatcher",
                    help="dispatching office slug (default: dispatcher)")
    ap.add_argument("--authority-bound", default="execute-task",
                    help="scope of authority transferred (default: execute-task)")
    ap.add_argument("--capability-match", default="",
                    help="value of dispatch's delta(office, task) at issuance")
    ap.add_argument("--note", default="",
                    help="optional human-readable note for the body")
    args = ap.parse_args(argv)

    slug = mint_slug(f"assignment-{args.task}")
    fm = {
        "title": f"Assignment: {args.task} → {args.office}",
        "type": "workitem",
        "kind": "assignment",
        "is-a": "assignment",
        "assigns-task": args.task,
        "to-office": args.office,
        "from-sender": args.from_sender,
        "sent-at": now_iso(),
        "authority-bound": args.authority_bound,
        "capability-match": args.capability_match or None,
        "retracted": None,
    }
    body = args.note or (
        f"Assignment of task `{args.task}` to office `{args.office}`, "
        f"dispatched by `{args.from_sender}` with authority bounded to "
        f"`{args.authority_bound}`.\n"
    )
    target = write_workitem("assign", slug, fm, body)

    entity = f"assignment:{slug}"
    increments = [
        {"e": entity, "p": "is-a", "o": "assignment", "v": "t"},
        {"e": entity, "p": "assigns-task", "o": args.task, "v": "t"},
        {"e": entity, "p": "to-office", "o": args.office, "v": "t"},
        {"e": entity, "p": "from-sender", "o": args.from_sender, "v": "t"},
        {"e": entity, "p": "sent-at", "o": fm["sent-at"], "v": "t"},
        {"e": entity, "p": "authority-bound", "o": args.authority_bound, "v": "t"},
        {"e": entity, "p": "capability-match",
         "o": args.capability_match or None,
         "v": "t" if args.capability_match else "⊥"},
        {"e": entity, "p": "retracted", "o": None, "v": "⊥"},
    ]
    log = write_spoke_event("dispatch", args.task, {
        "at": fm["sent-at"],
        "kind": "assignment-emission",
        "work-item": args.task,
        "entity": entity,
        "increments": increments,
    })

    print(f"pyfars work assign: wrote {target}")
    print(f"  slug: {slug}")
    print(f"  log:  {log}")
    return 0
