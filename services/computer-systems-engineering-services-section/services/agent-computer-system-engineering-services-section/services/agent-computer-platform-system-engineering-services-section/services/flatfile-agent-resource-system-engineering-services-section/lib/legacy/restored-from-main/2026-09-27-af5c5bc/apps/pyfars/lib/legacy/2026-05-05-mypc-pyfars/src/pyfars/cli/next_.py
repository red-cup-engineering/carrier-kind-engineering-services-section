"""``pyfars next`` — what should *I* work on next? (agent-side dispatch)

Closes ``[GAP-4]`` from
``decision:agentic-coordination-gap-analysis``: the existing
``pyfars dispatch`` answers *given a task, which agents are eligible?*
``pyfars next`` answers the inverse, which is the question an agent
opening a session actually has: *given who I am, which task should I
take?*

Resolution logic for the ``--as`` slug, in order:
  1. ``operations/command/group/personnel/<slug>.md`` — read
     ``capabilities``/``skills`` directly, or chase
     ``manifests-as-persona`` to the persona record;
  2. ``operations/engineering/personas/<slug>.md`` (or
     ``<slug>/<slug>.md``) — read ``capabilities``/``skills``;
  3. ``.fars/config.toml`` ``[[agents.registered]]`` — fall back to the
     lightweight runtime profile entries.

Eligibility filter mirrors ``pyfars dispatch``:
  - ``status`` ∈ {open, dispatched, in-progress}
  - all ``depends-on`` resolve to tasks with ``status == done``
  - ``requires-capabilities`` ⊆ agent capabilities (if known)
  - ``requires-skills`` ⊆ agent skills (if known)

Ranking: priority desc, then load asc, then slug for deterministic ties.
"""
from __future__ import annotations

import json as _json
import sys
from collections import defaultdict
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.spec import Parameter, VerbSpec, make_argparse
from pyfars.substrate.parse.frontmatter import parse as parse_fm

SPEC = VerbSpec(
    name="next",
    description="Find the next eligible work-item for an agent (agent-side dispatch).",
    example="pyfars next --as claude-code --limit 3",
    notes=(
        "Resolves --as via personnel → persona → .fars/config.toml. "
        "If no agent is given, lists all ready tasks across the corpus. "
        "With --json emits a structured plan."
    ),
    output=(
        "Ranked list of (slug, title, why-eligible, suggested next command). "
        "Exit 0 even when no tasks match; the empty result is meaningful."
    ),
    parameters=(
        Parameter(name="as_", kind="flag", default=None,
                  description=("agent identity — personnel:<slug>, "
                               "persona:<slug>, or bare agent name from "
                               ".fars/config.toml")),
        Parameter(name="capability", kind="append", default=[],
                  description=("require this capability (repeatable); "
                               "narrows --as further or stands alone")),
        Parameter(name="skill", kind="append", default=[],
                  description="require this skill (repeatable)"),
        Parameter(name="limit", kind="flag", type=int, default=5,
                  short="-n", description="max number of tasks to return"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of human-readable plan"),
    ),
)


# ---------- substrate scan ----------

def _walk_tasks(root: Path) -> list[dict]:
    """Walk the corpus for ``type: task`` records.

    Returns a list of ``{path, fm}`` dicts. Skips event-log, build,
    cache, and triage directories — the same boundaries the rest of
    FARS observes.
    """
    skip = {".git", ".fars", "__pycache__", "node_modules",
            ".pytest_cache", ".lake", "triage"}
    out: list[dict] = []
    for path in root.rglob("*.md"):
        if any(p in skip for p in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if not text.startswith("---"):
            continue
        try:
            fm, _body = parse_fm(text)
        except Exception:
            # Corpus has occasional notes with malformed YAML; don't let
            # one bad note take down the whole walk. Skip silently — the
            # `pyfars validate` verb is the place to surface YAML errors.
            continue
        if fm is None or fm.get("type") != "task":
            continue
        out.append({"path": path, "fm": fm})
    return out


def _as_list(v) -> list:
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


# ---------- agent resolution ----------

def _resolve_agent(slug: str, root: Path) -> dict | None:
    """Find the agent's capabilities/skills in the substrate or profile."""
    bare = str(slug).split(":", 1)[-1]

    # Source 1: personnel record.
    personnel = root / "operations/command/group/personnel" / f"{bare}.md"
    if personnel.is_file():
        try:
            fm, _ = parse_fm(personnel.read_text(encoding="utf-8"))
        except Exception:
            fm = None
        if fm:
            caps = _as_list(fm.get("capabilities"))
            skills = _as_list(fm.get("skills"))
            persona_slug = fm.get("manifests-as-persona")
            if persona_slug and not (caps and skills):
                pcaps, pskills = _persona_caps(root, str(persona_slug))
                caps = caps or pcaps
                skills = skills or pskills
            return {"slug": f"personnel:{bare}", "capabilities": caps,
                    "skills": skills, "source": "personnel"}

    # Source 2: persona record (with or without `persona:` prefix).
    pcaps, pskills = _persona_caps(root, bare)
    if pcaps or pskills:
        return {"slug": f"persona:{bare}", "capabilities": pcaps,
                "skills": pskills, "source": "persona"}

    # Source 3: .fars/config.toml [[agents.registered]].
    try:
        from pyfars.runtime.profile import discover_profile
        profile = discover_profile(root)
    except Exception:
        profile = None
    if profile is not None:
        for agent in (profile.agents or []):
            name = getattr(agent, "name", None)
            if name == bare or name == slug:
                return {
                    "slug": f"agent:{name}",
                    "capabilities": list(getattr(agent, "capabilities", []) or []),
                    "skills": list(getattr(agent, "skills", []) or []),
                    "source": "pyfars-profile",
                }
    return None


def _persona_caps(root: Path, slug: str) -> tuple[list, list]:
    bare = str(slug).split(":", 1)[-1]
    candidates = [
        root / "operations/engineering/personas" / f"{bare}.md",
        root / "operations/engineering/personas" / bare / f"{bare}.md",
        root / "operations/engineering/personas" / bare / "_index.md",
    ]
    for c in candidates:
        if c.is_file():
            try:
                fm, _ = parse_fm(c.read_text(encoding="utf-8"))
            except Exception:
                continue
            if fm:
                return (_as_list(fm.get("capabilities")),
                        _as_list(fm.get("skills")))
    return ([], [])


# ---------- ranking ----------

def _ready(task_fm: dict, by_slug: dict[str, dict]) -> tuple[bool, str]:
    for dep in _as_list(task_fm.get("depends-on")):
        dep_fm = by_slug.get(str(dep))
        if dep_fm is None:
            return False, f"unknown dep {dep}"
        if dep_fm.get("status") != "done":
            return False, f"waiting on {dep} (status={dep_fm.get('status')})"
    return True, "deps satisfied"


def _matches(task_fm: dict, agent: dict | None,
             extra_caps: set[str], extra_skills: set[str]) -> tuple[bool, str]:
    req_caps = set(_as_list(task_fm.get("requires-capabilities")))
    req_skills = set(_as_list(task_fm.get("requires-skills")))
    needed_caps = req_caps | extra_caps
    needed_skills = req_skills | extra_skills

    if agent is None:
        # No agent: only filter by explicit --capability / --skill.
        if extra_caps and not extra_caps.issubset(req_caps):
            # The task does not advertise these caps; skip.
            return False, f"task does not require {sorted(extra_caps - req_caps)}"
        return True, "no agent filter"

    have_caps = set(agent.get("capabilities", []))
    have_skills = set(agent.get("skills", []))
    missing_caps = needed_caps - have_caps
    if missing_caps:
        return False, f"agent missing caps {sorted(missing_caps)}"
    missing_skills = needed_skills - have_skills
    if missing_skills:
        return False, f"agent missing skills {sorted(missing_skills)}"
    matched = []
    if needed_caps & have_caps:
        matched.append(f"caps={sorted(needed_caps & have_caps)}")
    if needed_skills & have_skills:
        matched.append(f"skills={sorted(needed_skills & have_skills)}")
    return True, "; ".join(matched) or "no requirements"


def _load_for(agent_slug: str, tasks: list[dict]) -> int:
    """Tasks already assigned to this agent in non-terminal state."""
    bare = str(agent_slug).split(":", 1)[-1]
    n = 0
    for t in tasks:
        if t["fm"].get("status") in ("done", "abandoned"):
            continue
        ass = t["fm"].get("assigned-to") or t["fm"].get("assigned-to-personnel")
        if ass and bare in str(ass):
            n += 1
    return n


# ---------- entry ----------

def run(*, as_: str | None = None,
        capability: list | None = None,
        skill: list | None = None,
        limit: int = 5,
        root: Path = Path("."),
        json: bool = False) -> int:
    root_dir = as_directory(root, "pyfars next")
    if root_dir is None:
        return 2

    extra_caps = set(capability or [])
    extra_skills = set(skill or [])

    agent: dict | None = None
    if as_:
        agent = _resolve_agent(as_, root_dir)
        if agent is None:
            print(f"pyfars next: could not resolve agent {as_!r} "
                  f"(checked personnel, persona, .fars/config.toml)",
                  file=sys.stderr)
            return 2

    tasks = _walk_tasks(root_dir)
    by_slug = {f"task:{t['path'].stem}": t["fm"] for t in tasks}
    # Index by slug from frontmatter where present.
    for t in tasks:
        s = t["fm"].get("slug")
        if s:
            by_slug[str(s)] = t["fm"]

    candidates = []
    for t in tasks:
        fm = t["fm"]
        status = fm.get("status")
        if status not in ("open", "dispatched", "in-progress"):
            continue
        ready, why_ready = _ready(fm, by_slug)
        if not ready:
            continue
        ok, why_match = _matches(fm, agent, extra_caps, extra_skills)
        if not ok:
            continue
        load = _load_for(agent["slug"], tasks) if agent else 0
        candidates.append({
            "slug": str(fm.get("slug") or f"task:{t['path'].stem}"),
            "title": fm.get("title") or t["path"].stem,
            "path": str(t["path"].relative_to(root_dir)),
            "priority": int(fm.get("priority") or 3),
            "status": status,
            "why": why_match,
            "of-goal": fm.get("of-goal"),
            "touches": _as_list(fm.get("touches")),
            "load": load,
        })

    candidates.sort(key=lambda c: (-c["priority"], c["load"], c["slug"]))
    candidates = candidates[: max(0, int(limit))]

    payload = {
        "agent": agent,
        "extra_caps": sorted(extra_caps),
        "extra_skills": sorted(extra_skills),
        "candidates": candidates,
    }

    if json:
        print(_json.dumps(payload, indent=2, default=str))
        return 0

    if agent:
        print(f"# pyfars next — for {agent['slug']} "
              f"(source={agent['source']}, "
              f"caps={agent['capabilities']}, skills={agent['skills']})")
    else:
        print("# pyfars next — any agent")
    if extra_caps or extra_skills:
        print(f"  filters: caps={sorted(extra_caps)} "
              f"skills={sorted(extra_skills)}")
    if not candidates:
        print("\n(no eligible tasks — corpus may be unseeded; "
              "see pyfars dispatch for the inverse query)")
        return 0
    print(f"\n{len(candidates)} candidate(s):\n")
    for i, c in enumerate(candidates, 1):
        print(f"  [{i}] {c['slug']}  (priority={c['priority']}, "
              f"status={c['status']}, load={c['load']})")
        print(f"      title:   {c['title']}")
        print(f"      path:    {c['path']}")
        if c.get("of-goal"):
            print(f"      of-goal: {c['of-goal']}")
        if c.get("touches"):
            print(f"      touches: {c['touches']}")
        print(f"      match:   {c['why']}")
        if agent:
            print(f"      take:    pyfars assign-task --task {c['slug']} "
                  f"--to {agent['slug']}")
        print()
    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(
        as_=getattr(args, "as_", None) or getattr(args, "as", None),
        capability=list(getattr(args, "capability", []) or []),
        skill=list(getattr(args, "skill", []) or []),
        limit=args.limit, root=args.root, json=args.json,
    )


if __name__ == "__main__":
    sys.exit(main())
