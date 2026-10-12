"""Walk upward from a path to find a useful corpus root for slug resolution.

The corpus root is the directory whose slug-universe a validator should
resolve markdown links against. By convention, the most useful root is the
*outermost theory ancestor* — the topmost strict-ancestor directory that
still itself contains the strong theory-content subdirs.

Why outermost rather than nearest: a sub-theory's notes typically reference
entities at *every* level above it (its immediate parent theory's concepts,
its grandparent theory's morphisms, etc.). Resolving against the outermost
theory ancestor's slug universe captures all of these in one Substrate
load. The outermost is bounded because the chain stops as soon as an
ancestor is no longer a theory (e.g., a generic content directory that
just contains ``theories/`` and an ``_index.md`` is not itself a theory).

Strong theory markers — at least one must be present for an ancestor to
qualify as a theory ancestor:
  - ``concepts/``, ``objects/``, ``theorems/``, ``morphisms/``

Weaker markers (``narratives/``, ``questions/``, ``examples/``, ``terms/``)
are not used here because they appear on non-theory directories too (e.g.
content-aggregator directories that carry a ``terms/`` glossary).

Returns the *outermost* strict-ancestor of ``start`` reached by an
unbroken chain of theory ancestors, or ``None`` when no theory ancestor
is found within ``max_depth`` parents.
"""

from __future__ import annotations

from pathlib import Path

_STRONG_THEORY_MARKERS = ("concepts", "objects", "theorems", "morphisms")
_DEFAULT_MAX_DEPTH = 32


def looks_like_theory(directory: Path) -> bool:
    """True iff ``directory`` itself contains a strong theory subdir."""
    return any((directory / m).is_dir() for m in _STRONG_THEORY_MARKERS)


def find(start: Path, *, max_depth: int = _DEFAULT_MAX_DEPTH) -> Path | None:
    """Return the outermost strict-ancestor of ``start`` that looks like a theory.

    Walks parents of ``start`` (excluding ``start`` itself), within the
    bounded depth. Tracks every theory ancestor encountered and returns the
    outermost (topmost) one. Non-theory ancestors (e.g. intermediate
    ``theories/`` subdirectories or generic content directories) are
    skipped without breaking the search.

    Returns ``None`` when no theory ancestor is found within ``max_depth``
    parents.
    """
    start = start.resolve()
    parents = list(start.parents)[:max_depth]
    outermost: Path | None = None
    for parent in parents:
        if looks_like_theory(parent):
            outermost = parent
    return outermost
