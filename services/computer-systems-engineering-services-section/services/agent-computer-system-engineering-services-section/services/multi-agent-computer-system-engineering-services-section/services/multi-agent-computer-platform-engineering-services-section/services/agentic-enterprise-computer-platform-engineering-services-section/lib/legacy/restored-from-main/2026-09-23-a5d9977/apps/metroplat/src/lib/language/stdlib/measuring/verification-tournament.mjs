import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { objectTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";

const field = (key) => tm.field(key, tm.var(0));

/** RMN normalizer for finite verification-tournament certificate receipts: the
 *  structural/operational readings, the survivor-correspondence witness, and
 *  the settled-verdict fixed point, kept as one inspectable term body. */
export const receiptTerm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["capturedLeanModule", field("capturedLeanModule")],
  ["structural", field("structural")],
  ["operational", field("operational")],
  ["survivor", field("survivor")],
  ["survivorCorrespondence", field("survivorCorrespondence")],
  ["runtimeObligations", field("runtimeObligations")],
  ["verdict", field("verdict")],
  ["leanTheorems", field("leanTheorems")],
  ["runtimeBoundary", field("runtimeBoundary")],
]));
