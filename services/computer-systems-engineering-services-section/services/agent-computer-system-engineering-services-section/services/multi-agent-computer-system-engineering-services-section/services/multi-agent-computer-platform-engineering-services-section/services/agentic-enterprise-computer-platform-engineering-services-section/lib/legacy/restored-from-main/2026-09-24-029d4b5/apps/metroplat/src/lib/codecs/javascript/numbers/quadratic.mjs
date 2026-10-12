/**
 * codecs/host/javascript/numbers/quadratic — the lossy float boundary for the real quadratic field ℚ(√d).
 *
 * Exact ℚ(√d) arithmetic lives in the exact-number algebra; this is the door where a
 * quadratic rational crosses to a native floating-point approximation — exactness
 * ends here, so the read lives in the codec layer, not in the algebra.
 */

import { toNumber } from "./rational.mjs";

/** Boundary read only — a quadratic rational's native floating-point value (lossy). */
export const quadraticToNumber = (value) =>
  toNumber(value.unit) + toNumber(value.root) * Math.sqrt(value.radicand);
