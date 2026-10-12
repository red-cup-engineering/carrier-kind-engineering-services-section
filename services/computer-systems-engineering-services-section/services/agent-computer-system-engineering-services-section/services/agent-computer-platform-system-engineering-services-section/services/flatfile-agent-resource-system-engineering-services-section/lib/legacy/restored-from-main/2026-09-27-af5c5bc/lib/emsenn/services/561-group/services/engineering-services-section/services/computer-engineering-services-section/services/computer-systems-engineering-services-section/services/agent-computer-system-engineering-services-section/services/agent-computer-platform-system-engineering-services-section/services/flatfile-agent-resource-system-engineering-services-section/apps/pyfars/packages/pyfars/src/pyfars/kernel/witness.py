"""Tier B: ``Witness`` — one operator invocation, before/after digests and
FOUR evidence tagged, evidencing all three witness-pipeline registers
(design spec section 5). Content-identified the same way as any other
Tier B record (``kernel.identity.identity_of_record``). ``record_types.py``
owns the other six Tier B types and treats a ``Witness`` as foreign,
citing it only by id and type; this module owns its shape.

``make_witness`` is the low-level constructor: every field already
computed by the caller, so it performs no digesting, classification, or
folding of its own — but it still gates the claimed FOUR transition
through Register B before minting an id (mirroring JSFARS's
``makeWitness``, which gates the same way). ``record_witness`` is the
full witness pipeline (design spec S5, steps 1-10, registers A and B):
it computes the before/after content digests, classifies the operator's
kind, folds prior witnesses for the target into the FOUR knowledge
order, and only then calls ``make_witness``.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from typing import Any

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.four import NEITHER, Four, join_knowledge, witness_bit
from pyfars.kernel.identity import identity, identity_of_record
from pyfars.kernel.settlement import CellSettlement
from pyfars.operator.kind import classify, is_valid_kind


@dataclass(frozen=True)
class Witness:
    """One operator invocation, before/after digests and FOUR evidence
    tagged. ``conveys_authority`` is always ``False`` — a witness records
    that something happened, never that anyone was granted anything."""

    id: str
    operator: str
    target: str
    before_digest: str | None
    after_digest: str | None
    details: Mapping[str, Any]
    agent: str | None
    timestamp: str
    kind: str
    four_before: tuple[bool, bool]
    four_after: tuple[bool, bool]
    channel: str
    conveys_authority: bool = False

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "Witness",
            "id": self.id,
            "operator": self.operator,
            "target": self.target,
            "before_digest": self.before_digest,
            "after_digest": self.after_digest,
            "details": dict(self.details),
            "agent": self.agent,
            "timestamp": self.timestamp,
            "kind": self.kind,
            "four_before": list(self.four_before),
            "four_after": list(self.four_after),
            "channel": self.channel,
            "conveys_authority": self.conveys_authority,
        }


def make_witness(
    *,
    operator: str,
    target: str,
    before_digest: str | None,
    after_digest: str | None,
    details: Mapping[str, Any],
    agent: str | None,
    timestamp: str,
    kind: str,
    four_before: tuple[bool, bool],
    four_after: tuple[bool, bool],
    channel: str,
) -> Witness:
    """Register B's gate fires here, before anything is minted:
    ``witness_bit`` raises :class:`~pyfars.kernel.four.NotOneWitError` on
    anything but exactly one legal 0->1 knowledge-cover transition, and an
    illegal transition constructs nothing — no id, no ``Witness``, no
    return value a caller could go on to append."""
    witness_bit(Four(*four_before), Four(*four_after))
    provisional = Witness(
        id="",
        operator=operator,
        target=target,
        before_digest=before_digest,
        after_digest=after_digest,
        details=details,
        agent=agent,
        timestamp=timestamp,
        kind=kind,
        four_before=four_before,
        four_after=four_after,
        channel=channel,
    )
    return replace(provisional, id=identity_of_record(provisional.to_record()))


_MISSING = object()


def _folded_four(prior_witnesses: Sequence[Witness]) -> Four:
    """Register B's fold: the knowledge-order join of every prior
    witness's ``four_after`` for this proposition — the accumulated
    evidence a new witness's claimed transition is judged against."""
    folded = NEITHER
    for prior in prior_witnesses:
        folded = join_knowledge(folded, Four(*prior.four_after))
    return folded


def record_witness(
    *,
    event_log: EventLog,
    operator: str,
    target: str,
    after: Any,
    four_after: Four | tuple[bool, bool],
    before: Any = _MISSING,
    details: Mapping[str, Any] | None = None,
    agent: str | None = None,
    timestamp: str,
    channel: str,
    prior_witnesses: Sequence[Witness] = (),
    settlement: CellSettlement | None = None,
) -> Witness:
    """The witness pipeline: content-identify the target's before/after
    state (steps 1, 3), classify the operator's kind (step 4), fold prior
    witnesses for this proposition into the FOUR knowledge order (step 5),
    then hand off to ``make_witness`` for the Register B gate (step 6) —
    exactly one legal 0->1 knowledge-cover transition, or nothing is built
    at all. A rejected transition raises
    :class:`~pyfars.kernel.four.NotOneWitError` and writes nothing — not
    even a constructed ``Witness``, let alone an event-log line (step 10).

    Step 7's settling-monotonicity gate is this seam: when ``settlement``
    is given, ``target``'s write is guarded against that
    :class:`~pyfars.kernel.settlement.CellSettlement`'s own accumulated
    knowledge state — judged independently of whatever ``prior_witnesses``
    this call happened to be given — and
    :class:`~pyfars.kernel.settlement.SettlingMonotonicityViolation` aborts
    before the event-log append (step 10) exactly as a Register B rejection
    does. Projection to a Tier A file (step 11) remains a named seam for a
    later milestone."""
    before_digest = None if before is _MISSING else identity(before)
    after_digest = identity(after)
    kind = classify(operator, channel)
    four_before = _folded_four(prior_witnesses)
    resolved_after = four_after if isinstance(four_after, Four) else Four(*four_after)
    witness = make_witness(
        operator=operator,
        target=target,
        before_digest=before_digest,
        after_digest=after_digest,
        details=details or {},
        agent=agent,
        timestamp=timestamp,
        kind=kind,
        four_before=(four_before.pos, four_before.neg),
        four_after=(resolved_after.pos, resolved_after.neg),
        channel=channel,
    )
    if settlement is not None:
        settlement.write(target, resolved_after)
    event_log.append(channel, witness.to_record())
    return witness


def _require(record: Mapping[str, Any], key: str, owner: str) -> Any:
    if key not in record:
        raise ValueError(f"{owner}: required field {key!r} is missing")
    return record[key]


def _nonempty_str(value: Any, owner: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{owner}: required non-empty string")
    return value


def _optional_str(value: Any, owner: str) -> str | None:
    if value is not None and not isinstance(value, str):
        raise ValueError(f"{owner}: must be a string or null")
    return value


def _bool(value: Any, owner: str) -> bool:
    if not isinstance(value, bool):
        raise TypeError(f"{owner}: required boolean")
    return value


def _four(value: Any, owner: str) -> None:
    if not (
        isinstance(value, list)
        and len(value) == 2
        and all(isinstance(item, bool) for item in value)
    ):
        raise ValueError(f"{owner}: must be a two-element boolean pair")


def validate_witness(record: Mapping[str, Any]) -> Mapping[str, Any]:
    """Independent per-record shape check, mirroring
    ``record_types.validate_record``'s discipline for the other six Tier
    B types: required fields, ``operator/kind.py`` kind membership, the
    always-``False`` authority-withholding boolean, and the id-round-trip
    against the record's own content."""
    if record.get("type") != "Witness":
        raise ValueError(f"{record.get('type')!r}: not a Witness record")
    _nonempty_str(_require(record, "operator", "Witness"), "Witness.operator")
    _nonempty_str(_require(record, "target", "Witness"), "Witness.target")
    _optional_str(_require(record, "before_digest", "Witness"), "Witness.before_digest")
    _optional_str(_require(record, "after_digest", "Witness"), "Witness.after_digest")
    details = _require(record, "details", "Witness")
    if not isinstance(details, dict):
        raise TypeError("Witness.details: required object")
    _optional_str(_require(record, "agent", "Witness"), "Witness.agent")
    _nonempty_str(_require(record, "timestamp", "Witness"), "Witness.timestamp")
    kind = _nonempty_str(_require(record, "kind", "Witness"), "Witness.kind")
    if not is_valid_kind(kind):
        raise ValueError(f"Witness.kind: invalid operation kind {kind!r}")
    _four(_require(record, "four_before", "Witness"), "Witness.four_before")
    _four(_require(record, "four_after", "Witness"), "Witness.four_after")
    _nonempty_str(_require(record, "channel", "Witness"), "Witness.channel")
    if _bool(
        _require(record, "conveys_authority", "Witness"), "Witness.conveys_authority"
    ):
        raise ValueError("Witness.conveys_authority: must be False")
    record_id = _require(record, "id", "Witness")
    if not isinstance(record_id, str) or not record_id:
        raise ValueError("Witness: id must be a non-empty string")
    expected = identity_of_record(dict(record))
    if record_id != expected:
        raise ValueError(f"Witness {record_id}: content identity mismatch")
    return record


__all__ = ["Witness", "make_witness", "record_witness", "validate_witness"]
