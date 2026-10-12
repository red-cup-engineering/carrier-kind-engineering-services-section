import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { objectTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec";

const field = (key) => tm.field(key, tm.var(0));

/** RMN normalizer for the finite CRDT/CALM convergence receipt: the H1-vanishing
 *  merge/confluence facts, the monotone coordination-free orbit, and the
 *  Mayer-Vietoris overlap reading, kept as one inspectable term body. */
export const receiptTerm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["convergence", field("convergence")],
  ["monotoneCoordinationFree", field("monotoneCoordinationFree")],
  ["overlap", field("overlap")],
  ["openFrontier", field("openFrontier")],
]));
