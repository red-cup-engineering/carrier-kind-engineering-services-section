"""``pyfars belief`` — print the four-valued bilattice state of a cell.

Captain-facing surface of WOAH #1 (Round 13). Reads the event log,
folds witnesses targeting the requested ``(target, attribute)`` cell
through the knowledge-join, prints the resulting FOUR state plus a
breakdown of supporting / opposing / silent votes.

Two display modes:

  default markdown  — human-readable table with per-vote rows;
                      includes verdict line and counts by FOUR state.
  --json            — machine-readable; designed for downstream
                      tooling (federation merge, audit dashboards).

Exit codes follow the dispatch-monotonicity convention:

  0  cell is settled and consistent (FOUR ∈ {t, f})
  3  cell is contested (FOUR == ⊤) — the governance trigger
  4  cell is unsettled (FOUR == ⊥) — no witness has spoken
  2  usage / file errors

The 0/3/4 split lets a CI hook fail the build on contested cells
without conflating "no info yet" with "OK."
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.runtime.belief import BeliefCell, belief
from pyfars.runtime.event_log import EventLog
from pyfars.spec import Parameter, VerbSpec, make_argparse
from pyfars.substrate.bilattice import BilatticeValue


SPEC = VerbSpec(
    name="belief",
    description="Print the four-valued bilattice state of a (target, attribute) "
                "cell, folded over the event log via the knowledge-join.",
    example="pyfars belief library/notes/widget.md --attribute description",
    notes=("Exit 0 = settled+consistent (t / f); exit 3 = contested (⊤); "
           "exit 4 = unsettled (⊥); exit 2 = usage error. Use --channel to "
           "restrict the witness stream to a single named conduit."),
    output="Markdown verdict + per-vote table on stdout (or JSON with --json).",
    parameters=(
        Parameter(name="target", kind="positional", required=True,
                  description="path string the witness records as its target"),
        Parameter(name="attribute", kind="flag", default=None,
                  description="narrow to witnesses whose details.key matches "
                              "(default: every witness on the target)"),
        Parameter(name="channel", kind="flag", default=None,
                  description="restrict to one event-log channel"),
        Parameter(name="kind", kind="flag", default=None,
                  description="restrict to one AOP operation-kind "
                              "(observation, guard, accounting, query, "
                              "mutation, analysis, learning)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="repo root"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def _verdict_line(cell: BeliefCell) -> str:
    counts = {
        BilatticeValue.TRUE: len(cell.supporting),
        BilatticeValue.FALSE: len(cell.opposing),
        BilatticeValue.BOTTOM: sum(1 for v in cell.votes
                                    if v.vote is BilatticeValue.BOTTOM),
    }
    return (f"**verdict:** `{cell.value.symbol}` "
            f"(t: {counts[BilatticeValue.TRUE]}, "
            f"f: {counts[BilatticeValue.FALSE]}, "
            f"silent: {counts[BilatticeValue.BOTTOM]})")


def _emit_markdown(cell: BeliefCell, channel: str | None,
                   kind: str | None) -> None:
    title_attr = f"#{cell.attribute}" if cell.attribute else ""
    scope_bits = []
    if channel:
        scope_bits.append(f"channel `{channel}`")
    if kind:
        scope_bits.append(f"kind `{kind}`")
    title_scope = f" on {' & '.join(scope_bits)}" if scope_bits else ""
    print(f"# belief: `{cell.target}{title_attr}`{title_scope}")
    print()
    print(_verdict_line(cell))
    print()
    if not cell.votes:
        print("_no witnesses contributed to this cell._")
        return
    print("| # | operator | kind | channel | vote | truth | evidence | timestamp |")
    print("|---:|---|---|---|:---:|---:|---:|---|")
    for i, v in enumerate(cell.votes, 1):
        w = v.witness
        print(f"| {i} | `{w.operator}` | `{w.kind}` | `{w.channel or '-'}` "
              f"| {v.vote.symbol} | {v.truth:.2f} | {v.evidence:.2f} "
              f"| {w.timestamp} |")


def _emit_json(cell: BeliefCell, channel: str | None,
               kind: str | None) -> None:
    import json
    payload = {
        "target": cell.target,
        "attribute": cell.attribute,
        "channel": channel,
        "kind": kind,
        "value": cell.value.value,
        "symbol": cell.value.symbol,
        "is_settled": cell.is_settled,
        "is_consistent": cell.is_consistent,
        # Full witness payload per vote so an auditor replaying a saved
        # JSON artifact can reconstruct the cell's evolution without
        # needing the original event log (BANE-style audit replay).
        "votes": [
            {
                "operator": v.witness.operator,
                "kind": v.witness.kind,
                "target": v.witness.target,
                "before_hash": v.witness.before_hash,
                "after_hash": v.witness.after_hash,
                "details": dict(v.witness.details),
                "channel": v.witness.channel,
                "origin": v.witness.origin,
                "agent": v.witness.agent,
                "vote": v.vote.value,
                "truth": v.truth,
                "evidence": v.evidence,
                "timestamp": v.witness.timestamp,
            }
            for v in cell.votes
        ],
    }
    print(json.dumps(payload, indent=2))


def run(*, target: str, attribute: str | None = None,
        channel: str | None = None, kind: str | None = None,
        root: Path = Path("."), json: bool = False) -> int:
    root_dir = as_directory(root, "pyfars belief")
    if root_dir is None:
        return 2
    # Reject typoed --kind values up front rather than silently
    # returning ⊥ because no witness matches a non-existent kind.
    if kind is not None:
        from pyfars.operator.kind import is_valid_kind
        if not is_valid_kind(kind):
            print(f"pyfars belief: --kind={kind!r} is not one of the seven "
                  "operation kinds (observation, guard, accounting, "
                  "query, mutation, analysis, learning)", file=sys.stderr)
            return 2
    log = EventLog(root_dir)
    cell = belief(log, target, attribute=attribute,
                  channel=channel, kind=kind)
    if json:
        _emit_json(cell, channel, kind)
    else:
        _emit_markdown(cell, channel, kind)
    if cell.value is BilatticeValue.TOP:
        return 3
    if cell.value is BilatticeValue.BOTTOM:
        return 4
    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(target=args.target, attribute=args.attribute,
               channel=args.channel, kind=args.kind,
               root=args.root, json=args.json)


if __name__ == "__main__":
    sys.exit(main())
