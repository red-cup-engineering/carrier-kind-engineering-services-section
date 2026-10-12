"""``pyfars install-harness`` — install (or uninstall) a PyFARS harness.

A *harness* is a set of files and conventions that bridges the FARS
substrate to a specific external agent runtime or surface (Replit
Agent, Claude Code, Cursor, OpenAI Codex, the repo's own root-level
instruction files, etc.). The substrate is the source of truth;
harnesses materialize a runtime-specific *view* of it so each consumer
sees the substrate in the convention it expects.

Harnesses ship inside this package, under :mod:`pyfars.harnesses`. Each
harness is one subdirectory containing an ``_index.md`` (frontmatter
``type: harness``) and, where applicable, a ``templates/`` dir of Jinja2
templates rendered against substrate-derived context at install time.
Two example harnesses:

- **replit** — shims every PyFARS engineering skill into
  ``.agents/skills/<prefix><pack>-<skill>/SKILL.md`` so Replit Agent's
  project-skill auto-discovery loads them across every chat session.
- **repo-instructions** — generates the repo's root-level agent-
  instruction files (``CLAUDE.md``, ``README.md``, ``replit.md``)
  from substrate state plus templates owned by the harness, so they
  stay in sync with the rest of the corpus instead of drifting as
  static prose.

Closes the second half of the "Replit visibility" addendum from
``decision:agentic-coordination-gap-analysis``: MCP exposes verbs +
skills as RPC tools; the Replit harness exposes them as project-
installed skills the Replit Agent reads on session start. The
repo-instructions harness closes the orthogonal "frozen agent-
instruction prose" gap: hand-written CLAUDE.md / README.md / replit.md
go stale because they're written once and never refreshed; making
them generated solves drift by construction.

Idempotent: re-running an install overwrites the materialized files
(same names, same target). Each install writes a manifest the
matching ``--uninstall`` reads so removal is exact.
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from pyfars.spec import Parameter, VerbSpec, make_argparse
from pyfars.substrate.parse.frontmatter import parse as parse_fm

SPEC = VerbSpec(
    name="install-harness",
    description="Install (or uninstall) a PyFARS harness — a runtime-specific view of the substrate for an external agent.",
    example="pyfars install-harness replit",
    notes=(
        "List harnesses with no positional arg. Use --uninstall to remove an "
        "installed harness via its manifest. The replit harness shims every "
        "PyFARS skill into .agents/skills/<prefix><pack>-<skill>/SKILL.md so "
        "Replit Agent's project-skill auto-discovery picks them up across "
        "every chat session."
    ),
    output=(
        "On install: count of shims written + manifest path. "
        "On uninstall: count of shims removed."
    ),
    parameters=(
        Parameter(name="harness", kind="positional", required=False,
                  description="harness name (e.g. `replit`); omit to list available harnesses"),
        Parameter(name="target", kind="flag", default=None,
                  description="override harness's default install target (e.g. `.agents/skills/`)"),
        Parameter(name="prefix", kind="flag", default="pyfars-",
                  description="namespace prefix for shim names (default: `pyfars-`)"),
        Parameter(name="root", kind="flag", default=".", short="-r",
                  description="corpus root (default: CWD)"),
        Parameter(name="dry_run", kind="store_true",
                  description="show what would be written/removed; do not modify the filesystem"),
        Parameter(name="uninstall", kind="store_true",
                  description="remove a previously-installed harness using its manifest"),
        Parameter(name="all", kind="store_true",
                  description="install (or with --uninstall, remove) every available harness in one call; ignores positional `harness`"),
    ),
)


# ---------- harness registry ----------

def _list_available(root: Path) -> list[dict]:
    """Enumerate harnesses shipped in :mod:`pyfars.harnesses`."""
    del root  # unused — package-shipped harnesses are root-independent
    from pyfars.harnesses import available_harnesses
    return available_harnesses()


# ---------- replit harness ----------

def _walk_skills(skills_root: Path) -> list[dict]:
    """Walk ``operations/engineering/skills/`` for SKILL.md files."""
    out: list[dict] = []
    if not skills_root.is_dir():
        return out
    for skill_md in sorted(skills_root.rglob("SKILL.md")):
        try:
            text = skill_md.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        try:
            fm, body = parse_fm(text)
        except Exception:
            continue
        if not fm or "name" not in fm:
            continue
        # Pack is the first dir under skills_root: skills/<pack>/<skill>/SKILL.md
        rel = skill_md.relative_to(skills_root)
        parts = rel.parts
        pack = parts[0] if len(parts) >= 3 else "_root"
        out.append({
            "name": fm["name"],
            "description": str(fm.get("description", "")).strip(),
            "pack": pack,
            "source": skill_md,
            "body": body or "",
            "fm": fm,
        })
    return out


def _shim_text(*, shim_name: str, original: dict, root: Path) -> str:
    """Build a Replit-format SKILL.md that *describes and points at* the PyFARS skill."""
    desc_raw = original["description"] or f"PyFARS engineering skill ({original['pack']} pack)."
    # Replit shows description in the agent context; prefix to make origin obvious.
    desc = f"[FARS:{original['pack']}] {desc_raw}"
    if len(desc) > 360:
        desc = desc[:357].rstrip() + "..."
    desc = desc.replace("\n", " ").replace('"', "'")

    src_rel = original["source"].relative_to(root)
    fars_name = original["name"]

    return (
        f"---\n"
        f"name: {shim_name}\n"
        f'description: "{desc}"\n'
        f"---\n"
        f"\n"
        f"# {shim_name}\n"
        f"\n"
        f"PyFARS engineering skill, installed by `pyfars install-harness replit`. "
        f"Pack: **{original['pack']}**. Source: [`{src_rel}`]({src_rel}).\n"
        f"\n"
        f"## Invocation\n"
        f"\n"
        f"```bash\n"
        f"pyfars skills run {fars_name} [-- <args>]\n"
        f"```\n"
        f"\n"
        f"Use `pyfars skills show {fars_name}` to see the skill's full metadata "
        f"(inputs, outputs, region, capabilities). Use `pyfars skills list "
        f"--pack {original['pack']}` to see sibling skills in the same pack.\n"
        f"\n"
        f"## Original SKILL.md (verbatim)\n"
        f"\n"
        f"The substrate is the source of truth — this shim only exists so "
        f"Replit Agent's project-skill auto-discovery can find the skill. "
        f"Read the original at `{src_rel}` for any updates beyond what's "
        f"copied below.\n"
        f"\n"
        f"---\n"
        f"\n"
        f"{original['body'].strip()}\n"
    )


def _agent_shim_text(*, shim_name: str, agent: dict, root: Path) -> str:
    """Build a Replit-format SKILL.md that invites the agent runtime to *take on*
    the given substrate-recorded role. The shim is skill-shaped so it surfaces
    through Replit's project-skill auto-discovery, but its content is a role
    contract: when invoked, the runtime should adopt the agent's duties,
    powers, jurisdiction, and skill set as its operating posture for the
    remainder of the prompt.
    """
    fm = agent["fm"]
    title = str(fm.get("title", agent["slug"])).strip()
    raw_desc = str(fm.get("description", f"Take on the role of {title}.")).strip()
    raw_desc = " ".join(raw_desc.split())
    desc = f"[FARS:agent] Take on the role of {title}. {raw_desc}"
    if len(desc) > 360:
        desc = desc[:357].rstrip() + "..."
    desc = desc.replace('"', "'")

    src_rel = agent["source"].relative_to(root)

    def _bullets(field: str, *, prose: bool = False) -> str:
        # Reuse the same normalizers the claude-code projection uses, so that
        # YAML-coerced dicts (from unquoted ``key: value`` colons in prose
        # bullets) and other non-string items render as readable text rather
        # than Python repr literals.
        items = (_normalize_prose_items(fm.get(field)) if prose
                 else _format_list_field(fm, field))
        if not items:
            return "  (none declared)\n"
        return "".join(f"  - {item}\n" for item in items)

    serves = _bullets("serves")
    duties = _bullets("duties")
    powers = _bullets("powers")
    privileges = _bullets("privileges")
    immunities = _bullets("immunities", prose=True)
    skills_list = _bullets("skills")
    autonomous = _bullets("autonomous", prose=True)
    escalates = _bullets("escalates", prose=True)

    specialization = fm.get("specialization-of")
    spec_line = (f"\nThis role is a specialization of "
                 f"`agent-{specialization}`. The base role's contract still "
                 f"applies; this specialization narrows scope and may add "
                 f"specifics.\n") if specialization else ""

    return (
        f"---\n"
        f"name: {shim_name}\n"
        f'description: "{desc}"\n'
        f"---\n"
        f"\n"
        f"# {shim_name} — take on the role of {title}\n"
        f"\n"
        f"This skill exists so that when the captain says *\"you are a "
        f"{agent['slug']}\"* (or otherwise summons this role), the role's "
        f"contract is discoverable through the same skill channel as everything "
        f"else. Source-of-truth agent record: [`{src_rel}`]({src_rel}).\n"
        f"{spec_line}"
        f"\n"
        f"## Role contract\n"
        f"\n"
        f"**Serves:**\n{serves}\n"
        f"**Duties:**\n{duties}\n"
        f"**Powers:**\n{powers}\n"
        f"**Privileges:**\n{privileges}\n"
        f"**Immunities (things you must not do):**\n{immunities}\n"
        f"**Skills you should invoke when acting in this role:**\n{skills_list}\n"
        f"**Autonomous (do without asking):**\n{autonomous}\n"
        f"**Escalates (do not do without confirming):**\n{escalates}\n"
        f"## Full agent record (verbatim)\n"
        f"\n"
        f"The substrate is the source of truth — read [`{src_rel}`]({src_rel}) "
        f"for the role's body, charter bindings, jurisdiction, and any role-"
        f"specific guidance the frontmatter doesn't cover.\n"
    )


def _install_replit(*, root: Path, target: Path, prefix: str,
                    dry_run: bool) -> tuple[int, Path | None, list[dict]]:
    """Install the replit harness. Returns (count, manifest_path, entries).

    Projects two kinds of substrate records into the Replit-Agent skill
    namespace:

    - **Skills** at `operations/engineering/skills/<pack>/<skill>/SKILL.md`
      → `<target>/<prefix><pack>-<skill>/SKILL.md` (the original mechanism).
    - **Agent records** at `operations/engineering/agents/<slug>.md`
      → `<target>/agent-<slug>/SKILL.md` — a role-shaped shim whose body is
      the agent's duties / powers / skills, so saying "you are a <slug>"
      surfaces the role through skill auto-discovery.
    """
    skills_root = root / "operations/engineering/skills"
    skills = _walk_skills(skills_root)
    agents = _walk_agent_records(root)
    if not skills and not agents:
        print(f"no skills found under {skills_root} and no agents found",
              file=sys.stderr)
        return 0, None, []

    target.mkdir(parents=True, exist_ok=True) if not dry_run else None

    entries: list[dict] = []
    for s in skills:
        shim_name = f"{prefix}{s['pack']}-{s['name']}"
        shim_dir = target / shim_name
        shim_path = shim_dir / "SKILL.md"
        text = _shim_text(shim_name=shim_name, original=s, root=root)
        if not dry_run:
            shim_dir.mkdir(parents=True, exist_ok=True)
            shim_path.write_text(text, encoding="utf-8")
        entries.append({
            "shim-name": shim_name,
            "shim-path": str(shim_path.relative_to(root)),
            "source-path": str(s["source"].relative_to(root)),
            "pyfars-name": s["name"],
            "pack": s["pack"],
        })
    for a in agents:
        shim_name = f"agent-{a['slug']}"
        shim_dir = target / shim_name
        shim_path = shim_dir / "SKILL.md"
        text = _agent_shim_text(shim_name=shim_name, agent=a, root=root)
        if not dry_run:
            shim_dir.mkdir(parents=True, exist_ok=True)
            shim_path.write_text(text, encoding="utf-8")
        entries.append({
            "shim-name": shim_name,
            "shim-path": str(shim_path.relative_to(root)),
            "source-path": str(a["source"].relative_to(root)),
            "pyfars-name": a["slug"],
            "pack": "agent",
        })

    manifest_path = target / ".fars-harness-manifest.json"
    manifest = {
        "harness": "replit",
        "installed-at": datetime.now(timezone.utc).isoformat(),
        "prefix": prefix,
        "target": str(target.relative_to(root)) if target.is_relative_to(root) else str(target),
        "skills": entries,
    }
    if not dry_run:
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_replit(*, root: Path, target: Path,
                      dry_run: bool) -> tuple[int, Path | None]:
    """Uninstall via the manifest. Returns (count_removed, manifest_path)."""
    manifest_path = target / ".fars-harness-manifest.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "replit":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'replit'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    for entry in manifest.get("skills", []):
        shim_path = root / entry["shim-path"]
        shim_dir = shim_path.parent
        if shim_path.is_file():
            if not dry_run:
                shim_path.unlink()
            removed += 1
        if shim_dir.is_dir() and not any(shim_dir.iterdir() if shim_dir.exists() else []):
            if not dry_run:
                shim_dir.rmdir()
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- repo-instructions harness ----------

# Files that this harness emits at the repo root. Order is preserved in
# the install summary so the captain sees them in a stable sequence.
_REPO_INSTRUCTIONS_FILES = (
    ("CLAUDE.md", "CLAUDE.md.j2"),
    ("AGENTS.md", "AGENTS.md.j2"),
    ("README.md", "README.md.j2"),
    ("replit.md", "replit.md.j2"),
)


def _read_fm(path: Path) -> dict | None:
    """Read frontmatter from ``path``; return ``None`` if missing/unparseable."""
    if not path.is_file():
        return None
    try:
        fm, _body = parse_fm(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return fm or {}


def _resolve_personnel_slug(ref: str | None) -> str | None:
    """Strip a ``personnel:`` prefix; return ``None`` for falsy input."""
    if not ref:
        return None
    return ref.split(":", 1)[1] if ":" in ref else ref


def _personnel_record(root: Path, slug: str) -> tuple[Path, dict] | None:
    """Resolve a personnel slug to its record path + frontmatter."""
    p = root / "operations/command/group/personnel" / f"{slug}.md"
    fm = _read_fm(p)
    if fm is None:
        return None
    return p, fm


def _personnel_to_ctx(slug: str, fm: dict) -> dict:
    """Project a personnel record into the captain-context shape."""
    return {
        "slug": slug,
        "title": fm.get("title"),
        "handle": fm.get("public-handle") or slug,
        "public_handle": fm.get("public-handle"),
        "public_domain": fm.get("public-domain"),
        "status": fm.get("status"),
    }


def _holds_command(fm: dict) -> bool:
    """Does this personnel frontmatter hold ``office:command``?

    Tolerates list-of-strings as the canonical shape; falls back to
    string-coerce for malformed records so we don't silently miss a
    holder whose frontmatter parses oddly.
    """
    offices = fm.get("holds-offices") or []
    if isinstance(offices, str):
        offices = [offices]
    return any(str(o).strip() == "office:command" for o in offices)


def _resolve_polity(root: Path) -> dict:
    """Find the active polity record under ``operations/command/group/``.

    Looks at the directory's top-level ``*.md`` files and picks the
    first whose frontmatter has ``kind: polity`` and ``status: active``.
    The previous implementation hardcoded the filename; this generalizes
    so a future polity rename or addition is picked up automatically.
    """
    group_dir = root / "operations/command/group"
    if not group_dir.is_dir():
        return {}
    for p in sorted(group_dir.glob("*.md")):
        fm = _read_fm(p)
        if not fm or fm.get("kind") != "polity":
            continue
        if fm.get("status") not in (None, "active"):
            continue
        return {
            "title": fm.get("title"),
            "slug": fm.get("slug"),
            "charter": fm.get("charter"),
            "ships": fm.get("ships") or [],
            "computer-systems": fm.get("computer-systems") or [],
            "_path": str(p.relative_to(root)),
        }
    return {}


def _resolve_ship(root: Path, polity: dict) -> dict | None:
    """Resolve the polity's primary ship via its ``ships:`` list.

    Picks the first active ship listed by the polity. Falls back to a
    directory glob only if the polity has no ``ships:`` field at all.
    """
    ship_refs = polity.get("ships") or []
    candidates: list[Path] = []
    for ref in ship_refs:
        slug = _resolve_personnel_slug(ref)  # same prefix-stripping logic
        if slug:
            p = root / "operations/command/group/ships" / f"{slug}.md"
            if p.is_file():
                candidates.append(p)
    if not candidates:
        ships_dir = root / "operations/command/group/ships"
        if ships_dir.is_dir():
            candidates = [p for p in sorted(ships_dir.glob("*.md"))
                          if p.name != "_index.md"]
    for p in candidates:
        fm = _read_fm(p)
        if not fm or fm.get("kind") != "ship":
            continue
        if fm.get("status") not in (None, "active"):
            continue
        return {
            "title": fm.get("title"),
            "slug": fm.get("slug"),
            "designation": fm.get("designation"),
            "current_voyage": fm.get("current-voyage"),
            "captain": _resolve_personnel_slug(fm.get("captain")),
            "_path": str(p.relative_to(root)),
        }
    return None


def _resolve_captain(root: Path, ship: dict | None) -> dict | None:
    """Find the captain personnel record.

    Resolution order:
    1. The ship's ``captain:`` field (a personnel slug). The most precise
       binding when present.
    2. Fallback: scan ``personnel/`` for any *active* record holding
       ``office:command``. Surfaces a holder even when the ship record
       is missing or under-specified.

    Returns ``None`` if neither path resolves a record.
    """
    if ship and ship.get("captain"):
        rec = _personnel_record(root, ship["captain"])
        if rec is not None:
            _, fm = rec
            return _personnel_to_ctx(ship["captain"], fm)

    personnel_dir = root / "operations/command/group/personnel"
    if not personnel_dir.is_dir():
        return None
    for p in sorted(personnel_dir.glob("*.md")):
        if p.name == "_index.md":
            continue
        fm = _read_fm(p)
        if not fm or not _holds_command(fm):
            continue
        if fm.get("status") not in (None, "active"):
            continue
        return _personnel_to_ctx(p.stem, fm)
    return None


def _resolve_top_theories(root: Path) -> list[dict]:
    """List ``library/theories/<area>/_index.md`` entries with their titles."""
    out: list[dict] = []
    theories_root = root / "library/theories"
    if not theories_root.is_dir():
        return out
    for area in sorted(theories_root.iterdir()):
        idx = area / "_index.md"
        if not idx.is_file():
            continue
        fm = _read_fm(idx) or {}
        out.append({
            "slug": area.name,
            "title": fm.get("title"),
            "path": str(idx.parent.relative_to(root)) + "/",
        })
    return out


def _resolve_pc_subtheories(root: Path) -> list[dict]:
    """List direct sub-theories under predicated-computing/theories/."""
    out: list[dict] = []
    base = root / ("library/theories/engineering/theories/tech/theories/"
                   "computing/theories/predicated-computing/theories")
    if not base.is_dir():
        return out
    for child in sorted(base.iterdir()):
        idx = child / "_index.md"
        if not idx.is_file():
            continue
        fm = _read_fm(idx) or {}
        out.append({
            "slug": child.name,
            "title": fm.get("title"),
            "path": str(idx.parent.relative_to(root)) + "/",
        })
    return out


def _count_pyfars_verbs() -> int:
    """Return the number of verbs registered in ``pyfars.cli.__main__``."""
    try:
        from pyfars.cli.__main__ import VERB_MODULES
    except Exception:
        return 0
    return len(VERB_MODULES)


def _count_skills(root: Path) -> int:
    """Count ``SKILL.md`` files under ``operations/engineering/skills/``."""
    skills_root = root / "operations/engineering/skills"
    if not skills_root.is_dir():
        return 0
    return sum(1 for _ in skills_root.rglob("SKILL.md"))


def _resolve_polity_layout(root: Path) -> dict | None:
    """Parse ``<root>/polity.yaml`` (vcstool-format) into structured context.

    Returns None when the manifest is absent — the template degrades
    gracefully to substrate-only orientation for that case (i.e., when
    pyfars is run with ``--root`` pointing at a single member repo
    rather than the polity meta-repo).

    The manifest's ``repositories:`` mapping carries one entry per polity
    member, keyed by target path. Optional fields per entry — ``role``
    and ``description`` — drive the README's "what each member is" prose.
    Members are grouped by their first path segment (``civics``,
    ``platforms``, ``tools``) so the rendered layout reflects the
    polity's architectural taxonomy rather than a flat file list.
    """
    manifest_path = root / "polity.yaml"
    if not manifest_path.is_file():
        return None
    try:
        import yaml
        data = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    repos = data.get("repositories") or {}
    if not isinstance(repos, dict):
        return None

    members: list[dict] = []
    for path, entry in repos.items():
        if not isinstance(entry, dict):
            continue
        members.append({
            "path": str(path),
            "url": str(entry.get("url") or ""),
            "version": str(entry.get("version") or ""),
            "role": str(entry.get("role") or ""),
            "description": str(entry.get("description") or ""),
            "name": str(path).rsplit("/", 1)[-1],
        })

    # Group by first path segment so the template can render per-area
    # subtrees (civics on its own, platforms grouped by platform-slug, etc).
    groups: dict[str, list[dict]] = {}
    for m in members:
        head = m["path"].split("/", 1)[0]
        groups.setdefault(head, []).append(m)

    # Within platforms/, sub-group by platform-slug.
    platforms = {}
    for m in groups.get("platforms", []):
        parts = m["path"].split("/")
        if len(parts) >= 3:
            platform_slug = parts[1]
            platforms.setdefault(platform_slug, []).append(m)

    polity_meta = data.get("polity") or {}
    if not isinstance(polity_meta, dict):
        polity_meta = {}

    return {
        "members": members,
        "groups": groups,                 # {head -> [member, ...]}
        "platforms": platforms,           # {platform-slug -> [realization, ...]}
        "tools": groups.get("tools", []),
        "civics": groups.get("civics", []),
        "short": str(polity_meta.get("short") or ""),
        "meta_repo_url": str(polity_meta.get("meta-repo-url") or ""),
    }


def _build_repo_instructions_context(root: Path) -> dict:
    """Assemble the substrate-derived context dict the templates render against.

    Resolution chains polity → ship → captain so each lookup uses the
    previous result's references (rather than hitting hardcoded paths
    independently). Each resolver tolerates a missing predecessor and
    returns ``None`` / empty-dict so the templates can render a visible
    ``(missing)`` marker instead of failing.

    ``polity_layout`` (parsed from ``<root>/polity.yaml`` if present)
    enables polity-meta-repo orientation in the rendered README.
    Substrate-only invocations (run from inside a single member repo)
    omit those sections gracefully.
    """
    polity = _resolve_polity(root)
    ship = _resolve_ship(root, polity)
    captain = _resolve_captain(root, ship)
    polity_layout = _resolve_polity_layout(root)
    return {
        "polity": polity,
        "captain": captain,
        "ship": ship,
        "charter_path": polity.get("charter"),
        "top_theories": _resolve_top_theories(root),
        "predicated_computing_subtheories": _resolve_pc_subtheories(root),
        "computer_systems": _resolve_polity_computer_systems_for_flake(root, polity),
        "pyfars_verb_count": _count_pyfars_verbs(),
        "skill_count": _count_skills(root),
        "agent_count": len(_walk_agent_records(root)),
        "polity_layout": polity_layout,
        "is_polity_root": polity_layout is not None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generation_command": "pyfars install-harness repo-instructions",
    }


# ---------- claude-code harness ----------

def _walk_agent_records(root: Path) -> list[dict]:
    """Walk ``operations/engineering/agents/`` for agent records.

    Each entry has shape ``{slug, source, fm}``. Skips ``_index.md`` and
    anything that lacks parseable frontmatter with a ``title`` field
    (the smoke-test that the file is actually an agent record and not
    something stray that landed in the directory).

    Top-level only by design: nested records under
    ``operations/engineering/agents/<group>/<slug>.md`` (e.g. the
    ``emsemiote/`` subdirectory) describe agent *groups* rather than
    individually-dispatchable agents, and are out of scope for the
    Claude Code subagent projection until we know how to express the
    grouping in Claude Code's flat ``.claude/agents/`` namespace.
    """
    out: list[dict] = []
    agents_dir = root / "operations/engineering/agents"
    if not agents_dir.is_dir():
        return out
    for p in sorted(agents_dir.glob("*.md")):
        if p.name == "_index.md":
            continue
        fm = _read_fm(p)
        if not fm or not fm.get("title"):
            continue
        out.append({"slug": p.stem, "source": p, "fm": fm})
    return out


_CLAUDE_CODE_MODELS = {"opus", "sonnet", "haiku"}
"""The model-tier values Claude Code actually accepts in subagent
frontmatter. Substrate records may carry richer values; we pass through
only ones Claude Code recognizes and drop the field otherwise so the
runtime doesn't error on an unknown name."""


def _claude_code_description(raw: str | None, fallback: str) -> str:
    """Sanitize a substrate description for Claude Code's dispatcher.

    The dispatcher truncates long values and chokes on unescaped quotes
    or embedded newlines, so we collapse whitespace and cap the length.
    """
    desc = (raw or fallback).strip()
    desc = " ".join(desc.split())  # collapse newlines + runs of whitespace
    if len(desc) > 320:
        desc = desc[:317].rstrip() + "..."
    return desc.replace('"', "'")


def _format_list_field(fm: dict, key: str) -> list[str]:
    """Coerce a slug-list frontmatter field into a clean list of strings.

    Used for fields whose values are slugs (``duties``, ``powers``,
    ``skills``) — short identifiers that may be expressed as a YAML list
    or, in older records, as a comma-separated string. Splits on commas
    so a bare ``"a, b, c"`` becomes ``["a", "b", "c"]``. Do NOT use this
    for prose fields like ``autonomous``/``escalates`` whose items can
    legitimately contain commas — see ``_normalize_prose_items``.
    """
    val = fm.get(key)
    if not val:
        return []
    if isinstance(val, str):
        return [s.strip() for s in val.split(",") if s.strip()]
    if isinstance(val, list):
        return [_render_list_item(x) for x in val if _render_list_item(x)]
    return [str(val).strip()]


def _render_list_item(item: object) -> str:
    """Render one list element as a clean string.

    Substrate frontmatter occasionally has list items that the YAML
    loader parsed as ``dict`` because the captain wrote an unquoted
    colon inside an item — e.g. ``- Promoting `confidence: high`
    candidates`` becomes ``{"Promoting `confidence": "high` candidates"}``.
    Reconstruct ``key: value`` so the body still reads naturally instead
    of leaking a Python dict literal.
    """
    if item is None:
        return ""
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        # Rebuild "k: v" pairs in insertion order; usually one pair per
        # accidental dict, but join with ", " for the rare multi-pair case.
        parts = [f"{k}: {v}" for k, v in item.items()]
        return ", ".join(parts).strip()
    if isinstance(item, list):
        return ", ".join(_render_list_item(x) for x in item).strip()
    return str(item).strip()


def _normalize_prose_items(value: object) -> list[str]:
    """Coerce a prose-list frontmatter field into a clean list of strings.

    Used for ``autonomous`` and ``escalates`` whose items are full
    sentences and must NOT be comma-split. Tolerates None / single
    string / list / dict-shaped items (via ``_render_list_item``) so a
    malformed substrate record still produces readable output instead
    of being silently dropped (the original bug architect flagged).
    """
    if not value:
        return []
    if isinstance(value, str):
        s = value.strip()
        return [s] if s else []
    if isinstance(value, list):
        return [s for s in (_render_list_item(x) for x in value) if s]
    return [str(value).strip()]


def _claude_code_agent_body(*, slug: str, fm: dict, source_rel: str,
                            generated_at: str) -> str:
    """Render the body of a ``.claude/agents/<slug>.md`` file.

    Pulls duties/powers/skills/jurisdiction/autonomous/escalates from
    the substrate record so a Claude Code subagent invocation has the
    same operational context the FARS substrate record holds — no need
    to chase the substrate file just to know what the agent does.
    """
    title = fm.get("title") or slug
    role = fm.get("role")
    reports_to = fm.get("reports-to")
    duties = _format_list_field(fm, "duties")
    powers = _format_list_field(fm, "powers")
    skills = _format_list_field(fm, "skills")
    autonomous = _normalize_prose_items(fm.get("autonomous"))
    escalates = _normalize_prose_items(fm.get("escalates"))
    jurisdiction = fm.get("jurisdiction") or {}

    lines: list[str] = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append(
        f"<!-- Projected from `{source_rel}` by "
        f"`pyfars install-harness claude-code` at {generated_at}. "
        f"Edit the substrate record, not this file. -->"
    )
    lines.append("")

    role_bits: list[str] = []
    if role:
        role_bits.append(f"**Role:** {role}")
    if reports_to:
        role_bits.append(f"**Reports to:** {reports_to}")
    if role_bits:
        lines.append(" · ".join(role_bits))
        lines.append("")

    if duties:
        lines.append("## Duties")
        lines.append("")
        for d in duties:
            lines.append(f"- {d}")
        lines.append("")

    if powers:
        lines.append("## Powers")
        lines.append("")
        for p in powers:
            lines.append(f"- {p}")
        lines.append("")

    if skills:
        lines.append("## Skills")
        lines.append("")
        lines.append(
            "PyFARS skills this agent operates by (each is a record under "
            "`operations/engineering/skills/`):"
        )
        lines.append("")
        for s in skills:
            lines.append(f"- `{s}`")
        lines.append("")

    if jurisdiction:
        lines.append("## Jurisdiction")
        lines.append("")
        for region in ("read", "write"):
            paths = jurisdiction.get(region) or []
            if isinstance(paths, str):
                paths = [paths]
            if paths:
                lines.append(f"**{region.title()}:**")
                for path in paths:
                    lines.append(f"- `{path}`")
                lines.append("")

    if autonomous:
        lines.append("## Acts autonomously")
        lines.append("")
        for a in autonomous:
            lines.append(f"- {a}")
        lines.append("")

    if escalates:
        lines.append("## Escalates to captain")
        lines.append("")
        for e in escalates:
            lines.append(f"- {e}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def _claude_code_agent_text(*, slug: str, fm: dict, source_rel: str,
                            generated_at: str) -> str:
    """Build the full ``.claude/agents/<slug>.md`` text (frontmatter + body)."""
    title = fm.get("title") or slug
    desc = _claude_code_description(fm.get("description"),
                                    fallback=f"FARS agent: {title}")
    fm_lines = ["---", f"name: {slug}", f'description: "{desc}"']
    model = fm.get("model")
    if isinstance(model, str) and model.lower() in _CLAUDE_CODE_MODELS:
        fm_lines.append(f"model: {model.lower()}")
    fm_lines.append("---")
    body = _claude_code_agent_body(
        slug=slug, fm=fm, source_rel=source_rel, generated_at=generated_at,
    )
    return "\n".join(fm_lines) + "\n\n" + body


def _install_claude_code(*, root: Path, target: Path, prefix: str,
                         dry_run: bool) -> tuple[int, Path | None, list[dict]]:
    """Install the claude-code harness.

    Projects every substrate agent record under
    ``operations/engineering/agents/`` to ``.claude/agents/<slug>.md`` in
    Claude-Code-readable form. Writes a manifest under ``.fars/`` so
    ``--uninstall`` removes exactly the files this installer wrote.
    """
    del prefix  # unused — Claude Code dispatches by raw slug
    agents = _walk_agent_records(root)
    if not agents:
        raise HarnessInstallError(
            "no agent records found under operations/engineering/agents/"
        )

    out_dir = target / "agents"
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    entries: list[dict] = []
    for a in agents:
        source_rel = str(a["source"].relative_to(root))
        text = _claude_code_agent_text(
            slug=a["slug"], fm=a["fm"],
            source_rel=source_rel, generated_at=generated_at,
        )
        out_path = out_dir / f"{a['slug']}.md"
        if not dry_run:
            out_path.write_text(text, encoding="utf-8")
        entries.append({
            "filename": out_path.name,
            "out-path": str(out_path.relative_to(root))
                       if out_path.is_relative_to(root) else str(out_path),
            "source-path": source_rel,
            "slug": a["slug"],
            "bytes": len(text.encode("utf-8")),
        })

    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "claude-code.json"
    manifest = {
        "harness": "claude-code",
        "installed-at": generated_at,
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "agents": entries,
        "context-summary": {
            "agent-count": len(entries),
        },
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_claude_code(*, root: Path, target: Path,
                           dry_run: bool) -> tuple[int, Path | None]:
    """Uninstall via the manifest. Returns ``(count_removed, manifest_path)``."""
    del target  # the manifest carries paths; target arg is unused
    manifest_path = root / ".fars/harness-manifests/claude-code.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "claude-code":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'claude-code'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    out_dir: Path | None = None
    root_resolved = root.resolve()
    for entry in manifest.get("agents", []):
        # Containment check: a tampered manifest could carry `..` segments.
        # Resolve the full path and require it to live under root before
        # we unlink anything.
        out_path = (root / entry["out-path"]).resolve()
        try:
            out_path.relative_to(root_resolved)
        except ValueError:
            print(f"refusing to remove {out_path} — outside root "
                  f"{root_resolved} (manifest tampered?)", file=sys.stderr)
            continue
        out_dir = out_path.parent
        if out_path.is_file():
            if not dry_run:
                out_path.unlink()
            removed += 1
    # Clean up the .claude/agents/ dir if it's now empty (but never .claude/
    # itself — other harnesses may write siblings into it).
    if out_dir and out_dir.is_dir() and not any(out_dir.iterdir()):
        if not dry_run:
            out_dir.rmdir()
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


class HarnessInstallError(RuntimeError):
    """Raised when an installer cannot complete (missing dep, missing template,
    template render error). Surfaced to the caller so the verb exits non-zero
    instead of silently reporting a successful install of zero files."""


def _install_repo_instructions(*, root: Path, target: Path, prefix: str,
                               dry_run: bool) -> tuple[int, Path | None, list[dict]]:
    """Install the repo-instructions harness.

    Renders each template under
    ``pyfars.harnesses:repo-instructions/templates/``
    against substrate-derived context and writes the result to
    ``target/<filename>`` (target is the repo root by default).

    The ``prefix`` parameter is accepted for installer-signature uniformity
    but is unused — these are well-known fixed filenames.

    Raises ``HarnessInstallError`` on any unrecoverable problem (missing
    jinja2, missing templates dir, missing or unrenderable template).
    """
    del prefix  # unused for this harness
    try:
        import jinja2  # noqa: F401  — checked here so the error is clear
    except ImportError as exc:
        raise HarnessInstallError(
            "repo-instructions harness requires jinja2 "
            "(enter the Nix devshell or rebuild the PyFARS package)"
        ) from exc

    from jinja2 import Environment, StrictUndefined
    from jinja2.exceptions import TemplateError
    from pyfars.harnesses import harness_template_loader
    env = Environment(
        loader=harness_template_loader("repo-instructions"),
        keep_trailing_newline=True,
        undefined=StrictUndefined,
    )
    context = _build_repo_instructions_context(root)

    target.mkdir(parents=True, exist_ok=True) if not dry_run else None

    entries: list[dict] = []
    for filename, template_name in _REPO_INSTRUCTIONS_FILES:
        try:
            rendered = env.get_template(template_name).render(**context)
        except TemplateError as exc:
            raise HarnessInstallError(
                f"failed to render {template_name}: {exc}"
            ) from exc
        out_path = target / filename
        if not dry_run:
            out_path.write_text(rendered, encoding="utf-8")
        entries.append({
            "filename": filename,
            "out-path": str(out_path.relative_to(root))
                       if out_path.is_relative_to(root) else str(out_path),
            "template-source": f"pyfars.harnesses:repo-instructions/templates/{template_name}",
            "bytes": len(rendered.encode("utf-8")),
        })

    # Manifest goes under .fars/ so it doesn't pollute the repo root.
    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "repo-instructions.json"
    manifest = {
        "harness": "repo-instructions",
        "installed-at": datetime.now(timezone.utc).isoformat(),
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "files": entries,
        "context-summary": {
            "polity": context["polity"].get("title"),
            "captain": (context["captain"] or {}).get("slug"),
            "ship": (context["ship"] or {}).get("title"),
            "n-top-theories": len(context["top_theories"]),
            "n-pc-subtheories": len(context["predicated_computing_subtheories"]),
            "pyfars-verb-count": context["pyfars_verb_count"],
            "skill-count": context["skill_count"],
        },
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_repo_instructions(*, root: Path, target: Path,
                                 dry_run: bool) -> tuple[int, Path | None]:
    """Uninstall via the manifest. Returns ``(count_removed, manifest_path)``."""
    del target  # the manifest carries the file paths; target arg is unused
    manifest_path = root / ".fars/harness-manifests/repo-instructions.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "repo-instructions":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'repo-instructions'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    for entry in manifest.get("files", []):
        out_path = root / entry["out-path"]
        if out_path.is_file():
            if not dry_run:
                out_path.unlink()
            removed += 1
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- replit-config harness ----------
#
# Renders the substrate-owned spec at
# pyfars.harnesses:replit-config/templates/spec.toml.j2 to
# .fars/harness-manifests/replit-config.toml — the *desired* contents of
# .replit. Does NOT write .replit itself: the Replit sandbox protects that
# file against direct writes, so the apply step is left to either the
# Replit Agent's configureWorkflow() callback or the workspace UI. See
# pyfars.harnesses:replit-config/_index.md for the
# full apply protocol.

def _install_replit_config(*, root: Path, target: Path, prefix: str,
                           dry_run: bool) -> tuple[int, Path | None, list[dict]]:
    """Install the replit-config harness — render desired .replit to a manifest file."""
    del prefix  # unused for this harness
    try:
        import jinja2  # noqa: F401
    except ImportError as exc:
        raise HarnessInstallError(
            "replit-config harness requires jinja2 "
            "(enter the Nix devshell or rebuild the PyFARS package)"
        ) from exc

    template_name = "spec.toml.j2"
    from jinja2 import Environment, StrictUndefined
    from jinja2.exceptions import TemplateError
    from pyfars.harnesses import harness_template_loader
    env = Environment(
        loader=harness_template_loader("replit-config"),
        keep_trailing_newline=True,
        undefined=StrictUndefined,
    )
    try:
        rendered = env.get_template(template_name).render()
    except TemplateError as exc:
        raise HarnessInstallError(
            f"failed to render {template_name}: {exc}"
        ) from exc

    out_path = target / "replit-config.toml"
    if not dry_run:
        target.mkdir(parents=True, exist_ok=True)
        out_path.write_text(rendered, encoding="utf-8")

    # Diff against actual .replit so the install output tells the operator
    # whether an apply step is needed.
    actual_path = root / ".replit"
    drift = "unknown"
    if actual_path.is_file():
        actual = actual_path.read_text(encoding="utf-8")
        drift = "in-sync" if actual == rendered else "drifted"
    else:
        drift = "missing-actual"

    entries = [{
        "filename": "replit-config.toml",
        "out-path": str(out_path.relative_to(root))
                   if out_path.is_relative_to(root) else str(out_path),
        "template-source": f"pyfars.harnesses:replit-config/templates/{template_name}",
        "bytes": len(rendered.encode("utf-8")),
        "actual-replit-status": drift,
    }]

    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "replit-config.json"
    manifest = {
        "harness": "replit-config",
        "installed-at": datetime.now(timezone.utc).isoformat(),
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "files": entries,
        "actual-replit-status": drift,
        "apply-note": (
            "Substrate is the source of truth. To apply this desired-state "
            "to .replit, use the Replit Agent's configureWorkflow() callback "
            "(or the workspace UI), or dispatch a task agent. .replit is "
            "sandbox-protected against direct writes from this process."
        ),
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return 1, manifest_path, entries


def _uninstall_replit_config(*, root: Path, target: Path,
                             dry_run: bool) -> tuple[int, Path | None]:
    """Uninstall the replit-config harness."""
    del target
    manifest_path = root / ".fars/harness-manifests/replit-config.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "replit-config":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'replit-config'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    for entry in manifest.get("files", []):
        out_path = root / entry["out-path"]
        if out_path.is_file():
            if not dry_run:
                out_path.unlink()
            removed += 1
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- run / main ----------

# ---------- claude-code-hooks harness ----------
#
# Sister to claude-code: that harness projects substrate AGENTS into
# Claude Code subagent definitions. This one projects substrate HOOK
# records into Claude Code's hook protocol — `.claude/settings.json`
# plus per-hook scripts under `.claude/hooks/`. Each generated script
# reads the runtime's stdin payload and appends a bilattice-valued
# `Witness` to the FARS event log, so every Claude Code hook event
# becomes a structured ledger posting rather than an opaque shell call.

_VALID_HOOK_EVENTS = frozenset({
    "PreToolUse", "PostToolUse", "PostToolUseFailure",
    "UserPromptSubmit", "Stop", "SubagentStop", "PreCompact",
    "Notification", "SubagentStart", "PermissionRequest", "SessionStart",
})


def _walk_hook_records(root: Path, *, runtime: str = "claude-code") -> list[dict]:
    """Walk ``operations/engineering/hooks/`` for hook records targeted at
    ``runtime`` (default ``claude-code``).

    Canonical hook records are runtime-agnostic in shape; each carries a
    ``runtime`` frontmatter field naming which agent runtime's intercept
    protocol it targets. This walker filters to the requested runtime
    and applies the runtime's own event-enum / matcher validation —
    other runtimes (Aider, Cursor, …) get their own walkers without
    cross-validation conflicts. A record without a ``runtime`` field is
    skipped (not an error: it may target a runtime not yet implemented).

    Validates each retained record's ``event``, ``witness.operator``,
    and bilattice axes at walk time so installation either succeeds
    wholly or raises ``HarnessInstallError`` with a precise pointer to
    the bad record.
    """
    out: list[dict] = []
    hroot = root / "operations/engineering/hooks"
    if not hroot.is_dir():
        return out
    for p in sorted(hroot.glob("*.md")):
        if p.name == "_index.md":
            continue
        fm = _read_fm(p)
        if not fm or fm.get("kind") != "hook":
            continue
        if fm.get("runtime") != runtime:
            continue
        rel = p.relative_to(root)
        event = fm.get("event")
        if event not in _VALID_HOOK_EVENTS:
            raise HarnessInstallError(
                f"hook record {rel}: event {event!r} is not a recognized "
                f"Claude Code hook event "
                f"(valid: {sorted(_VALID_HOOK_EVENTS)})"
            )
        witness = fm.get("witness") or {}
        if not isinstance(witness, dict) or not witness.get("operator"):
            raise HarnessInstallError(
                f"hook record {rel}: missing required field "
                f"`witness.operator`"
            )
        truth_raw = witness.get("truth", 1.0)
        evidence_raw = witness.get("evidence", 1.0)
        try:
            truth = float(truth_raw)
            evidence = float(evidence_raw)
        except (TypeError, ValueError) as exc:
            raise HarnessInstallError(
                f"hook record {rel}: witness.truth/evidence must be "
                f"numbers; got truth={truth_raw!r}, evidence={evidence_raw!r}"
            ) from exc
        for name, val in (("truth", truth), ("evidence", evidence)):
            if not (0.0 <= val <= 1.0):
                raise HarnessInstallError(
                    f"hook record {rel}: witness.{name}={val} out of "
                    f"range; bilattice axes must lie in [0, 1]"
                )
        # Slug = filename stem. Restrict to a safe shell-arg charset so the
        # `hook:<slug>` token interpolated into settings.json command lines
        # cannot smuggle shell metacharacters (record filenames are normally
        # captain-authored, but a malicious record from a merged branch could
        # otherwise inject a quote+`;`+command into the runtime). The same
        # charset also keeps the slug usable in URL/path contexts and as a
        # frontmatter `slug: "hook:<...>"` value without escaping.
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", p.stem):
            raise HarnessInstallError(
                f"hook record {rel}: filename stem {p.stem!r} is not a "
                f"valid hook slug; must match `[a-z0-9][a-z0-9-]*` "
                f"(lowercase alphanumerics + hyphens, no leading hyphen)"
            )
        # Optional truncation policy: declarative override of the dispatcher's
        # default `warn`. Validated here so a malformed value is caught at
        # install rather than at first hook fire.
        on_truncation = str(fm.get("on-truncation", "warn"))
        if on_truncation not in ("warn", "block", "passthrough"):
            raise HarnessInstallError(
                f"hook record {rel}: on-truncation={on_truncation!r} is not "
                f"one of warn|block|passthrough"
            )
        # Optional governance pattern block: each entry must carry a regex
        # and a label. Sentinel semantics (only-fire-on-match) belong to the
        # dispatcher; we only validate shape + regex compilability here.
        patterns_raw = fm.get("patterns") or []
        patterns: list[dict] = []
        if patterns_raw:
            if not isinstance(patterns_raw, list):
                raise HarnessInstallError(
                    f"hook record {rel}: `patterns:` must be a list "
                    f"(got {type(patterns_raw).__name__})"
                )
            for i, item in enumerate(patterns_raw):
                if not isinstance(item, dict) or "regex" not in item:
                    raise HarnessInstallError(
                        f"hook record {rel}: patterns[{i}] must be a "
                        f"mapping with a `regex:` key"
                    )
                try:
                    re.compile(str(item["regex"]))
                except re.error as exc:
                    raise HarnessInstallError(
                        f"hook record {rel}: patterns[{i}].regex is not "
                        f"a valid regex: {exc}"
                    ) from exc
                patterns.append({
                    "regex": str(item["regex"]),
                    "label": str(item.get("label", f"pattern-{i}")),
                })
        out.append({
            "slug": p.stem,
            "event": event,
            "matcher": str(fm.get("matcher", ".*")),
            "operator": str(witness["operator"]),
            "truth": truth,
            "evidence": evidence,
            "channel": str(fm.get("channel", "dispatch")),
            "on-truncation": on_truncation,
            "patterns": patterns,
            "source": p,
        })
    return out


# Filename of the single dispatcher shim every claude-code hook fires through.
# Underscore prefix sorts it before per-record artifacts when listing the
# hooks/ directory and signals "not a hook itself".
_DISPATCHER_SHIM_NAME = "_pyfars-dispatch.sh"


def _dispatcher_script_text() -> str:
    """Render the single dispatcher shim shared across every installed hook.

    Replaces the prior per-record shim fan-out (one bash + one fresh
    python interpreter per hook fire). Now: one bash file in
    ``.claude/hooks/`` that takes the hook slug as ``$1`` and execs
    ``pyfars hook-dispatch <slug>``. pyfars is expected to be on PATH —
    the polity's nix-flake devshell provisions it; running outside
    a devshell that lacks pyfars on PATH will fail loudly.

    The shim contains no record-specific text — adding a new hook
    record changes only the substrate file and the settings.json wiring,
    not the shim. This eliminates the prior shell-injection surface
    (record content interpolated into a python heredoc) entirely;
    record content is loaded by the python dispatcher at runtime.
    """
    return (
        "#!/usr/bin/env bash\n"
        "# Generated by PyFARS `claude-code-hooks` harness — DO NOT HAND-EDIT.\n"
        "# Single dispatcher shim: settings.json wires every hook command at\n"
        "# this script with the hook slug as positional arg 1. Re-run\n"
        "# `pyfars install-harness claude-code-hooks` to regenerate.\n"
        "set -euo pipefail\n"
        'ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"\n'
        'export CLAUDE_PROJECT_DIR="$ROOT"\n'
        'exec pyfars hook-dispatch "$1"\n'
    )


def _build_hooks_settings_block(hooks: list[dict],
                                dispatcher_relative_to_root: str) -> dict:
    """Build the ``hooks`` block for `.claude/settings.json`.

    ``dispatcher_relative_to_root`` is the path of the single dispatcher
    shim, *relative to the repo root* (Claude Code's
    ``$CLAUDE_PROJECT_DIR``) — e.g.
    ``".claude/hooks/_pyfars-dispatch.sh"`` for a default install. The
    runtime resolves commands against ``$CLAUDE_PROJECT_DIR``, not the
    .claude/ install target, so the leading ``.claude/`` is required.

    Every per-record bucket points at the single dispatcher with the
    hook slug appended as positional arg 1 (``hook:<slug>`` form so the
    dispatcher can also be invoked manually with the same string).
    Groups by event then matcher within event so two PostToolUse hooks
    on different tools render as distinct buckets (matching the SDK's
    settings.json convention). Matcher key is omitted when the default
    ``.*`` is in use.
    """
    by_event: dict[str, list[dict]] = {}
    for h in hooks:
        by_event.setdefault(h["event"], []).append(h)
    block: dict[str, list[dict]] = {}
    for event, hs in by_event.items():
        by_matcher: dict[str, list[dict]] = {}
        for h in hs:
            by_matcher.setdefault(h["matcher"], []).append(h)
        buckets: list[dict] = []
        for matcher, mhs in by_matcher.items():
            entry: dict = {
                "hooks": [
                    {
                        "type": "command",
                        "command": (
                            f"$CLAUDE_PROJECT_DIR/{dispatcher_relative_to_root}"
                            f" hook:{h['slug']}"
                        ),
                    }
                    for h in mhs
                ],
            }
            if matcher != ".*":
                entry["matcher"] = matcher
            buckets.append(entry)
        block[event] = buckets
    return block


def _looks_like_prior_pyfars_hooks(block: object) -> bool:
    """Return true for a hooks block previously generated by this harness."""
    if not isinstance(block, dict) or not block:
        return False
    commands: list[str] = []
    for event_entries in block.values():
        if not isinstance(event_entries, list):
            return False
        for event_entry in event_entries:
            if not isinstance(event_entry, dict):
                return False
            hooks = event_entry.get("hooks")
            if not isinstance(hooks, list):
                return False
            for hook in hooks:
                if not isinstance(hook, dict):
                    return False
                command = hook.get("command")
                if isinstance(command, str):
                    commands.append(command)
    return bool(commands) and all(
        "/_fars-dispatch.sh " in command
        or "/_pyfars-dispatch.sh " in command
        for command in commands
    )


def _install_claude_code_hooks(*, root: Path, target: Path, prefix: str,
                               dry_run: bool,
                               ) -> tuple[int, Path | None, list[dict]]:
    """Install the claude-code-hooks harness.

    Projects every ``operations/engineering/hooks/<slug>.md`` record into
    a ``.claude/hooks/<slug>.sh`` script plus an entry in
    ``.claude/settings.json`` under ``hooks.<event>``. Preserves any
    pre-existing settings.json keys outside ``hooks`` so coexisting tools
    (permissions, env, etc.) keep working. Records the prior ``hooks``
    block on the manifest so uninstall can restore it exactly.
    """
    del prefix  # unused
    hooks = _walk_hook_records(root)
    if not hooks:
        raise HarnessInstallError(
            "no hook records found under operations/engineering/hooks/ "
            "(records need `kind: hook` frontmatter)"
        )

    out_dir = target / "hooks"
    settings_path = target / "settings.json"
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # Single dispatcher shim — written once regardless of hook count.
    # Adding/removing hook records changes only settings.json wiring,
    # not the shim itself, so install is O(1) in shim-write cost and
    # there is no per-record code-injection surface (records load at
    # dispatch-time inside python, not by string-interpolation into
    # bash heredocs).
    dispatcher_text = _dispatcher_script_text()
    dispatcher_path = out_dir / _DISPATCHER_SHIM_NAME
    if not dry_run:
        dispatcher_path.write_text(dispatcher_text, encoding="utf-8")
        dispatcher_path.chmod(0o755)

    entries: list[dict] = []
    for h in hooks:
        entry: dict = {
            "slug": h["slug"],
            "event": h["event"],
            "matcher": h["matcher"],
            "operator": h["operator"],
            "truth": h["truth"],
            "evidence": h["evidence"],
            "channel": h["channel"],
            "on-truncation": h["on-truncation"],
            "source-path": str(h["source"].relative_to(root)),
        }
        if h["patterns"]:
            # Manifest carries the labels (audit-friendly) but not the
            # compiled regex objects (not JSON). The substrate record
            # remains the source of truth for the regex itself.
            entry["patterns"] = [
                {"regex": p["regex"], "label": p["label"]}
                for p in h["patterns"]
            ]
        entries.append(entry)

    # Merge into settings.json without clobbering peer keys. Capture the
    # prior `hooks` block so uninstall can restore it. Refuse to install
    # over a malformed/non-dict settings.json — silently overwriting
    # would destroy the operator's peer keys (permissions, env, …) and
    # break the "preserve peer keys" contract this harness advertises.
    prior_settings: dict = {}
    prior_hooks: object = None
    if settings_path.is_file():
        try:
            raw = settings_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise HarnessInstallError(
                f"could not read existing {settings_path}: {exc}"
            ) from exc
        try:
            loaded = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HarnessInstallError(
                f"existing {settings_path} is not valid JSON ({exc}); "
                f"refusing to overwrite — fix or remove it first"
            ) from exc
        if not isinstance(loaded, dict):
            raise HarnessInstallError(
                f"existing {settings_path} is JSON but not an object "
                f"(found {type(loaded).__name__}); refusing to overwrite"
            )
        prior_settings = loaded
        prior_hooks = loaded.get("hooks")
        if _looks_like_prior_pyfars_hooks(prior_hooks):
            prior_hooks = None
    dispatcher_rel_to_root = (
        str(dispatcher_path.relative_to(root))
        if dispatcher_path.is_relative_to(root)
        else str(dispatcher_path)
    )
    new_hooks_block = _build_hooks_settings_block(hooks, dispatcher_rel_to_root)
    new_settings = dict(prior_settings)
    new_settings["hooks"] = new_hooks_block
    if not dry_run:
        settings_path.write_text(
            json.dumps(new_settings, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "claude-code-hooks.json"
    manifest = {
        "harness": "claude-code-hooks",
        "installed-at": generated_at,
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "dispatcher-path": dispatcher_rel_to_root,
        "dispatcher-bytes": len(dispatcher_text.encode("utf-8")),
        "hooks": entries,
        "settings-path": str(settings_path.relative_to(root))
                         if settings_path.is_relative_to(root)
                         else str(settings_path),
        "prior-hooks-block": prior_hooks,
        "context-summary": {
            "hook-count": len(entries),
            "events": sorted({h["event"] for h in hooks}),
            "channels": sorted({h["channel"] for h in hooks}),
            "sentinel-hook-count": sum(1 for h in hooks if h["patterns"]),
        },
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_claude_code_hooks(*, root: Path, target: Path,
                                 dry_run: bool,
                                 ) -> tuple[int, Path | None]:
    """Uninstall the claude-code-hooks harness via its manifest.

    Removes each generated script (with the same containment check used
    by the claude-code uninstaller — refuses to follow ``..`` segments
    out of the repo root). Restores the prior ``hooks`` block in
    ``.claude/settings.json`` if one was captured at install; otherwise
    removes the ``hooks`` key. If settings.json then has no keys left,
    the file itself is removed. The hooks/ directory is removed if
    empty.
    """
    del target
    manifest_path = root / ".fars/harness-manifests/claude-code-hooks.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "claude-code-hooks":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'claude-code-hooks'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    out_dir: Path | None = None
    root_resolved = root.resolve()

    def _safe_remove(rel_path: str) -> bool:
        """Resolve manifest path with containment check; remove if present."""
        nonlocal out_dir
        full = (root / rel_path).resolve()
        try:
            full.relative_to(root_resolved)
        except ValueError:
            print(f"refusing to remove {full} — outside root "
                  f"{root_resolved} (manifest tampered?)", file=sys.stderr)
            return False
        out_dir = full.parent
        if full.is_file():
            if not dry_run:
                full.unlink()
            return True
        return False

    # New-format manifest: single dispatcher shim. Old-format manifest
    # (per-record `out-path` per hook entry) is still recognized so an
    # operator who installed under the prior layout can uninstall after
    # upgrading the harness without manual cleanup.
    dispatcher_rel = manifest.get("dispatcher-path")
    if dispatcher_rel:
        if _safe_remove(dispatcher_rel):
            removed += 1
    for entry in manifest.get("hooks", []):
        legacy_out = entry.get("out-path")
        if legacy_out and _safe_remove(legacy_out):
            removed += 1
    settings_rel = manifest.get("settings-path")
    if settings_rel:
        settings_path = (root / settings_rel).resolve()
        try:
            settings_path.relative_to(root_resolved)
            settings_ok = True
        except ValueError:
            settings_ok = False
        if settings_ok and settings_path.is_file():
            try:
                cur = json.loads(settings_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as exc:
                # Don't silently overwrite a malformed settings.json on
                # uninstall either — surface to the operator so they
                # can decide. Manifest is *not* removed in this case
                # (the raise happens before `manifest_path.unlink()`
                # below) so the uninstall can be retried after they
                # fix it.
                raise HarnessInstallError(
                    f"existing {settings_path} is unreadable ({exc}); "
                    f"refusing to overwrite. Fix or remove it, then "
                    f"re-run --uninstall."
                ) from exc
            if not isinstance(cur, dict):
                # Symmetric with the install-side check: refuse to
                # operate on a settings.json that isn't a JSON object.
                # Manifest preserved for retry after operator fixes it.
                raise HarnessInstallError(
                    f"existing {settings_path} is JSON but not an "
                    f"object (found {type(cur).__name__}); refusing to "
                    f"overwrite. Fix or remove it, then re-run "
                    f"--uninstall."
                )
            if isinstance(cur, dict):
                if manifest.get("prior-hooks-block") is not None:
                    cur["hooks"] = manifest["prior-hooks-block"]
                else:
                    cur.pop("hooks", None)
                if not dry_run:
                    if cur:
                        settings_path.write_text(
                            json.dumps(cur, indent=2, ensure_ascii=False)
                            + "\n",
                            encoding="utf-8",
                        )
                    else:
                        settings_path.unlink()
    if out_dir and out_dir.is_dir() and not any(out_dir.iterdir()):
        if not dry_run:
            out_dir.rmdir()
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- cline-workflows harness ----------
#
# Cline (https://github.com/cline/cline) reads `.clinerules/workflows/*.md`
# as runnable, agent-executable procedures. Our substrate already carries
# `kind: runbook` records under `operations/engineering/runbooks/` —
# multi-step procedures composing one or more skill packs. This harness
# projects each runbook into a cline workflow, with a per-step witness
# protocol baked into the projection: after each numbered step the
# workflow instructs cline to invoke `.fars/cline-witness.sh <runbook>
# <step-N> [truth] [evidence]`, which appends a bilattice-valued
# dispatch witness to the FARS event log. A workflow execution becomes
# a chain of dispatch witnesses; `pyfars ledger tally --channel dispatch
# --origin cline-workflow:<slug>` reads the chain and tells you which
# steps held under truth-weighting vs evidence-weighting.

def _walk_runbook_records(root: Path) -> list[dict]:
    """Walk ``operations/engineering/runbooks/`` for runbook records.

    Validates the body has a ``## Steps`` section with at least one
    numbered step (``### N. ...``) so we never project a degenerate
    workflow into a runtime that would silently accept it.
    """
    out: list[dict] = []
    rroot = root / "operations/engineering/runbooks"
    if not rroot.is_dir():
        return out
    # Accept the canonical `### N. headline` plus tolerated variants:
    # `### N) headline`, `### N . headline`, and up to three spaces of
    # leading indent (CommonMark allows up to 3 before an ATX heading
    # without becoming a code block). This is broader than the strict
    # form while still rejecting genuine garbage like prose paragraphs.
    step_re = re.compile(
        r"^[ ]{0,3}###\s+(\d+)\s*[.)]\s+(.+?)\s*$", re.MULTILINE,
    )
    for p in sorted(rroot.glob("*.md")):
        if p.name == "_index.md":
            continue
        meta, body = parse_fm(p.read_text(encoding="utf-8"))
        if not meta or meta.get("kind") != "runbook":
            continue
        rel = p.relative_to(root)
        steps = [(int(m.group(1)), m.group(2)) for m in step_re.finditer(body)]
        if not steps:
            raise HarnessInstallError(
                f"runbook {rel}: body has no numbered steps "
                f"(expected `### N. headline` or `### N) headline` "
                f"under `## Steps`)"
            )
        out.append({
            "slug": p.stem,
            "title": str(meta.get("title", p.stem)),
            "description": str(meta.get("description", "")),
            "requires-captain-confirmation": bool(
                meta.get("requires-captain-confirmation", False)
            ),
            "step-count": len(steps),
            "steps": steps,  # [(n, headline), ...]
            "source": p,
            "body": body,  # post-frontmatter, used by the projector
        })
    return out


def _cline_witness_helper_text() -> str:
    """The shared per-step witness emitter the projected workflows call.

    Lives at ``.fars/cline-witness.sh``. Takes positional args
    ``<runbook-slug> <step-label> [truth] [evidence]`` (truth and
    evidence default to 1.0 — observed-success / artifact-in-hand).
    Shells out to ``pyfars witness`` to construct and append a
    bilattice-valued dispatch ``Witness`` to the event log; relies on
    ``pyfars`` being on ``PATH`` via the polity's nix-flake devshell
    rather than importing pyfars internals from any specific location.
    Generated; do not hand-edit.
    """
    return (
        "#!/usr/bin/env bash\n"
        "# Generated by PyFARS `cline-workflows` harness — DO NOT HAND-EDIT.\n"
        "# Re-run `pyfars install-harness cline-workflows` to refresh.\n"
        "#\n"
        "# Usage: cline-witness.sh <runbook-slug> <step-label> "
        "[truth=1.0] [evidence=1.0]\n"
        "set -euo pipefail\n"
        'if [[ $# -lt 2 ]]; then\n'
        '  echo "usage: cline-witness.sh <runbook-slug> <step-label> '
        '[truth=1.0] [evidence=1.0]" >&2\n'
        '  exit 64\n'
        'fi\n'
        'RUNBOOK="$1"; STEP="$2"; TRUTH="${3:-1.0}"; EVIDENCE="${4:-1.0}"\n'
        'exec pyfars witness \\\n'
        '  --operator "cline_runbook_step:$RUNBOOK" \\\n'
        '  --target   "cline-workflow:$RUNBOOK" \\\n'
        '  --channel  dispatch \\\n'
        '  --origin   "cline-workflow:$RUNBOOK" \\\n'
        '  --truth    "$TRUTH" \\\n'
        '  --evidence "$EVIDENCE" \\\n'
        '  --detail   "step=$STEP" \\\n'
        '  --detail   "runbook=$RUNBOOK"\n'
    )


def _cline_workflow_text(*, root: Path, runbook: dict) -> str:
    """Project one runbook into a cline workflow markdown file.

    Prepends a generated banner + the bilattice-witness preamble that
    instructs cline to call ``.fars/cline-witness.sh`` after each
    numbered step. Then inlines the runbook body (post-frontmatter)
    unchanged so the substrate prose remains the source of truth.
    """
    src_rel = runbook["source"].relative_to(root)
    # The walker already invoked parse_fm and cached the post-frontmatter
    # body — reuse it so we don't re-implement frontmatter stripping with
    # a fragile string match (which would mis-handle bodies that contain
    # their own `\n---\n` thematic breaks).
    body = runbook["body"].lstrip("\n")

    confirm_line = (
        "\n> **Captain confirmation required** — this runbook is marked "
        "`requires-captain-confirmation: true`. Pause before any "
        "irreversible step and wait for explicit approval.\n"
        if runbook["requires-captain-confirmation"] else ""
    )
    preamble = (
        f"<!-- Generated by PyFARS `cline-workflows` harness — "
        f"DO NOT HAND-EDIT. -->\n"
        f"<!-- Source: {src_rel} -->\n"
        f"<!-- Re-run `pyfars install-harness cline-workflows` to refresh. -->\n"
        "\n"
        f"# {runbook['title']}\n"
        "\n"
        f"_{runbook['description']}_\n"
        "\n"
        "## Per-step witness protocol\n"
        "\n"
        "After **every** numbered step below, run:\n"
        "\n"
        "```bash\n"
        f"bash .fars/cline-witness.sh {runbook['slug']} step-<N> "
        "<truth> <evidence>\n"
        "```\n"
        "\n"
        "Bilattice axes:\n"
        "\n"
        "- `truth=1.0` if the step's acceptance condition was met; "
        "`0.0` if it failed; `0.5` if partial. The runtime reads this "
        "as the predicate's truth value.\n"
        "- `evidence=1.0` if the step's artifact is in hand "
        "(file written, command exited 0, output captured); `0.5` if "
        "the step ran but the artifact is unverified; `0.0` if you "
        "have no observation yet.\n"
        "\n"
        "Each call appends a dispatch witness "
        f"(`origin: cline-workflow:{runbook['slug']}`) to "
        "`.fars/event-log/<date>.jsonl`. After the workflow completes, "
        f"`pyfars ledger tally --origin cline-workflow:{runbook['slug']}` "
        "reads the chain and projects truth- vs evidence-weighted views "
        "of the run.\n"
        f"{confirm_line}\n"
        "---\n"
        "\n"
    )
    footer = (
        "\n---\n"
        "\n"
        "## Substrate source\n"
        "\n"
        f"This workflow is a projection of [`{src_rel}`](../../{src_rel}). "
        "The substrate runbook is canonical; edit it there, then re-run "
        "`pyfars install-harness cline-workflows` to refresh this projection.\n"
    )
    return preamble + body.rstrip() + "\n" + footer


def _install_cline_workflows(*, root: Path, target: Path, prefix: str,
                             dry_run: bool,
                             ) -> tuple[int, Path | None, list[dict]]:
    """Install the cline-workflows harness.

    Projects every ``kind: runbook`` record under
    ``operations/engineering/runbooks/`` into a cline workflow at
    ``.clinerules/workflows/<slug>.md``, plus the shared per-step
    witness emitter at ``.fars/cline-witness.sh``. The manifest at
    ``.fars/harness-manifests/cline-workflows.json`` records every
    written file (with byte size + step count) so ``--uninstall``
    removes exactly what was projected.
    """
    del prefix  # unused
    runbooks = _walk_runbook_records(root)
    if not runbooks:
        raise HarnessInstallError(
            "no runbook records found under operations/engineering/"
            "runbooks/ (records need `kind: runbook` frontmatter)"
        )

    workflows_dir = target / "workflows"
    helper_path = root / ".fars/cline-witness.sh"
    if not dry_run:
        workflows_dir.mkdir(parents=True, exist_ok=True)
        helper_path.parent.mkdir(parents=True, exist_ok=True)

    helper_text = _cline_witness_helper_text()
    if not dry_run:
        helper_path.write_text(helper_text, encoding="utf-8")
        helper_path.chmod(0o755)

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    entries: list[dict] = []
    for r in runbooks:
        text = _cline_workflow_text(root=root, runbook=r)
        out_path = workflows_dir / f"{r['slug']}.md"
        if not dry_run:
            out_path.write_text(text, encoding="utf-8")
        entries.append({
            "slug": r["slug"],
            "title": r["title"],
            "step-count": r["step-count"],
            "requires-captain-confirmation": r["requires-captain-confirmation"],
            "out-path": str(out_path.relative_to(root))
                       if out_path.is_relative_to(root) else str(out_path),
            "source-path": str(r["source"].relative_to(root)),
            "bytes": len(text.encode("utf-8")),
        })

    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "cline-workflows.json"
    manifest = {
        "harness": "cline-workflows",
        "installed-at": generated_at,
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "workflows": entries,
        "helper-path": str(helper_path.relative_to(root))
                       if helper_path.is_relative_to(root)
                       else str(helper_path),
        "helper-bytes": len(helper_text.encode("utf-8")),
        "context-summary": {
            "workflow-count": len(entries),
            "total-steps": sum(e["step-count"] for e in entries),
        },
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_cline_workflows(*, root: Path, target: Path,
                               dry_run: bool,
                               ) -> tuple[int, Path | None]:
    """Uninstall the cline-workflows harness via its manifest.

    Removes each generated workflow file and the shared helper script,
    with the same containment check the other uninstallers use
    (refuses to follow ``..`` segments out of the repo root). The
    workflows/ directory is removed if empty after the sweep.
    """
    del target
    manifest_path = root / ".fars/harness-manifests/cline-workflows.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "cline-workflows":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'cline-workflows'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    out_dir: Path | None = None
    root_resolved = root.resolve()
    for entry in manifest.get("workflows", []):
        out_path = (root / entry["out-path"]).resolve()
        try:
            out_path.relative_to(root_resolved)
        except ValueError:
            print(f"refusing to remove {out_path} — outside root "
                  f"{root_resolved} (manifest tampered?)", file=sys.stderr)
            continue
        out_dir = out_path.parent
        if out_path.is_file():
            if not dry_run:
                out_path.unlink()
            removed += 1
    helper_rel = manifest.get("helper-path")
    if helper_rel:
        helper_path = (root / helper_rel).resolve()
        try:
            helper_path.relative_to(root_resolved)
            if helper_path.is_file():
                if not dry_run:
                    helper_path.unlink()
                removed += 1
        except ValueError:
            print(f"refusing to remove {helper_path} — outside root "
                  f"{root_resolved} (manifest tampered?)", file=sys.stderr)
    if out_dir and out_dir.is_dir() and not any(out_dir.iterdir()):
        if not dry_run:
            out_dir.rmdir()
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- claude-agent-sdk plugin envelope ----------
#
# The claude-agent-sdk-python loader (ClaudeAgentOptions(plugins=[{type:
# 'local', path: '...'}])) reads a plugin directory of the shape:
#
#   <plugin>/.claude-plugin/plugin.json    # name, description, version
#   <plugin>/commands/<verb>.md            # one markdown file per slash
#                                          # command (frontmatter: description,
#                                          # allowed-tools; body: prompt)
#
# This harness wraps every registered FARS verb (the keys of
# `pyfars.cli.__main__.VERB_MODULES`) as a slash command in such a plugin.
# Each command's body is a small prompt that tells the runtime to
# invoke `pyfars <verb> $ARGUMENTS`. The verb's existing
# substrate-side machinery — `EventLog.append(Witness(...))` inside
# whichever channel that verb owns — fires unchanged. The plugin is
# pure envelope: same verbs, same witnesses, new runtime surface.

def _walk_verb_records(*, verb_filter: set[str] | None = None) -> list[dict]:
    """Enumerate every FARS verb registered in ``__main__.VERB_MODULES``.

    For each verb we read SPEC if the verb has migrated to the
    declarative shape; otherwise we fall back to the legacy
    ``cli.help._HELP`` table for the description. A verb that is in
    neither source is skipped with a warning rather than erroring,
    so adding a new verb without help/SPEC doesn't break a refresh.

    ``verb_filter`` lets tests project a subset deterministically,
    avoiding the cost of importing 30+ verb modules per test.
    """
    from pyfars.cli import help as _help_mod
    from pyfars.cli.__main__ import VERB_MODULES
    out: list[dict] = []
    for verb in sorted(VERB_MODULES):
        if verb_filter is not None and verb not in verb_filter:
            continue
        spec = _help_mod._spec_for(verb)
        if spec is not None:
            description = spec.description
            example = spec.example or f"pyfars {verb}"
            params = [
                {
                    "name": p.name,
                    "kind": p.kind,
                    "required": p.required,
                    "description": p.description,
                }
                for p in spec.parameters
            ]
        else:
            entry = _help_mod._HELP.get(verb)
            if entry is None:
                print(f"plugin: skipping verb {verb!r} — no SPEC and no "
                      f"_HELP entry", file=sys.stderr)
                continue
            description, example, _notes = entry
            params = []
        out.append({
            "verb": verb,
            "module": VERB_MODULES[verb],
            "description": description,
            "example": example,
            "parameters": params,
            "has-spec": spec is not None,
        })
    return out


def _claude_plugin_manifest_text(*, verb_count: int) -> str:
    """Render the ``.claude-plugin/plugin.json`` manifest body."""
    return json.dumps({
        "name": "pyfars-substrate",
        "description": (
            f"FARS substrate verbs as Claude Code slash commands "
            f"({verb_count} verbs). Each command invokes a FARS verb; "
            f"the verb's substrate-side machinery appends a "
            f"bilattice-valued witness to the event log on the "
            f"verb's own channel."
        ),
        "version": "0.1.0",
        "author": {"name": "The 561 Group / FARS"},
        "homepage": (
            "https://github.com/emsenn/pyfars/tree/main/"
            "src/pyfars/harnesses/claude-agent-sdk-plugin"
        ),
    }, indent=2, ensure_ascii=False) + "\n"


def _claude_plugin_command_text(*, verb: dict) -> str:
    """Render one ``commands/<verb>.md`` body for the plugin.

    Frontmatter:
      - ``description`` — surfaces in claude-code's slash-command picker.
      - ``allowed-tools`` — restricts the command to invoking exactly
        ``pyfars <verb> ...`` so the slash command can't be repurposed
        as a general shell.

    Body lists parameters (when SPEC is present), an example, and the
    invocation block. Generated; do not hand-edit.
    """
    name = verb["verb"]
    desc = verb["description"].replace('"', '\\"')
    fm = (
        "---\n"
        f"description: \"{desc}\"\n"
        f"allowed-tools: Bash(pyfars {name}:*)\n"
        "---\n"
    )
    parts = [
        fm,
        "",
        f"# `/pyfars-{name}` — PyFARS `{name}` verb",
        "",
        f"_{verb['description']}_",
        "",
        "<!-- Generated by PyFARS `claude-agent-sdk-plugin` harness — "
        "DO NOT HAND-EDIT. -->",
        "<!-- Re-run `pyfars install-harness claude-agent-sdk-plugin` "
        "to refresh. -->",
        "",
    ]
    if verb["parameters"]:
        parts.append("## Parameters")
        parts.append("")
        for p in verb["parameters"]:
            tag = "required" if p["required"] else "optional"
            parts.append(
                f"- `{p['name']}` ({p['kind']}, {tag}) — "
                f"{p['description'] or '(no description)'}"
            )
        parts.append("")
    parts.append("## Example")
    parts.append("")
    parts.append("```bash")
    parts.append(verb["example"])
    parts.append("```")
    parts.append("")
    parts.append("## Invocation")
    parts.append("")
    parts.append(
        "Run the verb with the user's arguments and surface its "
        "stdout/stderr to the user:"
    )
    parts.append("")
    parts.append("```bash")
    parts.append(f"pyfars {name} $ARGUMENTS")
    parts.append("```")
    parts.append("")
    parts.append(
        f"This invocation routes through the substrate's runtime — if "
        f"the `{name}` verb mutates substrate state or asserts an "
        f"observation, it will append a bilattice-valued `Witness` to "
        f"`.fars/event-log/<date>.jsonl` on its own channel. The plugin "
        f"is pure envelope; the witness chain is the same one a direct "
        f"`pyfars {name}` invocation would produce."
    )
    parts.append("")
    return "\n".join(parts)


def _install_claude_agent_sdk_plugin(
        *, root: Path, target: Path, prefix: str, dry_run: bool,
        ) -> tuple[int, Path | None, list[dict]]:
    """Install the claude-agent-sdk-plugin harness.

    Writes ``<target>/.claude-plugin/plugin.json`` plus one
    ``<target>/commands/<verb>.md`` per registered FARS verb. The
    manifest at ``.fars/harness-manifests/claude-agent-sdk-plugin.json``
    records every written file (verb, byte size, has-spec flag) so
    ``--uninstall`` removes exactly that set with the same containment
    check the sister harnesses use.
    """
    del prefix  # unused
    # PYFARS_PLUGIN_VERB_FILTER is a test-only knob: honored ONLY when
    # pytest is running this process (PYTEST_CURRENT_TEST is set by
    # pytest for the duration of every test). This prevents ambient
    # environment from silently producing a partial production install.
    verb_filter: set[str] | None = None
    if os.environ.get("PYTEST_CURRENT_TEST"):
        verb_filter_env = os.environ.get("PYFARS_PLUGIN_VERB_FILTER")
        if verb_filter_env:
            verb_filter = set(verb_filter_env.split(","))
    verbs = _walk_verb_records(verb_filter=verb_filter)
    if not verbs:
        raise HarnessInstallError(
            "no FARS verbs registered in pyfars.cli.__main__.VERB_MODULES "
            "(or all filtered out by test-only PYFARS_PLUGIN_VERB_FILTER)"
        )

    # Snapshot semantics: before writing the new projection, prune the
    # prior manifest's files so a verb that has been removed/renamed
    # since last install does not leave a stale command file behind.
    # Uninstall is containment-checked; if it fails (corrupt manifest,
    # tampered paths) we surface the error rather than silently
    # accumulate drift.
    prior_manifest = (root /
                      ".fars/harness-manifests/claude-agent-sdk-plugin.json")
    if prior_manifest.is_file() and not dry_run:
        _uninstall_claude_agent_sdk_plugin(
            root=root, target=target, dry_run=False)

    plugin_meta_dir = target / ".claude-plugin"
    commands_dir = target / "commands"
    if not dry_run:
        plugin_meta_dir.mkdir(parents=True, exist_ok=True)
        commands_dir.mkdir(parents=True, exist_ok=True)

    plugin_json = _claude_plugin_manifest_text(verb_count=len(verbs))
    plugin_json_path = plugin_meta_dir / "plugin.json"
    if not dry_run:
        plugin_json_path.write_text(plugin_json, encoding="utf-8")

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    entries: list[dict] = []
    for v in verbs:
        text = _claude_plugin_command_text(verb=v)
        out_path = commands_dir / f"{v['verb']}.md"
        if not dry_run:
            out_path.write_text(text, encoding="utf-8")
        entries.append({
            "verb": v["verb"],
            "module": v["module"],
            "has-spec": v["has-spec"],
            "param-count": len(v["parameters"]),
            "out-path": str(out_path.relative_to(root))
                       if out_path.is_relative_to(root) else str(out_path),
            "bytes": len(text.encode("utf-8")),
        })

    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "claude-agent-sdk-plugin.json"
    manifest = {
        "harness": "claude-agent-sdk-plugin",
        "installed-at": generated_at,
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "plugin-json-path": str(plugin_json_path.relative_to(root))
                            if plugin_json_path.is_relative_to(root)
                            else str(plugin_json_path),
        "plugin-json-bytes": len(plugin_json.encode("utf-8")),
        "commands": entries,
        "context-summary": {
            "verb-count": len(entries),
            "spec-driven-count": sum(1 for e in entries if e["has-spec"]),
        },
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_claude_agent_sdk_plugin(
        *, root: Path, target: Path, dry_run: bool,
        ) -> tuple[int, Path | None]:
    """Uninstall the claude-agent-sdk-plugin harness via its manifest."""
    del target
    manifest_path = (root /
                     ".fars/harness-manifests/claude-agent-sdk-plugin.json")
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "claude-agent-sdk-plugin":
        print(f"manifest is for harness '{manifest.get('harness')}', not "
              f"'claude-agent-sdk-plugin'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    commands_dir: Path | None = None
    plugin_meta_dir: Path | None = None
    root_resolved = root.resolve()

    def _safe_unlink(rel: str | None) -> bool:
        if not rel:
            return False
        path = (root / rel).resolve()
        try:
            path.relative_to(root_resolved)
        except ValueError:
            print(f"refusing to remove {path} — outside root "
                  f"{root_resolved} (manifest tampered?)", file=sys.stderr)
            return False
        if path.is_file():
            if not dry_run:
                path.unlink()
            return True
        return False

    for entry in manifest.get("commands", []):
        if _safe_unlink(entry.get("out-path")):
            removed += 1
            commands_dir = (root / entry["out-path"]).resolve().parent
    if _safe_unlink(manifest.get("plugin-json-path")):
        removed += 1
        plugin_meta_dir = (root / manifest["plugin-json-path"]
                           ).resolve().parent

    for d in (commands_dir, plugin_meta_dir):
        if d and d.is_dir() and not any(d.iterdir()):
            if not dry_run:
                d.rmdir()
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- nix-flake harness ----------
#
# A deployment-substrate harness in the rough-first-cut mold: emits a single
# flake.nix at the repo root from a Jinja template plus the polity record.
# Predates the FARS "Harness surfaces & interfacers" spec section being
# drafted; works for the self-hosted-Unix swarm-participation class only.

_NIX_FLAKE_FILES = (
    ("flake.nix", "flake.nix.j2"),
)


def _resolve_polity_computer_systems_for_flake(root: Path, polity: dict) -> list[dict]:
    """Enumerate active computer systems that have declared a ``nix-system``.

    Reads the polity's ``computer-systems`` list and resolves each to its
    record under ``operations/command/group/computer-systems/``. Records
    without ``nix-system`` are dropped — only systems that explicitly say
    which Nix system they target participate in the flake's per-system
    outputs.

    The flake is targeted at *digital* hosts; ships (which can include
    non-digital substrate-resident operational units like the RSC
    Quiescent) are not enumerated here. A ship that happens to be
    digital should also be registered as a computer system.
    """
    out: list[dict] = []
    for ref in polity.get("computer-systems") or []:
        slug = _resolve_personnel_slug(ref)
        if not slug:
            continue
        p = root / "operations/command/group/computer-systems" / f"{slug}.md"
        fm = _read_fm(p)
        if not fm:
            continue
        if fm.get("status") not in (None, "active"):
            continue
        nix_system = fm.get("nix-system")
        if not nix_system:
            continue
        out.append({
            "slug": slug,
            "title": fm.get("title") or slug,
            "description": fm.get("description") or "",
            "nix_system": nix_system,
            "role": fm.get("role") or "generic",
            "primary_user": _resolve_personnel_slug(fm.get("primary-user")),
        })
    return out


def _build_nix_flake_context(root: Path) -> dict:
    """Substrate-derived context for the nix-flake harness."""
    polity = _resolve_polity(root)
    computer_systems = _resolve_polity_computer_systems_for_flake(root, polity)
    return {
        "polity": polity,
        "computer_systems": computer_systems,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generation_command": "pyfars install-harness nix-flake",
    }


def _install_nix_flake(*, root: Path, target: Path, prefix: str,
                       dry_run: bool) -> tuple[int, Path | None, list[dict]]:
    """Install the nix-flake harness.

    Renders the package-shipped ``flake.nix.j2`` template against
    substrate-derived context and writes the result to ``target/flake.nix``
    (target is the repo root by default).
    """
    del prefix  # unused for this harness
    try:
        import jinja2  # noqa: F401
    except ImportError as exc:
        raise HarnessInstallError(
            "nix-flake harness requires jinja2 "
            "(enter the Nix devshell or rebuild the PyFARS package)"
        ) from exc

    from jinja2 import Environment, StrictUndefined
    from jinja2.exceptions import TemplateError
    from pyfars.harnesses import harness_template_loader
    env = Environment(
        loader=harness_template_loader("nix-flake"),
        keep_trailing_newline=True,
        undefined=StrictUndefined,
    )
    context = _build_nix_flake_context(root)

    target.mkdir(parents=True, exist_ok=True) if not dry_run else None

    entries: list[dict] = []
    for filename, template_name in _NIX_FLAKE_FILES:
        try:
            rendered = env.get_template(template_name).render(**context)
        except TemplateError as exc:
            raise HarnessInstallError(
                f"failed to render {template_name}: {exc}"
            ) from exc
        out_path = target / filename
        if not dry_run:
            out_path.write_text(rendered, encoding="utf-8")
        entries.append({
            "filename": filename,
            "out-path": str(out_path.relative_to(root))
                       if out_path.is_relative_to(root) else str(out_path),
            "template-source": f"pyfars.harnesses:nix-flake/templates/{template_name}",
            "bytes": len(rendered.encode("utf-8")),
        })

    manifest_dir = root / ".fars/harness-manifests"
    manifest_path = manifest_dir / "nix-flake.json"
    manifest = {
        "harness": "nix-flake",
        "installed-at": datetime.now(timezone.utc).isoformat(),
        "target": str(target.relative_to(root))
                  if target.is_relative_to(root) else str(target),
        "files": entries,
        "context-summary": {
            "polity": (context.get("polity") or {}).get("title"),
        },
    }
    if not dry_run:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    return len(entries), manifest_path, entries


def _uninstall_nix_flake(*, root: Path, target: Path,
                         dry_run: bool) -> tuple[int, Path | None]:
    """Uninstall via the manifest. Returns ``(count_removed, manifest_path)``."""
    del target
    manifest_path = root / ".fars/harness-manifests/nix-flake.json"
    if not manifest_path.is_file():
        print(f"no manifest at {manifest_path}; nothing to uninstall",
              file=sys.stderr)
        return 0, None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("harness") != "nix-flake":
        print(f"manifest is for harness '{manifest.get('harness')}', "
              f"not 'nix-flake'", file=sys.stderr)
        return 0, manifest_path
    removed = 0
    for entry in manifest.get("files", []):
        out_path = root / entry["out-path"]
        if out_path.is_file():
            if not dry_run:
                out_path.unlink()
            removed += 1
    if not dry_run:
        manifest_path.unlink()
    return removed, manifest_path


# ---------- run / main ----------

_HARNESS_DEFAULT_TARGET = {
    "replit": ".agents/skills",
    "repo-instructions": ".",
    "claude-code": ".claude",
    "claude-code-hooks": ".claude",
    "cline-workflows": ".clinerules",
    "claude-agent-sdk-plugin": ".claude/plugins/pyfars-substrate",
    "replit-config": ".fars/harness-manifests",
    "nix-flake": ".",
}

_INSTALLERS = {
    "replit": _install_replit,
    "repo-instructions": _install_repo_instructions,
    "claude-code": _install_claude_code,
    "claude-code-hooks": _install_claude_code_hooks,
    "cline-workflows": _install_cline_workflows,
    "claude-agent-sdk-plugin": _install_claude_agent_sdk_plugin,
    "replit-config": _install_replit_config,
    "nix-flake": _install_nix_flake,
}

_UNINSTALLERS = {
    "replit": _uninstall_replit,
    "repo-instructions": _uninstall_repo_instructions,
    "claude-code": _uninstall_claude_code,
    "claude-code-hooks": _uninstall_claude_code_hooks,
    "cline-workflows": _uninstall_cline_workflows,
    "claude-agent-sdk-plugin": _uninstall_claude_agent_sdk_plugin,
    "replit-config": _uninstall_replit_config,
    "nix-flake": _uninstall_nix_flake,
}


def run(harness: str | None = None, *, target: str | None = None,
        prefix: str = "pyfars-", root: str | Path = ".",
        dry_run: bool = False, uninstall: bool = False,
        all: bool = False) -> dict:
    """Install (or uninstall) a harness; or list available harnesses.

    With ``all=True``, iterate over every harness in ``_INSTALLERS`` (or
    ``_UNINSTALLERS``) using each harness's default target; ``target`` and
    positional ``harness`` are ignored.
    """
    root_dir = Path(root).resolve()

    # --all: iterate over every registered harness.
    if all:
        registry = _UNINSTALLERS if uninstall else _INSTALLERS
        results: list[dict] = []
        ok = True
        verb = "uninstall" if uninstall else "install"
        print(f"# pyfars install-harness --all — {verb} {len(registry)} harness(es)\n")
        for name in sorted(registry):
            print(f"--- {name} ---")
            r = run(name, target=None, prefix=prefix, root=root_dir,
                    dry_run=dry_run, uninstall=uninstall, all=False)
            results.append(r)
            if "error" in r:
                ok = False
            print()
        return {"all": True, "harnesses": results, "ok": ok}

    # No harness given: list available.
    if not harness:
        available = _list_available(root_dir)
        print(f"# pyfars install-harness — {len(available)} harness(es) available\n")
        if not available:
            print("(none — pyfars.harnesses package is empty)")
            return {"available": []}
        for h in available:
            tgt = h.get("target-default") or "(no default target)"
            print(f"  - **{h['name']}** — installs into `{tgt}`")
            print(f"      {h['title']}")
            print(f"      defined at: {h['_index']}")
        print("\nRun `pyfars install-harness <name>` to install one.")
        return {"available": available}

    if harness not in _INSTALLERS:
        print(f"unknown harness: {harness}. Available: "
              f"{', '.join(sorted(_INSTALLERS))}", file=sys.stderr)
        return {"error": f"unknown harness: {harness}"}

    target_path = Path(target) if target else Path(_HARNESS_DEFAULT_TARGET[harness])
    if not target_path.is_absolute():
        target_path = (root_dir / target_path).resolve()

    if uninstall:
        count, manifest_path = _UNINSTALLERS[harness](
            root=root_dir, target=target_path, dry_run=dry_run,
        )
        verb = "would remove" if dry_run else "removed"
        rel_manifest = (str(manifest_path.relative_to(root_dir))
                        if manifest_path and manifest_path.is_relative_to(root_dir)
                        else str(manifest_path) if manifest_path else "(none)")
        print(f"\nharness '{harness}': {verb} {count} shim(s) "
              f"(manifest: {rel_manifest})")
        return {"harness": harness, "removed": count, "manifest": rel_manifest,
                "dry-run": dry_run}

    try:
        count, manifest_path, entries = _INSTALLERS[harness](
            root=root_dir, target=target_path, prefix=prefix, dry_run=dry_run,
        )
    except HarnessInstallError as exc:
        print(f"harness '{harness}': install failed — {exc}", file=sys.stderr)
        return {"error": str(exc), "harness": harness}
    verb = "would write" if dry_run else "wrote"
    rel_manifest = (str(manifest_path.relative_to(root_dir))
                    if manifest_path and manifest_path.is_relative_to(root_dir)
                    else str(manifest_path) if manifest_path else "(none)")
    rel_target = (str(target_path.relative_to(root_dir))
                  if target_path.is_relative_to(root_dir)
                  else str(target_path))
    # Each installer's entries describe the materialized files in its own
    # shape. Project them onto a uniform (label, source) pair for the
    # summary so this print loop doesn't have to know harness specifics.
    def _summarize(e: dict) -> tuple[str, str]:
        if "shim-name" in e:                # replit
            return e["shim-name"], e["source-path"]
        if "template-source" in e:          # package-shipped template
            return e["out-path"], e["template-source"]
        if "template-path" in e:            # legacy substrate-side template
            return e["out-path"], e["template-path"]
        if "source-path" in e and "out-path" in e:  # claude-code
            return e["out-path"], e["source-path"]
        return str(e.get("name", "?")), str(e.get("source", "?"))

    noun = "shim" if harness == "replit" else "file"
    print(f"\nharness '{harness}': {verb} {count} {noun}(s) into "
          f"`{rel_target}/` (manifest: `{rel_manifest}`)")
    if entries[:5]:
        print(f"\nfirst few {noun}s:")
        for e in entries[:5]:
            label, source = _summarize(e)
            print(f"  - {label:50s}  ←  {source}")
        if len(entries) > 5:
            print(f"  ... and {len(entries) - 5} more")
    if not dry_run:
        if harness == "replit":
            print("\nReplit Agent will pick these up on the next session start.")
        elif harness == "repo-instructions":
            print("\nRoot-level instruction files refreshed from substrate. "
                  "Re-run any time substrate state changes.")
        elif harness == "claude-code":
            print("\nClaude Code subagents projected from substrate. "
                  "Re-run after editing any agent record.")
        elif harness == "replit-config":
            print("\nDesired-state .replit rendered from substrate. "
                  ".replit itself is sandbox-protected; apply via "
                  "configureWorkflow() / workspace UI / task agent. "
                  "See pyfars.harnesses:replit-config/_index.md.")
    return {"harness": harness, "installed": count, "manifest": rel_manifest,
            "dry-run": dry_run, "target": rel_target}


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(
        getattr(args, "harness", None),
        target=args.target,
        prefix=args.prefix,
        root=args.root,
        dry_run=args.dry_run,
        uninstall=args.uninstall,
        all=getattr(args, "all", False),
    )
    if "error" in result:
        return 1
    if result.get("all") and not result.get("ok", True):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
