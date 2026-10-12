"""``pyfars match`` — rank polity offices against a task by predicate fiber.

Implements the captain-facing surface of the dispatch-and-matching
analysis: given a task's required / forbidden / preferred predicate
sets, score every office in the loaded group via fiber composition
``⊙`` and print the ranked candidates. Optionally narrow to a
specific ship's embarked crew (composes with the governance gate
in ``pyfars command``).

Two ways to specify the task:

  --task <slug-or-path>    load a markdown task record and read its
                           ``requires:`` / ``forbids:`` / ``prefers:``
                           frontmatter fields.
  --requires X --forbids Y --prefers Z
                           pass predicate sets directly (comma-separated).

Example:

  pyfars match --requires build,test --prefers test --ship ship:rsc-quiescent

Exit 0 if at least one office is eligible (conflict==0) AND scores a
positive agreement+duty_boost. Exit 3 otherwise — the Voyager
re-dispatch trigger, meaning no conflict-free office had any opinion
in favour of the task, so the caller should enrich the task and
re-match. Exit 2 on usage / file errors.
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.runtime.group import Group
from pyfars.runtime.match import MatchScore, TaskQuery, match_offices_in_group
from pyfars.spec import Parameter, VerbSpec, make_argparse
from pyfars.substrate.parse.frontmatter import parse as parse_frontmatter


SPEC = VerbSpec(
    name="match",
    description="Rank polity offices against a task by predicate-fiber "
                "composition (the dispatch-and-matching analysis).",
    example="pyfars match --requires build,test --ship ship:rsc-quiescent",
    notes=("--task loads a markdown record's frontmatter; --requires / "
           "--forbids / --prefers are comma-separated direct entry. "
           "Exit 3 = no eligible office scored positively (Voyager "
           "re-dispatch trigger); exit 2 = usage / file error."),
    output="Markdown ranked list on stdout; one line per office.",
    parameters=(
        Parameter(name="task", kind="flag", default=None,
                  description="path to a task .md whose frontmatter "
                              "carries requires/forbids/prefers"),
        Parameter(name="requires", kind="flag", default=None,
                  description="comma-separated required predicates"),
        Parameter(name="forbids", kind="flag", default=None,
                  description="comma-separated forbidden predicates"),
        Parameter(name="prefers", kind="flag", default=None,
                  description="comma-separated preferred predicates"),
        Parameter(name="ship", kind="flag", default=None,
                  description="ship slug to restrict matching to "
                              "(uses the ship's embarked crew only)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="repo root"),
        Parameter(name="group_dir", kind="flag", default=None,
                  description="explicit group dir (overrides --root path)"),
        Parameter(name="all_", kind="store_true",
                  description="include silent + conflicting offices "
                              "(default: drop both)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def _parse_csv(value: str | None) -> frozenset[str]:
    if not value:
        return frozenset()
    return frozenset(s.strip() for s in value.split(",") if s.strip())


def _task_from_file(path: Path) -> TaskQuery:
    """Load a markdown task record and extract predicate fields."""
    fm, _body = parse_frontmatter(path.read_text(encoding="utf-8"))
    if not fm:
        raise ValueError(f"no frontmatter in {path}")
    return TaskQuery(
        # Per substrate convention, the filename is the slug; do not
        # honor a frontmatter ``slug:`` override here.
        slug=path.stem,
        requires=_csv_or_list(fm.get("requires")),
        forbids=_csv_or_list(fm.get("forbids")),
        prefers=_csv_or_list(fm.get("prefers")),
    )


def _csv_or_list(value) -> frozenset[str]:
    """Coerce a YAML scalar/list/None into a frozenset of strings."""
    if value is None:
        return frozenset()
    if isinstance(value, str):
        return _parse_csv(value)
    return frozenset(str(v) for v in value if v)


def _resolve_group_dir(root: Path, group_dir: str | None) -> Path | None:
    if group_dir is not None:
        d = Path(group_dir).resolve()
        return d if d.is_dir() else None
    root_dir = as_directory(root, "pyfars match")
    if root_dir is None:
        return None
    return root_dir / "operations" / "command" / "group"


def _emit_markdown(scores: list[MatchScore], task: TaskQuery,
                   ship: str | None) -> None:
    print(f"# match: task `{task.slug or '(inline)'}`"
          + (f" on `{ship}`" if ship else ""))
    print()
    print(f"- requires: {sorted(task.requires) or '(none)'}")
    print(f"- forbids:  {sorted(task.forbids) or '(none)'}")
    print(f"- prefers:  {sorted(task.prefers) or '(none)'}")
    print()
    if not scores:
        print("**No offices scored anything on this task.**")
        return
    print("| Office | Verdict | Agree | Duty+ | Silent | Conflict |")
    print("|---|---|---:|---:|---:|---:|")
    for s in scores:
        verdict = "eligible" if s.is_eligible else "CONFLICT"
        print(f"| `{s.office.slug}` | {verdict} | {s.agreement} "
              f"| {s.duty_boost} | {s.silent} | {s.conflict} |")
    # Detail the top hit's matching predicates
    top = scores[0]
    if top.is_eligible and top.positive_score:
        print()
        print(f"**Top: `{top.office.slug}`**")
        if top.agreement_predicates:
            print(f"- agrees on: {sorted(top.agreement_predicates)}")
        if top.duty_boost_predicates:
            print(f"- duty boost: {sorted(top.duty_boost_predicates)}")


def _emit_json(scores: list[MatchScore], task: TaskQuery,
               ship: str | None) -> None:
    import json
    payload = {
        "task": {
            "slug": task.slug,
            "requires": sorted(task.requires),
            "forbids": sorted(task.forbids),
            "prefers": sorted(task.prefers),
        },
        "ship": ship,
        "scores": [
            {
                "office": s.office.slug,
                "eligible": s.is_eligible,
                "agreement": s.agreement,
                "conflict": s.conflict,
                "duty_boost": s.duty_boost,
                "silent": s.silent,
                "agreement_predicates": sorted(s.agreement_predicates),
                "conflict_predicates": sorted(s.conflict_predicates),
                "duty_boost_predicates": sorted(s.duty_boost_predicates),
            }
            for s in scores
        ],
    }
    print(json.dumps(payload, indent=2))


def run(*, task: str | None = None, requires: str | None = None,
        forbids: str | None = None, prefers: str | None = None,
        ship: str | None = None, root: Path = Path("."),
        group_dir: str | None = None, all_: bool = False,
        json: bool = False) -> int:
    if task is not None:
        try:
            task_query = _task_from_file(Path(task))
        except (FileNotFoundError, ValueError) as e:
            print(f"pyfars match: {e}", file=sys.stderr)
            return 2
    elif requires or forbids or prefers:
        task_query = TaskQuery(slug="(inline)",
                               requires=_parse_csv(requires),
                               forbids=_parse_csv(forbids),
                               prefers=_parse_csv(prefers))
    else:
        print("pyfars match: pass --task <path> or "
              "--requires/--forbids/--prefers", file=sys.stderr)
        return 2

    d = _resolve_group_dir(root, group_dir)
    if d is None or not d.is_dir():
        print(f"pyfars match: group dir not found: {d}", file=sys.stderr)
        return 2

    g = Group.load(d)
    try:
        scores = match_offices_in_group(
            task_query, g, ship_slug=ship,
            include_conflicts=all_, include_silent=all_,
        )
    except KeyError as e:
        print(f"pyfars match: {e}", file=sys.stderr)
        return 2

    if json:
        _emit_json(scores, task_query, ship)
    else:
        _emit_markdown(scores, task_query, ship)

    eligible = [s for s in scores if s.is_eligible and s.positive_score]
    return 0 if eligible else 3


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(task=args.task, requires=args.requires,
               forbids=args.forbids, prefers=args.prefers,
               ship=args.ship, root=args.root, group_dir=args.group_dir,
               all_=args.all_, json=args.json)


if __name__ == "__main__":
    sys.exit(main())
