"""``pyfars validate <path>`` — load, run all default rules, render report.

Default behavior:
  - Loads notes recursively from ``<path>`` (default: CWD).
  - Builds indexes, runs every applicable rule.
  - Writes the markdown report to stdout; per-code summary to stderr.
  - Exits 1 if any error-severity diagnostic was emitted, else 0.
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.render.diagnostics_report import render as render_report
from pyfars.render.json_dump import dump as render_json
from pyfars.closure.rule.compose_rules import run as run_rules
from pyfars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="validate",
    description="Run every default rule and emit a markdown diagnostic report.",
    example="pyfars validate library/domains/humanities/.../predication-categories",
    notes=(
        "Exits 1 if any error-severity diagnostic was emitted. "
        "When validating a subtree of a larger corpus, the validator auto-detects "
        "the corpus root (nearest ancestor with .git/, library/, or operations/) "
        "and resolves cross-tree markdown links against the corpus-wide slug "
        "universe so they do not produce spurious broken-link diagnostics. "
        "Use --corpus-root to override or --no-corpus-root to disable."
    ),
    output="Markdown report grouped by rule; --json emits a list of diagnostic dicts.",
    parameters=(
        Parameter(name="path", kind="positional", required=False, default=".",
                  description="directory to validate (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="write report to this file instead of stdout"),
        Parameter(name="bib", kind="flag", type=Path, default=None,
                  description="explicit references.bib path (default: <root>/references.bib if present)"),
        Parameter(name="corpus_root", kind="flag", type=Path, default=None,
                  description="explicit corpus root for cross-tree slug resolution (default: auto-detect)"),
        Parameter(name="no_corpus_root", kind="store_true",
                  description="disable corpus-root auto-detection; resolve slugs only within <path>"),
        Parameter(name="min_body_chars", kind="flag", type=int, default=200,
                  description="stub threshold (default: 200)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
        Parameter(name="quiet", kind="store_true",
                  description="suppress per-code summary on stderr"),
    ),
)


def _under(path: Path, scope: Path, *, base: Path) -> bool:
    """True iff ``path`` (relative to ``base``) is ``scope`` or a descendant.

    ``path`` is the note's path as stored on a ``Flatfile`` — relative to its
    substrate root. ``base`` is that substrate root. ``scope`` is the
    validation-scope directory (absolute). The note is in-scope iff
    ``base / path`` resolves under ``scope``.
    """
    abs_path = (base / path).resolve() if not path.is_absolute() else path.resolve()
    try:
        abs_path.relative_to(scope.resolve())
        return True
    except ValueError:
        return False


def run(*, path: Path | str = ".", bib: Path | None = None,
        min_body_chars: int = 200,
        corpus_root: Path | None = None,
        no_corpus_root: bool = False) -> tuple | None:
    """Run every default rule and return ``(diagnostics, n_notes, root)``.
    ``None`` if path is not a directory.

    When ``corpus_root`` is None and ``no_corpus_root`` is False, walks
    upward from ``path`` to find a workspace marker (.git/, library/,
    operations/) and uses that ancestor as the corpus root for cross-tree
    slug resolution. Set ``no_corpus_root=True`` to suppress the walk.
    """
    rooted = as_directory(path, "pyfars validate")
    if rooted is None:
        return None

    from pyfars.substrate.store import Substrate

    detected_root: Path | None = None
    if corpus_root is not None:
        detected_root = Path(corpus_root).resolve()
    elif not no_corpus_root:
        from pyfars.substrate.load._corpus_root import find as find_corpus_root
        cr = find_corpus_root(rooted)
        if cr is not None and cr != rooted:
            detected_root = cr

    if detected_root is not None and detected_root != rooted:
        corpus_ws = Substrate(root=detected_root)
        slug_universe = corpus_ws.by_slug
        base = corpus_ws.root
        scoped_notes = [
            n for n in corpus_ws.notes if _under(n.path, rooted, base=base)
        ]
        scoped_parse_diags = [
            d for d in corpus_ws.parse_diagnostics
            if d.path is None or _under(d.path, rooted, base=base)
        ]
    else:
        ws = Substrate(root=rooted)
        slug_universe = None
        scoped_notes = ws.notes
        scoped_parse_diags = ws.parse_diagnostics

    diagnostics = list(scoped_parse_diags) + run_rules(
        scoped_notes, root=rooted, bib_path=bib, min_body_chars=min_body_chars,
        slug_universe=slug_universe,
    )
    return diagnostics, len(scoped_notes), rooted


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(
        path=args.path, bib=args.bib, min_body_chars=args.min_body_chars,
        corpus_root=args.corpus_root, no_corpus_root=args.no_corpus_root,
    )
    if result is None:
        return 2
    diagnostics, n_notes, root = result

    if args.json:
        report = render_json(
            diagnostics,
            meta={"root": str(root), "n_notes": n_notes,
                  "n_diagnostics": len(diagnostics)},
        )
    else:
        report = render_report(
            diagnostics,
            title=f"pyfars validate — {root.name}",
            n_notes=n_notes, root=root,
        )
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(report, encoding="utf-8")
    else:
        sys.stdout.write(report)

    if not args.quiet:
        codes = Counter(d.code for d in diagnostics)
        print(f"pyfars validate: {n_notes} notes, {len(diagnostics)} diagnostics",
              file=sys.stderr)
        for code, n in sorted(codes.items()):
            print(f"  {n} {code}", file=sys.stderr)
        if args.out is not None:
            print(f"  report: {args.out}", file=sys.stderr)

    has_errors = any(d.severity == "error" for d in diagnostics)
    return 1 if has_errors else 0


if __name__ == "__main__":
    sys.exit(main())
