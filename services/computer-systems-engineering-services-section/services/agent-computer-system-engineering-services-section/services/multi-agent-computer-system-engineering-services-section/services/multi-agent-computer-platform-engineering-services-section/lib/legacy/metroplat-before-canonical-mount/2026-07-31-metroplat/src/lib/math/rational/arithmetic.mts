/**
 * analysis/arithmetic — a public exact-arithmetic path for analytical consumers.
 *
 * The exact-number implementation is the exact-number substrate; analysis packages
 * need a public path for exact rational comparison and arithmetic without
 * reaching through the settling chain.
 */
export {
  fromInteger,
  intIsZero,
  natCompare,
  natOne,
  ratZero,
  ratAdd,
  ratCompare,
  ratMultiply,
  ratNegate,
  ratSign,
  ratSubtract,
} from "./exact-number.mts";
export type {
  Integer,
  Natural,
  Rational,
} from "./exact-number.mts";
