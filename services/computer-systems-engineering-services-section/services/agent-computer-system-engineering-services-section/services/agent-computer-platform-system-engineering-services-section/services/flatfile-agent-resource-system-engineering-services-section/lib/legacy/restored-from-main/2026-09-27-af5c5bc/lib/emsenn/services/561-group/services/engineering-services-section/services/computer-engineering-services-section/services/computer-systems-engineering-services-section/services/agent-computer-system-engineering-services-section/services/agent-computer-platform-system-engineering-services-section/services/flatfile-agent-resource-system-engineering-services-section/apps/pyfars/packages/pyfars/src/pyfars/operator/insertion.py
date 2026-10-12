"""Insertion operators — add content to the substrate: a frontmatter
list item, a frontmatter scalar field, or a brand-new flatfile.

Dry-run by default (``apply=False``): the pure transform still runs (so
the caller can see what would change) but nothing is witnessed or
written. ``apply=True`` performs the witnessed write — see
``operator._witness_write`` for the append-only guard this composes.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.witness import Witness
from pyfars.operator._witness_write import witnessed_write
from pyfars.operator.edit.fm_add import add_item
from pyfars.operator.edit.fm_set import set_field
from pyfars.operator.edit.rewrite_fm import render as render_fm
from pyfars.render.fm_dump import dump
from pyfars.substrate.parse.frontmatter import parse as parse_fm

_CHANNEL = "substrate"


def _fm_of(path: Path) -> dict[str, Any]:
    fm, _body = parse_fm(path.read_text(encoding="utf-8"))
    return fm or {}


def insert_fm_item(
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
    """Append ``item`` to the list-valued frontmatter ``key`` of ``path``.

    Idempotent: if ``item`` is already present, the file is unchanged
    but a witness is still emitted (with ``after_digest == before_digest``)
    when ``apply=True``.
    """
    new_fm = add_item(_fm_of(path), key, item)
    details = {"key": key, "item": item}
    if not apply:
        return {"operator": "insert_fm_item", "target": str(path), "details": details}
    new_text = render_fm(path.read_text(encoding="utf-8"), new_fm)
    return witnessed_write(
        path,
        new_text,
        operator="insert_fm_item",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )


def set_fm_field(
    path: Path,
    key: str,
    value: Any,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, Any]:
    """Set frontmatter ``key`` to ``value`` on ``path``."""
    new_fm = set_field(_fm_of(path), key, value)
    details = {"key": key, "value": value}
    if not apply:
        return {"operator": "set_fm_field", "target": str(path), "details": details}
    new_text = render_fm(path.read_text(encoding="utf-8"), new_fm)
    return witnessed_write(
        path,
        new_text,
        operator="set_fm_field",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )


def insert_flatfile(
    path: Path,
    fm: dict[str, Any],
    body: str,
    *,
    event_log: EventLog,
    agent: str | None = None,
    timestamp: str,
    channel: str = _CHANNEL,
    apply: bool = False,
) -> Witness | dict[str, Any]:
    """Create a new flatfile at ``path`` with ``fm`` and ``body``.

    The file must not already exist.
    """
    if path.exists():
        raise FileExistsError(f"flatfile already exists: {path}")
    details = {"kind": fm.get("kind", "")}
    if not apply:
        return {"operator": "insert_flatfile", "target": str(path), "details": details}
    fm_yaml = dump(fm).rstrip() + "\n"
    new_text = f"---\n{fm_yaml}---\n{body or ''}"
    return witnessed_write(
        path,
        new_text,
        operator="insert_flatfile",
        event_log=event_log,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        details=details,
    )
