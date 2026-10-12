// A transport-neutral bounded astronomical computation. A merchant may
// price it; no payment, source credentials, network access or astrology here.
import { BODIES } from "./positions.mjs";
import { normalizeInstant } from "./astronomy-positions.mjs";
import {
  EPHEMERIS_PROVENANCE,
  findLunationQuarters,
  findStations,
  findExactAspects,
} from "./ephemeris.mjs";

export const ASTRONOMY_EVENT_KINDS = Object.freeze([
  "lunation-quarters", "apparent-stations", "relative-longitude-crossings",
]);

const DAY_MILLISECONDS = 86_400_000;
export const MAX_EVENT_WINDOW_DAYS = 35;

function body(value, label) {
  if (typeof value !== "string" || !BODIES.includes(value)) {
    throw new TypeError(label + " must be one of " + BODIES.join(", "));
  }
  return value;
}

/** Full validation happens BEFORE any billed work. */
export function admitAstronomyEventWindow(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("request must be an object");
  }
  const { kind } = request;
  if (!ASTRONOMY_EVENT_KINDS.includes(kind)) {
    throw new TypeError("kind must be one of " + ASTRONOMY_EVENT_KINDS.join(", "));
  }
  const start = normalizeInstant(request.start);
  const end = normalizeInstant(request.end);
  const interval = (Date.parse(end) - Date.parse(start)) / DAY_MILLISECONDS;
  if (!(interval > 0 && interval <= MAX_EVENT_WINDOW_DAYS)) {
    throw new RangeError("astronomy event window must be more than zero and at most " + MAX_EVENT_WINDOW_DAYS + " days");
  }
  const admitted = { kind, start, end };
  if (kind === "apparent-stations") {
    admitted.body = body(request.body, "body");
    if (admitted.body === "sun" || admitted.body === "moon") {
      throw new TypeError("apparent-stations supports planets, not sun or moon");
    }
  }
  if (kind === "relative-longitude-crossings") {
    admitted.bodyA = body(request.bodyA, "bodyA");
    admitted.bodyB = body(request.bodyB, "bodyB");
    if (admitted.bodyA === admitted.bodyB) throw new TypeError("relative-longitude crossing requires distinct bodies");
    if (typeof request.angleDegrees !== "number" || !Number.isFinite(request.angleDegrees) ||
        request.angleDegrees < 0 || request.angleDegrees > 180) {
      throw new RangeError("angleDegrees must be a finite number between 0 and 180");
    }
    admitted.angleDegrees = request.angleDegrees;
  }
  return Object.freeze(admitted);
}

/**
 * Provide the observed ephemeris events with explicit measurement framing.
 * Solver tolerances describe numerical root finding, NOT the physical error
 * of the truncated-series ephemeris or of the historical Delta-T model.
 */
export function computeAstronomyEventWindow(request) {
  const query = admitAstronomyEventWindow(request);
  let events;
  if (query.kind === "lunation-quarters") {
    events = findLunationQuarters(query.start, query.end);
  } else if (query.kind === "apparent-stations") {
    events = findStations(query.body, query.start, query.end);
  } else {
    events = findExactAspects(query.bodyA, query.bodyB, query.angleDegrees, query.start, query.end);
  }
  return Object.freeze({
    type: "561.astronomy-event-window.v1",
    request: query,
    frame: "apparent geocentric ecliptic longitude of date",
    timeScale: "UTC instants recovered from modelled TT via Delta-T inversion",
    method: EPHEMERIS_PROVENANCE,
    accuracyNotice: "A returned timestamp is a numerical root of the stated approximate ephemeris, not an absolute one-second astronomical accuracy guarantee. The Delta-T model is anchored near 2026; its uncertainty grows outside approximately 2015-2035.",
    events: Object.freeze(events.map(event => Object.freeze({ ...event }))),
  });
}
