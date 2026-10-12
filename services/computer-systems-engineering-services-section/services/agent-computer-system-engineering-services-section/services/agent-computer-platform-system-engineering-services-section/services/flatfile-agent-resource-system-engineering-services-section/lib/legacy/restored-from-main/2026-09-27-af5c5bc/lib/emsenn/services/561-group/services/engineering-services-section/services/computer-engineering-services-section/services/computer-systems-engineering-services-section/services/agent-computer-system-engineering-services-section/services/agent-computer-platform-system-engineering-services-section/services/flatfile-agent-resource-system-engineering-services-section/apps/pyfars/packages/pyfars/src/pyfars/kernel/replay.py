"""Deterministic replay: fold the append-only event log into in-memory
state (design spec S4, S11; Addendum ruling 5). "Events are the source
of truth. The working model is a cache" — this module builds the
cache.

The event log holds witnesses only (Addendum ruling 5). Every physical
journal line is the bare SEAVT quad only (``kernel/seavt.py``,
``kernel/event_log.py``) — a witness's full body resolves through its
own id (the line's ``v`` coordinate) via ``kernel/record_store.py``'s
content-addressed ``data/records/<id>.json`` store, the same split
``apps/fare/src/kernel/{replay,record-store}.mjs`` are forced into by
the real, installed ``witness-journal-log-service``'s strict row shape
(``kernel/record_store.py``'s module docstring) — so a directory either
language wrote is fully replayable by the other, not merely readable at
the bare-row level. ``kernel.event_log.EventLog.read_channel`` yields
one channel's lines in day-partition-then-append order; replay merges
every channel into one global trace order and folds it twice over:

  - **belief**, per proposition (a witness's ``target``): the FOUR
    knowledge-order join of every witness's ``four_after``
    (:func:`pyfars.kernel.four.join_knowledge`) — re-derived here from
    the raw evidence bits, never trusted from a witness's own
    self-reported ``four_before``.
  - **records**, the Tier B record registry: recovered from witnessed
    record-creation events, the only way a non-Witness Tier B record
    ever enters the log (Addendum ruling 5). The convention this
    milestone establishes (no prior milestone wired one): a
    record-creation witness carries the created record's full wire
    form under ``details["record"]``, and witnesses that record's own
    id as its ``target`` — mirroring ``operator/_witness_write.py``'s
    Tier A convention (``target`` = the thing that came to exist,
    ``after`` = its new content) for Tier B.

Corpus projection (a future ``kernel/projector`` module's
``Projector.apply(state, witness) -> state``) is a named seam, not
implemented here: this tree has no ``kernel/projector`` module yet
(checked directly — M5-M7 left none), and inventing one is out of
scope for this milestone. :data:`Projector` names the seam;
``replay_event_log``'s ``project`` parameter is where a real one plugs
in later. Left at its default of ``None``, replay folds to belief +
registry state only, exactly as this milestone's brief requires.

Two failure modes are refused, never silently skipped (design spec
S11):

  - a **corrupted line** — malformed JSON, an SRN-grammar violation in
    ``e``/``a``/``v`` (:func:`pyfars.kernel.seavt.decode_srn_atom`), a
    Witness that fails its own shape/id-round-trip check
    (:func:`pyfars.kernel.witness.validate_witness`), or a
    record-creation witness whose nested record fails
    :func:`pyfars.kernel.record_types.validate_record` or disagrees
    with its own witness's ``target`` — raises
    :class:`CorruptedLogLineError`.
  - a **causally-reordered log** — a witness for some proposition
    whose ``before_digest`` does not match the ``after_digest`` of
    that same proposition's immediately preceding witness in trace
    order — raises :class:`CausalOrderViolation`.

Replaying an identical log twice from empty state produces
canonically byte-identical state (:func:`serialize_state`); see
``tests/kernel/test_replay.py``.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.four import NEITHER, Four, join_knowledge
from pyfars.kernel.identity import canonicalize
from pyfars.kernel.record_store import get_record
from pyfars.kernel.record_types import TIER_B_RECORD_TYPES, validate_record
from pyfars.kernel.witness import validate_witness

__all__ = [
    "EMPTY_STATE",
    "CausalOrderViolation",
    "CorruptedLogLineError",
    "Projector",
    "ReplayError",
    "ReplayState",
    "channels_of",
    "replay_event_log",
    "serialize_state",
]

_RECORD_DETAILS_KEY = "record"


class ReplayError(ValueError):
    """Base of every typed error replay raises instead of silently
    skipping a bad line."""


class CorruptedLogLineError(ReplayError):
    """One journal line could not be folded: malformed JSON, an
    SRN-grammar violation, a Witness that fails its own shape/id
    check, or a witnessed record-creation whose nested record is
    invalid or disagrees with its own witness."""


class CausalOrderViolation(ReplayError):
    """A witness's ``before_digest`` does not match the
    ``after_digest`` of the immediately preceding witness for the
    same proposition in trace order — the log's append order
    contradicts the causal chain it claims to record."""


@dataclass(frozen=True)
class ReplayState:
    """Deterministic in-memory state folded from the event log:
    per-proposition belief (the FOUR knowledge-order join of every
    witness's ``four_after``) and the Tier B record registry (recovered
    from witnessed record-creation events). Corpus projection is the
    named seam :data:`Projector` describes, not part of this state."""

    belief: Mapping[str, Four] = field(default_factory=dict)
    records: Mapping[str, Mapping[str, Any]] = field(default_factory=dict)


EMPTY_STATE = ReplayState(belief={}, records={})


Projector = Callable[[ReplayState, Mapping[str, Any]], ReplayState]
"""The named seam for a future ``kernel/projector`` module's
``apply(state, witness) -> state`` (design spec S4, S5 step 11). No
projector module exists in this tree yet (M5-M7 left none); this
milestone does not invent one — :func:`replay_event_log`'s ``project``
parameter is where a real projector plugs in later. Left ``None`` (the
default, and the only wiring this milestone builds), replay folds to
belief + registry state only."""


def channels_of(root: Path) -> tuple[str, ...]:
    """Every channel with at least one journal line under ``root``,
    named for its feed file's stem, in sorted (thus deterministic)
    order — the same ``data/logs/<YYYY>/<MM>/<DD>/<feed>.jsonl`` layout
    :func:`pyfars.kernel.seavt.log_path_for` writes."""
    return tuple(sorted({path.stem for path in root.glob("data/logs/*/*/*/*.jsonl")}))


def _read_channel_or_raise(event_log: EventLog, channel: str) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    iterator = event_log.read_channel(channel)
    while True:
        try:
            line = next(iterator)
        except StopIteration:
            return lines
        except (ValueError, KeyError, TypeError) as exc:
            raise CorruptedLogLineError(
                f"channel {channel!r}: unreadable journal line: {exc}"
            ) from exc
        lines.append(line)


def _trace(event_log: EventLog, channels: Sequence[str]) -> list[dict[str, Any]]:
    """Every line across ``channels``, in global trace (causal) order.
    Each channel's own lines already come out of ``read_channel`` in
    deterministic day-partition-then-append order; merging the
    per-channel lists with a stable sort on witnessed time (``t``)
    keeps that per-channel order for ties and interleaves channels by
    when they were witnessed — a deterministic total order, since the
    inputs to the sort are themselves already deterministic."""
    trace: list[dict[str, Any]] = []
    for channel in channels:
        trace.extend(_read_channel_or_raise(event_log, channel))
    trace.sort(key=lambda line: line["t"])
    return trace


def _record_of(witness: Mapping[str, Any]) -> Mapping[str, Any] | None:
    """The Tier B record a record-creation witness names, or ``None``
    when ``witness`` is an ordinary Tier A witness. Validates the
    nested record and its agreement with its own witness before ever
    entering the registry — a malformed or misattributed record-
    creation event is corruption, not a record to silently drop."""
    details = witness.get("details")
    if not isinstance(details, dict):
        return None
    record = details.get(_RECORD_DETAILS_KEY)
    if record is None:
        return None
    if not isinstance(record, dict) or record.get("type") not in TIER_B_RECORD_TYPES:
        return None
    try:
        validate_record(record)
    except (TypeError, ValueError) as exc:
        raise CorruptedLogLineError(
            f"witness {witness.get('id')!r}: witnessed record-creation is "
            f"invalid: {exc}"
        ) from exc
    if record["id"] != witness.get("target"):
        raise CorruptedLogLineError(
            f"witness {witness.get('id')!r} targets {witness.get('target')!r} "
            f"but witnesses the creation of record {record['id']!r}"
        )
    return record


def replay_event_log(
    event_log: EventLog,
    *,
    channels: Sequence[str] | None = None,
    project: Projector | None = None,
) -> ReplayState:
    """Fold ``event_log`` into a :class:`ReplayState`, from empty
    state, across every channel in ``channels`` (every channel on disk,
    by default — :func:`channels_of`). Deterministic: replaying an
    identical log twice from empty state produces canonically
    byte-identical state (:func:`serialize_state`).

    A corrupted line raises :class:`CorruptedLogLineError`; a witness
    whose ``before_digest`` contradicts the trace-order chain for its
    proposition raises :class:`CausalOrderViolation`. Neither is ever
    silently skipped.

    ``project`` is the projector seam (:data:`Projector`) — when
    given, it folds alongside belief/registry, once per witness in
    trace order; left ``None`` (the default), replay folds to belief +
    registry state only, per this milestone's scope."""
    resolved_channels = (
        tuple(channels) if channels is not None else channels_of(event_log.root)
    )
    belief: dict[str, Four] = {}
    records: dict[str, Mapping[str, Any]] = {}
    last_after_digest: dict[str, str | None] = {}
    state = EMPTY_STATE

    for line in _trace(event_log, resolved_channels):
        witness = get_record(event_log.root, line["v"])
        if witness is None:
            raise CorruptedLogLineError(
                f"journal line names witness {line['v']!r}, which the record "
                "store does not resolve"
            )
        try:
            validate_witness(witness)
        except (TypeError, ValueError) as exc:
            raise CorruptedLogLineError(f"invalid Witness: {exc}") from exc
        if (
            witness["target"] != line["e"]
            or witness["operator"] != line["a"]
            or witness["id"] != line["v"]
        ):
            raise CorruptedLogLineError(
                f"journal line {{e:{line['e']!r},a:{line['a']!r},v:{line['v']!r}}} "
                f"disagrees with witness {witness['id']!r} "
                f"{{target:{witness['target']!r},operator:{witness['operator']!r}}}"
            )

        target = witness["target"]
        before_digest = witness["before_digest"]
        if target in last_after_digest and before_digest != last_after_digest[target]:
            raise CausalOrderViolation(
                f"{target!r}: witness {witness['id']!r}'s before_digest "
                f"{before_digest!r} does not match the preceding witness's "
                f"after_digest {last_after_digest[target]!r}"
            )
        last_after_digest[target] = witness["after_digest"]

        belief[target] = join_knowledge(
            belief.get(target, NEITHER), Four(*witness["four_after"])
        )
        record = _record_of(witness)
        if record is not None:
            records[record["id"]] = record

        if project is not None:
            state = project(
                ReplayState(belief=dict(belief), records=dict(records)), witness
            )
            belief = dict(state.belief)
            records = dict(state.records)

    return ReplayState(belief=dict(belief), records=dict(records))


def serialize_state(state: ReplayState) -> bytes:
    """Canonical bytes for ``state``: the same NFC-normalize/sort-keys/
    safe-integer canonicalization :func:`pyfars.kernel.identity.canonicalize`
    uses for content identity, compact-serialized. Two replays of the
    same log from empty state produce byte-identical output from this
    function — the determinism guarantee design spec S11 requires."""
    body = {
        "belief": {
            target: [value.pos, value.neg] for target, value in state.belief.items()
        },
        "records": {
            record_id: dict(record) for record_id, record in state.records.items()
        },
    }
    return json.dumps(
        canonicalize(body), ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
