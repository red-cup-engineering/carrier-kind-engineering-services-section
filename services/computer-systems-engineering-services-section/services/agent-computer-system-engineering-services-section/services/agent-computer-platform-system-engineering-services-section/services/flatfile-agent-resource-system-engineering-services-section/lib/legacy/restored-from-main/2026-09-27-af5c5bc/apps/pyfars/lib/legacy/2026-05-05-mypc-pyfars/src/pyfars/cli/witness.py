"""``pyfars witness`` — emit a witness to the event log from the CLI.

Generic witness emitter for shims and tools that previously embedded a
Python heredoc to construct a Witness directly. Encapsulates the
construction so callers don't need pyfars on PYTHONPATH or pyfars internals
imported — just `pyfars` on PATH.

Used by the cline-workflows witness helper (``.fars/cline-witness.sh``)
and any other shim that needs to record a step or event under a
substrate-aware operator/channel pair.
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.profile import discover_profile
from pyfars.spec import Parameter, VerbSpec, make_argparse


SPEC = VerbSpec(
    name="witness",
    description="Emit a witness to the FARS event log.",
    example=(
        "pyfars witness --operator cline_runbook_step:my-runbook "
        "--target cline-workflow:my-runbook --channel dispatch "
        "--origin cline-workflow:my-runbook --truth 1.0 --evidence 1.0 "
        "--detail step=plan --detail runbook=my-runbook"
    ),
    output="One JSONL line appended to the event log; nothing on stdout.",
    parameters=(
        Parameter(name="operator", kind="flag", type=str, default=None,
                  description="operator name (e.g. cline_runbook_step:<runbook>)"),
        Parameter(name="target", kind="flag", type=str, default=None,
                  description="witness target (path or substrate address)"),
        Parameter(name="channel", kind="flag", type=str, default="dispatch",
                  description="event-log channel (default: dispatch)"),
        Parameter(name="origin", kind="flag", type=str, default=None,
                  description="producing office/hook/process"),
        Parameter(name="truth", kind="flag", type=float, default=1.0,
                  description="bilattice truth axis [0,1] (default 1.0)"),
        Parameter(name="evidence", kind="flag", type=float, default=1.0,
                  description="bilattice evidence axis [0,1] (default 1.0)"),
        Parameter(name="detail", kind="append", type=str,
                  description="extra detail as key=value (repeatable)"),
        Parameter(name="agent", kind="flag", type=str, default=None,
                  description="emitting agent identifier"),
    ),
)


def _parse_details(detail_args: list[str] | None) -> dict[str, str]:
    """Parse ``--detail key=value`` flags into a dict.

    Splits on the first ``=`` only so values may contain ``=``.
    Anything without an ``=`` is treated as a flag-style key (value="").
    """
    out: dict[str, str] = {}
    for raw in detail_args or []:
        key, sep, value = raw.partition("=")
        if not key:
            continue
        out[key] = value if sep else ""
    return out


def run(*, operator: str | None = None, target: str | None = None,
        channel: str = "dispatch", origin: str | None = None,
        truth: float = 1.0, evidence: float = 1.0,
        detail: list[str] | None = None, agent: str | None = None) -> int:
    if not operator:
        print("pyfars witness: --operator is required", file=sys.stderr)
        return 64
    if not target:
        print("pyfars witness: --target is required", file=sys.stderr)
        return 64
    for name, val in (("truth", truth), ("evidence", evidence)):
        if not (0.0 <= val <= 1.0):
            print(f"pyfars witness: {name}={val} out of range [0,1]", file=sys.stderr)
            return 64
    profile = discover_profile(Path.cwd())
    if profile is None:
        print("pyfars: no FARS profile found", file=sys.stderr)
        return 2
    details = _parse_details(detail)
    witness = make_witness(
        operator=operator,
        target=target,
        before_hash=None,
        after_hash=None,
        channel=channel,
        origin=origin or operator,
        agent=agent,
        truth=truth,
        evidence=evidence,
        details=details,
    )
    EventLog(root=profile.root).append(witness)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = make_argparse(SPEC)
    args = parser.parse_args(argv)
    return run(**vars(args))


if __name__ == "__main__":
    sys.exit(main())
