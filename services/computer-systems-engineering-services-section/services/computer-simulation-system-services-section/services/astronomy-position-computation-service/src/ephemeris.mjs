// The ephemeris: time → chart, as honest mathematics.
//
// Vocabulary: this module is the function from an instant to the geocentric
// ecliptic-of-date (tropical) state of each body. The Sun follows Meeus'
// low-precision solar theory (Astronomical Algorithms ch. 25); the Moon a
// truncation of the ELP-2000 periodic series (ch. 47); the planets the JPL
// approximate Keplerian elements (Standish, 1800–2050 fit) carried from
// J2000 ecliptic to of-date by general precession and nutation. Every chart
// carries this provenance and its accuracy claims; event times inherit them.
//
// Accuracy (verified against JPL Horizons fixtures in the tests):
//   Sun ≤ 0.02°; Moon ≤ 0.02° (series truncation); planets a few arcminutes
//   typical, with the JPL-stated worst cases Jupiter ~0.11° and Saturn
//   ~0.17° within 1800–2050. Lunar event times good to ~3 minutes;
//   slow-planet events to ~hours, as their motion near exactness is slow.

import { BODIES } from "./positions.mjs";
import { isoUtcFromTerrestrialJulianDay, julianCenturies, julianDayFromIso, terrestrialJulianDay } from "./time.mjs";
import { normalizeDegrees } from "./coordinates.mjs";
import { findCircleCrossings, findZeroCrossings } from "./events.mjs";
import {
  LUNAR_LATITUDE_SERIES,
  LUNAR_LONGITUDE_SERIES,
  PLANET_ELEMENTS,

} from "./ephemeris-data.mjs";

const DEGREES = Math.PI / 180;

function sinDegrees(degrees) {
  return Math.sin(degrees * DEGREES);
}

function cosDegrees(degrees) {
  return Math.cos(degrees * DEGREES);
}

// — Nutation in longitude, two principal terms (Meeus ch. 22, truncated). —

function nutationInLongitude(T) {
  const omega = 125.04452 - 1934.136261 * T;
  const meanSunLongitude = 280.4665 + 36000.7698 * T;
  return (-17.2 * sinDegrees(omega) - 1.32 * sinDegrees(2 * meanSunLongitude)) / 3600;
}

// — The Sun (Meeus ch. 25, apparent longitude). —

function sunApparentLongitude(T) {
  const meanLongitude = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const meanAnomaly = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const center =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDegrees(meanAnomaly) +
    (0.019993 - 0.000101 * T) * sinDegrees(2 * meanAnomaly) +
    0.000289 * sinDegrees(3 * meanAnomaly);
  const trueLongitude = meanLongitude + center;
  const omega = 125.04 - 1934.136 * T;
  return normalizeDegrees(trueLongitude - 0.00569 - 0.00478 * sinDegrees(omega));
}

// — The Moon (Meeus ch. 47, truncated ELP-2000 series). —

function lunarFundamentals(T) {
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  return {
    meanLongitude: 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000,
    elongation: 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000,
    sunAnomaly: 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000,
    moonAnomaly: 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000,
    argumentOfLatitude: 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000,
    eccentricityFactor: 1 - 0.002516 * T - 0.0000074 * T * T,
  };
}

function lunarSeriesSum(
  series,
  fundamentals,
) {
  let sum = 0;
  for (const [d, m, mp, f, coefficient] of series) {
    const argument =
      d * fundamentals.elongation +
      m * fundamentals.sunAnomaly +
      mp * fundamentals.moonAnomaly +
      f * fundamentals.argumentOfLatitude;
    const eccentricity = m === 0 ? 1 : fundamentals.eccentricityFactor ** Math.abs(m);
    sum += coefficient * eccentricity * sinDegrees(argument);
  }
  return sum;
}

function moonPosition(T) {
  const fundamentals = lunarFundamentals(T);
  const a1 = 119.75 + 131.849 * T;
  const a2 = 53.09 + 479264.29 * T;
  const a3 = 313.45 + 481266.484 * T;
  const longitudeSum =
    lunarSeriesSum(LUNAR_LONGITUDE_SERIES, fundamentals) +
    3958 * sinDegrees(a1) +
    1962 * sinDegrees(fundamentals.meanLongitude - fundamentals.argumentOfLatitude) +
    318 * sinDegrees(a2);
  const latitudeSum =
    lunarSeriesSum(LUNAR_LATITUDE_SERIES, fundamentals) -
    2235 * sinDegrees(fundamentals.meanLongitude) +
    382 * sinDegrees(a3) +
    175 * sinDegrees(a1 - fundamentals.argumentOfLatitude) +
    175 * sinDegrees(a1 + fundamentals.argumentOfLatitude) +
    127 * sinDegrees(fundamentals.meanLongitude - fundamentals.moonAnomaly) -
    115 * sinDegrees(fundamentals.meanLongitude + fundamentals.moonAnomaly);
  return {
    longitude: normalizeDegrees(fundamentals.meanLongitude + longitudeSum / 1_000_000 + nutationInLongitude(T)),
    latitude: latitudeSum / 1_000_000,
  };
}

// — The planets (JPL approximate elements; Standish 1800–2050 table). —

function solveKepler(meanAnomalyDegrees, eccentricity) {
  const eccentricityDegrees = eccentricity / DEGREES;
  let eccentricAnomaly = meanAnomalyDegrees + eccentricityDegrees * sinDegrees(meanAnomalyDegrees);
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const delta =
      (meanAnomalyDegrees - (eccentricAnomaly - eccentricityDegrees * sinDegrees(eccentricAnomaly))) /
      (1 - eccentricity * cosDegrees(eccentricAnomaly));
    eccentricAnomaly += delta;
    if (Math.abs(delta) < 1e-9) break;
  }
  return eccentricAnomaly;
}

function heliocentricEclipticJ2000(planet, T) {
  const elements = PLANET_ELEMENTS[planet];
  const a = elements.a[0] + elements.a[1] * T;
  const e = elements.e[0] + elements.e[1] * T;
  const inclination = elements.i[0] + elements.i[1] * T;
  const meanLongitude = elements.l[0] + elements.l[1] * T;
  const perihelionLongitude = elements.lonPeri[0] + elements.lonPeri[1] * T;
  const nodeLongitude = elements.lonNode[0] + elements.lonNode[1] * T;
  const argumentOfPerihelion = perihelionLongitude - nodeLongitude;
  const meanAnomaly = normalizeDegrees(meanLongitude - perihelionLongitude);
  const eccentricAnomaly = solveKepler(meanAnomaly, e);
  const xOrbital = a * (cosDegrees(eccentricAnomaly) - e);
  const yOrbital = a * Math.sqrt(1 - e * e) * sinDegrees(eccentricAnomaly);
  const cosNode = cosDegrees(nodeLongitude);
  const sinNode = sinDegrees(nodeLongitude);
  const cosPeri = cosDegrees(argumentOfPerihelion);
  const sinPeri = sinDegrees(argumentOfPerihelion);
  const cosInclination = cosDegrees(inclination);
  const sinInclination = sinDegrees(inclination);
  return [
    (cosPeri * cosNode - sinPeri * sinNode * cosInclination) * xOrbital +
      (-sinPeri * cosNode - cosPeri * sinNode * cosInclination) * yOrbital,
    (cosPeri * sinNode + sinPeri * cosNode * cosInclination) * xOrbital +
      (-sinPeri * sinNode + cosPeri * cosNode * cosInclination) * yOrbital,
    sinPeri * sinInclination * xOrbital + cosPeri * sinInclination * yOrbital,
  ];
}

/** General precession in longitude since J2000, degrees (IAU value, truncated). */
function precessionInLongitude(T) {
  return (5029.0966 * T + 1.11113 * T * T) / 3600;
}

function planetGeocentric(
  planet,
  T,
) {
  const planetHelio = heliocentricEclipticJ2000(planet, T);
  const earthHelio = heliocentricEclipticJ2000("embary", T);
  const x = planetHelio[0] - earthHelio[0];
  const y = planetHelio[1] - earthHelio[1];
  const z = planetHelio[2] - earthHelio[2];
  const longitudeJ2000 = normalizeDegrees(Math.atan2(y, x) / DEGREES);
  const latitude = Math.atan2(z, Math.hypot(x, y)) / DEGREES;
  return {
    longitude: normalizeDegrees(longitudeJ2000 + precessionInLongitude(T) + nutationInLongitude(T)),
    latitude,
  };
}

// — Longitude of any body at a TT Julian day. —

export function bodyLongitude(body, julianDayTt) {
  const T = julianCenturies(julianDayTt);
  if (body === "sun") return sunApparentLongitude(T);
  if (body === "moon") return moonPosition(T).longitude;
  return planetGeocentric(body, T).longitude;
}

function bodyLatitude(body, julianDayTt) {
  const T = julianCenturies(julianDayTt);
  if (body === "sun") return 0;
  if (body === "moon") return moonPosition(T).latitude;
  return planetGeocentric(body, T).latitude;
}

const SPEED_STEP_DAYS = Object.freeze({
  sun: 0.25,
  moon: 0.05,
  mercury: 0.25,
  venus: 0.25,
  mars: 0.5,
  jupiter: 1,
  saturn: 1,
  uranus: 2,
  neptune: 2,
  pluto: 2,
});

/** The apparent geocentric ecliptic longitude derivative, in degrees per day. */
export function bodyLongitudeSpeed(body, julianDayTt) {
  const step = SPEED_STEP_DAYS[body];
  const before = bodyLongitude(body, julianDayTt - step);
  const after = bodyLongitude(body, julianDayTt + step);
  let difference = after - before;
  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference / (2 * step);
}

export const EPHEMERIS_PROVENANCE = Object.freeze({
  algorithm: "meeus-truncated-series + jpl-approximate-elements (zero-dependency)",
  accuracy:
    "Sun ≤0.02°; Moon ≤0.02°; planets a few arcminutes typical (audited worst cases vs astronomy-engine/VSOP87: Jupiter ≤0.10°, Saturn ≤0.18°) within 1800–2050. Lunar event times ~3 minutes; slow-planet events ~hours.",
});

/** The ephemeris as a chart: every body's state at one UTC instant. */
export function computeChart(isoUtc) {
  const julianDayTt = terrestrialJulianDay(julianDayFromIso(isoUtc));
  const states = {};
  for (const body of BODIES) {
    states[body] = Object.freeze({
      longitude: bodyLongitude(body, julianDayTt),
      latitude: bodyLatitude(body, julianDayTt),
      speed: bodyLongitudeSpeed(body, julianDayTt),
    });
  }
  return Object.freeze({
    time: isoUtc,
    julianDay: julianDayTt,
    bodies: Object.freeze(states),
    provenance: EPHEMERIS_PROVENANCE,
  });
}

// — Events over an interval. All take and return ISO UTC timestamps. —

const EVENT_SCAN_STEP_DAYS = Object.freeze({
  sun: 0.5,
  moon: 0.2,
  mercury: 0.5,
  venus: 0.5,
  mars: 1,
  jupiter: 2,
  saturn: 2,
  uranus: 4,
  neptune: 4,
  pluto: 4,
});

function ttInterval(isoStart, isoEnd) {
  return [terrestrialJulianDay(julianDayFromIso(isoStart)), terrestrialJulianDay(julianDayFromIso(isoEnd))];
}

/** A station: a body's longitude speed crossing zero, turning retrograde or direct. */
export function findStations(body, isoStart, isoEnd) {
  if (body === "sun" || body === "moon") return Object.freeze([]);
  const [jdStart, jdEnd] = ttInterval(isoStart, isoEnd);
  const crossings = findZeroCrossings((jd) => bodyLongitudeSpeed(body, jd), jdStart, jdEnd, {
    stepDays: EVENT_SCAN_STEP_DAYS[body],
    toleranceDays: 0.001,
  });
  return Object.freeze(
    crossings.map((crossing) =>
      Object.freeze({
        body,
        time: isoUtcFromTerrestrialJulianDay(crossing.julianDay),
        stationTo: crossing.direction === "decreasing" ? "retrograde" : "direct",
        longitude: bodyLongitude(body, crossing.julianDay),
      }),
    ),
  );
}

/** Moments two bodies' longitudes are exactly `angle` degrees apart. */
export function findExactAspects(bodyA, bodyB, angle, isoStart, isoEnd) {
  const [jdStart, jdEnd] = ttInterval(isoStart, isoEnd);
  const stepDays = Math.min(EVENT_SCAN_STEP_DAYS[bodyA], EVENT_SCAN_STEP_DAYS[bodyB]);
  const relative = (jd) => normalizeDegrees(bodyLongitude(bodyB, jd) - bodyLongitude(bodyA, jd));
  // A separation of `angle` is the relative longitude meeting angle or 360−angle.
  const targets = angle === 0 || angle === 180 ? [angle] : [angle, 360 - angle];
  const events = [];
  for (const target of targets) {
    for (const crossing of findCircleCrossings(relative, target, jdStart, jdEnd, { stepDays })) {
      events.push(Object.freeze({ bodyA, bodyB, angle, time: isoUtcFromTerrestrialJulianDay(crossing.julianDay) }));
    }
  }
  return Object.freeze(events.sort((a, b) => a.time.localeCompare(b.time)));
}

const QUARTER_NAMES = Object.freeze(["new moon", "first quarter", "full moon", "last quarter"]);

/** The Sun–Moon elongation meeting 0°, 90°, 180° and 270°. */
export function findLunationQuarters(isoStart, isoEnd) {
  const [jdStart, jdEnd] = ttInterval(isoStart, isoEnd);
  const elongation = (jd) => normalizeDegrees(bodyLongitude("moon", jd) - bodyLongitude("sun", jd));
  const events = [];
  for (let index = 0; index < 4; index += 1) {
    for (const crossing of findCircleCrossings(elongation, index * 90, jdStart, jdEnd, { stepDays: 0.2 })) {
      events.push(Object.freeze({ time: isoUtcFromTerrestrialJulianDay(crossing.julianDay), quarter: QUARTER_NAMES[index] }));
    }
  }
  return Object.freeze(events.sort((a, b) => a.time.localeCompare(b.time)));
}
