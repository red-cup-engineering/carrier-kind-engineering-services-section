"""``pyfars undo <label>`` — restore from a snapshot.

Looks up ``<label>`` in either the git stash list (preferred) or the
filesystem fallback under ``.corpus/snapshots/<label>/``, and restores.
Always touches working-tree files; never history.
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.operator.edit.snapshot import restore
from pyfars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="undo",
    description="Restore from a snapshot — overwrite current files with snapshot content.",
    example="pyfars undo before-bulk-edit",
    notes="Restore semantics, not merge: post-snapshot edits to those files are lost.",
    output="Stderr summary of what was restored.",
    parameters=(
        Parameter(name="label", kind="positional", required=True,
                  description="snapshot label to restore (see `pyfars snapshot --list`)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="no_git", kind="store_true",
                  description="force filesystem-copy restore"),
    ),
)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    root = as_directory(args.root, "pyfars undo")
    if root is None:
        return 2

    result = restore(root, args.label, use_git=not args.no_git)
    if not result.get("ok"):
        print(f"pyfars undo: {result.get('error')}", file=sys.stderr)
        return 1
    if result["mode"] == "git":
        print(f"pyfars undo: popped {result['stash']}", file=sys.stderr)
    else:
        print(f"pyfars undo: restored {result['n_files']} files",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
