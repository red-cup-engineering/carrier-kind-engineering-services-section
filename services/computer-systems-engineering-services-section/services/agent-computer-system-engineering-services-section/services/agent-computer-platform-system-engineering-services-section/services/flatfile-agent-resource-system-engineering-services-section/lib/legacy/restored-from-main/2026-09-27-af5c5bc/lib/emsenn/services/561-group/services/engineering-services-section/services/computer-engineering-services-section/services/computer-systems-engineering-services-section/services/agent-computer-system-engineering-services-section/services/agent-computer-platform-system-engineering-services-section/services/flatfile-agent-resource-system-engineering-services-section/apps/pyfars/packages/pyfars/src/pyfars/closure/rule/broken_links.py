"""Body markdown links to ``.md`` targets that don't resolve to a known slug.

Each broken link becomes one ``broken-link`` Diagnostic carrying the
source path, line number, and the target slug that didn't match.
"""
from __future__ import annotations

from typing import Container, Iterator

from pyfars.substrate.parse._slug_target import slug_of
from pyfars.substrate.parse.markdown_links import parse as parse_links
from pyfars.substrate.types.diagnostic import Diagnostic
from pyfars.substrate.flatfile import Flatfile

# Filename stems that name a directory-index file (no slug, just structural).
# Links to these resolve to a folder's overview rather than a content note,
# so they should be filesystem-existence-checked rather than slug-resolved.
# We accept them unconditionally here; explicit existence checking is the
# job of a separate filesystem-link rule (not yet present).
_INDEX_STEMS = frozenset({"README", "_index"})


def check(notes: list[Flatfile], known_slugs: Container[str]) -> Iterator[Diagnostic]:
    for n in notes:
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            tgt = slug_of(link.target_raw, require_md=True)
            if tgt is None or tgt in known_slugs or tgt in _INDEX_STEMS:
                continue
            yield Diagnostic(
                code="broken-links",
                severity="error",
                message=f"references missing slug `{tgt}`",
                path=n.path,
                line=link.line,
                extra={"slug": n.slug, "target": tgt, "target_raw": link.target_raw},
            )
