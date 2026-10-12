"""Reference resolves to multiple records.

The substrate's namespace is the path; the slug is just the path tail.
Same-tail records are normal — what matters is whether *references*
resolve uniquely. A reference (frontmatter relation value or body
markdown link) is resolved by **path-suffix match**: the reference's
component list (e.g. ``["personnel", "cassia-lorne"]``) matches every
record whose path ends with those components. Zero matches → broken
link (handled by ``broken_links``). Exactly one → resolved. More than
one → ambiguous; the writer disambiguates by lengthening the reference
to include more enclosing path.

This rule replaces the older ``slug-collision`` rule, which fired on
records sharing a tail regardless of whether anyone cited the shared
tail. That was a category error: the substrate addresses records by
path; the tail is for human-friendly short reference.
"""
from __future__ import annotations

from typing import Iterator

from pyfars.substrate.parse._path_target import (
    matches,
    record_components,
    target_components,
)
from pyfars.substrate.parse.fm_relations import RELATION_KEYS
from pyfars.substrate.parse.markdown_links import parse as parse_links
from pyfars.substrate.types.diagnostic import Diagnostic
from pyfars.substrate.flatfile import Flatfile


def _resolve(target: list[str],
             records: list[tuple[list[str], Flatfile]]) -> list[Flatfile]:
    return [r for comps, r in records if matches(target, comps)]


def check(notes: list[Flatfile]) -> Iterator[Diagnostic]:
    records: list[tuple[list[str], Flatfile]] = [
        (record_components(n.path), n) for n in notes
    ]
    for n in notes:
        for key in RELATION_KEYS:
            v = n.fm.get(key)
            items = v if isinstance(v, list) else [v] if isinstance(v, str) else []
            for item in items:
                if not isinstance(item, str):
                    continue
                tgt = target_components(item)
                if tgt is None:
                    continue
                hits = _resolve(tgt, records)
                if len(hits) < 2:
                    continue
                paths = sorted(str(h.path) for h in hits)
                yield Diagnostic(
                    code="ambiguous-reference",
                    severity="warning",
                    message=f"`{key}: {item}` resolves to {len(hits)} records: "
                            + ", ".join(f"`{p}`" for p in paths),
                    path=n.path,
                    extra={"slug": n.slug, "key": key,
                           "target": "/".join(tgt), "paths": paths},
                )
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            tgt = target_components(link.target_raw, require_md=True)
            if tgt is None:
                continue
            hits = _resolve(tgt, records)
            if len(hits) < 2:
                continue
            paths = sorted(str(h.path) for h in hits)
            yield Diagnostic(
                code="ambiguous-reference",
                severity="warning",
                message=f"link `{link.target_raw}` resolves to {len(hits)} records: "
                        + ", ".join(f"`{p}`" for p in paths),
                path=n.path,
                line=link.line,
                extra={"slug": n.slug, "target_raw": link.target_raw,
                       "target": "/".join(tgt), "paths": paths},
            )
