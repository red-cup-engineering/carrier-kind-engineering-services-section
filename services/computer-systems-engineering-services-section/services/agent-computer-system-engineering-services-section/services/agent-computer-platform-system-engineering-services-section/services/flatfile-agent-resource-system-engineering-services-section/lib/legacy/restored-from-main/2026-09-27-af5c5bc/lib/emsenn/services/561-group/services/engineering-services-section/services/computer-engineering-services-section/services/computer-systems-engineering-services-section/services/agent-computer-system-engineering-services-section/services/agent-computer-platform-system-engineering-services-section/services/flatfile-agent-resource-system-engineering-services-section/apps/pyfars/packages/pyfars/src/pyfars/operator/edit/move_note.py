"""Move/rename a note and rewrite every inbound reference.

Moves the file, then for every inbound:
  - **fm references**: rewrite the slug value in the citing note's
    frontmatter (via ``operator.relocation.rewrite_fm_slug``).
  - **body links**: replace ``[text](old_target_raw)`` with
    ``[text](new_target_raw)`` in the citing note's body (via
    ``operator.relocation.rewrite_body_link``).

Each of the move itself and every citing-note rewrite is its own
witnessed write (``operator.relocation``'s append-only guard) — the
composite change is auditable file-by-file rather than as one opaque
multi-file transaction. Dry-run by default (``apply=False``): nothing
is witnessed or written, only planned counts are reported.

When the slug doesn't change (only the path moves), body links are
still updated because their target paths shift. When the slug changes
but the parent dir is the same, fm refs change and body links keyed by
``slug.md`` change too.
"""
from __future__ import annotations

import os
from pathlib import Path

from pyfars.analyze.inbound_refs import body_refs, fm_refs
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.witness import Witness
from pyfars.operator import relocation
from pyfars.substrate.flatfile import Flatfile


def move(
    old_note: Flatfile,
    new_path: Path,
    *,
    root: Path,
    all_notes: list[Flatfile],
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = "substrate",
    apply: bool = False,
) -> dict:
    old_full = (root / old_note.path).resolve()
    new_full = new_path.resolve()
    new_slug = new_full.stem if new_full.name != "_index.md" else new_full.parent.name
    old_slug = old_note.slug
    summary: dict[str, object] = {
        "fm": 0,
        "body": 0,
        "moved": False,
        "old": str(old_full),
        "new": str(new_full),
        "old_slug": old_slug,
        "new_slug": new_slug,
        "witnesses": [],
    }

    fm_hits = fm_refs(all_notes, old_slug)
    body_hits = body_refs(all_notes, old_slug)
    summary["fm_planned"] = len(fm_hits)
    summary["body_planned"] = len(body_hits)

    if not apply:
        return summary

    witnesses: list[Witness] = [
        relocation.move_flatfile(
            old_full,
            new_full,
            event_log=event_log,
            agent=agent,
            timestamp=timestamp,
            channel=channel,
            apply=True,
        )
    ]
    summary["moved"] = True

    if old_slug != new_slug:
        for n, _key, _pos in fm_hits:
            citing_path = (root / n.path).resolve()
            if citing_path == old_full:
                citing_path = new_full
            result = relocation.rewrite_fm_slug(
                citing_path,
                old_slug,
                new_slug,
                event_log=event_log,
                agent=agent,
                timestamp=timestamp,
                channel=channel,
                apply=True,
            )
            if result is not None:
                witnesses.append(result)
                summary["fm"] += 1

    for n, link in body_hits:
        citing_path = (root / n.path).resolve()
        if citing_path == old_full:
            citing_path = new_full
        new_target = _rewrite_target_for_move(
            link.target_raw, citing_path, old_full, new_full,
        )
        result = relocation.rewrite_body_link(
            citing_path,
            link.target_raw,
            new_target,
            event_log=event_log,
            agent=agent,
            timestamp=timestamp,
            channel=channel,
            apply=True,
        )
        if result is not None:
            witnesses.append(result)
            summary["body"] += 1

    summary["witnesses"] = witnesses
    return summary


def _rewrite_target_for_move(target_raw: str, citing_path: Path,
                             old_full: Path, new_full: Path) -> str:
    """Build the post-move target for a body link, given the citing file's
    location and the moved file's old/new full paths.

    Strategy: compute the new relative path from the citing file's
    directory to ``new_full``, preserving any ``#anchor`` fragment.
    """
    fragment = ""
    if "#" in target_raw:
        _, fragment = target_raw.split("#", 1)
        fragment = "#" + fragment

    new_rel = os.path.relpath(new_full, citing_path.parent).replace(os.sep, "/")
    return new_rel + fragment
