#!/usr/bin/env python3
"""Compute fragments, closures, and deltas for ASR content.

Operationalizes the fragment calculus from mathematics/texts/fragment-calculus.md:
a fragment F = <A, K, Π> where A is assumptions, K is claims, Π is provenance.

A page's fragment is built from its frontmatter:
  A (assumptions)  = requires: + extends:  (what this page depends on)
  K (claims)       = defines: + teaches:   (what this page contributes)
  Π (provenance)   = cites: + authors:     (who/what supports the claims)

Closure Cl(F) follows the requires: chain transitively, collecting all
fragments reachable from the seed. A fragment is "closed" when every
dependency in A resolves to a page whose own fragment is also closed.

Delta Delta(F -> G) reports what changes are needed to make two fragments
compatible — what one has that the other lacks.

Usage:
  python fragment.py <path>                 # compute fragment for one page
  python fragment.py <path> --closure       # compute transitive closure
  python fragment.py <path1> --delta <path2> # compute delta between two pages
  python fragment.py <dir> --summary        # fragment summary for a directory
  python fragment.py --json                 # output as JSON
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent.parent

# ---------------------------------------------------------------------------
# Frontmatter parsing
# ---------------------------------------------------------------------------

def parse_frontmatter(file_path: Path) -> dict | None:
    """Parse YAML frontmatter from a markdown file. Returns dict or None."""
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
        # List continuation
        if line.startswith("  - ") or line.startswith("    - "):
            val = line.strip().lstrip("- ").strip().strip('"').strip("'")
            if current_key and current_list is not None:
                current_list.append(val)
            continue

        # Key: value
        match = re.match(r"^(\S[^:]*)\s*:\s*(.*)", line)
        if match:
            key = match.group(1).strip()
            val = match.group(2).strip().strip('"').strip("'")
            if val == "" or val == "[]":
                fm[key] = []
                current_key = key
                current_list = fm[key]
            elif val.startswith("[") and val.endswith("]"):
                # Inline list
                items = [v.strip().strip('"').strip("'")
                         for v in val[1:-1].split(",") if v.strip()]
                fm[key] = items
                current_key = key
                current_list = fm[key]
            else:
                fm[key] = val
                current_key = key
                current_list = None
        elif line.strip().startswith("- "):
            val = line.strip().lstrip("- ").strip().strip('"').strip("'")
            if current_key is not None:
                if not isinstance(fm.get(current_key), list):
                    fm[current_key] = []
                    current_list = fm[current_key]
                current_list.append(val)

    return fm


def resolve_path(source_dir: Path, ref: str, content_root: Path) -> Path:
    """Resolve a path reference to an absolute filesystem path."""
    if ref.startswith("/"):
        return (content_root / ref.lstrip("/")).resolve()
    return (source_dir / ref).resolve()


def is_path_reference(value: str) -> bool:
    """Check if a string looks like a file path reference."""
    return "/" in value or value.endswith(".md")


# ---------------------------------------------------------------------------
# Fragment computation
# ---------------------------------------------------------------------------

class Fragment:
    """A fragment F = <A, K, Π> for a single page."""

    def __init__(self, path: str, content_type: str = ""):
        self.path = path
        self.content_type = content_type
        self.assumptions: list[str] = []    # A: requires + extends (paths)
        self.claims: list[str] = []         # K: defines + teaches (values)
        self.provenance: list[str] = []     # Π: cites + authors (values)
        self.broken_assumptions: list[str] = []  # paths that don't resolve
        self.extra_relations: dict[str, list[str]] = {}  # other typed relations

    def to_dict(self) -> dict:
        d = {
            "path": self.path,
            "type": self.content_type,
            "A": self.assumptions,
            "K": self.claims,
            "P": self.provenance,
        }
        if self.broken_assumptions:
            d["broken"] = self.broken_assumptions
        if self.extra_relations:
            d["relations"] = self.extra_relations
        return d

    @property
    def is_well_formed(self) -> bool:
        """A fragment is well-formed if it has at least one claim."""
        return len(self.claims) > 0

    @property
    def has_provenance(self) -> bool:
        return len(self.provenance) > 0

    @property
    def is_grounded(self) -> bool:
        """A fragment is grounded if all its assumptions resolve."""
        return len(self.broken_assumptions) == 0


def compute_fragment(file_path: Path, content_root: Path) -> Fragment | None:
    """Compute the fragment for a single page."""
    fm = parse_frontmatter(file_path)
    if fm is None:
        return None

    rel_path = str(file_path.relative_to(content_root))
    content_type = fm.get("type", "")
    frag = Fragment(rel_path, content_type)

    file_dir = file_path.parent

    # A: assumptions (what this page depends on)
    for field in ("requires", "extends"):
        vals = fm.get(field, [])
        if isinstance(vals, str):
            vals = [vals]
        if not isinstance(vals, list):
            continue
        for val in vals:
            if is_path_reference(val):
                resolved = resolve_path(file_dir, val, content_root)
                if resolved.exists():
                    try:
                        frag.assumptions.append(
                            str(resolved.relative_to(content_root)))
                    except ValueError:
                        frag.assumptions.append(str(resolved))
                else:
                    frag.broken_assumptions.append(val)
            else:
                # Conceptual prerequisite — still an assumption
                frag.assumptions.append(f"[concept] {val}")

    # K: claims (what this page contributes)
    for field in ("defines", "teaches"):
        vals = fm.get(field, [])
        if isinstance(vals, str):
            vals = [vals]
        if not isinstance(vals, list):
            continue
        for val in vals:
            frag.claims.append(val)

    # Π: provenance (who/what supports the claims)
    for field in ("cites", "authors"):
        vals = fm.get(field, [])
        if isinstance(vals, str):
            vals = [vals]
        if not isinstance(vals, list):
            continue
        for val in vals:
            frag.provenance.append(val)

    # Extra typed relations (domain-specific)
    relation_fields = {
        "integrates", "produces", "sustains", "contests",
        "uses-concepts", "emerges-under", "school",
        "uses-mechanic", "classifies", "boundary-with", "models",
        "part-of", "questions", "addresses", "targets",
        "proven-by", "enables", "notation",
    }
    for field in relation_fields:
        vals = fm.get(field, [])
        if isinstance(vals, str):
            vals = [vals]
        if isinstance(vals, list) and vals:
            frag.extra_relations[field] = vals

    return frag


# ---------------------------------------------------------------------------
# Closure computation
# ---------------------------------------------------------------------------

class Closure:
    """The transitive closure of a fragment's assumption chain."""

    def __init__(self, seed_path: str):
        self.seed = seed_path
        self.fragments: dict[str, Fragment] = {}  # path -> Fragment
        self.depth: int = 0
        self.broken: list[dict] = []  # {source, target, reason}
        self.unclosed: list[str] = []  # pages whose fragments lack claims

    def to_dict(self) -> dict:
        return {
            "seed": self.seed,
            "depth": self.depth,
            "total_pages": len(self.fragments),
            "total_claims": sum(len(f.claims) for f in self.fragments.values()),
            "total_assumptions": sum(
                len(f.assumptions) for f in self.fragments.values()),
            "total_provenance": sum(
                len(f.provenance) for f in self.fragments.values()),
            "broken_links": self.broken,
            "unclosed_pages": self.unclosed,
            "is_closed": len(self.broken) == 0 and len(self.unclosed) == 0,
            "pages": {p: f.to_dict() for p, f in self.fragments.items()},
        }

    @property
    def is_closed(self) -> bool:
        return len(self.broken) == 0


def compute_closure(file_path: Path, content_root: Path,
                    max_depth: int = 20) -> Closure:
    """Compute the transitive closure of a page's fragment."""
    rel_path = str(file_path.relative_to(content_root))
    closure = Closure(rel_path)

    visited: set[str] = set()
    frontier: list[tuple[Path, int]] = [(file_path, 0)]

    while frontier:
        current_path, depth = frontier.pop(0)
        try:
            current_rel = str(current_path.relative_to(content_root))
        except ValueError:
            continue

        if current_rel in visited:
            continue
        visited.add(current_rel)

        if depth > closure.depth:
            closure.depth = depth

        if depth >= max_depth:
            continue

        frag = compute_fragment(current_path, content_root)
        if frag is None:
            closure.unclosed.append(current_rel)
            continue

        closure.fragments[current_rel] = frag

        if not frag.is_well_formed and frag.content_type not in ("index", "topic", ""):
            closure.unclosed.append(current_rel)

        # Track broken links
        for broken in frag.broken_assumptions:
            closure.broken.append({
                "source": current_rel,
                "target": broken,
                "reason": "path does not resolve",
            })

        # Follow resolved path assumptions
        for assumption in frag.assumptions:
            if assumption.startswith("[concept]"):
                continue
            assumption_path = content_root / assumption
            if assumption_path.exists() and str(assumption) not in visited:
                frontier.append((assumption_path, depth + 1))

    return closure


# ---------------------------------------------------------------------------
# Delta computation
# ---------------------------------------------------------------------------

class Delta:
    """The delta Delta(F -> G) between two fragments."""

    def __init__(self, source: str, target: str):
        self.source = source
        self.target = target
        self.claims_only_in_source: list[str] = []
        self.claims_only_in_target: list[str] = []
        self.claims_shared: list[str] = []
        self.assumptions_only_in_source: list[str] = []
        self.assumptions_only_in_target: list[str] = []
        self.provenance_only_in_source: list[str] = []
        self.provenance_only_in_target: list[str] = []

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "target": self.target,
            "claims_only_in_source": self.claims_only_in_source,
            "claims_only_in_target": self.claims_only_in_target,
            "claims_shared": self.claims_shared,
            "assumptions_only_in_source": self.assumptions_only_in_source,
            "assumptions_only_in_target": self.assumptions_only_in_target,
            "provenance_only_in_source": self.provenance_only_in_source,
            "provenance_only_in_target": self.provenance_only_in_target,
            "tension": self.tension_index,
        }

    @property
    def tension_index(self) -> float:
        """Heuristic cost of merging the two fragments.

        Higher = more divergent. 0 = identical.
        """
        unique_claims = (len(self.claims_only_in_source)
                         + len(self.claims_only_in_target))
        unique_assumptions = (len(self.assumptions_only_in_source)
                              + len(self.assumptions_only_in_target))
        shared = max(len(self.claims_shared), 1)
        return round((unique_claims + 0.5 * unique_assumptions) / shared, 2)


def compute_delta(frag_a: Fragment, frag_b: Fragment) -> Delta:
    """Compute the delta between two fragments."""
    delta = Delta(frag_a.path, frag_b.path)

    claims_a = set(frag_a.claims)
    claims_b = set(frag_b.claims)
    delta.claims_shared = sorted(claims_a & claims_b)
    delta.claims_only_in_source = sorted(claims_a - claims_b)
    delta.claims_only_in_target = sorted(claims_b - claims_a)

    assumptions_a = set(frag_a.assumptions)
    assumptions_b = set(frag_b.assumptions)
    delta.assumptions_only_in_source = sorted(assumptions_a - assumptions_b)
    delta.assumptions_only_in_target = sorted(assumptions_b - assumptions_a)

    prov_a = set(frag_a.provenance)
    prov_b = set(frag_b.provenance)
    delta.provenance_only_in_source = sorted(prov_a - prov_b)
    delta.provenance_only_in_target = sorted(prov_b - prov_a)

    return delta


# ---------------------------------------------------------------------------
# Directory summary
# ---------------------------------------------------------------------------

def compute_directory_summary(dir_path: Path, content_root: Path) -> dict:
    """Compute fragment statistics for all pages in a directory."""
    skip = {"private", "meta", "slop", "triage", ".obsidian"}

    total = 0
    well_formed = 0
    grounded = 0
    with_provenance = 0
    claim_counts: dict[str, int] = {}
    broken_count = 0
    type_counts: dict[str, int] = {}

    for md_file in sorted(dir_path.rglob("*.md")):
        rel = md_file.relative_to(content_root)
        if any(p in skip for p in rel.parts):
            continue
        if any(p.startswith(".") for p in rel.parts):
            continue

        frag = compute_fragment(md_file, content_root)
        if frag is None:
            continue

        total += 1
        if frag.content_type:
            type_counts[frag.content_type] = type_counts.get(
                frag.content_type, 0) + 1

        if frag.is_well_formed:
            well_formed += 1
        if frag.is_grounded:
            grounded += 1
        if frag.has_provenance:
            with_provenance += 1
        broken_count += len(frag.broken_assumptions)

        for claim in frag.claims:
            claim_counts[claim] = claim_counts.get(claim, 0) + 1

    return {
        "directory": str(dir_path.relative_to(content_root)),
        "total_pages": total,
        "well_formed": well_formed,
        "well_formed_pct": round(100 * well_formed / max(total, 1), 1),
        "grounded": grounded,
        "grounded_pct": round(100 * grounded / max(total, 1), 1),
        "with_provenance": with_provenance,
        "provenance_pct": round(100 * with_provenance / max(total, 1), 1),
        "broken_links": broken_count,
        "types": type_counts,
        "unique_claims": len(claim_counts),
        "top_claims": sorted(claim_counts.items(), key=lambda x: -x[1])[:10],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Compute fragments, closures, and deltas for ASR content")
    parser.add_argument("path", type=Path,
                        help="Path to a file or directory")
    parser.add_argument("--closure", action="store_true",
                        help="Compute transitive closure of requires: chain")
    parser.add_argument("--delta", type=Path, default=None,
                        help="Compute delta against another file")
    parser.add_argument("--summary", action="store_true",
                        help="Compute fragment summary for a directory")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")
    parser.add_argument("--repo-root", type=Path, default=REPO_ROOT,
                        help="Repository root")
    parser.add_argument("--max-depth", type=int, default=20,
                        help="Maximum closure depth")
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    content_root = repo_root / "content"
    target = args.path
    if not target.is_absolute():
        target = (Path.cwd() / target).resolve()
    else:
        target = target.resolve()

    # Directory summary mode
    if args.summary or target.is_dir():
        result = compute_directory_summary(target, content_root)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"\n== Fragment Summary: {result['directory']} ==")
            print(f"   Pages:          {result['total_pages']}")
            print(f"   Well-formed:    {result['well_formed']}"
                  f" ({result['well_formed_pct']}%)"
                  f"  [has at least one claim]")
            print(f"   Grounded:       {result['grounded']}"
                  f" ({result['grounded_pct']}%)"
                  f"  [all assumptions resolve]")
            print(f"   With provenance: {result['with_provenance']}"
                  f" ({result['provenance_pct']}%)"
                  f"  [has cites: or authors:]")
            print(f"   Broken links:   {result['broken_links']}")
            print(f"   Unique claims:  {result['unique_claims']}")
            print(f"   Types: {result['types']}")
            if result["top_claims"]:
                print(f"   Top claims:")
                for claim, count in result["top_claims"]:
                    print(f"     {count:3d}x  {claim}")
            print()
        return

    if not target.exists():
        print(f"Error: {target} does not exist", file=sys.stderr)
        sys.exit(1)

    # Delta mode
    if args.delta:
        delta_target = args.delta
        if not delta_target.is_absolute():
            delta_target = Path.cwd() / delta_target
        frag_a = compute_fragment(target, content_root)
        frag_b = compute_fragment(delta_target, content_root)
        if frag_a is None or frag_b is None:
            print("Error: could not parse frontmatter", file=sys.stderr)
            sys.exit(1)
        delta = compute_delta(frag_a, frag_b)
        if args.json:
            print(json.dumps(delta.to_dict(), indent=2))
        else:
            print(f"\n== Delta: {delta.source} -> {delta.target} ==")
            print(f"   Tension index: {delta.tension_index}")
            print(f"   Claims shared: {delta.claims_shared}")
            print(f"   Claims only in source: {delta.claims_only_in_source}")
            print(f"   Claims only in target: {delta.claims_only_in_target}")
            print(f"   Assumptions only in source:"
                  f" {delta.assumptions_only_in_source}")
            print(f"   Assumptions only in target:"
                  f" {delta.assumptions_only_in_target}")
            print()
        return

    # Closure mode
    if args.closure:
        closure = compute_closure(target, content_root, args.max_depth)
        if args.json:
            print(json.dumps(closure.to_dict(), indent=2))
        else:
            print(f"\n== Closure: {closure.seed} ==")
            print(f"   Depth:          {closure.depth}")
            print(f"   Total pages:    {closure.to_dict()['total_pages']}")
            print(f"   Total claims:   {closure.to_dict()['total_claims']}")
            print(f"   Total assumptions:"
                  f" {closure.to_dict()['total_assumptions']}")
            print(f"   Broken links:   {len(closure.broken)}")
            print(f"   Unclosed pages: {len(closure.unclosed)}")
            print(f"   Is closed:      {closure.is_closed}")
            if closure.broken:
                print(f"   Broken:")
                for b in closure.broken[:10]:
                    print(f"     {b['source']} -> {b['target']}")
            if closure.unclosed:
                print(f"   Unclosed:")
                for u in closure.unclosed[:10]:
                    print(f"     {u}")
            print()
        return

    # Single fragment mode
    frag = compute_fragment(target, content_root)
    if frag is None:
        print("Error: could not parse frontmatter", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(frag.to_dict(), indent=2))
    else:
        print(f"\n== Fragment: {frag.path} ==")
        print(f"   Type:         {frag.content_type}")
        print(f"   Well-formed:  {frag.is_well_formed}")
        print(f"   Grounded:     {frag.is_grounded}")
        print(f"   Provenance:   {frag.has_provenance}")
        print(f"   A (assumptions): {frag.assumptions}")
        print(f"   K (claims):      {frag.claims}")
        print(f"   P (provenance):  {frag.provenance}")
        if frag.broken_assumptions:
            print(f"   Broken:       {frag.broken_assumptions}")
        if frag.extra_relations:
            print(f"   Relations:    {frag.extra_relations}")
        print()


if __name__ == "__main__":
    main()
