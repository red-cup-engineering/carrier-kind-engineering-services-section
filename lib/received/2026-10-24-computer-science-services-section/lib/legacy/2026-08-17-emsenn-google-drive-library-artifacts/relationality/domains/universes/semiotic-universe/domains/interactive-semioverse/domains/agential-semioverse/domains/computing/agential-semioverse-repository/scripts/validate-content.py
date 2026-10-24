#!/usr/bin/env python3
"""Validate content frontmatter against domain-specific ASR specifications.

Checks mathematical, philosophical, and sociological content types
against their domain specs:
  - Mathematical: definitions MUST have defines:, axioms MUST NOT have
    proven-by:, theorems MUST have proven-by:, etc.
  - Philosophical: arguments MUST have supports:, objections MUST have
    targets:, responses MUST have addresses:, etc.
  - Sociological: terms MUST have defines:, concepts MUST have defines:,
    lessons MUST have requires: and teaches:, etc.
  - General: requires: paths resolve, no self-references, notation
    scoping within requires: chains.

Usage:
  python validate-content.py                     # validate all content
  python validate-content.py content/mathematics # validate one tree
  python validate-content.py --json              # output as JSON
  python validate-content.py --type definition   # validate one type
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# YAML frontmatter parser (minimal, no external deps)
# ---------------------------------------------------------------------------

def parse_frontmatter(text: str) -> dict | None:
    """Extract YAML frontmatter from a markdown file."""
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
    current_dict_key = None
    current_dict_list = None

    for line in fm_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())

        # Top-level key: value
        if indent == 0:
            match = re.match(r'^([a-zA-Z_-]+):\s*(.*)', line)
            if match:
                key = match.group(1)
                val = match.group(2).strip()
                current_key = key
                current_list = None
                current_dict_key = None
                current_dict_list = None

                if val == "" or val == "[]":
                    if val == "[]":
                        result[key] = []
                    # empty — determined by children
                elif val.startswith("[") and val.endswith("]"):
                    inner = val[1:-1].strip()
                    if inner:
                        items = [s.strip().strip('"').strip("'")
                                 for s in inner.split(",")]
                        result[key] = items
                    else:
                        result[key] = []
                elif val in ("true", "false"):
                    result[key] = val == "true"
                else:
                    result[key] = val.strip('"').strip("'")
        else:
            if current_key:
                if stripped.startswith("- symbol:") or stripped.startswith("- symbol :"):
                    # Start of a notation entry
                    if current_key not in result:
                        result[current_key] = []
                    sym_val = stripped.split(":", 1)[1].strip().strip('"').strip("'")
                    entry = {"symbol": sym_val}
                    result[current_key].append(entry)
                    current_dict_key = current_key
                    current_dict_list = result[current_key]
                elif stripped.startswith("for:") and current_dict_list:
                    for_val = stripped.split(":", 1)[1].strip().strip('"').strip("'")
                    current_dict_list[-1]["for"] = for_val
                elif stripped.startswith("- "):
                    if current_key not in result:
                        result[current_key] = []
                        current_list = result[current_key]
                    elif isinstance(result[current_key], list):
                        current_list = result[current_key]
                    item = stripped[2:].strip().strip('"').strip("'")
                    if current_list is not None:
                        current_list.append(item)
                elif ":" in stripped and indent <= 4:
                    if current_key not in result:
                        result[current_key] = {}
                    if isinstance(result[current_key], dict):
                        k, v = stripped.split(":", 1)
                        k = k.strip().strip('"')
                        v = v.strip().strip('"').strip("'")
                        result[current_key][k] = v

    return result


# ---------------------------------------------------------------------------
# Validation rules
# ---------------------------------------------------------------------------

# Mathematical content type rules
MATH_RULES = {
    "definition": {
        "must": ["defines"],
        "must_not": [],
        "should": ["notation"],
    },
    "axiom": {
        "must": ["part-of"],
        "must_not": ["proven-by"],
        "should": ["enables"],
    },
    "theorem": {
        "must": ["proven-by", "requires"],
        "must_not": [],
        "should": [],
    },
    "proof": {
        "must": ["proves", "uses"],
        "must_not": [],
        "should": ["technique"],
    },
    "lemma": {
        "must": ["proven-by", "requires"],
        "must_not": [],
        "should": ["supports"],
    },
    "proposition": {
        "must": ["proven-by", "requires"],
        "must_not": [],
        "should": [],
    },
    "corollary": {
        "must": ["follows-from", "proven-by"],
        "must_not": [],
        "should": [],
    },
    "conjecture": {
        "must": [],
        "must_not": ["proven-by"],
        "should": ["evidence"],
    },
    "example": {
        "must": ["illustrates"],
        "must_not": [],
        "should": [],
    },
    "counterexample": {
        "must": ["refutes"],
        "must_not": [],
        "should": [],
    },
}

# Philosophical content type rules
PHIL_RULES = {
    "claim": {
        "must": [],
        "must_not": [],
        "should": ["argued-by"],
    },
    "argument": {
        "must": ["supports"],
        "must_not": [],
        "should": ["argument-form"],
    },
    "objection": {
        "must": ["targets"],
        "must_not": [],
        "should": [],
    },
    "response": {
        "must": ["addresses"],
        "must_not": [],
        "should": [],
    },
}

# Sociological content type rules
# These apply to pages under sociology/ with general types (term, concept, etc.)
SOC_RULES = {
    "term": {
        "must": ["defines"],
        "must_not": [],
        "should": ["cites"],
    },
    "concept": {
        "must": ["defines"],
        "must_not": [],
        "should": ["integrates", "cites"],
    },
    "school": {
        "must": [],
        "must_not": [],
        "should": ["cites"],
    },
    "lesson": {
        "must": ["requires", "teaches"],
        "must_not": [],
        "should": [],
    },
    "text": {
        "must": [],
        "must_not": [],
        "should": ["cites"],
    },
}

# Ludic (games) content type rules
# These apply to pages under games/ with general types
GAME_RULES = {
    "term": {
        "must": ["defines"],
        "must_not": [],
        "should": ["cites"],
    },
    "lesson": {
        "must": ["teaches"],
        "must_not": [],
        "should": ["requires"],
    },
    "specification": {
        "must": [],
        "must_not": [],
        "should": ["classifies", "uses-mechanic"],
    },
    "text": {
        "must": [],
        "must_not": [],
        "should": ["cites"],
    },
}

# Types that don't have domain-specific rules but should still pass
# general validation (requires: resolution, etc.)
GENERAL_TYPES = {
    "term", "concept", "index", "text", "lesson", "school",
    "question", "skill", "specification", "topic",
}

ALL_DOMAIN_TYPES = set(MATH_RULES) | set(PHIL_RULES)


# ---------------------------------------------------------------------------
# Validation engine
# ---------------------------------------------------------------------------

class Issue:
    def __init__(self, severity: str, rule: str, message: str):
        self.severity = severity  # "error", "warning", "info"
        self.rule = rule
        self.message = message

    def to_dict(self) -> dict:
        return {
            "severity": self.severity,
            "rule": self.rule,
            "message": self.message,
        }


class ValidationResult:
    def __init__(self, path: str, content_type: str):
        self.path = path
        self.content_type = content_type
        self.issues: list[Issue] = []

    def error(self, rule: str, message: str):
        self.issues.append(Issue("error", rule, message))

    def warning(self, rule: str, message: str):
        self.issues.append(Issue("warning", rule, message))

    def info(self, rule: str, message: str):
        self.issues.append(Issue("info", rule, message))

    @property
    def errors(self) -> list[Issue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list[Issue]:
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "type": self.content_type,
            "passed": self.passed,
            "issues": [i.to_dict() for i in self.issues],
        }


def is_path_reference(value: str) -> bool:
    """Determine if a requires/extends value is a file path or a concept name."""
    return "/" in value or value.endswith(".md") or value.startswith(".")


def resolve_path(base_dir: Path, relative: str, content_root: Path) -> Path:
    """Resolve a path from frontmatter. Absolute paths (starting with /)
    resolve from content root; relative paths resolve from the file's dir."""
    if relative.startswith("/"):
        return (content_root / relative.lstrip("/")).resolve()
    return (base_dir / relative).resolve()


def validate_file(
    file_path: Path,
    fm: dict,
    content_root: Path,
) -> ValidationResult:
    """Validate a single file's frontmatter against domain rules."""

    content_type = fm.get("type", "")
    if not isinstance(content_type, str):
        content_type = str(content_type)
    result = ValidationResult(
        str(file_path.relative_to(content_root)),
        content_type,
    )

    # General: required fields
    if "title" not in fm:
        result.error("general.title", "Missing required field: title")
    if "date-created" not in fm:
        result.error("general.date-created", "Missing required field: date-created")

    # General: requires: paths resolve
    requires = fm.get("requires", [])
    if isinstance(requires, list):
        file_dir = file_path.parent
        for req in requires:
            if not is_path_reference(req):
                # Conceptual prerequisite, not a file path
                result.info(
                    "general.requires-concept",
                    f"requires: conceptual prerequisite (not a path): {req}",
                )
                continue
            resolved = resolve_path(file_dir, req, content_root)
            if not resolved.exists():
                result.error(
                    "general.requires-resolution",
                    f"requires: path does not resolve: {req}",
                )
            # Self-reference check
            elif resolved == file_path.resolve():
                result.error(
                    "general.no-self-reference",
                    f"requires: self-reference: {req}",
                )
    elif isinstance(requires, str):
        result.warning(
            "general.requires-format",
            "requires: should be a list, got string",
        )

    # General: extends: paths resolve
    extends = fm.get("extends", [])
    if isinstance(extends, list):
        file_dir = file_path.parent
        for ext in extends:
            if not is_path_reference(ext):
                continue
            resolved = resolve_path(file_dir, ext, content_root)
            if not resolved.exists():
                result.error(
                    "general.extends-resolution",
                    f"extends: path does not resolve: {ext}",
                )

    # Domain-specific rules
    rules = None
    domain = None
    rel_path = str(file_path.relative_to(content_root))
    rel_parts = Path(rel_path).parts

    if content_type in MATH_RULES:
        rules = MATH_RULES[content_type]
        domain = "math"
    elif content_type in PHIL_RULES:
        rules = PHIL_RULES[content_type]
        domain = "phil"
    elif (
        len(rel_parts) > 0
        and rel_parts[0] == "sociology"
        and content_type in SOC_RULES
    ):
        rules = SOC_RULES[content_type]
        domain = "soc"
    elif (
        len(rel_parts) > 0
        and rel_parts[0] == "games"
        and content_type in GAME_RULES
    ):
        rules = GAME_RULES[content_type]
        domain = "game"

    if rules:
        # MUST fields
        for field in rules["must"]:
            val = fm.get(field)
            if val is None or val == [] or val == "":
                result.error(
                    f"{domain}.{content_type}.must.{field}",
                    f"{content_type} MUST have {field}:",
                )

        # MUST NOT fields
        for field in rules["must_not"]:
            val = fm.get(field)
            if val is not None and val != [] and val != "":
                result.error(
                    f"{domain}.{content_type}.must-not.{field}",
                    f"{content_type} MUST NOT have {field}:",
                )

        # SHOULD fields
        for field in rules["should"]:
            val = fm.get(field)
            if val is None or val == [] or val == "":
                result.warning(
                    f"{domain}.{content_type}.should.{field}",
                    f"{content_type} SHOULD have {field}:",
                )

    # Notation scoping: check for duplicate symbols in requires chain
    notation = fm.get("notation", [])
    if isinstance(notation, list) and notation:
        symbols_here = set()
        for entry in notation:
            if isinstance(entry, dict) and "symbol" in entry:
                sym = entry["symbol"]
                if sym in symbols_here:
                    result.error(
                        "notation.local-uniqueness",
                        f"Duplicate symbol in same page: {sym}",
                    )
                symbols_here.add(sym)

    return result


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

def find_content_files(
    root: Path,
    type_filter: str | None = None,
) -> list[tuple[Path, dict]]:
    """Find all .md files with parseable frontmatter under root."""
    results = []

    # Skip directories
    skip = {"private", "meta", ".obsidian", "assets", "tags", "slop", "triage"}

    for md_file in sorted(root.rglob("*.md")):
        # Skip non-content directories
        parts = md_file.relative_to(root).parts
        if any(p in skip for p in parts):
            continue
        # Skip SKILL.md files
        if md_file.name == "SKILL.md":
            continue

        try:
            text = md_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

        fm = parse_frontmatter(text)
        if fm is None:
            continue

        # Apply type filter
        if type_filter and fm.get("type") != type_filter:
            continue

        results.append((md_file, fm))

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Validate content frontmatter against ASR specs"
    )
    parser.add_argument(
        "path", nargs="?", default=None,
        help="Path to validate (default: content/)",
    )
    parser.add_argument(
        "--type", dest="type_filter", default=None,
        help="Only validate pages with this type",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output as JSON",
    )
    parser.add_argument(
        "--errors-only", action="store_true",
        help="Only show files with errors",
    )
    parser.add_argument(
        "--repo-root", type=Path, default=Path("."),
        help="Repository root (default: current directory)",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    content_root = repo_root / "content"

    if args.path:
        scan_root = Path(args.path).resolve()
    else:
        scan_root = content_root

    if not scan_root.exists():
        print(f"Path does not exist: {scan_root}", file=sys.stderr)
        sys.exit(1)

    # Find and validate
    files = find_content_files(scan_root, args.type_filter)
    results = []

    for file_path, fm in files:
        r = validate_file(file_path, fm, content_root)
        # Only include files with domain-specific types or with issues
        content_type = fm.get("type", "")
        if not isinstance(content_type, str):
            content_type = str(content_type)
        if (content_type in ALL_DOMAIN_TYPES
                or r.issues
                or content_type not in GENERAL_TYPES):
            results.append(r)

    # Filter if requested
    if args.errors_only:
        results = [r for r in results if not r.passed]

    # Output
    # Ensure UTF-8 output on Windows
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if args.json:
        output = {
            "total_scanned": len(files),
            "total_validated": len(results),
            "passed": sum(1 for r in results if r.passed),
            "failed": sum(1 for r in results if not r.passed),
            "results": [r.to_dict() for r in results],
        }
        print(json.dumps(output, indent=2))
    else:
        total_errors = 0
        total_warnings = 0

        for r in results:
            errors = [i for i in r.issues if i.severity == "error"]
            warnings = [i for i in r.issues if i.severity == "warning"]

            if args.errors_only and not errors:
                continue

            status = "PASS" if r.passed else "FAIL"
            marker = "+" if r.passed else "x"
            type_label = f" ({r.content_type})" if r.content_type else ""
            print(f"  {marker} {r.path}{type_label} [{status}]")
            for i in errors:
                print(f"    ERROR  [{i.rule}] {i.message}")
            for i in warnings:
                print(f"    WARN   [{i.rule}] {i.message}")

            total_errors += len(errors)
            total_warnings += len(warnings)

        print()
        passed = sum(1 for r in results if r.passed)
        print(f"  {passed}/{len(results)} files passed validation")
        print(f"  {total_errors} errors, {total_warnings} warnings")
        print(f"  ({len(files)} files scanned)")

    sys.exit(0 if all(r.passed for r in results) else 1)


if __name__ == "__main__":
    main()
