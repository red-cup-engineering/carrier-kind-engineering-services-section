"""``pyfars work auto-dispatch <task-slug>`` — end-to-end endpoint dispatch.

Combines dispatch eligibility, assignment emission, and execution into one verb:

  1. Run `dispatch.run(task)` to get the eligible executable list, already
     sorted by load and provider preference.
  2. Pick the top endpoint/unix-tool (or `--prefer <slug>` if specified and eligible).
  3. Emit a dispatch-stage Assignment workitem.
  4. Invoke `work execute` against the new assignment, which calls the LLM
     endpoint or local unix tool and emits the ExecutionEvent.

`--dry-run` reports the choice without writing or invoking. `--assign-only`
emits the assignment but skips execute (useful for human-handed offices).
"""
from __future__ import annotations

import argparse
import sys

from pyfars.cli import dispatch
from pyfars.cli.work import execute as exec_mod
from pyfars.cli.work._emit import mint_slug, now_iso, write_workitem


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work auto-dispatch")
    ap.add_argument("task", help="task slug to auto-dispatch")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    ap.add_argument("--prefer", default=None,
                    help="prefer this endpoint slug if eligible "
                         "(default: top of dispatch ranking)")
    ap.add_argument("--from-sender", default="dispatcher",
                    help="dispatching office (default: dispatcher)")
    ap.add_argument("--authority-bound", default="execute-task")
    ap.add_argument("--prompt", default=None,
                    help="override prompt (default: task body)")
    ap.add_argument("--system", default=None)
    ap.add_argument("--temperature", type=float, default=0.2)
    ap.add_argument("--max-tokens", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true",
                    help="report chosen endpoint; no writes or calls")
    ap.add_argument("--assign-only", action="store_true",
                    help="write the assignment but skip execute")
    args = ap.parse_args(argv)

    out = dispatch.run(args.task, root=args.root)
    if out is None:
        print(f"pyfars work auto-dispatch: task {args.task!r} not found",
              file=sys.stderr)
        return 1
    if not out.get("ready", False):
        print(f"pyfars work auto-dispatch: task is not ready — "
              f"{out.get('ready-reason')}", file=sys.stderr)
        return 1

    eligible = out.get("eligible", [])
    executable_rows = [
        e for e in eligible if e.get("kind") in ("endpoint", "unix-tool")
    ]
    if not executable_rows:
        print(f"pyfars work auto-dispatch: no eligible executable dispatchables for {args.task}",
              file=sys.stderr)
        return 1

    chosen = None
    if args.prefer:
        for e in executable_rows:
            if e["agent"] == args.prefer:
                chosen = e
                break
        if chosen is None:
            print(f"pyfars work auto-dispatch: --prefer {args.prefer!r} "
                  "not in eligible executable dispatchables; falling back to top",
                  file=sys.stderr)
    if chosen is None:
        chosen = executable_rows[0]

    target_slug = chosen["agent"]
    if args.dry_run:
        print("pyfars work auto-dispatch (dry-run):")
        print(f"  task:     {args.task}")
        print(f"  target:   {target_slug} [{chosen.get('kind')}]")
        print(f"  reason:   {chosen['reason']}")
        print(f"  load:     {chosen['load']}")
        return 0

    assignment_slug = mint_slug(f"assignment-{args.task}")
    fm = {
        "title": f"Assignment: {args.task} → {target_slug}",
        "type": "workitem",
        "kind": "assignment",
        "is-a": "assignment",
        "assigns-task": args.task,
        "to-office": target_slug,
        "from-sender": args.from_sender,
        "sent-at": now_iso(),
        "authority-bound": args.authority_bound,
        "capability-match": chosen["reason"],
        "retracted": None,
    }
    body = (
        f"Auto-dispatch of task `{args.task}` to `{target_slug}` "
        f"by `{args.from_sender}` (authority: `{args.authority_bound}`).\n"
        f"\nDispatch reason: {chosen['reason']}\n"
    )
    a_target = write_workitem("assign", assignment_slug, fm, body)
    print(f"pyfars work auto-dispatch: wrote assignment {a_target}")
    print(f"  slug: {assignment_slug}")

    if args.assign_only:
        return 0

    exec_argv = [assignment_slug, "--root", str(args.root)]
    if args.prompt:
        exec_argv += ["--prompt", args.prompt]
    if args.system:
        exec_argv += ["--system", args.system]
    if args.temperature is not None:
        exec_argv += ["--temperature", str(args.temperature)]
    if args.max_tokens is not None:
        exec_argv += ["--max-tokens", str(args.max_tokens)]
    return exec_mod.run(exec_argv)
