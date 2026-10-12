"""Resolve workitem slugs and endpoint records via the Substrate index.

Work verbs (assign/execute/track/...) resolve task slugs that may live in
triage workspaces, plus assignment/observation records under
operations/engineering/records/work/<spoke>/. Both directory classes are
excluded by the default substrate filter (records aren't library content;
triage holds intentional drafts), so we load with a permissive filter that
keeps both in addition to the standard library set.
"""
from __future__ import annotations

from pathlib import Path

from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.store import Substrate


def _records_aware_filter(p: Path) -> bool:
    """Keep records and triage paths in addition to the standard library set."""
    s = str(p).replace("\\", "/")
    if "/operations/engineering/records/" in s and s.endswith(".md"):
        return True
    if "/triage/" in s and s.endswith(".md"):
        return True
    from pyfars.substrate.load._path_filter import keep
    return keep(p)


def load(root: Path) -> Substrate:
    return Substrate(root=root, path_filter=_records_aware_filter)


def resolve(sub: Substrate, slug: str) -> Flatfile | None:
    """Return the first match for `slug`, or None."""
    matches = sub.by_slug.get(slug, [])
    if not matches:
        return None
    return matches[0]


def is_endpoint(note: Flatfile) -> bool:
    return note.fm.get("type") == "llm-endpoint"


def is_unix_tool(note: Flatfile) -> bool:
    return note.fm.get("type") == "unix-tool"


def is_assignment(note: Flatfile) -> bool:
    return note.fm.get("kind") == "assignment" or note.fm.get("is-a") == "assignment"
