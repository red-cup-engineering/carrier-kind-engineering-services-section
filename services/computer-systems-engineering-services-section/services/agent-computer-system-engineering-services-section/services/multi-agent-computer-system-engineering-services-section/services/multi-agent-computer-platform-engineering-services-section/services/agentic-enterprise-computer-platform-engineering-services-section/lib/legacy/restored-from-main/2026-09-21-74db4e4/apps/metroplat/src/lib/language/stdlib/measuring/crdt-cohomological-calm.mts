import { tm, type Tm } from "../../ast/index.mts";
import { objectTerm } from "../../reader/projecting/index.mts";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** RMN normalizer for the finite CRDT/CALM convergence receipt: the H1-vanishing
 *  merge/confluence facts, the monotone coordination-free orbit, and the
 *  Mayer-Vietoris overlap reading, kept as one inspectable term body. */
export const receiptTerm: Tm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["convergence", field("convergence")],
  ["monotoneCoordinationFree", field("monotoneCoordinationFree")],
  ["overlap", field("overlap")],
  ["openFrontier", field("openFrontier")],
]));
