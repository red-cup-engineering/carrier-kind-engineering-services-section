"""``pyfars work <subcommand> [args...]`` — work-cycle workitem emission."""
from __future__ import annotations

import argparse
import sys
from typing import Callable

from pyfars.cli.work import (
    assign, auto_dispatch, budget, execute, feedback, heartbeat, ingest,
    intake_intent, plan, review, tick, track,
)

SUBCOMMANDS: dict[str, Callable[[list[str]], int]] = {
    "assign":        assign.run,
    "auto-dispatch": auto_dispatch.run,
    "budget":        budget.run,
    "execute":       execute.run,
    "feedback":      feedback.run,
    "heartbeat":     heartbeat.run,
    "ingest":        ingest.run,
    "intake-intent": intake_intent.run,
    "plan":          plan.run,
    "review":        review.run,
    "tick":          tick.run,
    "track":         track.run,
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work", add_help=True)
    ap.add_argument("subcommand", nargs="?", default=None,
                    help="one of: " + ", ".join(SUBCOMMANDS))
    ap.add_argument("args", nargs=argparse.REMAINDER)
    parsed = ap.parse_args(argv)

    if parsed.subcommand is None:
        ap.print_help()
        print("\nsubcommands:", file=sys.stderr)
        for s in SUBCOMMANDS:
            print(f"  {s}", file=sys.stderr)
        return 1

    if parsed.subcommand not in SUBCOMMANDS:
        print(f"pyfars work: unknown subcommand {parsed.subcommand!r}",
              file=sys.stderr)
        return 2

    return SUBCOMMANDS[parsed.subcommand](parsed.args)


if __name__ == "__main__":
    sys.exit(main())
