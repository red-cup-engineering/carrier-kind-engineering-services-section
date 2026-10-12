"""``pyfars work review <observed-slug> <expected-slug>`` — emit a review-stage Finding.

Compares an observation to an expectation and produces a structured Finding
with variance, cause, scope (single-loop or double-loop), and severity.
"""
from __future__ import annotations

import argparse
import sys

from pyfars.cli.work._emit import (
    mint_slug, now_iso, write_spoke_event, write_workitem,
)


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work review")
    ap.add_argument("observed", help="observation slug (or comma-separated list)")
    ap.add_argument("expected", help="plan/goal/baseline slug")
    ap.add_argument("--variance", required=True,
                    help="structured gap between observed and expected (prose or JSON)")
    ap.add_argument("--cause", default="",
                    help="contributing-factors prose; the body should carry the structured sub-fiber")
    ap.add_argument("--scope", default="single-loop",
                    choices=["single-loop", "double-loop"],
                    help="single-loop = execution did not realize plan; "
                         "double-loop = plan itself was wrong")
    ap.add_argument("--severity", default="moderate",
                    choices=["minor", "moderate", "major", "critical"])
    ap.add_argument("--contained-by", default=None,
                    help="parent review entity, if any")
    ap.add_argument("--note", default="", help="finding body text")
    args = ap.parse_args(argv)

    observed = [s.strip() for s in args.observed.split(",") if s.strip()]
    slug = mint_slug(f"finding-{observed[0] if observed else 'untitled'}")
    at = now_iso()
    fm = {
        "title": f"Finding ({args.scope}, {args.severity}): {observed[0] if observed else ''} vs {args.expected}",
        "type": "workitem",
        "kind": "finding",
        "is-a": "finding",
        "observed": observed,
        "expected": args.expected,
        "variance": args.variance,
        "cause": args.cause,
        "scope": args.scope,
        "severity": args.severity,
        "contained-by": args.contained_by,
        "found-at": at,
    }
    target = write_workitem("review", slug, fm, args.note or "")

    entity = f"finding:{slug}"
    increments = [
        {"e": entity, "p": "is-a", "o": "finding", "v": "t"},
        {"e": entity, "p": "expected", "o": args.expected, "v": "t"},
        {"e": entity, "p": "variance", "o": args.variance, "v": "t"},
        {"e": entity, "p": "scope", "o": args.scope, "v": "t"},
        {"e": entity, "p": "severity", "o": args.severity, "v": "t"},
        {"e": entity, "p": "found-at", "o": at, "v": "t"},
    ]
    for o in observed:
        increments.append({"e": entity, "p": "observed", "o": o, "v": "t"})
    if args.cause:
        increments.append({"e": entity, "p": "cause", "o": args.cause, "v": "t"})
    if args.contained_by:
        increments.append({"e": entity, "p": "contained-by", "o": args.contained_by, "v": "t"})
    write_spoke_event("review", args.expected, {
        "at": at,
        "kind": "finding-emission",
        "work-item": args.expected,
        "entity": entity,
        "increments": increments,
    })
    print(f"pyfars work review: wrote {target}")
    return 0
