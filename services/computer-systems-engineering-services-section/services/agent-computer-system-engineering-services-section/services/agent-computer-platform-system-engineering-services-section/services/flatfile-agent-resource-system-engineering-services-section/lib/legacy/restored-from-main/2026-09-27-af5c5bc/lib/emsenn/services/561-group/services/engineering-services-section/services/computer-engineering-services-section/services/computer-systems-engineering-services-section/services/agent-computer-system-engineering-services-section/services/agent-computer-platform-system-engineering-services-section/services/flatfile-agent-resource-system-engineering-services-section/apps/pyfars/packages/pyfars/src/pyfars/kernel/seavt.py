"""Tier B record <-> SEAVT ``{e, a, v, t}`` row mapping, and the physical
journal-path law ``witness-journal-log-service`` actually implements.

Re-verified against ``apps/fare``'s installed
``@red-cup-engineering/witness-journal-log-service@0.1.6`` source
(``logPathFor``/``journalDateFor``, ``src/index.mjs``): the design spec's
prose states the shared layout as
``<root>/.fars/event-log/<channel>/<YYYY-MM-DD>.jsonl``, but the installed
package (version drifted from the ``0.1.5`` the spec cites) actually
computes ``<root>/data/logs/<YYYY>/<MM>/<DD>/<feed>.jsonl`` — year, month,
and day as separate path segments, not one combined date file, and
``data/logs`` rather than ``.fars/event-log``. Per the design spec's own
stated methodology (S0.1: state the corrected fact and flag it explicitly
when a filesystem re-check contradicts a prior claim), this module ports
the real, installed algorithm — the one that makes a directory
``kernel/event_log.py`` writes the same directory the Node reader's
``readSeavt``/``logPathFor`` would look in — not the spec's stale prose.

A SEAVT row stores no identity, charge, or trace of its own
(``witness-journal-entry-service``'s own discipline); ``record_to_seavt``
projects a Witness's wire form into one, per the witness pipeline's step 9
(design spec S5): entity=target, attribute=operator, value=the witness's
own content identity, time=timestamp. Per S2.2's residual, accepted
limitation, ``v`` is a foreign-writer-opaque address, never a locally
recomputed digest — it resolves to a witness's full body only through
``kernel/record_store.py``'s content-addressed ``data/records/<id>.json``
store, the same split ``apps/fare/src/kernel/record-store.mjs`` documents
the real, installed ``witness-journal-log-service`` forces on both
languages: ``appendSeavt`` normalizes every row down to this strict
``{e, a, v, t}`` shape and silently drops anything else, so a physical
journal line here is never anything but the bare SEAVT quad.

``encode_srn_atom``/``decode_srn_atom`` are the missing step S5's Register
A prose assumed didn't exist: the real, installed
``witness-journal-entry-service``'s ``seavt()``/``assertValidSeavt`` admit
only strict "Three Dots and a Dash" Semiotic Resource Name surfaces for
``e``/``a``/``v`` (bare ASCII-alphanumeric atoms, or atoms joined by
``.``/``:``/``-``; any ``_`` is an unconditional escape-hatch refusal, and
any other character — a Tier A path's ``/``, an ``ni:`` URI's ``/`` and
``;`` — is a grammar violation). A real FARS witness's ``target`` (a
flatfile path) and ``v`` (an ``ni:///sha-256;...`` content-identity URI)
are never SRN surfaces on their own. Every byte of the raw string survives
losslessly as one bare SRN atom by spelling it in lowercase hex: hex
digits are themselves ASCII alphanumerics, so the whole encoded string is
one grammar-legal atom, unconditionally, for any input. This is the
physical-journal encoding only — ``seavt_row``/``record_to_seavt`` above
stay pure and unencoded; ``kernel/event_log.py`` applies this codec at
the actual read/write boundary with the shared on-disk layout, symmetric
with JSFARS's ``kernel/seavt.mjs``. The same codec also names a record's
file under ``kernel/record_store.py``'s ``data/records/`` store.
"""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path
from typing import Any

from pyfars.kernel.identity import canonicalize

__all__ = [
    "decode_srn_atom",
    "encode_srn_atom",
    "journal_date_for",
    "journal_line",
    "log_path_for",
    "record_to_seavt",
    "seavt_of_line",
    "seavt_row",
]

_DATE_PREFIX = re.compile(r"^\d{4}-\d{2}-\d{2}")


def _canonical_text(value: Any) -> str:
    return json.dumps(canonicalize(value), ensure_ascii=False, separators=(",", ":"))


def journal_date_for(at: Any) -> str:
    """The UTC date (``YYYY-MM-DD``) named by a witness time; the safe
    fallback bucket ``"0000-00-00"`` otherwise, so a malformed ``at`` still
    lands somewhere instead of raising. Ports
    ``witness-journal-log-service``'s ``journalDateFor`` exactly."""
    text = at if isinstance(at, str) else _canonical_text(at)
    match = _DATE_PREFIX.match(text)
    return match.group(0) if match else "0000-00-00"


def log_path_for(root: Path | str, feed: str, at: Any) -> Path:
    """The dated journal path for one feed:
    ``<root>/data/logs/<YYYY>/<MM>/<DD>/<feed>.jsonl``. The date is derived
    from ``at`` (a witness time), not the wall clock — replaying an old
    witness files it under the day it witnesses, not the day it happens to
    be replayed. Ports ``logPathFor`` exactly."""
    year, month, day = journal_date_for(at).split("-")
    return Path(root) / "data" / "logs" / year / month / day / f"{feed}.jsonl"


def encode_srn_atom(raw: str) -> str:
    """Lowercase-hex-spell ``raw``'s UTF-8 bytes as one bare Three Dots and
    a Dash SRN atom. Total and unconditional: unlike the punctuated-name
    grammar itself, this never refuses and never needs an escape hatch,
    because a hex digit is always an ASCII alphanumeric and the whole
    output is always exactly one atom (no ``.``/``:``/``-``/``_`` is ever
    produced). The portable half of the codec ``kernel/seavt.mjs`` mirrors
    byte-for-byte."""
    return raw.encode("utf-8").hex()


def decode_srn_atom(atom: str) -> str:
    """The exact inverse of :func:`encode_srn_atom`."""
    return bytes.fromhex(atom).decode("utf-8")


def seavt_row(entity: str, attribute: str, value: str, time: Any) -> dict[str, Any]:
    """One SEAVT source row: ``{e, a, v, t}``. Mirrors ``seavt()``."""
    return {"e": entity, "a": attribute, "v": value, "t": time}


def record_to_seavt(record: dict[str, Any]) -> dict[str, Any]:
    """A Tier B record's SEAVT projection: entity=target, attribute=
    operator, value=the record's own content identity, time=timestamp."""
    return seavt_row(record["target"], record["operator"], record["id"], record["timestamp"])


def journal_line(record: dict[str, Any]) -> dict[str, Any]:
    """The unencoded, in-memory shape of one journal entry: the record's
    bare SEAVT quad (:func:`record_to_seavt`) plus a defensive deep copy of
    the record's own full body under ``"record"``, matching
    ``kernel/event-log.mjs``'s in-memory line shape. This is the pre-SRN,
    pre-serialization line; ``kernel/event_log.py``'s physical writer
    encodes only the quad half of it (``_srn_encoded_line``) and stores the
    record half separately via ``kernel/record_store.py``, but a fully
    read-back line — quad plus its resolved record — has exactly this
    shape (see ``EventLog.read_channel``)."""
    line = record_to_seavt(record)
    line["record"] = copy.deepcopy(record)
    return line


def seavt_of_line(line: dict[str, Any]) -> dict[str, Any]:
    """The bare SEAVT quad half of a journal line, ignoring any other keys
    (notably ``journal_line``'s ``"record"``). The exact inverse-shaped
    projection ``journal_line`` extends."""
    return {field: line[field] for field in ("e", "a", "v", "t")}
