"""The content-addressed second store a journal line's ``v`` coordinate
resolves through to a witness's full body.

``kernel/event_log.py``'s physical JSONL line carries only the strict
SEAVT ``{e, a, v, t}`` quad (Register A, design spec S5) — not because
Python has any trouble nesting more onto a line, but because the *real*
event log a directory must stay interoperable with is the one FARS(Node)
writes, and FARS(Node) has no choice: the installed
``witness-journal-log-service``'s ``appendSeavt`` normalizes every row it
is handed down to that strict shape and silently drops anything else
(``apps/fare/src/kernel/record-store.mjs``'s own header comment documents
this exactly). A directory produced by one language must be readable by
the other's reader (design spec S5 Register A) at the full-Witness
replay level, not merely at the bare-row level — so PyFARS keeps the
identical two-store split JSFARS is forced into, rather than taking a
nesting shortcut only one language could read back.

One JSON file per record, named by its own id (SRN-encoded, the same
codec ``kernel/seavt.py``'s physical writer already applies to a
journal line's ``e``/``a``/``v``), under ``<root>/data/records/``.
Write-once by convention (a record's id is its own content hash, so a
second write of the same id is always the same bytes); this module does
not itself refuse a second write. Byte-for-byte the same physical layout
as ``apps/fare/src/kernel/record-store.mjs``'s ``recordFile``/
``putRecord``/``getRecord``, so a record either language writes here is
readable by the other's ``get_record``/``getRecord``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pyfars.kernel.seavt import encode_srn_atom

__all__ = ["get_record", "put_record", "record_file"]


def record_file(root: Path, record_id: str) -> Path:
    """The physical path a record's own content-identity ``id`` resolves
    to: ``<root>/data/records/<hex-encoded-id>.json``."""
    return root / "data" / "records" / f"{encode_srn_atom(record_id)}.json"


def put_record(root: Path, record: dict[str, Any]) -> Path:
    """Durably store ``record``'s full body, keyed by its own ``id``."""
    file = record_file(root, record["id"])
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
    return file


def get_record(root: Path, record_id: str) -> dict[str, Any] | None:
    """``record_id``'s full body, or ``None`` when nothing has ever been
    stored under it — including a foreign-language-written record, since
    the physical layout and id-encoding codec are shared and total."""
    file = record_file(root, record_id)
    if not file.is_file():
        return None
    return json.loads(file.read_text(encoding="utf-8"))
