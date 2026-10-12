"""Witness records — every operator emits one when it touches the substrate.

A ``Witness`` records what an operator did: the canonical hash of the
target before, the operator and its arguments, the canonical hash of
the target after, and a timestamp. Witnesses are the audit primitive of
the substrate: an auditor replaying the witness chain reconstructs the
state evolution.

This module defines the ``Witness`` dataclass and helpers for hashing
and serialization. Operators in ``pyfars.operator.*`` produce witnesses
via ``make_witness``; the runtime ``pyfars.runtime.event_log`` appends
them to an event log.

The design is deliberately minimal — a witness is a flat record, not a
typed hierarchy of operator-specific subclasses. ``details`` is a free
dict carrying operator-specific arguments (key, value, source/dest path
for moves, etc.). This keeps the audit format stable while operators
evolve.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from pyfars.operator.kind import OperationKind, classify, is_valid_kind


@dataclass(frozen=True)
class Witness:
    """A single operator invocation, recorded.

    Fields:
      operator: canonical name of the operator (e.g. "fm_add", "move_note").
      target: path operated on (relative to substrate root, as a string).
      before_hash: SHA-256 of the target's content before the operation,
        or ``None`` if the target did not exist.
      after_hash: SHA-256 of the target's content after, or ``None`` if
        the target was removed.
      details: operator-specific arguments (key, value, source/dest, ...).
        Must be JSON-serializable.
      timestamp: ISO-8601 UTC timestamp.
      agent: optional name of the agent invoking the operator.
    """
    operator: str
    target: str
    before_hash: str | None
    after_hash: str | None
    details: Mapping[str, Any] = field(default_factory=dict)
    timestamp: str = ""
    agent: str | None = None
    # Optional message-routing predicates. ``channel`` decouples
    # producer from consumer (PAM event-log channels, FARS messaging-
    # and-events analysis); ``origin`` records what office, hook, or
    # process caused the witness (LPMud's ORIGIN_* tag pattern).
    # Both default to None so older logs and operators stay valid.
    channel: str | None = None
    origin: str | None = None
    # Bilattice-valued belief axes (PAM predication-algebra-model
    # core math: truth × knowledge bilattice). ``truth`` is the
    # degree-of-truth in [0, 1]; ``evidence`` is the degree-of-
    # knowledge backing it. Defaults are 1.0 (fully-true / fully-
    # evidenced) so plain operator emissions need not opt in. Wire
    # form omits 1.0 values, preserving byte-equal round-trip with
    # pre-bilattice logs.
    truth: float = 1.0
    evidence: float = 1.0
    # Operation-kind tag (Round 14 / WOAH #5; AOP operation-kinds-
    # completeness). One of the seven canonical kinds: observation,
    # guard, accounting, query, mutation, analysis, learning. Default
    # ``"mutation"`` is the conservative classification — strict-shape
    # audits apply to mutations, so mis-defaulting fails loud rather
    # than silently understating cost. Production sites should set
    # ``kind`` explicitly via ``make_witness(kind=...)`` (or rely on
    # the operator-name → kind registry inside ``make_witness``).
    kind: OperationKind = "mutation"

    def __post_init__(self) -> None:
        # Bilattice axes are degrees in [0, 1]. Reject out-of-range
        # values at construction so silent over/under-weighting in
        # downstream tally/balance is impossible.
        for name, val in (("truth", self.truth), ("evidence", self.evidence)):
            if not (0.0 <= float(val) <= 1.0):
                raise ValueError(
                    f"Witness.{name}={val!r} out of range; "
                    f"bilattice axes must lie in [0, 1]"
                )
        # Reject typos / drifted kind tags before they reach the log.
        if not is_valid_kind(self.kind):
            raise ValueError(
                f"Witness.kind={self.kind!r} is not one of the seven "
                f"operation kinds (observation, guard, accounting, "
                f"query, mutation, analysis, learning)"
            )

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Force details to a plain dict for stable JSON serialization
        d["details"] = dict(self.details)
        # Drop default-valued optional fields from the wire form so
        # historical witnesses round-trip byte-for-byte equal and old
        # operators that don't yet thread routing/bilattice fields
        # produce identical JSON.
        if d.get("channel") is None:
            d.pop("channel", None)
        if d.get("origin") is None:
            d.pop("origin", None)
        if d.get("truth", 1.0) == 1.0:
            d.pop("truth", None)
        if d.get("evidence", 1.0) == 1.0:
            d.pop("evidence", None)
        # ``kind`` is always written to the wire form — the typology
        # is the whole point of the field, and audit/cost tooling
        # downstream needs every witness explicitly tagged. Pre-Round-
        # 14 logs that omit the field are reclassified on read by
        # ``from_dict`` via the operator/channel registry.
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), sort_keys=True, ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "Witness":
        operator = d["operator"]
        channel = d.get("channel")
        # Backward-compat: pre-Round-14 logs omit ``kind``; classify
        # from the operator + channel registry so old logs replay
        # with the correct typology and downstream kind-aware code
        # doesn't see a hole in coverage.
        kind = d.get("kind") or classify(operator, channel)
        return cls(
            operator=operator,
            target=d["target"],
            before_hash=d.get("before_hash"),
            after_hash=d.get("after_hash"),
            details=dict(d.get("details") or {}),
            timestamp=d.get("timestamp", ""),
            agent=d.get("agent"),
            channel=channel,
            origin=d.get("origin"),
            truth=float(d.get("truth", 1.0)),
            evidence=float(d.get("evidence", 1.0)),
            kind=kind,
        )


def hash_content(content: str | bytes | None) -> str | None:
    """SHA-256 hex digest of content, or None for missing content."""
    if content is None:
        return None
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.sha256(content).hexdigest()


def hash_path(path: Path) -> str | None:
    """SHA-256 of file content at path, or None if the file is missing."""
    try:
        return hash_content(path.read_bytes())
    except FileNotFoundError:
        return None


def now_iso() -> str:
    """ISO-8601 UTC timestamp for witness records."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def make_witness(
    operator: str,
    target: Path | str,
    before_hash: str | None,
    after_hash: str | None,
    *,
    details: Mapping[str, Any] | None = None,
    agent: str | None = None,
    channel: str | None = None,
    origin: str | None = None,
    truth: float = 1.0,
    evidence: float = 1.0,
    kind: OperationKind | None = None,
) -> Witness:
    """Construct a Witness with a current timestamp.

    Operators in ``pyfars.operator.*`` are the canonical caller; they
    capture the before-hash before mutating, the after-hash after, and
    pass operator-specific arguments through ``details``.

    ``channel`` is the named event stream this witness belongs to
    (e.g. ``"substrate"``, ``"dispatch"``, ``"learning"``) — see PAM
    event-log channels and the FARS messaging-and-events analysis.
    ``origin`` records the producing office/hook/process — the LPMud
    ``ORIGIN_*`` pattern. ``truth`` and ``evidence`` are the PAM
    bilattice axes; default 1.0 means "fully-true, fully-evidenced"
    so plain operator code need not opt in.

    ``kind`` is the AOP operation-kind tag (Round 14 / WOAH #5). When
    ``None`` (the default), ``operator/kind.classify`` resolves it from
    the operator name + channel — every operator the FARS codebase
    emits is in the registry, so existing call sites need no change.
    Pass ``kind`` explicitly to override (rare; mostly the
    ``make_diagnosis_witness`` / ``make_lesson_witness`` helpers and
    future kind-distinct operators).
    """
    return Witness(
        operator=operator,
        target=str(target),
        before_hash=before_hash,
        after_hash=after_hash,
        details=dict(details or {}),
        timestamp=now_iso(),
        agent=agent,
        channel=channel,
        origin=origin,
        truth=truth,
        evidence=evidence,
        kind=kind if kind is not None else classify(operator, channel),
    )


def make_diagnosis_witness(
    target: Path | str,
    *,
    cause: str,
    failed_operator: str,
    suggested_response: str | None = None,
    related: Mapping[str, Any] | None = None,
    agent: str | None = None,
    origin: str | None = None,
) -> Witness:
    """Witness recording *why* a substrate operation failed.

    The Reflexion / FARS failure-diagnosis pattern: a failure produces a
    structured predication (``cause``, ``failed_operator``, optional
    ``suggested_response``) that the next dispatch can compose against,
    not just an opaque error code.

    Always emitted on the ``"learning"`` channel under the synthetic
    ``"diagnose"`` operator name; the default ledger binding books
    diagnosis as an ``expenses:diagnosis`` flow so the cost of having
    to diagnose is visible in the ledger.
    """
    details: dict[str, Any] = {
        "failed_operator": failed_operator,
        "diagnosed_cause": cause,
    }
    if suggested_response:
        details["suggested_response"] = suggested_response
    if related:
        details["related"] = dict(related)
    return make_witness(
        operator="diagnose",
        target=target,
        before_hash=None,
        after_hash=None,
        details=details,
        agent=agent,
        channel="learning",
        origin=origin,
    )


def make_lesson_witness(
    pattern: str,
    *,
    suggested_action: str,
    evidence_count: int = 1,
    source_witnesses: list[str] | None = None,
    agent: str | None = None,
    origin: str | None = None,
) -> Witness:
    """Witness recording a *lesson* distilled from recurring observation.

    The continuous-learning closure (AOP `learning` concept: observation
    → instinct → skill → tool). When the substrate observes the same
    pattern N times — typically N unmapped witnesses for one operator,
    or N diagnoses sharing a cause — that observation crystallizes
    into a lesson, which itself becomes a witness on the substrate's
    own learning channel. The ledger then books the lesson as
    ``assets:knowledge:lessons ← equity:learning``: the system has
    *paid* for the observation by accumulating evidence, and now owns
    a knowledge asset.

    ``evidence_count`` populates the witness's ``evidence`` axis as
    ``1 - 1/(1+evidence_count)`` — monotonically increasing toward 1.0
    as more confirmations arrive — so consumers can sort lessons by
    strength of backing.
    """
    details: dict[str, Any] = {
        "pattern": pattern,
        "suggested_action": suggested_action,
        "evidence_count": int(evidence_count),
    }
    if source_witnesses:
        details["source_witnesses"] = list(source_witnesses)
    # Evidence saturates with count: 1 obs → 0.5, 3 → 0.75, 9 → 0.9.
    evidence = 1.0 - 1.0 / (1.0 + max(0, int(evidence_count)))
    return make_witness(
        operator="lesson",
        target=f"lesson/{pattern}",
        before_hash=None,
        after_hash=None,
        details=details,
        agent=agent,
        channel="learning",
        origin=origin,
        truth=1.0,
        evidence=evidence,
    )
