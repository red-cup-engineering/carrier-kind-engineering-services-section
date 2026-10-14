import { executePinnedOxiEphemeris } from "./precision-runtime.mjs";
import { ASTRONOMY_POSITION_ACCURACY_DEGREES, computeAstronomyPositions, normalizeInstant } from "./astronomy-positions.mjs";
import { BODIES } from "./positions.mjs";

const verifiedCharts = new WeakMap();
export const PRECISION_RANGE = Object.freeze({ minYear: 1972, maxYear: 2050 });
export const DE440_SHA256 = "29915576d0a6555766b99485ac3056ee415e86df4fce282611c31afb329ad062";
export const OXIEPHEMERIS_VERSION = "0.1.1";

function coordinate(value, name, low, high) {
  // URL query numbers and literal JSON numbers share one meaning. Null,
  // booleans, blank strings and containers are absence/malformed data, not
  // invented zero-degree measurements through JavaScript Number coercion.
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) {
    throw new TypeError(`${name} must be an explicit number or nonempty numeric string`);
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < low || number > high) throw new RangeError(`${name} must be a finite number from ${low} through ${high}`);
  return number;
}

export function normalizePrecisionAstronomyRequest(date, options = {}) {
  const time = normalizeInstant(date);
  const year = new Date(time).getUTCFullYear();
  if (year < PRECISION_RANGE.minYear || year > PRECISION_RANGE.maxYear) throw new RangeError(`precision positions support ${PRECISION_RANGE.minYear}-${PRECISION_RANGE.maxYear} UTC`);
  return Object.freeze({ time, latitude: coordinate(options.latitude, "latitude", -90, 90), longitude: coordinate(options.longitude, "longitude", -180, 180) });
}

export function oxiEphemerisArguments(request, ephemerisFile) {
  const args = ["chart", request.time, "--lat", String(request.latitude), `--lon=${request.longitude}`, "--system", request.houseSystem ?? "whole-sign", "--rulership", request.rulership ?? "traditional", "--de", ephemerisFile, "--format", "json"];
  if (request.sidereal) args.push("--sidereal", request.sidereal);
  return args;
}

export async function executeOxiEphemeris(request, runtime = process.env) {
  const binary = runtime.OXIEPH_BIN || "oxieph";
  if (!runtime.OXIEPH_DE) throw new Error("OXIEPH_DE must name the pinned JPL DE440 classic-binary ephemeris file");
  const { chart, identity } = await executePinnedOxiEphemeris({
    binary, ephemerisFile: runtime.OXIEPH_DE, ephemerisSha256: DE440_SHA256,
    supplierVersion: OXIEPHEMERIS_VERSION,
    argumentsForEphemeris: (file) => oxiEphemerisArguments(request, file),
  });
  if (chart && typeof chart === "object") {
    verifiedCharts.set(chart, { identity, request: JSON.stringify(request), content: JSON.stringify(chart) });
  }
  return chart;
}

function crossCheck(essentials, chart) {
  const precise = new Map(chart.bodies.map((body) => [body.body.toLowerCase(), body]));
  return Object.fromEntries(BODIES.map((body) => {
    const measured = precise.get(body);
    if (!measured) throw new Error(`precision supplier omitted ${body}`);
    let delta = ((measured.lon_deg - essentials.bodies[body].longitude) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    return [body, { essentialsLongitudeDegrees: essentials.bodies[body].longitude, precisionLongitudeDegrees: measured.lon_deg, signedDifferenceDegrees: Number(delta.toFixed(8)), absoluteDifferenceArcminutes: Number((Math.abs(delta) * 60).toFixed(6)), withinEssentialsAuditedBound: Math.abs(delta) <= ASTRONOMY_POSITION_ACCURACY_DEGREES[body] }];
  }));
}

export async function computePrecisionAstronomyPositions(date, options, dependencies = {}) {
  const request = normalizePrecisionAstronomyRequest(date, options);
  const chart = await (dependencies.execute ?? executeOxiEphemeris)(request, dependencies.runtime);
  if (chart?.kind !== "natal" || !Array.isArray(chart.bodies)) throw new Error("precision supplier returned a non-chart payload");
  const receipt = verifiedCharts.get(chart);
  const identity = receipt?.request === JSON.stringify(request) && receipt.content === JSON.stringify(chart) ? receipt.identity : null;
  const fields = ["body", "lon_deg", "lat_deg", "lon_speed_deg_per_day", "lat_speed_deg_per_day", "distance_au", "light_time_days", "declination_deg", "retrograde", "out_of_bounds"];
  return Object.freeze({ tier: "astronomy-precision-positions", time: request.time, location: Object.freeze({ latitudeDegreesNorth: request.latitude, longitudeDegreesEast: request.longitude }), metrology: Object.freeze({ coordinateFrame: "apparent geocentric ecliptic-of-date (true equinox)", ephemeris: identity ? "JPL DE440" : null, ephemerisSha256: identity?.ephemerisSha256 ?? null, supplier: identity ? `OxiEphemeris ${identity.supplierVersion}` : null, supplierLicense: identity ? "Apache-2.0" : null, supplierSha256: identity?.supplierSha256 ?? null, runtimeIdentity: identity ? "verified-file-and-reported-version" : "unverified-executor", qualification: "Raw numeric resolution is preserved. No unsupported universal uncertainty is inferred; per-body divergence from the independently implemented essentials engine is reported below." }), bodies: Object.freeze(chart.bodies.map((body) => Object.fromEntries(fields.filter((field) => field in body).map((field) => [field, body[field]])))), nodes: chart.nodes, essentialsCrossCheck: crossCheck(computeAstronomyPositions(request.time), chart) });
}

