"""Rewrite a slug value inside a note's frontmatter relation keys.

Walks every relation key (``depends-on``, ``see-also``, ``component-of``,
…) and replaces matches of ``old_slug`` with ``new_slug``. Path-y
values normalize before comparison: ``../foo/old.md`` matches
``old`` and is rewritten to the literal ``new_slug`` (the path-y
spelling is collapsed; downstream tools normalize anyway).

Pure — returns ``(new_fm, changes)``; the caller decides whether and
how to write it back.
"""

from __future__ import annotations

from collections.abc import Iterable

from pyfars.substrate.parse._slug_target import slug_of
from pyfars.substrate.parse.fm_relations import RELATION_KEYS


def rewrite(
    fm: dict, old_slug: str, new_slug: str, *, keys: Iterable[str] = RELATION_KEYS
) -> tuple[dict, int]:
    changes = 0
    new_fm = dict(fm)
    for k in keys:
        v = new_fm.get(k)
        if isinstance(v, list):
            new_list = []
            modified = False
            for item in v:
                if isinstance(item, str) and slug_of(item) == old_slug:
                    new_list.append(new_slug)
                    modified = True
                else:
                    new_list.append(item)
            if modified:
                new_fm[k] = new_list
                changes += 1
        elif isinstance(v, str) and slug_of(v) == old_slug:
            new_fm[k] = new_slug
            changes += 1
    return new_fm, changes
