/**
 * Cross-cell effect-locus handoff contract.
 *
 * A transfer is not established by naming an epoch or dropping an arbitrary
 * receipt string into a list. The epoch and witness/lease must bind the exact
 * predecessor, successor, and subject, and must name the source projection from
 * which they were received.
 */

export const AGENT_HANDOFF_OBSTRUCTIONS = Object.freeze([
  "handoff-source-unbound",
  "handoff-epoch-invalid",
  "handoff-binding-invalid",
  "handoff-successor-mismatch",
  "handoff-subject-mismatch",
  "handoff-unwitnessed",
]);

function nonempty(value) {
  return value !== undefined && value.trim().length > 0;
}

function validEpoch(value) {
  return value !== undefined && Number.isSafeInteger(value) && value > 0;
}

function validSource(ref, mode) {
  return nonempty(ref) && (mode === "canonical" || mode === "degraded-projection");
}

function witnessMatches(
  witness,
  handoff,
) {
  return validSource(witness.sourceRef, witness.sourceMode)
    && witness.sourceMode === handoff.sourceMode
    && nonempty(witness.ref)
    && witness.epoch === handoff.epoch
    && witness.predecessor === handoff.predecessor
    && witness.successor === handoff.successor
    && witness.subject === handoff.subject;
}

function leaseMatches(
  lease,
  handoff,
) {
  return validSource(lease.sourceRef, lease.sourceMode)
    && lease.sourceMode === handoff.sourceMode
    && nonempty(lease.ref)
    && lease.epoch === handoff.epoch
    && lease.holder === handoff.successor
    && lease.subject === handoff.subject;
}

/**
 * Assay one handoff.
 *
 * expectedSuccessor / expectedSubject bind the transfer to the local effect
 * being attempted. A structurally valid transfer with a different successor or
 * subject is not authority to act here.
 */
export function assayAgentHandoff(
  handoff,
  options = {},
) {
  if (handoff.mode === "local") {
    return Object.freeze({
      kind: "organizing.cell.handoff-assay",
      ok: true,
      obstructions: Object.freeze([]),
      evidence: Object.freeze(["handoff:local"]),
    });
  }

  const obstructions = [];
  if (!validSource(handoff.epochSourceRef, handoff.sourceMode)) {
    obstructions.push("handoff-source-unbound");
  }
  if (!validEpoch(handoff.epoch)) obstructions.push("handoff-epoch-invalid");
  if (
    !nonempty(handoff.predecessor)
    || !nonempty(handoff.successor)
    || !nonempty(handoff.subject)
  ) {
    obstructions.push("handoff-binding-invalid");
  }
  if (
    options.expectedSuccessor !== undefined
    && handoff.successor !== options.expectedSuccessor
  ) {
    obstructions.push("handoff-successor-mismatch");
  }
  if (
    options.expectedSubject !== undefined
    && handoff.subject !== options.expectedSubject
  ) {
    obstructions.push("handoff-subject-mismatch");
  }

  const witness = (handoff.witnesses ?? []).some((entry) =>
    witnessMatches(entry, handoff));
  const lease = handoff.lease !== undefined && leaseMatches(handoff.lease, handoff);
  if (!witness && !lease) obstructions.push("handoff-unwitnessed");

  const unique = Object.freeze([...new Set(obstructions)]);
  return Object.freeze({
    kind: "organizing.cell.handoff-assay",
    ok: unique.length === 0,
    obstructions: unique,
    evidence: Object.freeze([
      ...(handoff.epoch === undefined ? [] : ["handoff-epoch:" + handoff.epoch]),
      ...(handoff.epochSourceRef === undefined ? [] : ["handoff-source:" + handoff.epochSourceRef]),
      ...(handoff.predecessor === undefined ? [] : ["handoff-predecessor:" + handoff.predecessor]),
      ...(handoff.successor === undefined ? [] : ["handoff-successor:" + handoff.successor]),
      ...(handoff.subject === undefined ? [] : ["handoff-subject:" + handoff.subject]),
      ...((handoff.witnesses ?? []).flatMap((entry) => entry.evidence)),
      ...(handoff.lease?.evidence ?? []),
    ]),
  });
}

