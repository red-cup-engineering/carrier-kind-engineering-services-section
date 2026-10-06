/** Typed authorization decisions and execution receipts. */
import { addressArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

/**
 * Seal a content-addressed, serializable execution result.
 *
 * When the sealed receipt cannot itself be content-addressed — the identity
 * judgment refuses, most commonly `canonical-limit` on an oversized handler
 * `value` — the receipt is never thrown past this boundary. It is instead
 * resealed without the unaddressable `value`, as a `phase: "receipt"`
 * refusal naming the judgment's code and path, so the caller learns the
 * result was too large to witness instead of the process dying.
 */
export function executionReceipt(draft) {
  const generator = Object.freeze({
    kind: draft.ok ? "metroplat.rpc.execution:witness" : "metroplat.rpc.execution:obstruction",
    ok: draft.ok,
    invocation: draft.invocation,
    operation: draft.operation,
    ...(draft.decision === undefined ? {} : { decision: draft.decision }),
    phase: draft.phase,
    ...(draft.value === undefined ? {} : { value: requireJsonValue(draft.value, "execution receipt value") }),
    reasons: Object.freeze([...(draft.reasons ?? [])]),
    evidence: Object.freeze([...(draft.evidence ?? [])]),
    startedAt: draft.startedAt,
    completedAt: draft.completedAt,
  });
  try {
    return Object.freeze({ ...generator, id: addressArtifact(generator).ref });
  } catch (error) {
    return receiptAddressRefusal(draft, error.message);
  }
}

/**
 * Reseal a receipt whose full form could not be content-addressed: drop the
 * unaddressable `value` and report the identity refusal as the sole reason. Falls back to a plain SHA-256 of the receipt's
 * stable small fields for `id` on the residual case where even the reduced
 * form cannot be addressed (an oversized `reasons` or `evidence`).
 */
function receiptAddressRefusal(draft, reason) {
  const reduced = Object.freeze({
    kind: "metroplat.rpc.execution:obstruction",
    ok: false,
    invocation: draft.invocation,
    operation: draft.operation,
    ...(draft.decision === undefined ? {} : { decision: draft.decision }),
    phase: "receipt",
    reasons: Object.freeze([reason]),
    evidence: Object.freeze([...(draft.evidence ?? [])]),
    startedAt: draft.startedAt,
    completedAt: draft.completedAt,
  });
  let id;
  try {
    id = addressArtifact(reduced).ref;
  } catch {
    id = semanticId({
      invocation: draft.invocation.id,
      operation: draft.operation,
      startedAt: draft.startedAt,
      completedAt: draft.completedAt,
    });
  }
  return Object.freeze({ ...reduced, id });
}
