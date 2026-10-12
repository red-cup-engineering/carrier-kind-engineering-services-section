"""``pyfars ledger`` — lens the witness event-log as a double-entry ledger.

Realizes the captain-planned `transactional-record-infrastructure` and
`lens-entity-system` work without building a parallel substrate: the
existing `.fars/event-log/*.jsonl` is the source of truth, postings
are computed on demand by `pyfars.runtime.ledger.project`.

Subcommands:

  postings   stream every posting projected from the event log
  tally      running balances per (account, commodity)
  balance    detailed-balance check (debits == credits per commodity);
             non-zero exit when any commodity is unbalanced

All subcommands accept ``--root``; ``--json`` switches to machine output.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.ledger import (
    _load_closure_accounts,
    coverage,
    derive_all_lessons,
    detailed_balance,
    filter_postings,
    load_bindings,
    project_all,
    propose_binding,
    tally,
    witnesses_as_of,
)


# Canonical ISO-8601 UTC, seconds precision: "YYYY-MM-DDTHH:MM:SSZ".
# This is exactly what now_iso() emits (timespec="seconds"). We
# refuse fractional precision because mixing precisions breaks
# lexicographic ordering (e.g. "...00Z" sorts AFTER "...00.1Z" lex,
# but BEFORE chronologically) — and witnesses_as_of compares strings.
_ISO_UTC = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$"
)


def _unit_interval(name: str):
    """argparse type: float in [0, 1]."""
    def parse(s: str) -> float:
        try:
            v = float(s)
        except ValueError as exc:
            raise argparse.ArgumentTypeError(
                f"{name} must be a float in [0, 1]; got {s!r}"
            ) from exc
        if not (0.0 <= v <= 1.0):
            raise argparse.ArgumentTypeError(
                f"{name}={v} out of range; must lie in [0, 1]"
            )
        return v
    return parse


def _iso_utc_timestamp(s: str) -> str:
    """argparse type: canonical ISO-8601 UTC timestamp string."""
    if not _ISO_UTC.match(s):
        raise argparse.ArgumentTypeError(
            f"--as-of value {s!r} is not a canonical ISO-8601 UTC "
            f"timestamp (expected e.g. 2026-05-01T00:00:00Z); "
            f"lex compare is only total across that shape"
        )
    return s


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="pyfars ledger",
        description="Lens the witness event-log as a double-entry ledger.",
    )
    p.add_argument("-r", "--root", type=Path, default=Path("."),
                   help="FARS instance root (default: CWD)")
    p.add_argument("--json", action="store_true",
                   help="emit JSON instead of human-readable text")
    # Routing-predicate filters (PAM channels + LPMud origin pattern,
    # per the FARS messaging-and-events analysis). Apply to postings,
    # tally, and balance — coverage operates on the raw witness stream
    # and ignores them.
    p.add_argument("--channel", default=None,
                   help="restrict to witnesses on this channel")
    p.add_argument("--origin", default=None,
                   help="restrict to witnesses from this origin")
    p.add_argument("--operator", default=None,
                   help="restrict to witnesses of this operator")
    p.add_argument("--commodity", default=None,
                   help="restrict to postings in this commodity")
    # Bilattice + temporal axes (PAM predication-algebra-model).
    p.add_argument("--min-truth", type=_unit_interval("--min-truth"),
                   default=None,
                   help="exclude postings whose witness truth < this "
                        "(0..1; bilattice truth axis)")
    p.add_argument("--min-evidence", type=_unit_interval("--min-evidence"),
                   default=None,
                   help="exclude postings whose witness evidence < this "
                        "(0..1; bilattice knowledge axis)")
    p.add_argument("--weight-by", default=None,
                   choices=["truth", "evidence", "k_meet"],
                   help="scale tally/balance amounts by a bilattice axis "
                        "(k_meet is a conservative cross-axis projection, "
                        "not a formal bilattice meet)")
    p.add_argument("--as-of", default=None, type=_iso_utc_timestamp,
                   help="rewind: include only witnesses with timestamp ≤ this "
                        "(canonical ISO-8601 UTC, e.g. 2026-05-01T00:00:00Z; "
                        "temporal lens)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("postings",
                   help="stream every projected posting")
    sub.add_parser("tally",
                   help="running balances per (account, commodity)")
    sub.add_parser("balance",
                   help="detailed-balance check (non-zero exit on imbalance)")
    cov = sub.add_parser("coverage",
                         help="binding coverage over the witness stream")
    cov.add_argument("--propose-binding", metavar="OPERATOR", default=None,
                     help="emit a TOML binding stub for OPERATOR (or 'all' "
                          "to emit one stub per currently-unmapped operator)")
    learn = sub.add_parser(
        "learn",
        help="distill lessons from recurring unmapped patterns "
             "(continuous-learning closure)",
    )
    learn.add_argument("--threshold", type=int, default=3,
                       help="minimum unmapped count to crystallize a lesson "
                            "(default 3)")
    learn.add_argument("--record", action="store_true",
                       help="actually append the lesson witnesses to the "
                            "event log (default: dry-run)")
    learn.add_argument("--force", action="store_true",
                       help="re-emit lessons even when the log already "
                            "documents them at equal-or-higher evidence")
    return p


def _filters(args) -> dict:
    return {
        "channel": args.channel,
        "origin": args.origin,
        "operator": args.operator,
        "commodity": args.commodity,
        "min_truth": args.min_truth,
        "min_evidence": args.min_evidence,
    }


def _read_witnesses(root: Path, as_of: str | None):
    return witnesses_as_of(EventLog(root=root).read_all(), as_of)


def _load_postings(root: Path, *, as_of: str | None = None,
                   **filters) -> list:
    bindings = load_bindings(root / ".fars" / "ledger.toml")
    return list(filter_postings(
        project_all(_read_witnesses(root, as_of), bindings),
        **filters,
    ))


def _cmd_postings(root: Path, *, as_json: bool,
                  as_of: str | None = None, **filters) -> int:
    postings = _load_postings(root, as_of=as_of, **filters)
    if as_json:
        json.dump([p.to_dict() for p in postings], sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0
    if not postings:
        print("# pyfars ledger postings\n\n(no postings — empty event log)")
        return 0
    print("# pyfars ledger postings\n")
    print(f"{'TIMESTAMP':<25} {'OP':<14} {'DEBIT':<35} "
          f"{'CREDIT':<35} {'AMOUNT':>8} {'COM':<10}")
    for p in postings:
        print(f"{p.witness_ts:<25} {p.witness_op:<14} {p.debit:<35} "
              f"{p.credit:<35} {p.amount:>8.2f} {p.commodity:<10}")
    return 0


def _cmd_tally(root: Path, *, as_json: bool, as_of: str | None = None,
               weight_by: str | None = None, **filters) -> int:
    postings = _load_postings(root, as_of=as_of, **filters)
    balances = tally(postings, weight_by=weight_by)
    if as_json:
        payload = [
            {"account": b.account, "commodity": b.commodity,
             "debits": b.debits, "credits": b.credits,
             "balance": b.balance}
            for b in balances.values()
        ]
        json.dump(payload, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0
    if not balances:
        print("# pyfars ledger tally\n\n(no postings — empty event log)")
        return 0
    print("# pyfars ledger tally\n")
    print(f"{'ACCOUNT':<40} {'COMMODITY':<10} {'DEBITS':>10} "
          f"{'CREDITS':>10} {'BALANCE':>10}")
    for (acct, comm), b in sorted(balances.items()):
        print(f"{acct:<40} {comm:<10} {b.debits:>10.2f} "
              f"{b.credits:>10.2f} {b.balance:>+10.2f}")
    return 0


def _cmd_balance(root: Path, *, as_json: bool, as_of: str | None = None,
                 weight_by: str | None = None, **filters) -> int:
    postings = _load_postings(root, as_of=as_of, **filters)
    closure = _load_closure_accounts(root / ".fars" / "ledger.toml")
    checks = detailed_balance(postings, closure_accounts=closure,
                              weight_by=weight_by)
    bindings = load_bindings(root / ".fars" / "ledger.toml")
    cov = coverage(_read_witnesses(root, as_of), bindings)
    if as_json:
        payload = {
            commodity: {
                "total_debits": c.total_debits,
                "total_credits": c.total_credits,
                "balanced": c.balanced,
                "flows": [
                    {"account": f.account, "debits": f.debits,
                     "credits": f.credits, "net": f.net,
                     "is_closure_account": f.is_closure_account,
                     "closed": f.closed}
                    for f in c.flows
                ],
            }
            for commodity, c in checks.items()
        }
        payload["_coverage"] = {
            "total_witnesses": cov.total_witnesses,
            "projected_witnesses": cov.projected_witnesses,
            "unmapped_witnesses": cov.unmapped_witnesses,
        }
        json.dump(payload, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0 if all(c.balanced for c in checks.values()) else 1

    if not checks:
        print("# pyfars ledger balance\n\n"
              "(no postings — operations loop not yet running)")
        return 0
    print("# pyfars ledger balance — detailed-balance stationarity check\n")
    if not closure:
        print("(no `[closure-accounts]` declared in .fars/ledger.toml — "
              "applying strict default: every account in every commodity "
              "must close to zero)\n")
    any_imbalanced = False
    for commodity, c in sorted(checks.items()):
        marker = "✓" if c.balanced else "✗"
        if not c.balanced:
            any_imbalanced = True
        print(f"## {commodity} {marker}")
        print(f"  total debits:   {c.total_debits:.2f}")
        print(f"  total credits:  {c.total_credits:.2f}")
        print()
        print(f"  {'ACCOUNT':<40} {'NET':>10} {'ROLE':<10} STATUS")
        for f in c.flows:
            role = "closure" if f.is_closure_account else "stock"
            status = "✓ closed" if f.closed else "✗ leaking"
            print(f"  {f.account:<40} {f.net:>+10.2f} {role:<10} {status}")
        print()
    if cov.unmapped_witnesses > 0:
        print(f"Note: {cov.unmapped_witnesses} of {cov.total_witnesses} "
              f"witnesses are unmapped by the current bindings (run "
              f"`pyfars ledger coverage` for details). The lens is partial "
              f"— a 'balanced' verdict only covers projected activity.\n")
    if any_imbalanced:
        print("Some closure accounts are leaking. Per the operations-loop "
              "goal-doc, an account where work enters (debit) but never "
              "exits (credit) is a stage that hasn't closed: the loop has "
              "not reached stationarity in that channel.")
    else:
        print("Every closure account is closed. Operations loop at "
              "stationarity for the declared channels.")
    return 0 if not any_imbalanced else 1


def _cmd_coverage(root: Path, *, as_json: bool,
                  as_of: str | None = None,
                  propose_binding_for: str | None = None) -> int:
    bindings = load_bindings(root / ".fars" / "ledger.toml")
    cov = coverage(_read_witnesses(root, as_of), bindings)
    if propose_binding_for is not None:
        unmapped = dict(cov.unmapped_operators)
        if propose_binding_for == "all":
            if not unmapped:
                print("# All operators have bindings — nothing to propose.")
                return 0
            for op, n in cov.unmapped_operators:
                print(propose_binding(op, n))
            return 0
        if propose_binding_for not in unmapped:
            print(f"# Operator `{propose_binding_for}` is not unmapped — "
                  f"either it already has a binding or no witness uses it.",
                  file=sys.stderr)
            return 1
        print(propose_binding(propose_binding_for,
                              unmapped[propose_binding_for]))
        return 0
    if as_json:
        json.dump({
            "total_witnesses": cov.total_witnesses,
            "projected_witnesses": cov.projected_witnesses,
            "unmapped_witnesses": cov.unmapped_witnesses,
            "unmapped_operators": [
                {"operator": op, "count": n} for op, n in cov.unmapped_operators
            ],
        }, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0
    print("# pyfars ledger coverage\n")
    print(f"  total witnesses:     {cov.total_witnesses}")
    print(f"  projected:           {cov.projected_witnesses}")
    print(f"  unmapped:            {cov.unmapped_witnesses}")
    if cov.unmapped_operators:
        print("\n  unmapped operators (binding gap — these witnesses do not "
              "produce any posting):")
        for op, n in cov.unmapped_operators:
            print(f"    {n:>6}  {op}")
        print("\n  Add bindings in .fars/ledger.toml to project these "
              "operators, or accept that the lens is partial for them.")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    root = as_directory(args.root, "pyfars ledger")
    if root is None:
        return 2
    filters = _filters(args)
    if args.cmd == "postings":
        return _cmd_postings(root, as_json=args.json,
                             as_of=args.as_of, **filters)
    if args.cmd == "tally":
        return _cmd_tally(root, as_json=args.json, as_of=args.as_of,
                          weight_by=args.weight_by, **filters)
    if args.cmd == "balance":
        return _cmd_balance(root, as_json=args.json, as_of=args.as_of,
                            weight_by=args.weight_by, **filters)
    if args.cmd == "coverage":
        return _cmd_coverage(
            root, as_json=args.json, as_of=args.as_of,
            propose_binding_for=getattr(args, "propose_binding", None),
        )
    if args.cmd == "learn":
        return _cmd_learn(root, as_json=args.json, as_of=args.as_of,
                          threshold=args.threshold, record=args.record,
                          force=args.force)
    return 2


def _cmd_learn(root: Path, *, as_json: bool, as_of: str | None,
               threshold: int, record: bool, force: bool = False) -> int:
    bindings = load_bindings(root / ".fars" / "ledger.toml")
    closure = _load_closure_accounts(root / ".fars" / "ledger.toml")
    # Candidates derive from the as-of window (you can ask "what
    # would I have learned by date T?"), but idempotency must consult
    # ALL prior lessons in the log, regardless of window — otherwise
    # `learn --record --as-of <past>` re-emits each run because
    # newly-recorded lessons carry current timestamps outside the
    # window and look "missing" on replay.
    log = EventLog(root=root)
    all_lessons_in_log = [w for w in log.read_all() if w.operator == "lesson"]
    window_witnesses = list(_read_witnesses(root, as_of))
    candidates = derive_all_lessons(
        window_witnesses, bindings, closure, threshold=threshold)
    if force:
        lessons = candidates
    else:
        from pyfars.runtime.ledger import existing_lesson_strengths
        already = existing_lesson_strengths(all_lessons_in_log)
        lessons = [w for w in candidates
                   if w.details["evidence_count"]
                   > already.get(w.details["pattern"], -1)]
    if record and lessons:
        for w in lessons:
            log.append(w)
    if as_json:
        json.dump({
            "threshold": threshold,
            "recorded": bool(record),
            "lessons": [w.to_dict() for w in lessons],
        }, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0
    if not lessons:
        print(f"# pyfars ledger learn\n\n"
              f"(no patterns crossed threshold={threshold} — "
              f"either coverage is complete or the substrate is quiet)")
        return 0
    print(f"# pyfars ledger learn — distilled {len(lessons)} lesson(s) "
          f"at threshold={threshold}\n")
    for w in lessons:
        d = w.details
        print(f"## {d['pattern']}")
        print(f"  evidence:    {w.evidence:.3f}  "
              f"(observed {d['evidence_count']}× in window)")
        print(f"  suggestion:  {d['suggested_action']}")
        print()
    if record:
        print(f"Recorded {len(lessons)} lesson witness(es) to the event log "
              f"on the `learning` channel. Run `pyfars ledger tally "
              f"--commodity LESSONS` to see the knowledge stock.")
    else:
        print("Dry run. Pass --record to append these lesson witnesses to "
              "the event log so the substrate's knowledge of its own gaps "
              "becomes part of the audit chain.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
