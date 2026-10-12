/**
 * Independent receiving over an existing execution receipt.
 *
 * Producing an execution receipt and accepting that effect are separate events.
 * Receiving acceptance is derived from source assertions tied to the exact
 * receiver + subject + execution receipt; callers cannot inject "held".
 */
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

function nonempty(value, label) {
  if (value.trim().length === 0) throw new TypeError(label + ": expected non-empty string");
  return value;
}

function receivingSourceMode(value) {
  if (
    value !== "canonical"
    && value !== "degraded-projection"
    && value !== "provider-native"
  ) {
    throw new TypeError("receiving sourceMode: unexpected value");
  }
  return value;
}

export function receivingAssertion(input

 ) {
  const material = Object.freeze({
    kind: "organizing.cell.receiving-assertion",
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "receiving assertion issuer"),
    receiver: nonempty(input.receiver, "receiving assertion receiver"),
    subject: nonempty(input.subject, "receiving assertion subject"),
    executionReceipt: nonempty(input.executionReceipt, "receiving assertion execution receipt"),
    at: nonempty(input.at, "receiving assertion at"),
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
  return Object.freeze({
    ...material,
    id: semanticId(material),
  });
}

export function affirmsReceiving(
  issuer,
  receiver,
  subject,
  executionReceipt,
  at,
  evidence = [],
) {
  return receivingAssertion({
    assertion: "affirm",
    issuer,
    receiver,
    subject,
    executionReceipt,
    at,
    evidence,
  });
}

export function deniesReceiving(
  issuer,
  receiver,
  subject,
  executionReceipt,
  at,
  evidence = [],
) {
  return receivingAssertion({
    assertion: "deny",
    issuer,
    receiver,
    subject,
    executionReceipt,
    at,
    evidence,
  });
}

function receivingStanding(
  assertions,
  receiver,
  subject,
  executionReceipt,
) {
  const matching = assertions.filter((assertion) =>
    assertion.receiver === receiver
    && assertion.subject === subject
    && assertion.executionReceipt === executionReceipt);
  const affirmations = matching.filter((assertion) => assertion.assertion === "affirm");
  const denials = matching.filter((assertion) => assertion.assertion === "deny");
  return Object.freeze({
    value: readingOfSides("extremal", affirmations.length > 0, denials.length > 0),
    affirmations: Object.freeze(affirmations),
    denials: Object.freeze(denials),
  });
}

/**
 * Seal an independent receiving receipt.
 *
 * accepted=true requires:
 * - a source-bound assertion set,
 * - a distinct producer and receiver,
 * - the receiving subject to equal the executed resource,
 * - successful producer execution,
 * - HELD acceptance derived from exact receiving assertions.
 */
export function independentReceivingReceipt(draft) {
  const subject = nonempty(draft.subject, "receiving subject");
  const producer = nonempty(draft.producer, "receiving producer");
  const receiver = nonempty(draft.receiver, "receiving receiver");
  const receivedAt = nonempty(draft.receivedAt, "receiving time");
  const sourceRef = nonempty(draft.sourceRef, "receiving sourceRef");
  const sourceMode = receivingSourceMode(draft.sourceMode);
  const standing = receivingStanding(
    draft.assertions,
    receiver,
    subject,
    draft.execution.id,
  );

  const reasons = [];
  const independent = producer !== receiver;
  if (!independent) reasons.push("producer-cannot-self-satisfy-independent-receiving");
  if (subject !== draft.execution.invocation.resource) {
    reasons.push("receiving-subject-does-not-match-executed-resource");
  }
  if (standing.value === "held" && !draft.execution.ok) {
    reasons.push("held-acceptance-cannot-close-failed-execution");
  }

  const completed = Date.parse(draft.execution.completedAt);
  const received = Date.parse(receivedAt);
  if (
    Number.isFinite(completed)
    && Number.isFinite(received)
    && received < completed
  ) {
    reasons.push("receiving-precedes-execution-completion");
  }

  const valid = reasons.length === 0;
  const accepted =
    valid
    && independent
    && draft.execution.ok
    && standing.value === "held";

  const material = Object.freeze({
    kind: "organizing.cell.independent-receiving-receipt",
    subject,
    producer,
    receiver,
    executionReceipt: draft.execution.id,
    executionOk: draft.execution.ok,
    independent,
    sourceRef,
    sourceMode,
    acceptance: standing.value,
    affirmations: Object.freeze(standing.affirmations.map((assertion) => assertion.id)),
    denials: Object.freeze(standing.denials.map((assertion) => assertion.id)),
    valid,
    accepted,
    reasons: Object.freeze(reasons),
    evidence: Object.freeze([
      ...(draft.evidence ?? []),
      ...standing.affirmations.flatMap((assertion) => assertion.evidence),
      ...standing.denials.flatMap((assertion) => assertion.evidence),
      "receiving-source:" + sourceRef,
      "receiving-source-mode:" + sourceMode,
    ]),
    receivedAt,
  });

  return Object.freeze({
    ...material,
    id: semanticId(material),
  });
}

