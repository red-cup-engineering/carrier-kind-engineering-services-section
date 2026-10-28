#!/usr/bin/env python3
"""Build and query the repository's predicate graph. Check axiom satisfaction.

The predicate graph is the set of all (subject, predicate, object) triplets
declared by pages via their YAML frontmatter. Each typed relation field
generates one or more triplets:

    (page-handle, relation-type, target)

The subject is the page's handle (its path relative to content root). The
predicate is the relation type (requires, defines, proven-by, etc.). The
object is the target — either another page handle or a value string.

This graph is the computable substrate on which closure operates. The
satisfaction checker (--satisfy) evaluates each axiom of a page's type
theory against the graph and reports concrete gaps.

Reference: operational-closure.md Sections 0, 2, 7.

Usage:
  python predicate-graph.py                            # build graph, print stats
  python predicate-graph.py --triplets <page>          # page's interaction surface
  python predicate-graph.py --incoming <page>          # triplets pointing TO page
  python predicate-graph.py --query <predicate>        # filter by predicate
  python predicate-graph.py --transitive <page> <pred> # follow relation chain
  python predicate-graph.py --satisfy <page>           # axiom satisfaction for page
  python predicate-graph.py --satisfy-all              # satisfaction across repository
  python predicate-graph.py --satisfy-all --gaps-only  # show only unsatisfied axioms
  python predicate-graph.py --json                     # JSON output
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field as dataclass_field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent.parent

# ---------------------------------------------------------------------------
# Frontmatter parsing
# ---------------------------------------------------------------------------

# Fields that are page metadata, not semantic relations.
# Everything else in frontmatter generates triplets.
METADATA_FIELDS = {
    "title", "aliases", "date-created", "date-updated", "status",
    "id", "kind", "description", "summary", "name", "version",
    "runtime", "region", "dependencies", "scopes", "inputs", "outputs",
    "skill-kind", "license", "compatibility", "metadata", "allowed-tools",
    "invocation", "tool",
}


def parse_frontmatter(file_path: Path) -> dict | None:
    """Parse YAML frontmatter from a markdown file.

    Handles: scalar values, inline lists [a, b], block lists (- item),
    nested dict entries (notation with symbol/for). Returns dict or None.
    """
    try:
        text = file_path.read_text(encoding="utf-8")
    except Exception:
        return None

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

    fm = {}
    current_key = None
    current_list = None

    for line in lines[1:end]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())

        # Top-level key: value
        if indent == 0:
            match = re.match(r"^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)", line)
            if match:
                key = match.group(1)
                val = match.group(2).strip()
                current_key = key
                current_list = None

                if val == "" or val == "[]":
                    fm[key] = []
                    current_list = fm[key]
                elif val.startswith("[") and val.endswith("]"):
                    inner = val[1:-1].strip()
                    if inner:
                        items = [s.strip().strip('"').strip("'")
                                 for s in inner.split(",") if s.strip()]
                        fm[key] = items
                    else:
                        fm[key] = []
                    current_list = fm[key]
                elif val in ("true", "false"):
                    fm[key] = val == "true"
                else:
                    fm[key] = val.strip('"').strip("'")
        else:
            if current_key is not None:
                # Notation entries: - symbol: X / for: Y
                if stripped.startswith("- symbol:") or stripped.startswith("- symbol :"):
                    if current_key not in fm:
                        fm[current_key] = []
                    sym_val = stripped.split(":", 1)[1].strip().strip('"').strip("'")
                    entry = {"symbol": sym_val}
                    if isinstance(fm[current_key], list):
                        fm[current_key].append(entry)
                elif stripped.startswith("for:") and isinstance(fm.get(current_key), list):
                    if fm[current_key] and isinstance(fm[current_key][-1], dict):
                        fm[current_key][-1]["for"] = (
                            stripped.split(":", 1)[1].strip().strip('"').strip("'"))
                elif stripped.startswith("- "):
                    item = stripped[2:].strip().strip('"').strip("'")
                    if current_key not in fm:
                        fm[current_key] = []
                    if isinstance(fm[current_key], list):
                        fm[current_key].append(item)
                        current_list = fm[current_key]

    return fm


def is_handle(value: str) -> bool:
    """Check if a value is a file handle (path reference) vs a plain value."""
    return "/" in value or value.endswith(".md")


def resolve_handle(source_dir: Path, ref: str, content_root: Path) -> Path:
    """Resolve a handle reference to a filesystem path."""
    if ref.startswith("/"):
        return (content_root / ref.lstrip("/")).resolve()
    return (source_dir / ref).resolve()


# ---------------------------------------------------------------------------
# Triplet
# ---------------------------------------------------------------------------

@dataclass
class Triplet:
    """A subject-predicate-object triple from frontmatter."""
    subject: str       # page handle (relative path from content root)
    predicate: str     # relation type
    object: str        # target value or handle
    object_kind: str   # "handle" or "value"

    def to_dict(self) -> dict:
        return {
            "s": self.subject,
            "p": self.predicate,
            "o": self.object,
            "kind": self.object_kind,
        }


# ---------------------------------------------------------------------------
# Predicate Graph
# ---------------------------------------------------------------------------

class PredicateGraph:
    """The full predicate graph of the repository.

    Built from YAML frontmatter across all pages. Supports forward lookups
    (by subject, by predicate), reverse lookups (by object), and transitive
    closure along handle relations.
    """

    def __init__(self):
        self.triplets: list[Triplet] = []
        self.by_subject: dict[str, list[Triplet]] = defaultdict(list)
        self.by_predicate: dict[str, list[Triplet]] = defaultdict(list)
        self.by_object: dict[str, list[Triplet]] = defaultdict(list)
        self.page_types: dict[str, str] = {}       # handle -> content type
        self.page_domains: dict[str, str] = {}     # handle -> domain
        self.existing_pages: set[str] = set()       # handles that exist

    def add(self, t: Triplet):
        """Add a triplet to the graph."""
        self.triplets.append(t)
        self.by_subject[t.subject].append(t)
        self.by_predicate[t.predicate].append(t)
        self.by_object[t.object].append(t)

    def interaction_surface(self, page: str) -> list[Triplet]:
        """All triplets with page as subject — its interaction surface."""
        return self.by_subject.get(page, [])

    def incoming(self, page: str) -> list[Triplet]:
        """All triplets whose handle-type object matches page."""
        return [t for t in self.by_object.get(page, [])
                if t.object_kind == "handle"]

    def query(self, predicate: str, obj: str | None = None) -> list[Triplet]:
        """Filter triplets by predicate and optionally by object."""
        results = self.by_predicate.get(predicate, [])
        if obj is not None:
            results = [t for t in results if t.object == obj]
        return results

    def transitive_closure(self, page: str, predicate: str,
                           max_depth: int = 20) -> list[str]:
        """Follow a handle relation transitively from page.

        Returns the ordered list of reachable pages (not including the
        starting page).
        """
        visited = []
        frontier = [page]
        seen = {page}
        depth = 0

        while frontier and depth < max_depth:
            next_frontier = []
            for current in frontier:
                for t in self.by_subject.get(current, []):
                    if t.predicate == predicate and t.object_kind == "handle":
                        if t.object not in seen:
                            seen.add(t.object)
                            visited.append(t.object)
                            next_frontier.append(t.object)
            frontier = next_frontier
            depth += 1

        return visited

    def handle_exists(self, handle: str) -> bool:
        """Check if a handle resolves to an existing page."""
        return handle in self.existing_pages

    def page_type(self, handle: str) -> str:
        """Get the content type of a page, or empty string."""
        return self.page_types.get(handle, "")

    def page_domain(self, handle: str) -> str:
        """Get the domain of a page, or empty string."""
        return self.page_domains.get(handle, "")

    def stats(self) -> dict:
        """Summary statistics of the graph."""
        predicates = defaultdict(int)
        for t in self.triplets:
            predicates[t.predicate] += 1

        handle_count = sum(1 for t in self.triplets if t.object_kind == "handle")
        value_count = sum(1 for t in self.triplets if t.object_kind == "value")

        domains = defaultdict(int)
        for handle in self.existing_pages:
            d = self.page_domains.get(handle, "")
            if d:
                domains[d] += 1

        type_counts = defaultdict(int)
        for t in self.page_types.values():
            type_counts[t] += 1

        return {
            "total_triplets": len(self.triplets),
            "total_pages": len(self.existing_pages),
            "pages_with_triplets": len(self.by_subject),
            "unique_predicates": len(predicates),
            "handle_triplets": handle_count,
            "value_triplets": value_count,
            "predicates": dict(sorted(predicates.items(), key=lambda x: -x[1])),
            "typed_pages": len(self.page_types),
            "types": dict(sorted(type_counts.items(), key=lambda x: -x[1])),
            "domains": dict(sorted(domains.items(), key=lambda x: -x[1])),
        }

    @classmethod
    def build(cls, content_root: Path) -> "PredicateGraph":
        """Build the full predicate graph from repository content.

        Scans all .md files, parses frontmatter, extracts triplets from
        every non-metadata field. Handle references are resolved to
        canonical paths relative to content root.
        """
        graph = cls()
        skip = {"private", "meta", "slop", "triage", ".obsidian"}

        for md_file in sorted(content_root.rglob("*.md")):
            rel = md_file.relative_to(content_root)
            parts = rel.parts
            if any(p in skip for p in parts):
                continue
            if any(p.startswith(".") for p in parts):
                continue
            if md_file.name == "SKILL.md":
                continue

            handle = str(rel).replace("\\", "/")
            graph.existing_pages.add(handle)

            fm = parse_frontmatter(md_file)
            if fm is None:
                continue

            # Determine domain from first path component
            domain = parts[0] if len(parts) > 1 else ""
            graph.page_domains[handle] = domain

            # Extract triplets from all non-metadata fields
            for key, val in fm.items():
                if key in METADATA_FIELDS:
                    continue

                # --- type field: record type, emit triplet ---
                if key == "type":
                    if isinstance(val, str) and val:
                        graph.page_types[handle] = val
                        graph.add(Triplet(handle, "type", val, "value"))
                    continue

                # --- tags field: each tag is a triplet ---
                if key == "tags":
                    if isinstance(val, list):
                        for tag in val:
                            if isinstance(tag, str) and tag:
                                graph.add(Triplet(handle, "tagged", tag, "value"))
                    continue

                # --- authors field: provenance values ---
                if key == "authors":
                    if isinstance(val, list):
                        for author in val:
                            if isinstance(author, str) and author:
                                graph.add(Triplet(handle, "authors", author, "value"))
                    elif isinstance(val, str) and val:
                        graph.add(Triplet(handle, "authors", val, "value"))
                    continue

                # --- notation field: may be list of dicts or strings ---
                if key == "notation":
                    if isinstance(val, list):
                        for entry in val:
                            if isinstance(entry, dict) and "symbol" in entry:
                                graph.add(Triplet(
                                    handle, "notation", entry["symbol"], "value"))
                            elif isinstance(entry, str) and entry:
                                graph.add(Triplet(handle, "notation", entry, "value"))
                    continue

                # --- General: list or scalar values ---
                if isinstance(val, list):
                    values = val
                elif isinstance(val, str) and val:
                    values = [val]
                elif isinstance(val, bool):
                    continue  # skip boolean fields
                else:
                    continue

                for v in values:
                    if not isinstance(v, str) or not v:
                        continue
                    # Skip dict entries that weren't caught above
                    if isinstance(v, dict):
                        continue

                    if is_handle(v):
                        # Resolve to canonical handle
                        resolved = resolve_handle(
                            md_file.parent, v, content_root)
                        try:
                            canonical = str(
                                resolved.relative_to(content_root)
                            ).replace("\\", "/")
                        except ValueError:
                            canonical = v
                        graph.add(Triplet(handle, key, canonical, "handle"))
                    else:
                        graph.add(Triplet(handle, key, v, "value"))

        return graph


# ---------------------------------------------------------------------------
# Domain axiom definitions
# ---------------------------------------------------------------------------
#
# Each content type in each domain has a theory: the set of axioms that
# the domain ASR spec declares for that type. Axioms are encoded as
# structured dicts:
#
#   {"kind": "must", "field": "defines"}
#     -> page MUST have at least one triplet with this predicate
#
#   {"kind": "must_not", "field": "proven-by"}
#     -> page MUST NOT have any triplet with this predicate
#
#   {"kind": "should", "field": "notation"}
#     -> page SHOULD have this predicate (warning, not error)
#
#   {"kind": "target_exists", "field": "requires"}
#     -> all handle-type objects for this predicate must resolve
#
#   {"kind": "no_self_ref", "field": "requires"}
#     -> no triplet with this predicate may point back to the page
#
#   {"kind": "reciprocal", "field": "proven-by", "reciprocal": "proves"}
#     -> if (A, proven-by, B) then (B, proves, A) should exist
#
#   {"kind": "target_type", "field": "proven-by", "expected_type": "proof"}
#     -> handle targets of this predicate should be of this content type
#
# Each axiom evaluates to satisfied or unsatisfied. Unsatisfied axioms
# produce gaps: concrete descriptions of what would need to change.

def _must(field):
    return {"kind": "must", "field": field}

def _must_not(field):
    return {"kind": "must_not", "field": field}

def _should(field):
    return {"kind": "should", "field": field}

def _target_exists(field):
    return {"kind": "target_exists", "field": field}

def _no_self_ref(field):
    return {"kind": "no_self_ref", "field": field}

def _reciprocal(field, reciprocal):
    return {"kind": "reciprocal", "field": field, "reciprocal": reciprocal}

def _target_type(field, expected_type):
    return {"kind": "target_type", "field": field, "expected_type": expected_type}


# Mathematics
MATH_AXIOMS = {
    "definition": [
        _must("defines"),
        _should("notation"),
        _should("requires"),
        _no_self_ref("requires"),
        _target_exists("requires"),
    ],
    "axiom": [
        _must("part-of"),
        _must_not("proven-by"),
        _should("enables"),
    ],
    "theorem": [
        _must("proven-by"),
        _must("requires"),
        _target_exists("proven-by"),
        _target_exists("requires"),
        _no_self_ref("requires"),
        _reciprocal("proven-by", "proves"),
        _target_type("proven-by", "proof"),
    ],
    "proof": [
        _must("proves"),
        _must("uses"),
        _target_exists("proves"),
        _target_exists("uses"),
        _should("technique"),
        _reciprocal("proves", "proven-by"),
    ],
    "lemma": [
        _must("proven-by"),
        _must("requires"),
        _target_exists("proven-by"),
        _target_exists("requires"),
        _should("supports"),
        _reciprocal("proven-by", "proves"),
    ],
    "proposition": [
        _must("proven-by"),
        _must("requires"),
        _target_exists("proven-by"),
        _target_exists("requires"),
    ],
    "corollary": [
        _must("follows-from"),
        _must("proven-by"),
        _target_exists("follows-from"),
        _target_exists("proven-by"),
    ],
    "conjecture": [
        _must_not("proven-by"),
        _should("evidence"),
    ],
    "example": [
        _must("illustrates"),
        _target_exists("illustrates"),
    ],
    "counterexample": [
        _must("refutes"),
        _target_exists("refutes"),
    ],
}

# Philosophy
PHIL_AXIOMS = {
    "claim": [
        _should("argued-by"),
    ],
    "argument": [
        _must("supports"),
        _target_exists("supports"),
        _should("argument-form"),
        _should("requires"),
        _reciprocal("supports", "argued-by"),
    ],
    "objection": [
        _must("targets"),
        _target_exists("targets"),
        _reciprocal("targets", "contested-by"),
    ],
    "response": [
        _must("addresses"),
        _target_exists("addresses"),
        _reciprocal("addresses", "addressed-by"),
    ],
}

# Sociology
SOC_AXIOMS = {
    "term": [
        _must("defines"),
        _should("cites"),
    ],
    "concept": [
        _must("defines"),
        _should("integrates"),
        _should("cites"),
    ],
    "school": [
        _should("cites"),
    ],
    "lesson": [
        _must("requires"),
        _must("teaches"),
        _target_exists("requires"),
    ],
    "text": [
        _should("cites"),
    ],
}

# Games (ludic)
GAME_AXIOMS = {
    "term": [
        _must("defines"),
        _should("cites"),
    ],
    "lesson": [
        _must("teaches"),
        _should("requires"),
    ],
    "specification": [
        _should("classifies"),
        _should("uses-mechanic"),
    ],
    "text": [
        _should("cites"),
    ],
}

# Education
EDU_AXIOMS = {
    "lesson": [
        _must("teaches"),
        _must("requires"),
        _target_exists("requires"),
        _should("cites"),
    ],
    "curriculum": [
        _must("teaches"),
        _should("requires"),
    ],
    "term": [
        _must("defines"),
        _should("cites"),
    ],
    "school": [
        _should("cites"),
    ],
}

# Registry: (domain, content_type) -> list of axioms
# Domain is the first path component (mathematics, philosophy, etc.)
DOMAIN_AXIOM_REGISTRY: dict[str, dict[str, list[dict]]] = {
    "mathematics": MATH_AXIOMS,
    "philosophy": PHIL_AXIOMS,
    "sociology": SOC_AXIOMS,
    "games": GAME_AXIOMS,
    "education": EDU_AXIOMS,
}

# Universal axioms applied to ALL typed pages regardless of domain
UNIVERSAL_AXIOMS = [
    _target_exists("requires"),
    _target_exists("extends"),
    _no_self_ref("requires"),
    _no_self_ref("extends"),
]


# ---------------------------------------------------------------------------
# Satisfaction checker
# ---------------------------------------------------------------------------

@dataclass
class Gap:
    """A concrete unsatisfied axiom — what needs to change."""
    axiom_kind: str    # the axiom type that failed
    field: str         # the relation field involved
    severity: str      # "error" or "warning"
    message: str       # human-readable description
    remedy: str        # what triplet or change would satisfy it

    def to_dict(self) -> dict:
        return {
            "axiom": self.axiom_kind,
            "field": self.field,
            "severity": self.severity,
            "message": self.message,
            "remedy": self.remedy,
        }


@dataclass
class SatisfactionResult:
    """The result of checking a page against its type theory."""
    page: str
    content_type: str
    domain: str
    axioms_checked: int = 0
    axioms_satisfied: int = 0
    gaps: list[Gap] = dataclass_field(default_factory=list)

    @property
    def fully_satisfied(self) -> bool:
        return len([g for g in self.gaps if g.severity == "error"]) == 0

    @property
    def error_count(self) -> int:
        return len([g for g in self.gaps if g.severity == "error"])

    @property
    def warning_count(self) -> int:
        return len([g for g in self.gaps if g.severity == "warning"])

    def to_dict(self) -> dict:
        return {
            "page": self.page,
            "type": self.content_type,
            "domain": self.domain,
            "axioms_checked": self.axioms_checked,
            "axioms_satisfied": self.axioms_satisfied,
            "satisfied": self.fully_satisfied,
            "errors": self.error_count,
            "warnings": self.warning_count,
            "gaps": [g.to_dict() for g in self.gaps],
        }


class SatisfactionChecker:
    """Evaluate axiom satisfaction for pages against the predicate graph.

    For each typed page, loads the domain axioms for its content type,
    evaluates each axiom against the page's triplets and the full graph,
    and produces a SatisfactionResult with concrete gaps.
    """

    def __init__(self, graph: PredicateGraph):
        self.graph = graph

    def _page_has_predicate(self, page: str, predicate: str) -> bool:
        """Check if page has any triplet with this predicate."""
        for t in self.graph.interaction_surface(page):
            if t.predicate == predicate:
                return True
        return False

    def _page_triplets_for(self, page: str, predicate: str) -> list[Triplet]:
        """Get all triplets for a page with a specific predicate."""
        return [t for t in self.graph.interaction_surface(page)
                if t.predicate == predicate]

    def _check_axiom(self, page: str, axiom: dict) -> Gap | None:
        """Evaluate one axiom against a page. Returns a Gap if unsatisfied."""
        kind = axiom["kind"]
        field = axiom["field"]

        if kind == "must":
            if not self._page_has_predicate(page, field):
                return Gap(
                    axiom_kind="must",
                    field=field,
                    severity="error",
                    message=f"MUST have {field}: — field is missing or empty",
                    remedy=f"Add ({page}, {field}, ???) — provide a value for {field}:",
                )

        elif kind == "must_not":
            if self._page_has_predicate(page, field):
                return Gap(
                    axiom_kind="must_not",
                    field=field,
                    severity="error",
                    message=f"MUST NOT have {field}: — field is present",
                    remedy=f"Remove {field}: from {page}",
                )

        elif kind == "should":
            if not self._page_has_predicate(page, field):
                return Gap(
                    axiom_kind="should",
                    field=field,
                    severity="warning",
                    message=f"SHOULD have {field}: — field is missing or empty",
                    remedy=f"Add ({page}, {field}, ???) — provide a value for {field}:",
                )

        elif kind == "target_exists":
            triplets = self._page_triplets_for(page, field)
            for t in triplets:
                if t.object_kind == "handle" and not self.graph.handle_exists(t.object):
                    return Gap(
                        axiom_kind="target_exists",
                        field=field,
                        severity="error",
                        message=f"{field}: target does not exist: {t.object}",
                        remedy=f"Create page at {t.object}, or fix the path in {page}",
                    )

        elif kind == "no_self_ref":
            triplets = self._page_triplets_for(page, field)
            for t in triplets:
                if t.object_kind == "handle" and t.object == page:
                    return Gap(
                        axiom_kind="no_self_ref",
                        field=field,
                        severity="error",
                        message=f"{field}: self-reference — page points to itself",
                        remedy=f"Remove self-referencing {field}: entry from {page}",
                    )

        elif kind == "reciprocal":
            reciprocal_field = axiom["reciprocal"]
            triplets = self._page_triplets_for(page, field)
            for t in triplets:
                if t.object_kind == "handle" and self.graph.handle_exists(t.object):
                    # Check if target has the reciprocal relation back
                    target_triplets = self._page_triplets_for(t.object, reciprocal_field)
                    has_reciprocal = any(
                        tt.object_kind == "handle" and tt.object == page
                        for tt in target_triplets
                    )
                    if not has_reciprocal:
                        return Gap(
                            axiom_kind="reciprocal",
                            field=field,
                            severity="warning",
                            message=(
                                f"{field}: {t.object} does not have "
                                f"{reciprocal_field}: pointing back to {page}"
                            ),
                            remedy=(
                                f"Add ({t.object}, {reciprocal_field}, {page}) "
                                f"— the target should reference this page"
                            ),
                        )

        elif kind == "target_type":
            expected_type = axiom["expected_type"]
            triplets = self._page_triplets_for(page, field)
            for t in triplets:
                if t.object_kind == "handle" and self.graph.handle_exists(t.object):
                    actual_type = self.graph.page_type(t.object)
                    if actual_type and actual_type != expected_type:
                        return Gap(
                            axiom_kind="target_type",
                            field=field,
                            severity="warning",
                            message=(
                                f"{field}: target {t.object} has type "
                                f"'{actual_type}', expected '{expected_type}'"
                            ),
                            remedy=(
                                f"Change type of {t.object} to '{expected_type}', "
                                f"or fix the {field}: reference in {page}"
                            ),
                        )

        return None

    def check_page(self, page: str) -> SatisfactionResult:
        """Check all axioms for a page against the predicate graph.

        Loads the page's content type and domain, finds the applicable
        axioms, evaluates each one, and returns the result with gaps.
        """
        content_type = self.graph.page_type(page)
        domain = self.graph.page_domain(page)

        result = SatisfactionResult(
            page=page,
            content_type=content_type,
            domain=domain,
        )

        # Collect applicable axioms
        axioms: list[dict] = []

        # Domain-specific axioms
        domain_axioms = DOMAIN_AXIOM_REGISTRY.get(domain, {})
        type_axioms = domain_axioms.get(content_type, [])
        axioms.extend(type_axioms)

        # Universal axioms (only if page has the relevant fields —
        # don't flag missing requires: as a target_exists error
        # when requires: is not expected for this type)
        for ua in UNIVERSAL_AXIOMS:
            if ua["kind"] in ("target_exists", "no_self_ref"):
                # Only check if the page actually has this field
                if self._page_has_predicate(page, ua["field"]):
                    axioms.append(ua)

        # Deduplicate axioms (same kind + field)
        seen = set()
        unique_axioms = []
        for a in axioms:
            key = (a["kind"], a["field"], a.get("reciprocal", ""),
                   a.get("expected_type", ""))
            if key not in seen:
                seen.add(key)
                unique_axioms.append(a)

        result.axioms_checked = len(unique_axioms)

        # Evaluate each axiom
        for axiom in unique_axioms:
            gap = self._check_axiom(page, axiom)
            if gap is None:
                result.axioms_satisfied += 1
            else:
                result.gaps.append(gap)

        return result

    def check_all(self) -> list[SatisfactionResult]:
        """Check satisfaction for every typed page in the graph.

        Only checks pages that have a content type AND belong to a domain
        with defined axioms.
        """
        results = []
        for page in sorted(self.graph.existing_pages):
            content_type = self.graph.page_type(page)
            domain = self.graph.page_domain(page)
            if not content_type:
                continue
            # Check if there are axioms for this domain+type, or universal axioms apply
            domain_axioms = DOMAIN_AXIOM_REGISTRY.get(domain, {})
            type_axioms = domain_axioms.get(content_type, [])
            has_universal = any(
                self._page_has_predicate(page, ua["field"])
                for ua in UNIVERSAL_AXIOMS
                if ua["kind"] in ("target_exists", "no_self_ref")
            )
            if type_axioms or has_universal:
                results.append(self.check_page(page))
        return results


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_triplet(t: Triplet) -> str:
    """Format a triplet for display."""
    kind_marker = "→" if t.object_kind == "handle" else "="
    return f"  ({t.subject}, {t.predicate}, {kind_marker} {t.object})"


def format_satisfaction(result: SatisfactionResult, gaps_only: bool = False) -> str:
    """Format a satisfaction result for display."""
    lines = []
    if gaps_only and result.fully_satisfied and result.warning_count == 0:
        return ""

    status = "SATISFIED" if result.fully_satisfied else "UNSATISFIED"
    marker = "+" if result.fully_satisfied else "x"
    type_label = f" ({result.content_type})" if result.content_type else ""
    domain_label = f" [{result.domain}]" if result.domain else ""

    lines.append(
        f"  {marker} {result.page}{type_label}{domain_label} "
        f"[{status}] "
        f"{result.axioms_satisfied}/{result.axioms_checked} axioms"
    )

    for gap in result.gaps:
        severity = "ERROR" if gap.severity == "error" else "WARN "
        lines.append(f"    {severity} [{gap.axiom_kind}] {gap.message}")
        lines.append(f"           remedy: {gap.remedy}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Build and query the predicate graph. Check axiom satisfaction.")
    parser.add_argument("--triplets", type=str, default=None, metavar="PAGE",
                        help="Show interaction surface for a page")
    parser.add_argument("--incoming", type=str, default=None, metavar="PAGE",
                        help="Show triplets pointing TO a page")
    parser.add_argument("--query", type=str, nargs="+", default=None,
                        metavar=("PRED", "OBJ"),
                        help="Query by predicate [and object]")
    parser.add_argument("--transitive", type=str, nargs=2, default=None,
                        metavar=("PAGE", "PRED"),
                        help="Transitive closure of a relation from a page")
    parser.add_argument("--satisfy", type=str, default=None, metavar="PAGE",
                        help="Check axiom satisfaction for a page")
    parser.add_argument("--satisfy-all", action="store_true",
                        help="Check axiom satisfaction for all typed pages")
    parser.add_argument("--gaps-only", action="store_true",
                        help="With --satisfy-all, show only pages with gaps")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")
    parser.add_argument("--repo-root", type=Path, default=REPO_ROOT,
                        help="Repository root")
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    content_root = repo_root / "content"

    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    # Build the graph
    graph = PredicateGraph.build(content_root)

    # --- Triplets mode ---
    if args.triplets is not None:
        page = args.triplets.replace("\\", "/")
        surface = graph.interaction_surface(page)
        if args.json:
            print(json.dumps({
                "page": page,
                "triplets": [t.to_dict() for t in surface],
            }, indent=2))
        else:
            print(f"\n== Interaction surface: {page} ==")
            print(f"   {len(surface)} triplets")
            for t in surface:
                print(format_triplet(t))
            print()
        return

    # --- Incoming mode ---
    if args.incoming is not None:
        page = args.incoming.replace("\\", "/")
        incoming = graph.incoming(page)
        if args.json:
            print(json.dumps({
                "page": page,
                "incoming": [t.to_dict() for t in incoming],
            }, indent=2))
        else:
            print(f"\n== Incoming: {page} ==")
            print(f"   {len(incoming)} triplets point here")
            for t in incoming:
                print(format_triplet(t))
            print()
        return

    # --- Query mode ---
    if args.query is not None:
        predicate = args.query[0]
        obj = args.query[1] if len(args.query) > 1 else None
        results = graph.query(predicate, obj)
        if args.json:
            print(json.dumps({
                "predicate": predicate,
                "object": obj,
                "results": [t.to_dict() for t in results],
            }, indent=2))
        else:
            label = f"{predicate}"
            if obj:
                label += f" = {obj}"
            print(f"\n== Query: {label} ==")
            print(f"   {len(results)} matches")
            for t in results[:50]:
                print(format_triplet(t))
            if len(results) > 50:
                print(f"   ... and {len(results) - 50} more")
            print()
        return

    # --- Transitive mode ---
    if args.transitive is not None:
        page, predicate = args.transitive
        page = page.replace("\\", "/")
        chain = graph.transitive_closure(page, predicate)
        if args.json:
            print(json.dumps({
                "page": page,
                "predicate": predicate,
                "chain": chain,
                "depth": len(chain),
            }, indent=2))
        else:
            print(f"\n== Transitive closure: {page} via {predicate} ==")
            print(f"   {len(chain)} pages reachable")
            for i, p in enumerate(chain):
                exists = "  " if graph.handle_exists(p) else "! "
                print(f"   {exists}{i+1}. {p}")
            print()
        return

    # --- Satisfy mode (single page) ---
    if args.satisfy is not None:
        page = args.satisfy.replace("\\", "/")
        checker = SatisfactionChecker(graph)
        result = checker.check_page(page)
        if args.json:
            print(json.dumps(result.to_dict(), indent=2))
        else:
            print(f"\n== Satisfaction: {page} ==")
            print(format_satisfaction(result))
            print()
        return

    # --- Satisfy-all mode ---
    if args.satisfy_all:
        checker = SatisfactionChecker(graph)
        results = checker.check_all()

        if args.json:
            total_checked = len(results)
            satisfied = sum(1 for r in results if r.fully_satisfied)
            total_errors = sum(r.error_count for r in results)
            total_warnings = sum(r.warning_count for r in results)
            print(json.dumps({
                "total_checked": total_checked,
                "satisfied": satisfied,
                "unsatisfied": total_checked - satisfied,
                "total_errors": total_errors,
                "total_warnings": total_warnings,
                "results": [r.to_dict() for r in results
                            if not args.gaps_only or not r.fully_satisfied
                            or r.warning_count > 0],
            }, indent=2))
        else:
            total_checked = len(results)
            satisfied = sum(1 for r in results if r.fully_satisfied)
            total_errors = sum(r.error_count for r in results)
            total_warnings = sum(r.warning_count for r in results)
            total_axioms = sum(r.axioms_checked for r in results)
            total_axioms_sat = sum(r.axioms_satisfied for r in results)

            print(f"\n== Satisfaction Check: Repository ==")
            print(f"   Pages checked:     {total_checked}")
            print(f"   Fully satisfied:   {satisfied}"
                  f" ({round(100 * satisfied / max(total_checked, 1), 1)}%)")
            print(f"   With errors:       {total_checked - satisfied}")
            print(f"   Total axioms:      {total_axioms}")
            print(f"   Axioms satisfied:  {total_axioms_sat}"
                  f" ({round(100 * total_axioms_sat / max(total_axioms, 1), 1)}%)")
            print(f"   Total errors:      {total_errors}")
            print(f"   Total warnings:    {total_warnings}")
            print()

            # Per-domain summary
            domain_stats: dict[str, dict] = defaultdict(
                lambda: {"checked": 0, "satisfied": 0, "errors": 0, "warnings": 0})
            for r in results:
                d = r.domain or "(no domain)"
                domain_stats[d]["checked"] += 1
                if r.fully_satisfied:
                    domain_stats[d]["satisfied"] += 1
                domain_stats[d]["errors"] += r.error_count
                domain_stats[d]["warnings"] += r.warning_count

            print("   By domain:")
            for d in sorted(domain_stats):
                ds = domain_stats[d]
                pct = round(100 * ds["satisfied"] / max(ds["checked"], 1), 1)
                print(f"     {d}: {ds['satisfied']}/{ds['checked']}"
                      f" satisfied ({pct}%),"
                      f" {ds['errors']} errors, {ds['warnings']} warnings")
            print()

            # Individual results
            for r in results:
                output = format_satisfaction(r, args.gaps_only)
                if output:
                    print(output)
            print()

        return

    # --- Default: stats mode ---
    s = graph.stats()
    if args.json:
        print(json.dumps(s, indent=2))
    else:
        print(f"\n== Predicate Graph ==")
        print(f"   Total pages:           {s['total_pages']}")
        print(f"   Pages with triplets:   {s['pages_with_triplets']}")
        print(f"   Typed pages:           {s['typed_pages']}")
        print(f"   Total triplets:        {s['total_triplets']}")
        print(f"   Handle triplets:       {s['handle_triplets']}")
        print(f"   Value triplets:        {s['value_triplets']}")
        print(f"   Unique predicates:     {s['unique_predicates']}")
        print()
        print("   Predicates (top 20):")
        for pred, count in list(s["predicates"].items())[:20]:
            print(f"     {count:5d}  {pred}")
        print()
        print("   Content types (top 15):")
        for t, count in list(s["types"].items())[:15]:
            print(f"     {count:5d}  {t}")
        print()
        print("   Domains:")
        for d, count in list(s["domains"].items()):
            print(f"     {count:5d}  {d}")
        print()


if __name__ == "__main__":
    main()
