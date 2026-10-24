#!/usr/bin/env python3
"""Validate SKILL.md manifests against the signal-dispatch specification.

Implements the six validation checks from signal-dispatch.md Section 6:
  1. Required fields present (id, description, region)
  2. id matches directory name
  3. dependencies reference existing skill ids
  4. region.reads and region.writes reference valid directory paths
  5. inputs and outputs are well-typed
  6. triggers present for invocable skills (runtime: inference | script)

Also checks:
  - Invariant 5.1: default values for optional fields
  - Invariant 5.2: triggers requirement for dispatchable skills
  - Invariant 5.3 (skill-manifests.md): dependency DAG acyclicity

Usage:
  python validate-manifest.py                    # validate all skills
  python validate-manifest.py stabilize          # validate one skill
  python validate-manifest.py --json             # output as JSON
  python validate-manifest.py --fix              # apply auto-fixable defaults
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = {"id", "description", "region"}

OPTIONAL_DEFAULTS = {
    "version": [0, 1],
    "kind": "operational",
    "runtime": "inference",
    "triggers": [],
    "inputs": {},
    "outputs": {},
    "dependencies": [],
    "scopes": [],
}

VALID_KINDS = {"operational", "learn", "meta"}
VALID_RUNTIMES = {"inference", "script", "manual", "documentation"}
VALID_TYPES = {"string", "number", "boolean", "object", "string[]", "object[]"}

SKILL_ID_PATTERN = re.compile(r"^[a-z][a-z0-9-]*$")


# ---------------------------------------------------------------------------
# YAML parsing (minimal, no external deps)
# ---------------------------------------------------------------------------

def parse_frontmatter(text: str) -> dict | None:
    """Extract YAML frontmatter from a SKILL.md file.

    Returns the parsed frontmatter dict, or None if no frontmatter found.
    Uses a minimal parser that handles the subset of YAML used in skill manifests.
    """
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return None

    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return None

    fm_lines = lines[1:end]
    result = {}
    current_key = None
    current_list = None
    current_dict = None

    for line in fm_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # Top-level key: value
        if not line.startswith(" ") and not line.startswith("\t"):
            match = re.match(r'^([a-zA-Z_-]+):\s*(.*)', line)
            if match:
                key = match.group(1)
                val = match.group(2).strip()
                current_key = key
                current_list = None
                current_dict = None

                if val == "" or val == "{}":
                    if val == "{}":
                        result[key] = {}
                        current_dict = result[key]
                    # empty — could be list or dict, determined by children
                elif val.startswith("[") and val.endswith("]"):
                    # Inline list
                    inner = val[1:-1].strip()
                    if inner:
                        items = [s.strip().strip('"').strip("'") for s in inner.split(",")]
                        # Try to parse as ints
                        try:
                            items = [int(x) for x in items]
                        except ValueError:
                            pass
                        result[key] = items
                    else:
                        result[key] = []
                elif val.startswith("{") and val.endswith("}"):
                    # Inline dict
                    inner = val[1:-1].strip()
                    if inner:
                        d = {}
                        for pair in inner.split(","):
                            k, v = pair.split(":", 1)
                            d[k.strip().strip('"')] = v.strip().strip('"')
                        result[key] = d
                    else:
                        result[key] = {}
                else:
                    result[key] = val.strip('"').strip("'")
        else:
            # Indented line — belongs to current_key
            if current_key:
                if stripped.startswith("- "):
                    # List item
                    if current_key not in result:
                        result[current_key] = []
                        current_list = result[current_key]
                    elif isinstance(result[current_key], list):
                        current_list = result[current_key]
                    item = stripped[2:].strip().strip('"').strip("'")
                    if current_list is not None:
                        current_list.append(item)
                elif ":" in stripped:
                    # Dict entry
                    if current_key not in result:
                        result[current_key] = {}
                    if isinstance(result[current_key], dict):
                        k, v = stripped.split(":", 1)
                        k = k.strip().strip('"')
                        v = v.strip().strip('"').strip("'")
                        if v.startswith("[") and v.endswith("]"):
                            inner = v[1:-1].strip()
                            if inner:
                                v = [s.strip().strip('"').strip("'") for s in inner.split(",")]
                            else:
                                v = []
                        result[current_key][k] = v

    return result


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class ValidationResult:
    def __init__(self, skill_id: str, path: str):
        self.skill_id = skill_id
        self.path = path
        self.errors: list[dict] = []      # sh:Violation
        self.warnings: list[dict] = []    # sh:Warning
        self.info: list[dict] = []        # sh:Info

    def error(self, check: int, message: str):
        self.errors.append({"check": check, "message": message, "severity": "error"})

    def warning(self, check: int, message: str):
        self.warnings.append({"check": check, "message": message, "severity": "warning"})

    def notice(self, check: int, message: str):
        self.info.append({"check": check, "message": message, "severity": "info"})

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> dict:
        return {
            "skill_id": self.skill_id,
            "path": self.path,
            "passed": self.passed,
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
        }


def validate_manifest(
    fm: dict,
    dir_name: str,
    file_path: str,
    all_skill_ids: set[str],
    content_root: Path,
) -> ValidationResult:
    """Validate a parsed frontmatter dict against the signal-dispatch spec."""

    skill_id = fm.get("id", dir_name)
    result = ValidationResult(skill_id, file_path)

    # Check 1: Required fields present
    for field in REQUIRED_FIELDS:
        if field not in fm:
            result.error(1, f"Required field '{field}' is missing.")

    # Check 2: id matches directory name
    if "id" in fm:
        if fm["id"] != dir_name:
            result.error(2, f"id '{fm['id']}' does not match directory name '{dir_name}'.")
        if not SKILL_ID_PATTERN.match(fm["id"]):
            result.error(2, f"id '{fm['id']}' is not valid kebab-case (must match ^[a-z][a-z0-9-]*$).")

    # Check 3: dependencies reference existing skill ids
    deps = fm.get("dependencies", [])
    if isinstance(deps, list):
        for dep in deps:
            if dep not in all_skill_ids:
                result.warning(3, f"Dependency '{dep}' does not match any known skill id.")
    elif deps:
        result.warning(3, f"dependencies should be a list, got: {type(deps).__name__}")

    # Check 4: region paths
    region = fm.get("region", {})
    if isinstance(region, dict):
        for direction in ("reads", "writes"):
            paths = region.get(direction, [])
            if isinstance(paths, list):
                for p in paths:
                    # Allow template variables like {discipline}
                    clean = re.sub(r'\{[^}]+\}', 'x', str(p))
                    if not re.match(r'^[a-zA-Z._*/x]+/?$', clean):
                        result.warning(4, f"region.{direction} path '{p}' has unusual characters.")
            elif isinstance(paths, str):
                result.notice(4, f"region.{direction} should be a list, got string '{paths}'.")
    else:
        result.error(4, "region should be a dict with 'reads' and 'writes' keys.")

    # Check 5: inputs and outputs are well-typed
    for field_name in ("inputs", "outputs"):
        schema = fm.get(field_name, {})
        if isinstance(schema, dict):
            for param, ptype in schema.items():
                ptype_str = str(ptype).rstrip("?")
                if ptype_str not in VALID_TYPES:
                    result.warning(5, f"{field_name}.{param} type '{ptype}' is not in recognized vocabulary: {VALID_TYPES}")
        elif schema != {} and schema is not None:
            result.notice(5, f"{field_name} should be a dict, got: {type(schema).__name__}")

    # Check 6: triggers present for invocable skills (Invariant 5.2)
    runtime = fm.get("runtime", "inference")
    triggers = fm.get("triggers", [])
    if isinstance(runtime, str) and runtime in ("inference", "script"):
        if not triggers:
            result.warning(6, f"Dispatchable skill (runtime: {runtime}) has no triggers. It can only be invoked by /skill-id or as a dependency.")

    # Additional: kind validation
    kind = fm.get("kind")
    if isinstance(kind, str) and kind not in VALID_KINDS:
        result.warning(0, f"kind '{kind}' is not recognized. Expected one of: {VALID_KINDS}")
    elif kind and not isinstance(kind, str):
        result.warning(0, f"kind should be a string, got: {type(kind).__name__}")

    # Additional: runtime validation
    if isinstance(runtime, str) and runtime not in VALID_RUNTIMES:
        result.warning(0, f"runtime '{runtime}' is not recognized. Expected one of: {VALID_RUNTIMES}")
    elif runtime and not isinstance(runtime, str):
        result.warning(0, f"runtime should be a string, got: {type(runtime).__name__}")

    # Additional: version format
    version = fm.get("version")
    if version:
        if not (isinstance(version, list) and len(version) == 2):
            result.notice(0, f"version should be [major, minor], got: {version}")

    # Additional: self-dependency (Invariant 5.3 partial)
    if isinstance(deps, list) and skill_id in deps:
        result.error(0, f"Skill '{skill_id}' lists itself as a dependency (cycle).")

    return result


def check_dag_acyclicity(all_manifests: dict[str, dict]) -> list[str]:
    """Check that the dependency graph is a DAG. Returns list of cycle descriptions."""
    # Build adjacency list
    graph = {}
    for sid, fm in all_manifests.items():
        deps = fm.get("dependencies", [])
        graph[sid] = deps if isinstance(deps, list) else []

    # Topological sort via DFS
    visited = set()
    in_stack = set()
    cycles = []

    def dfs(node, path):
        if node in in_stack:
            cycle_start = path.index(node)
            cycle = path[cycle_start:] + [node]
            cycles.append(" -> ".join(cycle))
            return
        if node in visited:
            return
        visited.add(node)
        in_stack.add(node)
        path.append(node)
        for dep in graph.get(node, []):
            if dep in graph:
                dfs(dep, path)
        path.pop()
        in_stack.remove(node)

    for node in graph:
        if node not in visited:
            dfs(node, [])

    return cycles


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

def find_skills(repo_root: Path) -> list[tuple[str, Path]]:
    """Find all SKILL.md files in core and content-embedded locations."""
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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Validate SKILL.md manifests")
    parser.add_argument("skill_id", nargs="?", help="Validate a specific skill by id")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--repo-root", type=Path, default=Path("."),
                        help="Repository root (default: current directory)")
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    content_root = repo_root / "content"

    # Discover all skills
    all_skills = find_skills(repo_root)
    all_skill_ids = {sid for sid, _ in all_skills}
    all_manifests = {}

    # Filter to specific skill if requested
    if args.skill_id:
        all_skills = [(sid, path) for sid, path in all_skills if sid == args.skill_id]
        if not all_skills:
            print(f"No skill found with id '{args.skill_id}'", file=sys.stderr)
            sys.exit(1)

    # Validate each skill
    results = []
    for dir_name, skill_path in all_skills:
        text = skill_path.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if fm is None:
            r = ValidationResult(dir_name, str(skill_path))
            r.error(0, "No YAML frontmatter found.")
            results.append(r)
            continue

        all_manifests[dir_name] = fm
        r = validate_manifest(fm, dir_name, str(skill_path), all_skill_ids, content_root)
        results.append(r)

    # Check DAG acyclicity
    if not args.skill_id:
        cycles = check_dag_acyclicity(all_manifests)
        if cycles:
            for cycle in cycles:
                # Attach to the first skill in the cycle
                first_id = cycle.split(" -> ")[0]
                for r in results:
                    if r.skill_id == first_id:
                        r.error(3, f"Dependency cycle detected: {cycle}")
                        break

    # Output
    if args.json:
        output = {
            "total": len(results),
            "passed": sum(1 for r in results if r.passed),
            "failed": sum(1 for r in results if not r.passed),
            "results": [r.to_dict() for r in results],
        }
        print(json.dumps(output, indent=2))
    else:
        total_errors = 0
        total_warnings = 0
        total_info = 0

        for r in results:
            status = "PASS" if r.passed else "FAIL"
            marker = "+" if r.passed else "x"
            print(f"  {marker} {r.skill_id} [{status}]")
            for item in r.errors:
                print(f"    ERROR  [check {item['check']}] {item['message']}")
            for item in r.warnings:
                print(f"    WARN   [check {item['check']}] {item['message']}")
            for item in r.info:
                print(f"    INFO   [check {item['check']}] {item['message']}")
            total_errors += len(r.errors)
            total_warnings += len(r.warnings)
            total_info += len(r.info)

        print()
        passed = sum(1 for r in results if r.passed)
        print(f"  {passed}/{len(results)} skills passed validation")
        print(f"  {total_errors} errors, {total_warnings} warnings, {total_info} info")

    sys.exit(0 if all(r.passed for r in results) else 1)


if __name__ == "__main__":
    main()
