"""Skill-pack registry for FARS — discover, describe, and invoke SKILL.md scripts.

Skills live under ``operations/engineering/skills/<pack>/<skill>/``:

  - ``SKILL.md``  — frontmatter (description, name, inputs, outputs, ...) + body
  - ``scripts/<skill>.sh``  — the executable

This module discovers them, parses the frontmatter, and exposes them as
first-class FARS objects so the CLI verb ``pyfars skills`` and the MCP
server can register each as a callable tool.

The skill registry is the AOP runtime substrate's *operational* layer: it
maps the skill packs the engineering office authors into runtime-callable
tools, rather than re-implementing them inside FARS.
"""
from __future__ import annotations

from pyfars.skills.api import list_skills, get_skill, run_skill, Skill
from pyfars.skills.registry import discover

__all__ = ["list_skills", "get_skill", "run_skill", "Skill", "discover"]
