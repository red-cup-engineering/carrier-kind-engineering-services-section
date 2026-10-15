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
  if (typeof value !== "string") throw new TypeError("date must be an ISO-8601 string");
  const source = value.trim();
  if (!source) throw new TypeError("date is required (ISO-8601, e.g. 2026-07-18 or 2026-07-18T12:00:00Z)");
  // Date.parse alone silently rolls February 30 into March and interprets
  // zone-less datetimes in the host's local timezone. Neither is an admitted
  // astronomical instant. Check the source calendar before applying offsets.
  const parts = /^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?([Zz]|[+-]\d{2}:?\d{2}))?$/.exec(source);
  if (!parts) throw new TypeError("date must be YYYY-MM-DD or an ISO datetime with explicit Z or numeric offset");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = parts;
  const calendarYear = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const offset = zone?.replace(":", "");
  const leap = calendarYear % 4 === 0 && (calendarYear % 100 !== 0 || calendarYear % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1] ||
      Number(hourText ?? 0) > 23 || Number(minuteText ?? 0) > 59 || Number(secondText ?? 0) > 59 ||
      (offset && offset.toUpperCase() !== "Z" && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(3, 5)) > 59))) {
    throw new TypeError("date has an invalid calendar day, clock time or UTC offset; leap seconds are not represented by this model");
  }
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
      // Relative longitude increases through BOTH halves of a lunation.
      // The illuminated fraction increases only from new to full Moon.
      // At the exact endpoints use the phase immediately following them.
      trend: elongation < 180 ? "waxing" : "waning",
    }),
    provenance: chart.provenance,
    accuracy: Object.freeze({
      perBodyDegrees: ASTRONOMY_POSITION_ACCURACY_DEGREES,
      method: "independently audited against astronomy-engine (VSOP87/ELP)",
      validRange: `${ASTRONOMY_POSITIONS_RANGE.minYear}-${ASTRONOMY_POSITIONS_RANGE.maxYear}`,
    }),
  });
}

