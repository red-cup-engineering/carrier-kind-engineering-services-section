"""``pyfars work budget`` — fold cost + rate-limit observations into a per-endpoint table.

Walks all `kind: observation` workitems under the corpus, groups by
``observes:``, and reports for each endpoint:

  - call count (number of execution-events whose ``by-office`` is the endpoint)
  - cumulative completion / prompt / total tokens
  - cumulative dollar cost
  - most-recent rate-limit observation's remaining-requests / remaining-tokens
  - timestamp of most-recent execution event

This is the substrate's read-side of the cost-discipline. It does not
predict; it summarizes what's already been witnessed.
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from pyfars.cli._runner import as_directory
from pyfars.cli.work._resolve import is_endpoint, load


def _ts(o) -> str:
    return o.fm.get("observed-at") or o.fm.get("at") or ""


def _val(obs) -> dict:
    v = obs.fm.get("value") or {}
    return v if isinstance(v, dict) else {}


def _fold_endpoint(endpoint_slug: str, observations, executions) -> dict[str, Any]:
    cost_obs = [o for o in observations
                if o.fm.get("observes") == endpoint_slug
                and o.fm.get("method") == "endpoint-response-usage"]
    rate_obs = [o for o in observations
                if o.fm.get("observes") == endpoint_slug
                and o.fm.get("method") == "provider-header-extraction"]
    exec_evs = [e for e in executions if e.fm.get("by-office") == endpoint_slug]

    total_dollars = 0.0
    prompt_tok = 0
    completion_tok = 0
    total_tok = 0
    for o in cost_obs:
        v = _val(o)
        try:
            total_dollars += float(v.get("dollars") or 0)
        except (TypeError, ValueError):
            pass
        toks = v.get("tokens") or {}
        if isinstance(toks, dict):
            prompt_tok += int(toks.get("prompt-tokens") or 0)
            completion_tok += int(toks.get("completion-tokens") or 0)
            total_tok += int(toks.get("total-tokens") or 0)

    last_rate = None
    if rate_obs:
        rate_obs_sorted = sorted(rate_obs, key=_ts, reverse=True)
        last_rate = {
            "observed-at": _ts(rate_obs_sorted[0]),
            "value": _val(rate_obs_sorted[0]),
        }

    succeeded = sum(1 for e in exec_evs if e.fm.get("state-change") == "completed")
    failed = sum(1 for e in exec_evs if e.fm.get("state-change") == "failed")
    last_call = max((e.fm.get("at") or "" for e in exec_evs), default="")

    return {
        "endpoint": endpoint_slug,
        "calls": len(exec_evs),
        "succeeded": succeeded,
        "failed": failed,
        "prompt-tokens": prompt_tok,
        "completion-tokens": completion_tok,
        "total-tokens": total_tok,
        "dollars": round(total_dollars, 6),
        "last-call": last_call,
        "last-rate-limit": last_rate,
    }


def _render_markdown(rows: list[dict]) -> str:
    if not rows:
        return "# Endpoint budgets\n\nNo execution events or observations recorded.\n"
    lines = ["# Endpoint budgets", ""]
    lines.append("| Endpoint | Calls (✓/✗) | Tokens (in/out/total) | $ | Last rate-limit | Last call |")
    lines.append("|---|---|---|---|---|---|")
    for r in rows:
        rl = r["last-rate-limit"]
        if rl:
            v = rl["value"]
            rl_str = f"req={v.get('remaining-requests','?')}, tok={v.get('remaining-tokens','?')}"
        else:
            rl_str = "(no obs)"
        toks = f"{r['prompt-tokens']}/{r['completion-tokens']}/{r['total-tokens']}"
        calls = f"{r['calls']} ({r['succeeded']}/{r['failed']})"
        lines.append(
            f"| `{r['endpoint']}` | {calls} | {toks} | "
            f"{r['dollars']:.4f} | {rl_str} | {r['last-call'] or '—'} |"
        )
    return "\n".join(lines) + "\n"


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work budget")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    ap.add_argument("--endpoint", default=None,
                    help="filter to a single endpoint slug")
    ap.add_argument("--json", action="store_true",
                    help="emit JSON instead of markdown")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work budget")
    if root is None:
        return 2

    sub = load(root)
    notes = list(sub.notes)

    endpoints = [n for n in notes if is_endpoint(n)]
    if args.endpoint:
        endpoints = [n for n in endpoints if n.slug == args.endpoint]
        if not endpoints:
            print(f"pyfars work budget: endpoint {args.endpoint!r} not found",
                  file=sys.stderr)
            return 1

    observations = [n for n in notes if n.fm.get("kind") == "observation"]
    executions = [n for n in notes if n.fm.get("kind") == "execution-event"]

    rows = [_fold_endpoint(e.slug, observations, executions) for e in endpoints]
    rows.sort(key=lambda r: (-r["calls"], r["endpoint"]))

    if args.json:
        sys.stdout.write(json.dumps(rows, indent=2, default=str))
    else:
        sys.stdout.write(_render_markdown(rows))
    return 0
