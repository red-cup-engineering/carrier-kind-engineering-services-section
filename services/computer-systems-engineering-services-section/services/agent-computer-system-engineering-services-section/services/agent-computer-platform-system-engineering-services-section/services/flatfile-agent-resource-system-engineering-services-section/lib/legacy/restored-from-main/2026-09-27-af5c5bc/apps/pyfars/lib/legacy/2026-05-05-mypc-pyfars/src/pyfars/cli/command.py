"""``pyfars command`` — issue a command to a ship of the polity.

The captain's verb. Loads the group at
<root>/operations/command/group/, resolves the ship by slug,
authorizes the issuer (must hold an office on the polity), and
emits a witness on the ``"command"`` channel — durably appended
to the FARS event log so the act is audit-traceable.

Example:

  pyfars command --ship ship:rsc-quiescent --action begin-voyage \\
               --by personnel:emsenn \\
               --payload '{"voyage": "the-relationality-pass"}'

A denied command (issuer holds no office on the polity) still
emits a witness — the *attempt* is itself an institutional event
and we want it on the record. Exit code 0 for issued, 3 for
denied, 2 for unrecognized ship/issuer/JSON, 1 for I/O failure.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.runtime.channel import EventRuntime, MessageBus
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.group import Group, command as do_command
from pyfars.spec import Parameter, VerbSpec, make_argparse


SPEC = VerbSpec(
    name="command",
    description="Issue a command to a ship of the loaded polity, recording "
                "the act as a witness on the 'command' channel.",
    example=('pyfars command --ship ship:rsc-quiescent '
             '--action begin-voyage --by personnel:emsenn'),
    notes=("The issuer must hold at least one office on the ship's "
           "polity; otherwise the command is recorded as denied (exit 3) "
           "rather than executed. --payload is a JSON object."),
    output="Witness JSON on stdout; appended to .fars/event-log/.",
    parameters=(
        Parameter(name="ship", kind="flag", required=True,
                  description="ship slug, e.g. ship:rsc-quiescent"),
        Parameter(name="action", kind="flag", required=True,
                  description="action verb, e.g. begin-voyage, set-heading"),
        Parameter(name="by", kind="flag", required=True,
                  description="issuing personnel slug, e.g. personnel:emsenn"),
        Parameter(name="payload", kind="flag", default=None,
                  description="optional JSON object with action arguments"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="repo root"),
        Parameter(name="group_dir", kind="flag", default=None,
                  description="explicit group dir (overrides --root path)"),
        Parameter(name="agent", kind="flag", default=None,
                  description="agent name for the witness record"),
        Parameter(name="dry_run", kind="store_true",
                  description="resolve + authorize but do not write the witness"),
    ),
)


def _resolve_group_dir(root: Path, group_dir: str | None) -> Path | None:
    if group_dir is not None:
        d = Path(group_dir).resolve()
        return d if d.is_dir() else None
    root_dir = as_directory(root, "pyfars command")
    if root_dir is None:
        return None
    return root_dir / "operations" / "command" / "group"


def run(*, ship: str, action: str, by: str,
        payload: str | None = None,
        root: Path = Path("."), group_dir: str | None = None,
        agent: str | None = None, dry_run: bool = False) -> int:
    payload_obj = None
    if payload:
        try:
            payload_obj = json.loads(payload)
        except json.JSONDecodeError as e:
            print(f"pyfars command: invalid --payload JSON: {e}",
                  file=sys.stderr)
            return 2
        if not isinstance(payload_obj, dict):
            print("pyfars command: --payload must decode to a JSON object",
                  file=sys.stderr)
            return 2

    d = _resolve_group_dir(root, group_dir)
    if d is None or not d.is_dir():
        print(f"pyfars command: group dir not found: {d}", file=sys.stderr)
        return 2
    repo_root = d.parent.parent.parent  # group/ → command/ → operations/ → root

    g = Group.load(d)
    try:
        runtime = (None if dry_run else
                   EventRuntime(log=EventLog(root=repo_root),
                                bus=MessageBus()))
        result = do_command(g, ship, action, by=by, payload=payload_obj,
                            runtime=runtime, agent=agent)
    except KeyError as e:
        print(f"pyfars command: {e}", file=sys.stderr)
        return 2

    print(result.witness.to_json())
    if result.status == "denied":
        print(f"  status: DENIED — {result.reason}", file=sys.stderr)
        return 3
    print(f"  status: issued by {by} → {ship} ({action})", file=sys.stderr)
    if dry_run:
        print("  (dry run — witness not appended)", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(ship=args.ship, action=args.action, by=args.by,
               payload=args.payload, root=args.root,
               group_dir=args.group_dir, agent=args.agent,
               dry_run=args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
