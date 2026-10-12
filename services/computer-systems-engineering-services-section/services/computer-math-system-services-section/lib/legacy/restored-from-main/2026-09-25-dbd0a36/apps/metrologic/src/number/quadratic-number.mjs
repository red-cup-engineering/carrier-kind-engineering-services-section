import { toNumber } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number-host";
/**
 * writing/quadratic — the lossy float boundary for the real quadratic field ℚ(√d).
 *
 * Exact ℚ(√d) arithmetic lives in the carrier algebra; this is the door where a
 * quadratic rational crosses to a native floating-point approximation — exactness
 * ends here, so the read lives in the codec layer, not in the algebra.
 */


/** Boundary read only — a quadratic rational's native floating-point value (lossy). */
export const quadraticToNumber = (value) =>
  toNumber(value.unit) + toNumber(value.root) * Math.sqrt(value.radicand);
