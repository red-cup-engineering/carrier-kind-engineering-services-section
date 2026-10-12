// Time for the ephemeris: ISO 8601 UTC ↔ Julian day, and the UT → TT bridge.
//
// Vocabulary: a Julian day number locates an instant on the astronomical
// timeline; ephemeris series are evaluated in terrestrial time (TT), which
// leads universal time by ΔT. ΔT here is anchored to the measured value
// (IERS Bulletin A, 2026-06: 69.17 s — Earth's rotation plateaued after
// ~2015, so the older Espenak–Meeus 2005–2050 polynomial runs ~6 s high)
// with a small linear drift; its error within ~2015–2035 is a few seconds,
// far below the ephemeris' own accuracy claims.

const MILLISECONDS_PER_DAY = 86_400_000;
/** Julian day of the Unix epoch, 1970-01-01T00:00:00Z. */
const UNIX_EPOCH_JULIAN_DAY = 2_440_587.5;
/** Julian day of J2000.0, 2000-01-01T12:00:00 TT. */
export const J2000 = 2_451_545.0;

export function julianDayFromIso(iso) {
  const milliseconds = Date.parse(iso);
  if (Number.isNaN(milliseconds)) throw new TypeError(`not an ISO 8601 timestamp: ${iso}`);
  return UNIX_EPOCH_JULIAN_DAY + milliseconds / MILLISECONDS_PER_DAY;
}

export function isoFromJulianDay(julianDay) {
  if (!Number.isFinite(julianDay)) throw new TypeError("julianDay must be a finite number");
  const milliseconds = (julianDay - UNIX_EPOCH_JULIAN_DAY) * MILLISECONDS_PER_DAY;
  return new Date(Math.round(milliseconds / 1000) * 1000).toISOString().replace(".000", "");
}

/** ΔT = TT − UT in seconds, anchored at IERS 2026.45 (69.17 s), ~2015–2035. */
export function deltaTSeconds(julianDayUt) {
  const year = 2000 + (julianDayUt - J2000) / 365.25;
  return 69.17 + 0.1 * (year - 2026.45);
}

/** The Julian day in terrestrial time for a UT Julian day. */
export function terrestrialJulianDay(julianDayUt) {
  return julianDayUt + deltaTSeconds(julianDayUt) / 86_400;
}

/** Julian centuries of TT since J2000.0. */
export function julianCenturies(julianDayTt) {
  return (julianDayTt - J2000) / 36_525;
}
