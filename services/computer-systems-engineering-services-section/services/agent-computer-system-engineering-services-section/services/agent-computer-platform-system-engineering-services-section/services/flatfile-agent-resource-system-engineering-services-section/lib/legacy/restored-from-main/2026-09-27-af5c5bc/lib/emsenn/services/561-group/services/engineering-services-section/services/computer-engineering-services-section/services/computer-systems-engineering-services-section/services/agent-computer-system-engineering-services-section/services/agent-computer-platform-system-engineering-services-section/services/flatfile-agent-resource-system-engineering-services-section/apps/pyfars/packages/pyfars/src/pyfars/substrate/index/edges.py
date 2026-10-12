"""Build the full edge list across notes.

Frontmatter relations (``depends-on``, ``see-also``, …) become ``Predication``s
with ``source='fm'`` and ``kind`` = the relation name. Body markdown links
to ``.md`` targets become ``Predication``s with ``source='body'`` and
``kind='link'``; the destination is the bare slug extracted from the
target path. ``sources`` selects which families to include.
"""

from __future__ import annotations

from collections.abc import Iterable

from pyfars.convention import RELATION_KEYS
from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.parse._slug_target import slug_of
from pyfars.substrate.parse.fm_relations import parse as parse_fm_relations
from pyfars.substrate.parse.markdown_links import parse as parse_links
from pyfars.substrate.predication import Predication


def build(
    notes: list[Flatfile],
    *,
    sources: Iterable[str] = ("fm", "body"),
    relation_keys: Iterable[str] = RELATION_KEYS,
) -> list[Predication]:
    sources = set(sources)
    out: list[Predication] = []
    for n in notes:
        if "fm" in sources:
            out.extend(parse_fm_relations(n.fm, slug=n.slug, keys=relation_keys))
        if "body" in sources:
            for link in parse_links(n.body):
                if link.kind not in ("relative", "absolute"):
                    continue
                slug = slug_of(link.target_raw, require_md=True)
                if slug is None:
                    continue
                out.append(
                    Predication(
                        src=n.slug,
                        dst=slug,
                        kind="link",
                        source="body",
                        line=link.line,
                    )
                )
    return out
