"""Walk ``operations/engineering/skills/<pack>/<skill>/`` and parse SKILL.md.

A skill is a directory containing:

  ``SKILL.md``  — markdown with YAML frontmatter
  ``scripts/<skill>.sh``  — executable

The registry is purely read-only — it does not invoke skills.
``api.run_skill`` does that.

Stored paths are absolute (``Path.resolve()``) so callers can ``chdir`` /
pass any ``cwd`` to ``run_skill`` without breaking script lookup.
Frontmatter parsing reuses ``pyfars.substrate.parse.frontmatter.parse``
(real YAML via PyYAML) — block-list and nested-mapping constructs in
SKILL.md files are preserved.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pyfars.substrate.parse.frontmatter import FrontmatterError
from pyfars.substrate.parse.frontmatter import parse as _parse_md


@dataclass(frozen=True)
class SkillRecord:
    """One discovered skill."""
    slug: str  # the skill directory name (e.g. "draft-theorem")
    pack: str  # parent pack (e.g. "math")
    skill_md: Path  # absolute path to SKILL.md
    script: Path | None  # absolute path to scripts/<slug>.sh, if present
    frontmatter: dict[str, Any]
    description: str = ""

    def is_runnable(self) -> bool:
        return self.script is not None and self.script.is_file() and os.access(self.script, os.X_OK)


def discover(skills_root: str | Path = "operations/engineering/skills") -> list[SkillRecord]:
    """Return every discovered skill under skills_root.

    A skill is any directory that contains a ``SKILL.md``. The pack is the
    parent directory's name; if a SKILL.md sits directly under
    skills_root, the pack is ``""``.

    Paths in the returned records are absolute, so the result is safe to
    use across ``cwd`` changes.
    """
    root = Path(skills_root)
    if not root.is_dir():
        return []
    root = root.resolve()
    records: list[SkillRecord] = []
    for skill_md in sorted(root.glob("**/SKILL.md")):
        skill_md = skill_md.resolve()
        skill_dir = skill_md.parent
        slug = skill_dir.name
        pack_dir = skill_dir.parent
        pack = pack_dir.name if pack_dir != root else ""
        try:
            fm_dict, _ = _parse_md(skill_md.read_text(encoding="utf-8"))
        except (FrontmatterError, OSError):
            fm_dict = None
        fm = fm_dict if isinstance(fm_dict, dict) else {}
        # Script location: scripts/<slug>.sh
        script = (skill_dir / "scripts" / f"{slug}.sh").resolve()
        records.append(SkillRecord(
            slug=slug,
            pack=pack,
            skill_md=skill_md,
            script=script if script.is_file() else None,
            frontmatter=fm,
            description=str(fm.get("description", "")),
        ))
    return records


def find(slug: str, skills_root: str | Path = "operations/engineering/skills") -> SkillRecord | None:
    """Find a skill by slug. Returns the first match (slugs should be unique)."""
    for r in discover(skills_root):
        if r.slug == slug:
            return r
    return None
