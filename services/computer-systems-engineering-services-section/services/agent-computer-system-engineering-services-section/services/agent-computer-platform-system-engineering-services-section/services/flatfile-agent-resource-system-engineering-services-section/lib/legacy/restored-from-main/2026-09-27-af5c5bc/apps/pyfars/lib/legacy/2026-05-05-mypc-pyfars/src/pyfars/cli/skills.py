"""``pyfars skills <subcommand> [args]`` — enumerate, describe, and invoke skills.

Subcommands:

  ``pyfars skills list [--pack P] [--json]``        list all skills (optionally filtered by pack)
  ``pyfars skills show <slug> [--json]``            print one skill's SKILL.md or its parsed metadata
  ``pyfars skills run <slug> [-- args...]``          invoke the skill's script with passthrough args

Skills are discovered under ``operations/engineering/skills/`` by default;
override with ``--skills-root P``.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pyfars.skills.api import list_skills, get_skill, run_skill


def _make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pyfars skills",
                                description="Enumerate, describe, and invoke engineering skills.")
    p.add_argument("--skills-root", default="operations/engineering/skills",
                   help="root of the skills tree (default: operations/engineering/skills)")
    sub = p.add_subparsers(dest="sub", required=True)

    pl = sub.add_parser("list", help="list all skills")
    pl.add_argument("--pack", default=None, help="restrict to one pack (e.g. math)")
    pl.add_argument("--json", action="store_true", help="emit JSON")

    ps = sub.add_parser("show", help="show one skill's metadata")
    ps.add_argument("slug")
    ps.add_argument("--json", action="store_true")
    ps.add_argument("--raw", action="store_true",
                    help="print the SKILL.md content verbatim")

    pr = sub.add_parser("run", help="invoke a skill's script")
    pr.add_argument("slug")
    pr.add_argument("rest", nargs=argparse.REMAINDER,
                    help="arguments forwarded to the script (separate with --)")
    pr.add_argument("--cwd", default=".", help="working directory for the script (default: CWD)")
    pr.add_argument("--timeout", type=float, default=60.0)
    return p


def _cmd_list(args) -> int:
    skills = list_skills(args.skills_root)
    if args.pack:
        skills = [s for s in skills if s.pack == args.pack]
    if args.json:
        out = [{
            "slug": s.slug,
            "pack": s.pack,
            "description": s.description,
            "runnable": s.is_runnable(),
            "skill_md": str(s.skill_md),
            "script": str(s.script) if s.script else None,
        } for s in skills]
        json.dump(out, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        by_pack: dict[str, list] = {}
        for s in skills:
            by_pack.setdefault(s.pack or "(no pack)", []).append(s)
        for pack in sorted(by_pack):
            print(f"# {pack} ({len(by_pack[pack])} skills)")
            for s in sorted(by_pack[pack], key=lambda x: x.slug):
                marker = " " if s.is_runnable() else "✗"
                print(f"  {marker} {s.slug:40s}  {s.description[:60]}")
            print()
    return 0


def _cmd_show(args) -> int:
    s = get_skill(args.slug, args.skills_root)
    if s is None:
        print(f"pyfars skills show: unknown skill: {args.slug}", file=sys.stderr)
        return 1
    if args.raw:
        sys.stdout.write(s.skill_md.read_text(encoding="utf-8"))
        return 0
    if args.json:
        out = {
            "slug": s.slug,
            "pack": s.pack,
            "description": s.description,
            "frontmatter": s.frontmatter,
            "runnable": s.is_runnable(),
            "skill_md": str(s.skill_md),
            "script": str(s.script) if s.script else None,
        }
        json.dump(out, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0
    print(f"slug: {s.slug}")
    print(f"pack: {s.pack}")
    print(f"description: {s.description}")
    print(f"runnable: {s.is_runnable()}")
    print(f"skill_md: {s.skill_md}")
    print(f"script: {s.script}")
    print()
    print("frontmatter:")
    for k, v in s.frontmatter.items():
        print(f"  {k}: {v}")
    return 0


def _cmd_run(args) -> int:
    rest = args.rest
    if rest and rest[0] == "--":
        rest = rest[1:]
    try:
        result = run_skill(args.slug, rest, args.skills_root,
                           cwd=args.cwd, timeout=args.timeout)
    except ValueError as e:
        print(f"pyfars skills run: {e}", file=sys.stderr)
        return 2
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    return result.exit_code


def main(argv: list[str] | None = None) -> int:
    args = _make_parser().parse_args(argv)
    if args.sub == "list":
        return _cmd_list(args)
    if args.sub == "show":
        return _cmd_show(args)
    if args.sub == "run":
        return _cmd_run(args)
    return 2


if __name__ == "__main__":
    sys.exit(main())
