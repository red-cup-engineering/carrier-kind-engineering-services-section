"""Federation envelopes and CRDT-convergence merge — Round 17 / WOAH #3.

This module is FARS's substrate-level realization of the
``federation-convergence`` theorem: two substrates sharing a closure-
rule system, value-domain (the ``BilatticeValue`` FOUR), predicate
category, and entity scope converge to the same state under
bidirectional event exchange in *any* order, *any* number of round-
trips, with *any* partition pattern during exchange. The technical
heart is the **closure-merge commutation lemma**

    cl_p(cl_p(X) ∨_k Y) == cl_p(X ∨_k Y)

which here reduces, for a substrate whose value-domain is the
Belnap–Fitting FOUR and whose closure operator is the identity (the
substrate-level baseline before any closure rule fires), to the
plain associative-commutative-idempotent property of ``join_k`` over
each fiber cell. ``FederationSubstrate.merge`` is the cellwise
``∨_k`` over all cells the two substrates have seen; the envelope
machinery is the wire-format reification of that merge across a
sovereign-node boundary.

What *is* in this round (the convergence core):

  - ``FederationCell`` — the wire-portable ``(entity, predicate,
    value, provenance)`` quadruple per ``federation-envelope-record``
    ``payload.cells`` schema.

  - ``FederationEnvelope`` — the minimal envelope per
    ``federation-envelope-record``: ``from_peer_id``, ``to_peer_id``,
    monotonic ``ordinal``, ``cells``, ``emitted_at`` ISO timestamp,
    and the canonical-JSON SHA-256 ``envelope_id`` content-address.
    The id is computed over canonical-JSON-of-everything-except the
    id field itself (and the ``admitted_at`` receiver-side timestamp,
    which is not part of the wire form), per the spec's hash-stable
    invariant: two byte-equivalent envelopes have the same id.

  - ``FederationSubstrate`` — an in-memory substrate carrying:
      * ``cells`` — the converged ``{(entity, predicate):
        BilatticeValue}`` fiber map.
      * ``seen_envelope_ids`` — the dedup index per the morphism's
        invariant "Re-admission of an envelope by ``envelope-id`` is
        a no-op on substrate state."
      * ``last_admitted_ordinal[(from, to)]`` — the per-pair monotonic
        progress counter per the record's ordinal discipline.
      * ``last_emitted_ordinal[(from, to)]`` — the sender-side dual.
      * Optional ``EventLog`` for substrate-recording every emission /
        admission per the morphism invariant "Substrate-recording on
        every outcome."

  - Five new operators registered with ``OPERATOR_KIND``:
      * ``federation_envelope_emitted`` — observation
      * ``federation_envelope_admitted`` — observation (the *fact*
        of admission is observed; the cell-merge below is the
        substrate-mutating step)
      * ``federation_envelope_deduplicated`` — observation
      * ``federation_envelope_rejected`` — observation
      * ``federation_cell_merged`` — mutation (the join_k fold into
        the receiver's fiber)

What is **deferred to a later round** (and why this scope cut is OK):

  - Per-peer signing keys, signature production / verification.
    Round 17's convergence claim is about the algebra; the signature
    discipline is an authentication layer that sits *above* the
    algebra (per ``federation-convergence`` "What the theorem
    requires" — signatures are a precondition for *operational*
    federation, not a precondition for the math). Adding signatures
    later does not change the merge semantics; the envelope's
    canonical form already excludes the eventual ``signature`` field
    by virtue of building the id from a fixed field list.

  - Peer-records, transport-records, vocabulary-handshake bridging,
    quarantine sub-regions, retraction. Each is a substrate object
    of its own; ``admit_envelope`` here implements the
    parse / verify-id / dedup / merge / record path, which is the
    common spine of the ``admit-federation-envelope`` morphism. The
    branch points (vocabulary check, peer-trust grading, retraction
    dispatch) are documented in the morphism but not load-bearing
    for the convergence theorem itself.

  - Transport bytes. Per ``transport-tolerance-of-federation``, the
    carrier is interchangeable; this round ships envelopes between
    in-memory ``FederationSubstrate`` instances by direct method
    call. A future round can wrap the envelope's ``to_canonical_json``
    in any of Matrix / libp2p / HTTP / filesystem inbox without
    changing the substrate semantics.

The cellwise ``∨_k`` is a CRDT because ``join_k`` is commutative,
associative, and idempotent on the four-element ``BilatticeValue``
lattice (verified by ``tests/test_bilattice.py``). The order-
independence and N-substrate convergence properties of the theorem
follow directly; the tests in ``tests/test_federation.py`` exercise
the math hypotheses against the operational implementation.

References:
  predicated-computing / theorems / federation-convergence
  predicated-computing / concepts / federation-envelope
  predicated-computing / .../ flatfile-agentic-resource-system /
    morphisms / emit-federation-envelope
  predicated-computing / .../ flatfile-agentic-resource-system /
    morphisms / admit-federation-envelope
  predicated-computing / .../ flatfile-agentic-resource-system /
    objects / federation-envelope-record
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Literal, Mapping

from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog
from pyfars.substrate.bilattice import BilatticeValue, join_k


AdmissionOutcome = Literal["admitted", "deduplicated", "rejected"]
"""The three observable outcomes of ``admit_envelope``.

Per the ``admit-federation-envelope`` morphism the spec also names
``quarantined``; that branch is reached only on vocabulary-mismatch
under the ``quarantine`` policy, which is not implemented in this
round (no peer-record, no agreed-vocabulary). The morphism's
substrate-recording invariant is satisfied by the three outcomes
implemented here — every admission attempt produces a witness."""


# Canonical-JSON encoding for envelope id computation. ``sort_keys``
# gives lexicographic key order per ``canonical-form`` /
# ``hash-injectivity-under-canonical-form`` discipline; ``separators``
# strips whitespace so byte-equivalent envelopes from different JSON
# emitters produce the same hash. ``ensure_ascii`` keeps the byte form
# ASCII-stable across hosts with different default encodings.
_CANONICAL_JSON_KW: dict[str, Any] = {
    "sort_keys": True,
    "separators": (",", ":"),
    "ensure_ascii": True,
}


def _canonical_json(obj: Any) -> bytes:
    """Serialize ``obj`` to canonical-JSON bytes for hashing."""
    return json.dumps(obj, **_CANONICAL_JSON_KW).encode("ascii")


def _sha256_hex(data: bytes) -> str:
    """Hex SHA-256 — the one hash function used everywhere here."""
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class FederationCell:
    """One substrate cell as it crosses a sovereign-node boundary.

    Per ``federation-envelope-record`` ``payload.cells`` schema: an
    ``(entity, predicate, value, provenance)`` quadruple. ``value``
    is one of the four ``BilatticeValue`` members; ``provenance`` is
    the audit chain — at minimum the upstream witness/content hashes
    the sender claims for this cell — kept as a tuple so the cell is
    itself hashable / comparable.

    ``cell_hash`` is the canonical-JSON SHA-256 of the cell's content;
    callers that want to dedup by cell-content (rather than by
    enclosing envelope-id) can use it as a key.
    """

    entity: str
    predicate: str
    value: BilatticeValue
    provenance: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        """Wire-form dict; ``value`` rendered as its enum *name* so the
        canonical-JSON depends on the algebra symbol, not on the
        enum's positional index (which could drift across releases).
        """
        return {
            "entity": self.entity,
            "predicate": self.predicate,
            "value": self.value.name,
            "provenance": list(self.provenance),
        }

    @property
    def cell_hash(self) -> str:
        """SHA-256 of canonical-JSON of ``to_dict()``."""
        return _sha256_hex(_canonical_json(self.to_dict()))

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "FederationCell":
        """Inverse of ``to_dict``; canonicalizes the value back."""
        return cls(
            entity=str(d["entity"]),
            predicate=str(d["predicate"]),
            value=BilatticeValue[str(d["value"])],
            provenance=tuple(str(p) for p in d.get("provenance", ())),
        )


# Fields that participate in envelope-id computation, in canonical
# order. The id is the SHA-256 of the canonical-JSON of a dict
# restricted to these fields. Listed explicitly (not derived from
# ``asdict``) so adding a new field to ``FederationEnvelope`` is an
# *intentional* hash-discipline change rather than a silent break.
_ENVELOPE_ID_FIELDS: tuple[str, ...] = (
    "from_peer_id",
    "to_peer_id",
    "ordinal",
    "cells",
    "emitted_at",
)


@dataclass(frozen=True)
class FederationEnvelope:
    """The substrate-level federation envelope.

    Minimal subset of ``federation-envelope-record`` sufficient for
    the convergence theorem: routing (``from_peer_id``, ``to_peer_id``),
    monotonic per-pair ``ordinal``, ``cells`` payload, sender-side
    ``emitted_at`` ISO timestamp, content-addressed ``envelope_id``.
    The signature/key-id/scheme fields are deferred per the module
    docstring's scope cut; adding them later is additive (they are
    not in ``_ENVELOPE_ID_FIELDS``, so existing envelope-ids do not
    move when signatures are introduced).

    Per ``federation-envelope-record`` invariants:

      - **Hash-stable.** ``envelope_id`` is the canonical-JSON SHA-256
        of the fields in ``_ENVELOPE_ID_FIELDS``, *excluding*
        ``envelope_id`` itself, ``admitted_at``, and (in this round)
        the not-yet-implemented signature. Two byte-equivalent
        envelopes from byte-equivalent emit calls have the same id.

      - **Append-only after admission.** The class is frozen.

      - **Substrate-recorded on both sides.** Enforced by the
        operators below, not by this dataclass.
    """

    from_peer_id: str
    to_peer_id: str
    ordinal: int
    cells: tuple[FederationCell, ...]
    emitted_at: str
    envelope_id: str = ""
    """Computed if left empty; required to match if supplied."""

    def __post_init__(self) -> None:
        if self.ordinal < 0:
            raise ValueError(f"ordinal={self.ordinal} must be >= 0")
        # Allow construction with envelope_id="" and fill it in (the
        # common ``emit_envelope`` path); when supplied non-empty,
        # verify it matches the canonical recomputation so callers
        # cannot smuggle a tampered id through the constructor.
        computed = self.compute_envelope_id()
        if self.envelope_id == "":
            object.__setattr__(self, "envelope_id", computed)
        elif self.envelope_id != computed:
            raise ValueError(
                f"envelope_id={self.envelope_id!r} does not match "
                f"canonical content-hash {computed!r}"
            )

    def _id_payload(self) -> dict[str, Any]:
        """Dict over ``_ENVELOPE_ID_FIELDS`` — what the id hashes."""
        return {
            "from_peer_id": self.from_peer_id,
            "to_peer_id": self.to_peer_id,
            "ordinal": self.ordinal,
            "cells": [c.to_dict() for c in self.cells],
            "emitted_at": self.emitted_at,
        }

    def compute_envelope_id(self) -> str:
        """Canonical-JSON SHA-256 over ``_ENVELOPE_ID_FIELDS``."""
        return _sha256_hex(_canonical_json(self._id_payload()))

    def to_canonical_json(self) -> bytes:
        """Wire-form bytes including the id (for transport / on-disk).

        Per ``transport-tolerance-of-federation``, this is the byte
        form a transport carries; the receiver parses it via
        ``from_canonical_json`` and re-verifies the id.
        """
        d = self._id_payload()
        d["envelope_id"] = self.envelope_id
        return _canonical_json(d)

    @classmethod
    def from_canonical_json(cls, data: bytes | str) -> "FederationEnvelope":
        """Parse wire bytes back to an envelope; verifies the id."""
        d = json.loads(data)
        env = cls(
            from_peer_id=str(d["from_peer_id"]),
            to_peer_id=str(d["to_peer_id"]),
            ordinal=int(d["ordinal"]),
            cells=tuple(FederationCell.from_dict(c) for c in d["cells"]),
            emitted_at=str(d["emitted_at"]),
            envelope_id=str(d.get("envelope_id", "")),
        )
        return env


@dataclass
class FederationSubstrate:
    """Minimal in-memory substrate for the convergence-core round.

    Carries:

      - ``peer_id`` — this substrate's own peer identifier; envelopes
        emitted from here use it as ``from_peer_id``.

      - ``cells`` — the converged ``{(entity, predicate):
        BilatticeValue}`` map. Cellwise ``∨_k`` is the merge.

      - ``seen_envelope_ids`` — dedup index per the
        ``admit-federation-envelope`` morphism's hash-deduplicating
        invariant. Re-admission of any envelope id already present
        is a no-op on ``cells`` and produces a
        ``federation_envelope_deduplicated`` witness.

      - ``last_admitted_ordinal`` — per-pair (from, to) progress
        counter. Updated to ``max(current, env.ordinal)`` on every
        successful admission; informational (the dedup is by id, not
        by ordinal — ordinals can arrive out of order under partition
        and convergence still holds).

      - ``last_emitted_ordinal`` — sender-side dual. Auto-incremented
        by ``emit_envelope`` when no explicit ordinal is supplied.

      - ``event_log`` — optional. When set, every emission and every
        admission outcome appends a witness, satisfying the
        morphisms' substrate-recording invariant. When ``None``, the
        substrate still converges; only the audit trail is missing.

      - ``agent`` — optional witness ``agent`` attribution; the
        platform's federation engine name.
    """

    peer_id: str
    cells: dict[tuple[str, str], BilatticeValue] = field(default_factory=dict)
    seen_envelope_ids: set[str] = field(default_factory=set)
    last_admitted_ordinal: dict[tuple[str, str], int] = field(default_factory=dict)
    last_emitted_ordinal: dict[tuple[str, str], int] = field(default_factory=dict)
    event_log: EventLog | None = None
    agent: str | None = None

    # ---- queries ---------------------------------------------------

    def get(self, entity: str, predicate: str) -> BilatticeValue:
        """Cell value, defaulting to ⊥ for unwritten cells."""
        return self.cells.get((entity, predicate), BilatticeValue.BOTTOM)

    def state_hash(self) -> str:
        """Canonical-JSON SHA-256 of the cell map.

        Two substrates with byte-identical ``cells`` produce the same
        hash regardless of insertion order — the precondition for
        ``federation-convergence``'s "byte-identity is downstream"
        observation in the strict / Scott-continuous regime.
        """
        snap = sorted(
            ((e, p, v.name) for (e, p), v in self.cells.items()),
        )
        return _sha256_hex(_canonical_json(snap))

    # ---- emit ------------------------------------------------------

    def emit_envelope(
        self,
        *,
        to_peer_id: str,
        cells: Iterable[FederationCell],
        emitted_at: str | None = None,
        ordinal: int | None = None,
    ) -> FederationEnvelope:
        """Construct, register, and (if event-logged) record an envelope.

        Implements the convergence-core spine of the
        ``emit-federation-envelope`` morphism:

          * Auto-assigns ``ordinal := last_emitted_ordinal[pair] + 1``
            when not supplied (per the morphism's step 4 ordinal
            discipline). When supplied, uses the caller's value but
            still advances the counter to ``max(current, ordinal)``
            so subsequent auto-assignments stay strictly monotonic.
          * Computes ``envelope_id`` via the dataclass's canonical
            hash (morphism step 5; see ``compute_envelope_id``).
          * Records the envelope id in ``last_emitted_ordinal``-
            adjacent state (caller is responsible for handing the
            envelope's bytes to a transport — this method does not
            touch the wire).
          * Emits a ``federation_envelope_emitted`` observation
            witness (morphism step 9) when ``event_log`` is set.

        Deferred (see module docstring scope cut): vocabulary-check,
        signature, file-reify under ``.fars/federation/outbound/``,
        peer-record update, transport hand-off.
        """
        cells_t = tuple(cells)
        pair = (self.peer_id, to_peer_id)
        if ordinal is None:
            ordinal = self.last_emitted_ordinal.get(pair, 0) + 1
        if emitted_at is None:
            emitted_at = datetime.now(timezone.utc).isoformat(
                timespec="microseconds"
            ).replace("+00:00", "Z")
        envelope = FederationEnvelope(
            from_peer_id=self.peer_id,
            to_peer_id=to_peer_id,
            ordinal=ordinal,
            cells=cells_t,
            emitted_at=emitted_at,
        )
        self.last_emitted_ordinal[pair] = max(
            self.last_emitted_ordinal.get(pair, 0), ordinal
        )
        if self.event_log is not None:
            self.event_log.append(make_witness(
                operator="federation_envelope_emitted",
                target=f"federation:{to_peer_id}",
                before_hash=None,
                after_hash=envelope.envelope_id,
                channel="federation",
                origin="emit_envelope",
                agent=self.agent,
                details={
                    "envelope-id": envelope.envelope_id,
                    "from-peer-id": self.peer_id,
                    "to-peer-id": to_peer_id,
                    "ordinal": ordinal,
                    "cell-count": len(cells_t),
                    "emitted-at": emitted_at,
                },
            ))
        return envelope

    # ---- admit -----------------------------------------------------

    def admit_envelope(
        self, envelope: FederationEnvelope,
    ) -> AdmissionOutcome:
        """Verify, dedup, merge, and record an inbound envelope.

        Implements the convergence-core spine of the
        ``admit-federation-envelope`` morphism:

          1. **Verify envelope-id** (morphism step 4). Recompute the
             canonical-JSON SHA-256 over the id-fields; on mismatch,
             emit a ``federation_envelope_rejected`` observation
             with ``truth=0.0`` (the envelope is not authentic) and
             return ``"rejected"``. (The dataclass constructor also
             checks this, but a tampered envelope might be passed in
             with the field cleared; the explicit recheck here keeps
             the operator's contract self-contained.)
          2. **Deduplicate** (morphism step 5). If
             ``envelope_id in seen_envelope_ids``, emit
             ``federation_envelope_deduplicated`` and return
             ``"deduplicated"``. The substrate is unchanged — the
             "Re-admission ... is a no-op on substrate state"
             invariant.
          3. **Merge cells** (morphism step 9, ``cells`` dispatch).
             For each cell in ``envelope.cells``, fold the cell's
             value into the receiver's fiber via ``join_k`` and emit
             one ``federation_cell_merged`` mutation witness per
             cell that *changed* the fiber state (cells whose
             join_k yields the existing value are recorded in the
             envelope-admitted summary but do not re-emit a per-cell
             witness — observational silence on no-op merges keeps
             the audit log proportional to actual state change).
          4. **Record admission** (morphism step 8). Mark the
             envelope id as seen, advance the per-pair admitted
             ordinal, emit a ``federation_envelope_admitted``
             observation summarizing the merge.

        Returns the ``AdmissionOutcome`` literal so callers can
        branch on the outcome without parsing the witness stream.
        """
        # Step 0 — recipient routing gate. Per federation-envelope-record:
        # "Multi-recipient envelopes are not admitted at this level; an
        # envelope addressed to multiple peers is encoded as multiple
        # envelopes (one per recipient), each with its own envelope-id."
        # The dual of this is that each receiver MUST refuse envelopes
        # not addressed to it — otherwise the sender/recipient routing
        # contract of federation-envelope is meaningless and any
        # substrate could absorb traffic addressed to any peer. The
        # rejection happens *before* envelope-id verification because a
        # mis-routed envelope's id is not load-bearing for the rejection
        # decision (the receiver isn't the intended audience regardless).
        if envelope.to_peer_id != self.peer_id:
            self._emit_admission_outcome_witness(
                operator="federation_envelope_rejected",
                envelope=envelope,
                outcome="rejected",
                reason="wrong-recipient",
                truth=0.0,
                cells_merged=0,
            )
            return "rejected"

        # Step 1 — verify envelope-id.
        recomputed = envelope.compute_envelope_id()
        if envelope.envelope_id != recomputed:
            self._emit_admission_outcome_witness(
                operator="federation_envelope_rejected",
                envelope=envelope,
                outcome="rejected",
                reason="envelope-id-mismatch",
                truth=0.0,
                cells_merged=0,
            )
            return "rejected"

        # Step 2 — dedup.
        if envelope.envelope_id in self.seen_envelope_ids:
            self._emit_admission_outcome_witness(
                operator="federation_envelope_deduplicated",
                envelope=envelope,
                outcome="deduplicated",
                reason="envelope-id-already-seen",
                truth=1.0,
                cells_merged=0,
            )
            return "deduplicated"

        # Step 3 — merge cells.
        cells_changed = 0
        for cell in envelope.cells:
            key = (cell.entity, cell.predicate)
            current = self.cells.get(key, BilatticeValue.BOTTOM)
            merged = join_k(current, cell.value)
            if merged is not current:
                self.cells[key] = merged
                cells_changed += 1
                if self.event_log is not None:
                    self.event_log.append(make_witness(
                        operator="federation_cell_merged",
                        target=f"federation-cell:{cell.entity}",
                        before_hash=None,
                        after_hash=None,
                        channel="federation",
                        origin="admit_envelope",
                        agent=self.agent,
                        details={
                            "envelope-id": envelope.envelope_id,
                            "from-peer-id": envelope.from_peer_id,
                            "entity": cell.entity,
                            "predicate": cell.predicate,
                            "key": cell.predicate,
                            "before": current.name,
                            "after": merged.name,
                            "incoming": cell.value.name,
                        },
                    ))

        # Step 4 — record admission.
        self.seen_envelope_ids.add(envelope.envelope_id)
        pair = (envelope.from_peer_id, envelope.to_peer_id)
        self.last_admitted_ordinal[pair] = max(
            self.last_admitted_ordinal.get(pair, 0), envelope.ordinal,
        )
        self._emit_admission_outcome_witness(
            operator="federation_envelope_admitted",
            envelope=envelope,
            outcome="admitted",
            reason=None,
            truth=1.0,
            cells_merged=cells_changed,
        )
        return "admitted"

    # ---- internal --------------------------------------------------

    def _emit_admission_outcome_witness(
        self,
        *,
        operator: str,
        envelope: FederationEnvelope,
        outcome: AdmissionOutcome,
        reason: str | None,
        truth: float,
        cells_merged: int,
    ) -> None:
        """Single emission point for the four admission-outcome witnesses.

        Centralized so the outcome details schema is stable across
        admitted / deduplicated / rejected paths — auditors filtering
        ``channel="federation"`` see one consistent shape.
        """
        if self.event_log is None:
            return
        details: dict[str, Any] = {
            "envelope-id": envelope.envelope_id,
            "from-peer-id": envelope.from_peer_id,
            "to-peer-id": envelope.to_peer_id,
            "ordinal": envelope.ordinal,
            "cell-count": len(envelope.cells),
            "cells-merged": cells_merged,
            "outcome": outcome,
        }
        if reason is not None:
            details["reason"] = reason
        self.event_log.append(make_witness(
            operator=operator,
            target=f"federation:{envelope.from_peer_id}",
            before_hash=None,
            after_hash=envelope.envelope_id,
            channel="federation",
            origin="admit_envelope",
            agent=self.agent,
            truth=truth,
            details=details,
        ))


__all__ = [
    "AdmissionOutcome",
    "FederationCell",
    "FederationEnvelope",
    "FederationSubstrate",
]
