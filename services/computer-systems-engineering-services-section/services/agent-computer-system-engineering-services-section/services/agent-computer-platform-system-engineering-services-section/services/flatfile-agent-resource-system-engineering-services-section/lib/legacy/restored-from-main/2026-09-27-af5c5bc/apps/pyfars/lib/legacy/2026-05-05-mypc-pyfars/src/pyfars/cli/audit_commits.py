"""``pyfars audit-commits`` — commit-as-witness coverage report.

Walks ``git log`` for the corpus root, classifies each commit as
*substantive*, *snapshot* (substrate auto-checkpoint), or *merge*
(parent count > 1), then for substantive commits parses references
under four rules: ``Task #N``, ``task-<slug>``, task-record paths
(``.local/tasks/<slug>.md`` / ``operations/.../tasks/<slug>.md``), and
library-entity slugs (backticked or bare multi-token kebab) resolved
against the entity index built from ``library/`` and
``operations/command/``.

The verb realizes the [commit-as-witness](../../../../../../library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/commit-as-witness.md)
substrate-bridge by making the binding partition operationally
inspectable. The substantive-unbound list is the worklist for binding
external events to substrate cells; the silent-task list is the
inverse view — task records the commit log has not yet witnessed.
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.analyze.commit_witness_coverage import analyze, render_markdown
from pyfars.render.json_dump import dump as render_json
from pyfars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="audit-commits",
    description="Commit-as-witness coverage: substantive vs snapshot vs merge, and which substantive commits carry a task or entity reference.",
    example="pyfars audit-commits --limit 50",
    notes=(
        "Realizes the commit-as-witness substrate-bridge. Classifies "
        "each commit (substantive | snapshot | merge by parent count) "
        "and binds substantive commits via four reference shapes: "
        "`Task #N`, `task-<slug>`, task-record paths, and library-entity "
        "slugs (backticked or bare multi-token kebab) resolved against "
        "the entity index. Output is the operational worklist for "
        "binding external events to substrate cells."
    ),
    output="Markdown report on stdout (or JSON with --json).",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="corpus root (default: CWD)"),
        Parameter(name="limit", kind="flag", type=int, default=200,
                  short="-n",
                  description="how many recent commits to scan (default 200)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(*, root: Path | str = ".", limit: int = 200) -> dict:
    """Compute the coverage report. Pure callable for ``pyfars.api`` / MCP."""
    return analyze(root=root, limit=limit)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    try:
        report = run(root=args.root, limit=args.limit)
    except RuntimeError as exc:
        print(f"pyfars audit-commits: {exc}", file=sys.stderr)
        return 2

    if args.json:
        sys.stdout.write(render_json(report))
        return 0

    sys.stdout.write(render_markdown(report))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
