"""Relocation operators — restructure the substrate without inserting or
retracting predications: move a flatfile, rename a frontmatter key,
rewrite a body link, rewrite a frontmatter-relation slug.

Same dry-run/apply and append-only-guard discipline as ``insertion.py``.
``rewrite_body_link``/``rewrite_fm_slug`` return ``None`` when the pure
transform finds nothing to change — no witness for a write that would
be a no-op before it even reaches the gate.
"""

from __future__ import annotations

from pathlib import Path

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.witness import Witness, record_witness
from pyfars.operator._witness_write import witnessed_write
from pyfars.operator.edit.rename_fm_key import rename as rename_key
from pyfars.operator.edit.rewrite_body_link import render as render_body_link
from pyfars.operator.edit.rewrite_fm import render as render_fm
from pyfars.operator.edit.rewrite_fm_slug import rewrite as rewrite_fm_slug_pure
from pyfars.substrate.parse.frontmatter import parse as parse_fm

_CHANNEL = "substrate"


def move_flatfile(
    old_path: Path,
    new_path: Path,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, object]:
    """Move a flatfile from ``old_path`` to ``new_path``.

    Inbound-reference rewriting (which other flatfiles cite this one
    under what slug) is the responsibility of ``operator.edit.move_note``
    — this wrapper handles the bare file relocation.
    """
    if not old_path.exists():
        raise FileNotFoundError(f"missing source: {old_path}")
    if new_path.exists():
        raise FileExistsError(f"destination exists: {new_path}")
    details = {"from": str(old_path), "to": str(new_path)}
    if not apply:
        return {"operator": "move_flatfile", "target": str(new_path), "details": details}
    content = old_path.read_text(encoding="utf-8")
    witness = record_witness(
        event_log=event_log,
        operator="move_flatfile",
        target=str(new_path),
        before=content,
        after=content,
        four_after=(True, False),
        details=details,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
    )
    new_path.parent.mkdir(parents=True, exist_ok=True)
    old_path.rename(new_path)
    return witness


def rename_fm_key(
    path: Path,
    old_key: str,
    new_key: str,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, object]:
    """Rename frontmatter ``old_key`` -> ``new_key`` on ``path``."""
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    new_fm = rename_key(fm or {}, old_key, new_key)
    details = {"old_key": old_key, "new_key": new_key}
    if not apply:
        return {"operator": "rename_fm_key", "target": str(path), "details": details}
    new_text = render_fm(text, new_fm)
    return witnessed_write(
        path,
        new_text,
        operator="rename_fm_key",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )


def rewrite_body_link(
    path: Path,
    old_target: str,
    new_target: str,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, object] | None:
    """Rewrite markdown body links from ``old_target`` to ``new_target``."""
    text = path.read_text(encoding="utf-8")
    new_text, count = render_body_link(text, old_target, new_target)
    if count == 0:
        return None
    details = {"old": old_target, "new": new_target, "count": count}
    if not apply:
        return {"operator": "rewrite_body_link", "target": str(path), "details": details}
    return witnessed_write(
        path,
        new_text,
        operator="rewrite_body_link",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )


def rewrite_fm_slug(
    path: Path,
    old_slug: str,
    new_slug: str,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, object] | None:
    """Rewrite ``old_slug`` -> ``new_slug`` across ``path``'s frontmatter
    relation keys."""
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    if fm is None:
        return None
    new_fm, changes = rewrite_fm_slug_pure(fm, old_slug, new_slug)
    if changes == 0:
        return None
    details = {"old_slug": old_slug, "new_slug": new_slug, "changes": changes}
    if not apply:
        return {"operator": "rewrite_fm_slug", "target": str(path), "details": details}
    new_text = render_fm(text, new_fm)
    return witnessed_write(
        path,
        new_text,
        operator="rewrite_fm_slug",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )
