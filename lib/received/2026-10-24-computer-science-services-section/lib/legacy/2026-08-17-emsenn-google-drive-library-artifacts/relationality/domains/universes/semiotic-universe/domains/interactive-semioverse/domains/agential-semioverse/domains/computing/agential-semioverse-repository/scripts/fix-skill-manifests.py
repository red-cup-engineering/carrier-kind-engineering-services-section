#!/usr/bin/env python3
"""Bulk-fix SKILL.md files to add missing required fields.

Adds:
  - id: {directory-name} if missing
  - region: with sensible defaults if missing

Does NOT modify existing values. Only adds fields that are absent.

Usage:
  python fix-skill-manifests.py --repo-root .
  python fix-skill-manifests.py --repo-root . --dry-run
"""

import argparse
import re
import sys
from pathlib import Path


def find_skills(repo_root: Path) -> list[tuple[str, Path]]:
    """Find all SKILL.md files."""
    skills = []

    # Core skills
    core_dir = repo_root / ".claude" / "skills"
    if core_dir.exists():
        for d in sorted(core_dir.iterdir()):
            skill_file = d / "SKILL.md"
            if d.is_dir() and skill_file.exists():
                skills.append((d.name, skill_file))

    # Content-embedded skills
    content_dir = repo_root / "content"
    if content_dir.exists():
        for skill_file in sorted(content_dir.rglob("**/skills/*/SKILL.md")):
            dir_name = skill_file.parent.name
            skills.append((dir_name, skill_file))

    return skills


def infer_region(skill_path: Path, repo_root: Path) -> dict:
    """Infer a reasonable region from the skill's location."""
    rel = skill_path.relative_to(repo_root)
    parts = rel.parts

    # Core skills (.claude/skills/) — read/write content/
    if parts[0] == ".claude":
        return {"reads": ["content/"], "writes": ["content/"]}

    # Content-embedded skills — find the discipline root
    # Pattern: content/{discipline}/.../skills/{name}/SKILL.md
    if parts[0] == "content" and len(parts) > 2:
        # Find where "skills" appears in the path
        try:
            skills_idx = list(parts).index("skills")
            # Everything before "skills" is the thing the skill operates on
            thing_path = "/".join(parts[1:skills_idx])
            if thing_path:
                return {
                    "reads": [f"content/{thing_path}/"],
                    "writes": [f"content/{thing_path}/"],
                }
        except ValueError:
            pass

    return {"reads": ["content/"], "writes": ["content/"]}


def fix_skill(dir_name: str, skill_path: Path, repo_root: Path, dry_run: bool) -> list[str]:
    """Fix a single SKILL.md. Returns list of changes made."""
    text = skill_path.read_text(encoding="utf-8")

    # Must have frontmatter
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return []

    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return []

    fm_lines = lines[1:end]
    fm_text = "\n".join(fm_lines)
    changes = []

    # Check for missing id:
    has_id = any(re.match(r'^id\s*:', line) for line in fm_lines)
    if not has_id:
        # Insert id after description (or as first field)
        insert_idx = 0
        for j, line in enumerate(fm_lines):
            if re.match(r'^description\s*:', line):
                insert_idx = j + 1
                break
            elif re.match(r'^name\s*:', line):
                insert_idx = j + 1
                break

        fm_lines.insert(insert_idx, f"id: {dir_name}")
        changes.append(f"added id: {dir_name}")

    # Check for missing region:
    has_region = any(re.match(r'^region\s*:', line) for line in fm_lines)
    if not has_region:
        region = infer_region(skill_path, repo_root)
        reads_str = ", ".join(f'"{r}"' for r in region["reads"])
        writes_str = ", ".join(f'"{w}"' for w in region["writes"])

        # Insert region before dependencies or scopes, or at end
        insert_idx = len(fm_lines)
        for j, line in enumerate(fm_lines):
            if re.match(r'^(dependencies|scopes)\s*:', line):
                insert_idx = j
                break

        region_lines = [
            "region:",
            f"  reads: [{reads_str}]",
            f"  writes: [{writes_str}]",
        ]
        for k, rl in enumerate(region_lines):
            fm_lines.insert(insert_idx + k, rl)
        changes.append(f"added region (reads: {region['reads']}, writes: {region['writes']})")

    if changes and not dry_run:
        new_text = "\n".join(lines[:1] + fm_lines + lines[end:])
        skill_path.write_text(new_text, encoding="utf-8")

    return changes


def main():
    parser = argparse.ArgumentParser(description="Bulk-fix SKILL.md manifests")
    parser.add_argument("--repo-root", type=Path, default=Path("."),
                        help="Repository root (default: current directory)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be changed without modifying files")
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    skills = find_skills(repo_root)

    total_fixed = 0
    total_changes = 0

    for dir_name, skill_path in skills:
        changes = fix_skill(dir_name, skill_path, repo_root, args.dry_run)
        if changes:
            total_fixed += 1
            total_changes += len(changes)
            prefix = "[DRY RUN] " if args.dry_run else ""
            print(f"  {prefix}{dir_name}:")
            for c in changes:
                print(f"    - {c}")

    print()
    action = "would fix" if args.dry_run else "fixed"
    print(f"  {action} {total_fixed} skills ({total_changes} changes)")
    print(f"  ({len(skills)} skills scanned)")


if __name__ == "__main__":
    main()
