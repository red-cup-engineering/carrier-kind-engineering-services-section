"""Retraction operators — remove content from the substrate: a
frontmatter list item, a whole frontmatter key, or a flatfile.

Same dry-run/apply and append-only-guard discipline as ``insertion.py``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.witness import Witness
from pyfars.operator._witness_write import witnessed_delete, witnessed_write
from pyfars.operator.edit.fm_rm import remove
from pyfars.operator.edit.rewrite_fm import render as render_fm
from pyfars.substrate.parse.frontmatter import parse as parse_fm

_CHANNEL = "substrate"


def _fm_of(path: Path) -> dict[str, Any]:
    fm, _body = parse_fm(path.read_text(encoding="utf-8"))
    return fm or {}


def remove_fm_item(
    path: Path,
    key: str,
    item: Any,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, Any]:
    """Remove ``item`` from the list-valued frontmatter ``key`` of ``path``.

    No-op if the key is absent or the item is not in the list (a
    witness is still emitted with ``after_digest == before_digest``
    when ``apply=True``).
    """
    new_fm = remove(_fm_of(path), key, item)
    details = {"key": key, "item": item}
    if not apply:
        return {"operator": "remove_fm_item", "target": str(path), "details": details}
    new_text = render_fm(path.read_text(encoding="utf-8"), new_fm)
    return witnessed_write(
        path,
        new_text,
        operator="remove_fm_item",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )


def remove_fm_key(
    path: Path,
    key: str,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, Any]:
    """Remove the frontmatter ``key`` (and its value) entirely."""
    new_fm = remove(_fm_of(path), key)
    details = {"key": key}
    if not apply:
        return {"operator": "remove_fm_key", "target": str(path), "details": details}
    new_text = render_fm(path.read_text(encoding="utf-8"), new_fm)
    return witnessed_write(
        path,
        new_text,
        operator="remove_fm_key",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )


def delete_flatfile(
    path: Path,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, Any]:
    """Delete the flatfile at ``path``."""
    if not apply:
        return {"operator": "delete_flatfile", "target": str(path), "details": {}}
    return witnessed_delete(
        path,
        operator="delete_flatfile",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details={},
    )
