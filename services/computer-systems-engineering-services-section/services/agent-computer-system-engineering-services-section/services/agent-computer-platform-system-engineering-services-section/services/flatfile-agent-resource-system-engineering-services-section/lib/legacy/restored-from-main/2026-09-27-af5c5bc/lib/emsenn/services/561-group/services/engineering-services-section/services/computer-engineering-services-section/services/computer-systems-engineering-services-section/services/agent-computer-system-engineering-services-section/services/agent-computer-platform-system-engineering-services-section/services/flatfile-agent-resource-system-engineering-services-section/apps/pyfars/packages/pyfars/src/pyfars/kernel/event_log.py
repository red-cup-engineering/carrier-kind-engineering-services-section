"""Append-only SEAVT journal — Register A of the witness pipeline (design
spec S5, step 10). One JSON object per line, day-partitioned per feed at
the physical layout ``kernel/seavt.py`` ports from the real, installed
``witness-journal-log-service`` (``log_path_for``/``journal_date_for``).
Every appended line is the bare SEAVT quad only; the witness's full body
lands in ``kernel/record_store.py``'s content-addressed store in the same
append, keyed by the same id the line's ``v`` coordinate carries — the
split the real, installed ``appendSeavt`` forces on both languages
(``kernel/record_store.py``'s module docstring; symmetric with
``apps/fare/src/kernel/{event-log,record-store}.mjs``).

Single-writer, no locking — matching gen-1's own ``runtime/event_log.py``
assumption. There is deliberately no rewrite, truncate, or delete API of
any kind: an appended line is permanent. A later fact about a Tier B
record is always a new ``CorrectionRecord``/``StatusEvent`` pointing at
it (design spec S3.1), never an edit to a line already on disk.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pyfars.kernel.record_store import get_record, put_record
from pyfars.kernel.seavt import (
    decode_srn_atom,
    encode_srn_atom,
    log_path_for,
    record_to_seavt,
)

__all__ = ["EventLog", "NotAWitnessError"]

_SRN_FIELDS = ("e", "a", "v")
_WITNESS_FIELDS = ("timestamp", "operator", "target")


class NotAWitnessError(TypeError):
    """The event log holds witnesses only. A non-Witness Tier B record has
    no journal line of its own — its creation is witnessed instead
    (``record_witness`` with the record's id as target), and that Witness
    is what the log holds."""


def _srn_encoded_line(record: dict[str, Any]) -> dict[str, Any]:
    """A journal line ready for the physical file: the bare SEAVT quad,
    its ``e``/``a``/``v`` spelled as SRN-conformant atoms (§S5 Register A),
    ``t`` untouched."""
    line = record_to_seavt(record)
    for field in _SRN_FIELDS:
        line[field] = encode_srn_atom(line[field])
    return line


def _srn_decoded_line(line: dict[str, Any]) -> dict[str, Any]:
    """The inverse of :func:`_srn_encoded_line`, applied to a line read off
    disk — including a foreign-language-written one, since the codec is
    shared and total, not merely opaque (§S2.2)."""
    decoded = dict(line)
    for field in _SRN_FIELDS:
        decoded[field] = decode_srn_atom(decoded[field])
    return decoded


@dataclass(frozen=True)
class EventLog:
    """An append-only SEAVT journal rooted at ``root``."""

    root: Path

    def append(self, channel: str, record: dict[str, Any]) -> None:
        """Append one witness's SEAVT-projected journal line to the
        witness's own ``timestamp``-dated file for ``channel``, creating
        the day-partition directory if needed, then durably store the
        witness's full body in ``kernel/record_store.py``'s content-
        addressed store, keyed by the same id the line's ``v`` coordinate
        carries — the line alone is never enough to replay from (§S5
        Register A). Refuses anything that is not Witness-shaped: the log
        holds witnesses only."""
        missing = [field for field in _WITNESS_FIELDS if field not in record]
        if missing:
            raise NotAWitnessError(
                f"event log holds witnesses only; record lacks {missing} — "
                "witness the record's creation and append that Witness instead"
            )
        path = log_path_for(self.root, channel, record["timestamp"])
        path.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(
            _srn_encoded_line(record), ensure_ascii=False, separators=(",", ":")
        )
        with path.open("a", encoding="utf-8") as handle:
            handle.write(line)
            handle.write("\n")
        put_record(self.root, record)

    def read_channel(self, channel: str) -> Iterator[dict[str, Any]]:
        """Every journal line ever appended for ``channel``, in
        chronological order (day-partition directories, then append order
        within each day's file), each resolved to
        ``kernel/seavt.py``'s ``journal_line`` shape: the bare SEAVT quad
        plus the full record its ``v`` coordinate names, read back from
        ``kernel/record_store.py``'s content-addressed store (§S5 Register
        A: the physical line alone is never enough to replay from)."""
        for path in sorted(self.root.glob(f"data/logs/*/*/*/{channel}.jsonl")):
            with path.open("r", encoding="utf-8") as handle:
                for raw in handle:
                    raw = raw.strip()
                    if not raw:
                        continue
                    line = _srn_decoded_line(json.loads(raw))
                    line["record"] = get_record(self.root, line["v"])
                    yield line
