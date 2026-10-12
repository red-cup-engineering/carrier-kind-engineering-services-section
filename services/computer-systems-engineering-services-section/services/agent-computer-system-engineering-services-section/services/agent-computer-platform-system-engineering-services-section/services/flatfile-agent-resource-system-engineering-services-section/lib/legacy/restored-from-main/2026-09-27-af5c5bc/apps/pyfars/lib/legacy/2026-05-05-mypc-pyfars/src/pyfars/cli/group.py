"""``pyfars group`` — load + validate the polity records under a group dir.

Two subcommands:

  pyfars group validate [--root <dir>]
      Load the polity at <root>/operations/command/group/ and report
      every cross-reference invariant break (missing populace files,
      offices' held-by → unknown personnel, ship.captain → unknown,
      etc.). Exit 1 on any break, 0 on a clean graph.

  pyfars group show [--root <dir>]
      Print the loaded polity, its ships, offices (with held-by),
      and personnel (with offices held). The captain's quick
      "what's the state of the group on disk?" view.

Wraps ``pyfars.runtime.group.Group`` — keep this module CLI-only;
governance logic stays in the runtime package.
"""
from __future__ import annotations

import sys
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.runtime.group import Group
from pyfars.spec import Parameter, VerbSpec, make_argparse


SPEC = VerbSpec(
    name="group",
    description="Load and inspect the polity / ships / offices / personnel "
                "records under operations/command/group/.",
    example="pyfars group validate",
    notes="Subcommands: validate (cross-reference graph check), "
          "show (print loaded records).",
    output="Markdown summary on stdout. Validate exits 1 on any break.",
    parameters=(
        Parameter(name="subcommand", kind="positional", required=False,
                  default="show",
                  description="one of: validate, show"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="repo root (group dir at "
                              "<root>/operations/command/group)"),
        Parameter(name="group_dir", kind="flag", default=None,
                  description="explicit group dir (overrides --root path)"),
    ),
)


def _resolve_group_dir(root: Path, group_dir: str | None) -> Path | None:
    if group_dir is not None:
        d = Path(group_dir).resolve()
        if not d.is_dir():
            print(f"pyfars group: not a directory: {d}", file=sys.stderr)
            return None
        return d
    root_dir = as_directory(root, "pyfars group")
    if root_dir is None:
        return None
    return root_dir / "operations" / "command" / "group"


def _show(g: Group) -> int:
    print(f"# {g.polity.title or g.polity.slug}")
    print()
    print(f"- slug: `{g.polity.slug}`")
    print(f"- status: {g.polity.status}")
    print(f"- populace: {len(g.polity.populace)} "
          f"({len(g.personnel)} loaded)")
    print(f"- ships: {len(g.polity.ships)} "
          f"({len(g.ships)} loaded)")
    print(f"- offices: {len(g.polity.offices)} "
          f"({len(g.offices)} loaded)")
    print()
    print("## Ships")
    for slug in sorted(g.ships):
        s = g.ships[slug]
        cap = s.captain or "(no captain)"
        voy = f" — voyage: {s.current_voyage}" if s.current_voyage else ""
        print(f"- `{s.slug}` — captain {cap}{voy}")
    print()
    print("## Offices")
    for slug in sorted(g.offices):
        o = g.offices[slug]
        held = o.held_by or "(vacant)"
        print(f"- `{o.slug}` — held by {held}")
    print()
    print("## Personnel")
    for slug in sorted(g.personnel):
        p = g.personnel[slug]
        offs = sorted(p.holds_offices)
        offs_str = ", ".join(offs) if offs else "(no offices)"
        print(f"- `{p.slug}` ({p.type or 'unknown'}) — holds: {offs_str}")
    return 0


def _validate(g: Group) -> int:
    v = g.validate()
    if v.ok:
        print(f"# {g.polity.slug}: ok")
        print()
        print(f"All {len(g.ships)} ships, {len(g.offices)} offices, "
              f"and {len(g.personnel)} personnel cross-reference cleanly.")
        return 0
    print(f"# {g.polity.slug}: validation failed")
    print()
    if v.missing_populace:
        print("## Populace entries with no personnel file")
        for s in sorted(v.missing_populace):
            print(f"- `{s}`")
        print()
    if v.missing_offices:
        print("## Polity-listed offices with no office file")
        for s in sorted(v.missing_offices):
            print(f"- `{s}`")
        print()
    if v.missing_ships:
        print("## Polity-listed ships with no ship file")
        for s in sorted(v.missing_ships):
            print(f"- `{s}`")
        print()
    if v.held_by_unknown_personnel:
        print("## office.held-by → unknown personnel")
        for off, who in sorted(v.held_by_unknown_personnel):
            print(f"- `{off}` held by `{who}`")
        print()
    if v.holds_unknown_office:
        print("## personnel.holds-offices → unknown office")
        for who, off in sorted(v.holds_unknown_office):
            print(f"- `{who}` holds `{off}`")
        print()
    if v.captain_not_in_personnel:
        print("## ship.captain → unknown personnel")
        for ship, who in sorted(v.captain_not_in_personnel):
            print(f"- `{ship}` captained by `{who}`")
        print()
    if v.crewed_by_unknown_office:
        print("## ship.crewed-by-offices → unknown office")
        for ship, off in sorted(v.crewed_by_unknown_office):
            print(f"- `{ship}` crewed by `{off}`")
        print()
    return 1


def run(*, subcommand: str = "show", root: Path = Path("."),
        group_dir: str | None = None) -> int:
    d = _resolve_group_dir(root, group_dir)
    if d is None:
        return 2
    if not d.is_dir():
        print(f"pyfars group: group dir does not exist: {d}", file=sys.stderr)
        return 2
    g = Group.load(d)
    if subcommand == "validate":
        return _validate(g)
    if subcommand == "show":
        return _show(g)
    print(f"pyfars group: unknown subcommand {subcommand!r}; "
          f"valid: validate, show", file=sys.stderr)
    return 2


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(subcommand=args.subcommand, root=args.root,
               group_dir=args.group_dir)


if __name__ == "__main__":
    sys.exit(main())
