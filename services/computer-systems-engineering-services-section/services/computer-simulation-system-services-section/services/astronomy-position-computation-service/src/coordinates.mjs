/** Circular ecliptic-coordinate operations, in degrees. */
export function normalizeDegrees(degrees) {
  if (!Number.isFinite(degrees)) throw new TypeError("degrees must be a finite number");
  const folded = degrees % 360;
  return folded < 0 ? folded + 360 : folded;
}

export function signedArc(from, to) {
  const difference = normalizeDegrees(to) - normalizeDegrees(from);
  if (difference > 180) return difference - 360;
  if (difference <= -180) return difference + 360;
  return difference;
}
