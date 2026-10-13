// Equatorial sky-coordinate projection of the existing geocentric ephemeris.
// NO independent orbit engine, remote data access, payment or horoscope semantics.
// The ecliptic model already has simplified nutation/aberration; this conversion
// uses mean obliquity of date, so its output is an approximate mixed-frame
// equatorial projection, NOT precision ICRS, CIRS or topocentric pointing data.
//
// Meeus mean obliquity series, J2000 TT centuries. Reference:
// https://www2.mps.mpg.de/homes/fraenz/systems/systems3art/node3.html
import { eclipticUnitVector } from "./angular-geometry.mjs";
import { normalizeDegrees } from "./coordinates.mjs";
import { computeChart } from "./ephemeris.mjs";
import { BODIES } from "./positions.mjs";
import { julianCenturies } from "./time.mjs";
import { normalizeInstant } from "./astronomy-positions.mjs";

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export function meanObliquityOfDateDegrees(julianDayTt) {
  if (typeof julianDayTt !== "number" || !Number.isFinite(julianDayTt)) {
    throw new TypeError("julianDayTt must be finite");
  }
  const T = julianCenturies(julianDayTt);
  const seconds = 21.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return 23 + 26 / 60 + seconds / 3600;
}

/** Longitude/latitude are in ecliptic-of-date degrees, ε in degrees. */
export function eclipticToEquatorial(longitudeDegrees, latitudeDegrees, obliquityDegrees) {
  const epsilon = requireObliquity(obliquityDegrees) * DEGREES_TO_RADIANS;
  const ecliptic = eclipticUnitVector(longitudeDegrees, latitudeDegrees);
  const x = ecliptic.x;
  const y = ecliptic.y * Math.cos(epsilon) - ecliptic.z * Math.sin(epsilon);
  const z = ecliptic.y * Math.sin(epsilon) + ecliptic.z * Math.cos(epsilon);
  const rightAscensionDegrees = normalizeDegrees(Math.atan2(y, x) * RADIANS_TO_DEGREES);
  const declinationDegrees = Math.atan2(z, Math.hypot(x, y)) * RADIANS_TO_DEGREES;
  return Object.freeze({ rightAscensionDegrees, declinationDegrees });
}

/** Exact mathematical inverse of eclipticToEquatorial for the same ε. */
export function equatorialToEcliptic(rightAscensionDegrees, declinationDegrees, obliquityDegrees) {
  const epsilon = requireObliquity(obliquityDegrees) * DEGREES_TO_RADIANS;
  const equatorial = eclipticUnitVector(rightAscensionDegrees, declinationDegrees);
  const x = equatorial.x;
  const y = equatorial.y * Math.cos(epsilon) + equatorial.z * Math.sin(epsilon);
  const z = -equatorial.y * Math.sin(epsilon) + equatorial.z * Math.cos(epsilon);
  const longitudeDegrees = normalizeDegrees(Math.atan2(y, x) * RADIANS_TO_DEGREES);
  const latitudeDegrees = Math.atan2(z, Math.hypot(x, y)) * RADIANS_TO_DEGREES;
  return Object.freeze({ longitudeDegrees, latitudeDegrees });
}

function requireObliquity(angle) {
  if (typeof angle !== "number" || !Number.isFinite(angle) || angle < -90 || angle > 90) {
    throw new RangeError("obliquityDegrees must be a finite angle between -90 and 90 degrees");
  }
  return angle;
}

/**
 * A 10-body equatorial projection of the SAME upstream sky model.
 * No additional source is ingested; no unsupported catalog precision claim.
 * Geocentric apparent ecliptic-of-date source coordinates are rotated by
 * mean obliquity; the resulting mixed approximation is disclosed explicitly.
 */
export function computeEquatorialPositions(date) {
  const time = normalizeInstant(date);
  const chart = computeChart(time);
  const epsilon = meanObliquityOfDateDegrees(chart.julianDay);
  const states = {};
  for (const body of BODIES) {
    const point = chart.bodies[body];
    const equatorial = eclipticToEquatorial(point.longitude, point.latitude, epsilon);
    states[body] = Object.freeze({
      rightAscensionDegrees: Number(equatorial.rightAscensionDegrees.toFixed(5)) % 360,
      rightAscensionHours: Number((equatorial.rightAscensionDegrees / 15).toFixed(7)) % 24,
      declinationDegrees: Number(equatorial.declinationDegrees.toFixed(5)),
    });
  }
  return Object.freeze({
    type: "561.astronomy-equatorial-position.v1",
    time,
    sourceFrame: "approximate geocentric apparent ecliptic of date",
    derivedFrame: "approximate geocentric equatorial of date using mean obliquity",
    obliquityModel: "Meeus J2000 TT-centuries mean obliquity polynomial",
    meanObliquityDegrees: Number(epsilon.toFixed(8)),
    bodies: Object.freeze(states),
    provenance: chart.provenance,
    measurementNote: "Derived coordinates are not ICRS, full true/apparent equatorial place, or a topocentric telescope-pointing solution. No proper motion, parallax, atmospheric refraction, full nutation in obliquity or rigorous light-time correction is added. The source approximate ephemeris limits physical accuracy; extra output decimals do not change that.",
  });
}
