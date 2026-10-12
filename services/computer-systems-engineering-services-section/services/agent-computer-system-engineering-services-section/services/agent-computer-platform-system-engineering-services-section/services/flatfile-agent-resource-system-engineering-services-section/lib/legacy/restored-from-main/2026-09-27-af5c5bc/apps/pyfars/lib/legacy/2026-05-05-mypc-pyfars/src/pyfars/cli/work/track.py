"""``pyfars work track <subject>`` — emit a tracking-stage Observation.

A free-form observation entity for any subject (task, plan, office, endpoint).
Per Goodhart discipline, the observation lives in its own fiber and does not
mutate the subject.
"""
from __future__ import annotations

import argparse
import json
import sys

from pyfars.cli.work._emit import (
    mint_slug, now_iso, write_spoke_event, write_workitem,
)


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work track")
    ap.add_argument("subject", help="slug of the entity being observed")
    ap.add_argument("--method", default="manual",
                    help="how the value was derived (default: manual)")
    ap.add_argument("--value", default=None,
                    help="the read's content; JSON if --json-value, else string")
    ap.add_argument("--json-value", action="store_true",
                    help="parse --value as JSON")
    ap.add_argument("--baseline", default=None, help="expected value, if any")
    ap.add_argument("--scale", default="nominal",
                    choices=["nominal", "ordinal", "interval", "ratio"],
                    help="Stevens' measurement scale (default: nominal)")
    ap.add_argument("--note", default="", help="free-form body text")
    args = ap.parse_args(argv)

    if args.json_value and args.value:
        try:
            value: object = json.loads(args.value)
        except json.JSONDecodeError as e:
            print(f"pyfars work track: --value is not valid JSON: {e}", file=sys.stderr)
            return 2
    else:
        value = args.value

    slug = mint_slug(f"observation-{args.subject}")
    at = now_iso()
    fm = {
        "title": f"Observation: {args.subject}",
        "type": "workitem",
        "kind": "observation",
        "is-a": "observation",
        "observes": args.subject,
        "observed-at": at,
        "method": args.method,
        "value": value,
        "baseline": args.baseline,
        "scale": args.scale,
    }
    target = write_workitem("track", slug, fm, args.note or "")

    entity = f"observation:{slug}"
    increments = [
        {"e": entity, "p": "is-a", "o": "observation", "v": "t"},
        {"e": entity, "p": "observes", "o": args.subject, "v": "t"},
        {"e": entity, "p": "observed-at", "o": at, "v": "t"},
        {"e": entity, "p": "method", "o": args.method, "v": "t"},
        {"e": entity, "p": "value", "o": value, "v": "t"},
        {"e": entity, "p": "scale", "o": args.scale, "v": "t"},
    ]
    if args.baseline is not None:
        increments.append({"e": entity, "p": "baseline", "o": args.baseline, "v": "t"})
    write_spoke_event("track", args.subject, {
        "at": at,
        "kind": "observation-emission",
        "work-item": args.subject,
        "entity": entity,
        "increments": increments,
    })
    print(f"pyfars work track: wrote {target}")
    return 0
