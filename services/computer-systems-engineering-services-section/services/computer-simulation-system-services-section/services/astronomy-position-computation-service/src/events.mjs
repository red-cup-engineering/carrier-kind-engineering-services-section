// Events: where continuous sky functions cross named values.
//
// Vocabulary: an ingress is a longitude's crossing of a sign cusp; a station
// is a speed's zero crossing (the moment apparent motion reverses); an exact
// aspect is a pair's separation meeting an aspect's angle; a lunation quarter
// is the elongation meeting a cardinal phase angle. All are found the same
// way: scan a continuous function of time at a body-appropriate step, bracket
// sign changes, and settle each bracket by bisection. Times are as precise as
// the underlying ephemeris, no more — the chart's provenance states that.

import { signedArc, normalizeDegrees } from "./coordinates.mjs";

const DEFAULT_TOLERANCE_DAYS = 1 / 86_400; // one second

/**
 * Find the zero crossings of a continuous function of Julian day on
 * [jdStart, jdEnd]: scan at stepDays, bisect each sign-changing bracket.
 */
export function findZeroCrossings(
  fn,
  jdStart,
  jdEnd,
  options,
) {
  if (!(jdEnd > jdStart)) throw new TypeError("scan interval must have jdEnd > jdStart");
  if (!(options.stepDays > 0)) throw new TypeError("stepDays must be positive");
  const tolerance = options.toleranceDays ?? DEFAULT_TOLERANCE_DAYS;
  const crossings = [];
  let previousJd = jdStart;
  let previousValue = fn(jdStart);
  for (let jd = jdStart + options.stepDays; ; jd += options.stepDays) {
    const clamped = Math.min(jd, jdEnd);
    const value = fn(clamped);
    // A bracket crosses when the signs differ. A zero exactly at the leading
    // sample belongs to the bracket that reached it; the bracket leaving it
    // (previousValue === 0) is not a second crossing.
    if (previousValue !== 0 && Math.sign(value) !== Math.sign(previousValue)) {
      const settled = bisect(fn, previousJd, clamped, tolerance);
      crossings.push(
        Object.freeze({
          julianDay: settled,
          direction: (value > previousValue ? "increasing" : "decreasing"),
        }),
      );
    }
    previousJd = clamped;
    previousValue = value;
    if (clamped >= jdEnd) break;
  }
  return Object.freeze(crossings);
}

/**
 * Find the moments a circular function (degrees on R/360°) crosses a target
 * value. The scan step must keep successive samples within ±90° of each other
 * around the target so the local chart signedArc(target, value) stays
 * continuous across each bracket.
 */
export function findCircleCrossings(
  fn,
  targetDegrees,
  jdStart,
  jdEnd,
  options,
) {
  const target = normalizeDegrees(targetDegrees);
  const local = (julianDay) => signedArc(target, fn(julianDay));
  // Brackets that straddle the antipode (|arc| near 180) are fold artifacts,
  // not crossings of the target; drop any settled point that is not on it.
  return findZeroCrossings(local, jdStart, jdEnd, options).filter(
    (crossing) => Math.abs(local(crossing.julianDay)) < 1,
  );
}

function bisect(
  fn,
  jdLow,
  jdHigh,
  toleranceDays,
) {
  let low = jdLow;
  let high = jdHigh;
  let lowValue = fn(low);
  while (high - low > toleranceDays) {
    const middle = (low + high) / 2;
    const middleValue = fn(middle);
    if (Math.sign(middleValue) === Math.sign(lowValue) && middleValue !== 0) {
      low = middle;
      lowValue = middleValue;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
}
