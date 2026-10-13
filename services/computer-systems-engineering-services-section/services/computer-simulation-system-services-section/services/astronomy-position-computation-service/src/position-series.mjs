// One bounded batched astronomical measurement, not hundreds of independently
// priced moments. Uses exactly the same numerical model, laws, and uncertainty
// as the existing single-instant geocentric astronomy product.
import {
  ASTRONOMY_POSITION_ACCURACY_DEGREES,
  computeAstronomyPositions,
  normalizeInstant,
} from "./astronomy-positions.mjs";
import { BODIES } from "./positions.mjs";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
export const MAX_ASTRONOMY_SERIES_SAMPLES = 256;
export const MAX_ASTRONOMY_SERIES_DAYS = 35;
export const MAX_ASTRONOMY_SERIES_BODIES = BODIES.length;

/** The complete billing bound and semantic request are admitted before work. */
export function admitAstronomyPositionSeries(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("series request must be a JSON object");
  }
  const start = normalizeInstant(request.start);
  const end = normalizeInstant(request.end);
  const startMilliseconds = Date.parse(start);
  const endMilliseconds = Date.parse(end);
  const stepMinutes = request.stepMinutes;
  if (!Number.isInteger(stepMinutes) || stepMinutes < 1 || stepMinutes > 10_080) {
    throw new RangeError("stepMinutes must be an integer from 1 through 10080");
  }
  const spanMilliseconds = endMilliseconds - startMilliseconds;
  if (spanMilliseconds < 0 || spanMilliseconds > MAX_ASTRONOMY_SERIES_DAYS * DAY_MS) {
    throw new RangeError("series must run forward for at most " + MAX_ASTRONOMY_SERIES_DAYS + " days");
  }
  const stepMilliseconds = stepMinutes * MINUTE_MS;
  const samples = Math.floor(spanMilliseconds / stepMilliseconds) + 1;
  if (samples > MAX_ASTRONOMY_SERIES_SAMPLES) {
    throw new RangeError("series exceeds " + MAX_ASTRONOMY_SERIES_SAMPLES + " sample instants; increase stepMinutes or reduce interval");
  }
  const requested = request.bodies ?? BODIES;
  if (!Array.isArray(requested) || requested.length < 1 ||
      requested.length > MAX_ASTRONOMY_SERIES_BODIES ||
      requested.some(value => typeof value !== "string" || !BODIES.includes(value)) ||
      new Set(requested).size !== requested.length) {
    throw new TypeError("bodies must be 1 through 10 unique known solar-system bodies");
  }
  const includeLunarPhase = request.includeLunarPhase ?? false;
  if (typeof includeLunarPhase !== "boolean") throw new TypeError("includeLunarPhase must be a boolean");
  return Object.freeze({
    start, end, stepMinutes, sampleCount: samples,
    bodies: Object.freeze(BODIES.filter(value => requested.includes(value))),
    includeLunarPhase,
  });
}

/**
 * Exact UTC cadence; the requested end may lie between sample instants.
 * The final sampled instant and the unsampled remainder are explicit rather
 * than falsely claiming continuous complete coverage through requested end.
 */
export function computeAstronomyPositionSeries(request) {
  const admitted = admitAstronomyPositionSeries(request);
  const startMilliseconds = Date.parse(admitted.start);
  const stepMilliseconds = admitted.stepMinutes * MINUTE_MS;
  const samples = [];
  let provenance;
  let frame;
  for (let index = 0; index < admitted.sampleCount; index += 1) {
    const time = new Date(startMilliseconds + index * stepMilliseconds).toISOString();
    const source = computeAstronomyPositions(time);
    provenance ??= source.provenance;
    frame ??= source.frame;
    const bodies = {};
    for (const body of admitted.bodies) bodies[body] = source.bodies[body];
    samples.push(Object.freeze({
      time,
      bodies: Object.freeze(bodies),
      ...(admitted.includeLunarPhase ? { lunarPhase: source.lunarPhase } : {}),
    }));
  }
  const sampledEnd = samples.at(-1).time;
  const remainderMinutes = (Date.parse(admitted.end) - Date.parse(sampledEnd)) / MINUTE_MS;
  const bounds = Object.fromEntries(admitted.bodies.map(body => [
    body, ASTRONOMY_POSITION_ACCURACY_DEGREES[body],
  ]));
  return Object.freeze({
    type: "561.astronomy-position-series.v1",
    request: admitted,
    frame,
    sampledEnd,
    unsampledRemainderMinutes: remainderMinutes,
    samples: Object.freeze(samples),
    accuracy: Object.freeze({
      perBodyDegrees: Object.freeze(bounds),
      note: "These are the existing single-instant source model's per-body angular bounds. Inter-sample motion is not interpolated, and the printed decimal resolution adds no physical accuracy.",
    }),
    provenance,
    deliveryNotice: "Bounded deterministic snapshots at the listed UTC instants only. No upstream API, no guarantee of continuous orbit reconstruction between instants.",
  });
}
