"""``pyfars work feedback <finding-slug> <target-slug>`` — emit a feedback-stage Adjustment.

Produces an Adjustment that responds to a finding by modifying a target entity.
"""
from __future__ import annotations

import argparse
import sys

from pyfars.cli.work._emit import (
    mint_slug, now_iso, write_spoke_event, write_workitem,
)


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work feedback")
    ap.add_argument("finding", help="finding slug being responded to (comma-separated for multi)")
    ap.add_argument("target", help="entity being modified")
    ap.add_argument("--change", required=True,
                    help="what specifically is different (prose; structured sub-fiber goes in body)")
    ap.add_argument("--rationale", default="",
                    help="link from finding's cause to this change")
    ap.add_argument("--loop-type", default="single-loop",
                    choices=["single-loop", "double-loop"])
    ap.add_argument("--by-office", default="dispatcher")
    ap.add_argument("--note", default="", help="adjustment body text")
    args = ap.parse_args(argv)

    findings = [s.strip() for s in args.finding.split(",") if s.strip()]
    slug = mint_slug(f"adjustment-{args.target}")
    at = now_iso()
    fm = {
        "title": f"Adjustment ({args.loop_type}): {args.target}",
        "type": "workitem",
        "kind": "adjustment",
        "is-a": "adjustment",
        "responds-to": findings,
        "target": args.target,
        "change": args.change,
        "loop-type": args.loop_type,
        "rationale": args.rationale,
        "by-office": args.by_office,
        "applied-at": at,
    }
    target = write_workitem("feedback", slug, fm, args.note or "")

    entity = f"adjustment:{slug}"
    increments = [
        {"e": entity, "p": "is-a", "o": "adjustment", "v": "t"},
        {"e": entity, "p": "target", "o": args.target, "v": "t"},
        {"e": entity, "p": "change", "o": args.change, "v": "t"},
        {"e": entity, "p": "loop-type", "o": args.loop_type, "v": "t"},
        {"e": entity, "p": "by-office", "o": args.by_office, "v": "t"},
        {"e": entity, "p": "applied-at", "o": at, "v": "t"},
    ]
    for f in findings:
        increments.append({"e": entity, "p": "responds-to", "o": f, "v": "t"})
    if args.rationale:
        increments.append({"e": entity, "p": "rationale", "o": args.rationale, "v": "t"})
    write_spoke_event("feedback", args.target, {
        "at": at,
        "kind": "adjustment-emission",
        "work-item": args.target,
        "entity": entity,
        "increments": increments,
    })
    print(f"pyfars work feedback: wrote {target}")
    return 0
