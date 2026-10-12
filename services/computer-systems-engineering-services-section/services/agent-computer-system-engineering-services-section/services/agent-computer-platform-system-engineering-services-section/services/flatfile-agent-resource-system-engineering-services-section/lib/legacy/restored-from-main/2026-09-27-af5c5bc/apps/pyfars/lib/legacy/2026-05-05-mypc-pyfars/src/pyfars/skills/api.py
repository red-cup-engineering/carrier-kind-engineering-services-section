"""Public API for the skill registry — list, fetch, run.

This is the AOP-runtime surface: agents and the MCP server use these
functions to enumerate skills, read their definitions, and invoke them.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pyfars.skills.registry import SkillRecord, discover, find


# Re-export the dataclass under a friendlier alias.
Skill = SkillRecord


@dataclass(frozen=True)
class SkillRunResult:
    """Result of invoking a skill's script."""
    skill: str
    exit_code: int
    stdout: str
    stderr: str
    cmd: list[str]


def list_skills(skills_root: str | Path = "operations/engineering/skills") -> list[Skill]:
    """All discovered skills."""
    return discover(skills_root)


def get_skill(slug: str, skills_root: str | Path = "operations/engineering/skills") -> Skill | None:
    """Fetch a single skill by slug."""
    return find(slug, skills_root)


def run_skill(slug: str, args: list[str] | None = None,
              skills_root: str | Path = "operations/engineering/skills",
              cwd: str | Path = ".",
              timeout: float | None = 60.0) -> SkillRunResult:
    """Invoke a skill's script with the given args.

    Raises ``ValueError`` when the skill is unknown or has no executable script.
    Captures stdout/stderr; returns a ``SkillRunResult`` regardless of exit code.
    """
    rec = find(slug, skills_root)
    if rec is None:
        raise ValueError(f"unknown skill: {slug}")
    if not rec.is_runnable():
        raise ValueError(f"skill {slug} has no executable script at {rec.script}")
    cmd = [str(rec.script), *(args or [])]
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return SkillRunResult(
        skill=slug,
        exit_code=proc.returncode,
        stdout=proc.stdout,
        stderr=proc.stderr,
        cmd=cmd,
    )
