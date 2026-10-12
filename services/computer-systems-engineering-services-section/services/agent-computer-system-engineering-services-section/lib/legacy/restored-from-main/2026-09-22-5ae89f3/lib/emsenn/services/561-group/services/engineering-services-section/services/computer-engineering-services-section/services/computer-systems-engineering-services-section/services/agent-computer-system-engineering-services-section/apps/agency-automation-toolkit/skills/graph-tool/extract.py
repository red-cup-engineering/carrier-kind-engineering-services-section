"""
Extract a relational graph from a directory of markdown files.

Every file is a Base. Every frontmatter key-value pair is a Claim:
    file --key--> value

Values that appear across multiple files become shared Bases,
connecting those files through them.

Output: JSON with two arrays, bases and claims.
"""

import sys
import json
import hashlib
from pathlib import Path

import yaml


def base_id(value: str) -> str:
    """Stable short id for a base."""
    return hashlib.sha256(value.encode()).hexdigest()[:12]


def extract_claims(filepath: Path, root: Path):
    """Yield (subject, predicate, object) triples from one file's frontmatter."""
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except (OSError, FileNotFoundError):
        return
    if not text.startswith("---"):
        return

    parts = text.split("---", 2)
    if len(parts) < 3:
        return

    try:
        fm = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return

    if not isinstance(fm, dict):
        return

    subject = str(filepath.relative_to(root))

    for key, value in fm.items():
        if value is None:
            continue
        yield from _flatten_value(subject, key, value)


def _flatten_value(subject, predicate, value):
    """Flatten nested values into individual claims."""
    if isinstance(value, list):
        for item in value:
            yield from _flatten_value(subject, predicate, item)
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from _flatten_value(subject, f"{predicate}.{k}", v)
    else:
        yield (subject, str(predicate), str(value))


def build_graph(root: Path):
    bases = {}  # id -> {id, value, kind}
    claims = []  # [{subject, predicate, object}]

    for filepath in sorted(root.rglob("*.md")):
        rel = str(filepath.relative_to(root))
        fid = base_id(rel)
        bases[fid] = {"id": fid, "value": rel, "kind": "file"}

        for subj, pred, obj in extract_claims(filepath, root):
            oid = base_id(obj)
            if oid not in bases:
                bases[oid] = {"id": oid, "value": obj, "kind": "token"}
            claims.append({
                "subject": base_id(subj),
                "predicate": pred,
                "object": oid,
            })

    return {"bases": list(bases.values()), "claims": claims}


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <directory> [output.json]", file=sys.stderr)
        sys.exit(1)

    root = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    graph = build_graph(root)

    result = json.dumps(graph, indent=2)
    if out:
        out.write_text(result, encoding="utf-8")
        print(f"{len(graph['bases'])} bases, {len(graph['claims'])} claims -> {out}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
