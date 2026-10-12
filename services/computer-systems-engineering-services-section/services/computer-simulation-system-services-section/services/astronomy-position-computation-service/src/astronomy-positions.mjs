import { normalizeDegrees } from "./coordinates.mjs";
import { computeChart } from "./ephemeris.mjs";
import { BODIES } from "./positions.mjs";

/** The interval in which the underlying approximate-elements fit is qualified. */
export const ASTRONOMY_POSITIONS_RANGE = Object.freeze({ minYear: 1800, maxYear: 2050 });

/** Conservative angular bounds, in degrees, for the published numerical model. */
export const ASTRONOMY_POSITION_ACCURACY_DEGREES = Object.freeze({
  sun: 0.02,
  moon: 0.02,
  mercury: 0.03,
  venus: 0.02,
  mars: 0.03,
  jupiter: 0.1,
  saturn: 0.18,
  uranus: 0.03,
  neptune: 0.02,
  pluto: 0.02,
});

/**
 * Validate an ISO instant and canonicalize it to UTC before numerical work.
 * The range is an accuracy boundary, not a calendar limitation.
 */
export function normalizeInstant(value) {
  const source = String(value ?? "").trim();
  if (!source) throw new TypeError("date is required (ISO-8601, e.g. 2026-07-18 or 2026-07-18T12:00:00Z)");
  const instant = source.includes("T") ? source : `${source}T00:00:00.000Z`;
  const milliseconds = Date.parse(instant);
  if (Number.isNaN(milliseconds)) {
    throw new TypeError(`invalid date ${JSON.stringify(value)} (expected ISO-8601, e.g. 2026-07-18)`);
  }
  const normalized = new Date(milliseconds).toISOString();
  const year = new Date(milliseconds).getUTCFullYear();
  if (year < ASTRONOMY_POSITIONS_RANGE.minYear || year > ASTRONOMY_POSITIONS_RANGE.maxYear) {
    throw new RangeError(
      `date out of validated range ${ASTRONOMY_POSITIONS_RANGE.minYear}-${ASTRONOMY_POSITIONS_RANGE.maxYear} (got year ${year}); ephemeris accuracy is only guaranteed inside this window`,
    );
  }
  return normalized;
}

/**
 * Pure positional-astronomy response for any consumer. It deliberately has
 * no zodiac, aspect, house, or interpretive field.
 */
export function computeAstronomyPositions(value) {
  const time = normalizeInstant(value);
  const chart = computeChart(time);
  const bodies = {};
  for (const body of BODIES) {
    const state = chart.bodies[body];
    bodies[body] = Object.freeze({
      longitude: Number(state.longitude.toFixed(4)),
      latitude: Number(state.latitude.toFixed(4)),
      speed: Number(state.speed.toFixed(5)),
    });
  }
  const elongation = normalizeDegrees(chart.bodies.moon.longitude - chart.bodies.sun.longitude);
  return Object.freeze({
    tier: "astronomy-positions",
    time,
    frame: "geocentric ecliptic-of-date, tropical, apparent",
    bodies: Object.freeze(bodies),
    lunarPhase: Object.freeze({
      elongation: Number(elongation.toFixed(4)),
      illuminatedFraction: Number(((1 - Math.cos((elongation * Math.PI) / 180)) / 2).toFixed(6)),
      trend: chart.bodies.moon.speed - chart.bodies.sun.speed >= 0 ? "waxing" : "waning",
    }),
    provenance: chart.provenance,
    accuracy: Object.freeze({
      perBodyDegrees: ASTRONOMY_POSITION_ACCURACY_DEGREES,
      method: "independently audited against astronomy-engine (VSOP87/ELP)",
      validRange: `${ASTRONOMY_POSITIONS_RANGE.minYear}-${ASTRONOMY_POSITIONS_RANGE.maxYear}`,
    }),
  });
}
