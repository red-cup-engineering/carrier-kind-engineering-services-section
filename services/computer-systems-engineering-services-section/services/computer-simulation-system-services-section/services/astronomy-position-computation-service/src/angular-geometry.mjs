// Spherical geometry over geocentric apparent ecliptic coordinates.
// This is source-owned astronomy mathematics, not horoscope interpretation,
// a source dataset resale, or a payment/transport implementation.
import { normalizeInstant } from "./astronomy-positions.mjs";
import { computeChart } from "./ephemeris.mjs";
import { BODIES } from "./positions.mjs";

const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;
export const MAX_ANGULAR_GEOMETRY_BODIES = BODIES.length;

function finiteAngle(value, label, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) ||
      value < min || value > max) {
    throw new RangeError(label + " must be a finite number from " + min + " to " + max + " degrees");
  }
  return value;
}

/**
 * A dimensionless unit vector expressed in ecliptic-of-date axes.
 * Longitude accepts any finite angle; latitude must represent a physical
 * point on the sphere. Range wrapping only changes its representation.
 */
export function eclipticUnitVector(longitudeDegrees, latitudeDegrees) {
  if (typeof longitudeDegrees !== "number" || !Number.isFinite(longitudeDegrees)) {
    throw new TypeError("longitudeDegrees must be finite");
  }
  const latitude = finiteAngle(latitudeDegrees, "latitudeDegrees", -90, 90) * RADIANS_PER_DEGREE;
  const longitude = longitudeDegrees * RADIANS_PER_DEGREE;
  const cosLatitude = Math.cos(latitude);
  return Object.freeze({
    x: cosLatitude * Math.cos(longitude),
    y: cosLatitude * Math.sin(longitude),
    z: Math.sin(latitude),
  });
}

/**
 * Stable for both near-identical and antipodal unit vectors. Unlike acos(dot),
 * atan2(|cross|, dot) does not discard sub-arcsecond small angles through
 * cancellation of the dot product near 1.
 */
export function sphericalSeparationDegrees(a, b) {
  if (!a || typeof a !== "object" || !b || typeof b !== "object") {
    throw new TypeError("two ecliptic coordinate objects are required");
  }
  const u = eclipticUnitVector(a.longitude, a.latitude);
  const v = eclipticUnitVector(b.longitude, b.latitude);
  const crossLength = Math.hypot(
    u.y * v.z - u.z * v.y,
    u.z * v.x - u.x * v.z,
    u.x * v.y - u.y * v.x,
  );
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  return Math.atan2(crossLength, dot) * DEGREES_PER_RADIAN;
}

export function admitAngularGeometryRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("request must be a JSON object");
  }
  const time = normalizeInstant(request.time);
  const selected = request.bodies ?? BODIES;
  if (!Array.isArray(selected) || selected.length < 2 || selected.length > MAX_ANGULAR_GEOMETRY_BODIES ||
      selected.some(b => typeof b !== "string" || !BODIES.includes(b)) ||
      new Set(selected).size !== selected.length) {
    throw new TypeError("bodies must contain 2 to " + MAX_ANGULAR_GEOMETRY_BODIES + " distinct known body names");
  }
  // Stable canonical body ordering means equivalent selections have identical
  // downstream records, regardless of request array order.
  const bodies = BODIES.filter(b => selected.includes(b));
  return Object.freeze({ time, bodies: Object.freeze(bodies) });
}

/**
 * Every unordered pair is included once, bounded above by 45 observations.
 * Numerical display resolution (six decimal degrees) is NOT the uncertainty
 * of the astronomical source, and no false 3D accuracy bound is inferred
 * from the source's separate positional-longitude error table.
 */
export function computeAngularGeometry(request) {
  const admitted = admitAngularGeometryRequest(request);
  const chart = computeChart(admitted.time);
  const pairs = [];
  for (let a = 0; a < admitted.bodies.length; a += 1) {
    for (let b = a + 1; b < admitted.bodies.length; b += 1) {
      const bodyA = admitted.bodies[a];
      const bodyB = admitted.bodies[b];
      const separation = sphericalSeparationDegrees(chart.bodies[bodyA], chart.bodies[bodyB]);
      pairs.push(Object.freeze({
        bodyA, bodyB, separationDegrees: Number(separation.toFixed(6)),
      }));
    }
  }
  return Object.freeze({
    type: "561.astronomy-angular-geometry.v1",
    time: admitted.time,
    frame: "geocentric apparent ecliptic-of-date coordinates",
    bodies: admitted.bodies,
    pairCount: pairs.length,
    pairs: Object.freeze(pairs),
    provenance: chart.provenance,
    measurementNote: "Spherical great-circle separations via atan2(cross-norm, dot) on unrounded model positions. Output resolution is 0.000001 degree; physical accuracy remains limited by the embedded astronomical ephemeris and frame approximation, not by that printed resolution.",
  });
}
