import { chargeValue, joinKnowledgeValue } from "./bilattice-charge.mjs";
import { admit } from "@red-cup-engineering/computer-system-engine/type-system";
import { semanticClaimType } from "./semantic-carriers.mjs";
const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (message) => Object.freeze({ ok: false, refusal: Object.freeze({ code: "invalid-claim", message }) });
function reference(value) { return value && typeof value === "object" && typeof value.id === "string" && value.id.startsWith("ni:") && typeof value.type === "string" && value.type.trim() !== ""; }
/** Admit one typed predication. No Boolean default can erase absent or contradictory evidence. */
export function createSignClaim(input) {
  const candidate = input && typeof input === "object" ? { kind: "sign.claim", ...input } : input;
  const admitted = admit(semanticClaimType, candidate);
  if (!admitted.ok || !reference(candidate?.subject) || !reference(candidate?.object)) return refused("subject and object must be typed semantic references and predicate must be a nonempty string");
  return accepted(Object.freeze({ kind: "sign.claim", subject: Object.freeze({ ...candidate.subject }), predicate: candidate.predicate, object: Object.freeze({ ...candidate.object }), charge: candidate.charge }));
}
/** Knowledge-order join of two named claim charges. */
export function conflateCharges(left, right) {
  return joinKnowledgeValue(chargeValue(left), chargeValue(right)).name;
}
export function conflateClaims(left, right) {
  if (left.subject.id !== right.subject.id || left.subject.type !== right.subject.type || left.predicate !== right.predicate || left.object.id !== right.object.id || left.object.type !== right.object.type) return refused("only claims with the same subject, predicate, and object may be conflated");
  return createSignClaim({ ...left, charge: conflateCharges(left.charge, right.charge) });
}
