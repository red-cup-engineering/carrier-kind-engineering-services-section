import { tm, type Tm } from "../../ast/index.mts";
import { objectTerm } from "../../reader/projecting/index.mts";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** RMN normalizer for the finite inconsistency-sheaf receipt: the dTop-supported
 *  cokernel of the settling-associated sheaf inclusion, its cohomology and
 *  consistent-zero readings, and the regime-gate laws it stands on. */
export const receiptTerm: Tm = tm.lam(objectTerm([
  ["kind", field("kind")],
  ["valuation", field("valuation")],
  ["cochain", field("cochain")],
  ["topMask", field("topMask")],
  ["topSection", field("topSection")],
  ["cokernel", field("cokernel")],
  ["cohomology", field("cohomology")],
  ["consistentZero", field("consistentZero")],
  ["restrictTopEqualsPi", field("restrictTopEqualsPi")],
  ["cokernelOfIota", field("cokernelOfIota")],
  ["directSumSplitInherited", field("directSumSplitInherited")],
  ["frontier", field("frontier")],
]));
