#!/usr/bin/env node
// The astrologia producer: the day's chart, and the sky's events over the
// next thirty days, as claim-state bundles.
//
// All claims carry force "computes" with the ephemeris's stated method and
// accuracy (EPHEMERIS_PROVENANCE): the chart at 16:00Z holds one "title"
// claim, a placement claim per body (longitude, sign, degree-in-sign, speed,
// motion), and a lunation claim. Each event — ingress, station, lunation
// quarter — gets its own bundle with a plain-English "title" and an
// "occurs-at" claim whose time.valid is the event instant. Writes are
// append-only and idempotent: an existing bundle file is left untouched.

import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  BODIES,
  EPHEMERIS_PROVENANCE,
  computeChart,
  findIngresses,
  findLunationQuarters,
  findStations,
  lunationOf,
  motionOf,
  signPlacement,
} from "@emsenn/divining/astrology";
import type { AssertedClaim, ClaimStateBundle } from "@emsenn/content/topology/news";

import {
  addDays,
  assertedNow,
  computesClaim,
  reportWrite,
  resolveDate,
  writeBundleIfAbsent,
} from "@emsenn/producing-content/organizing-a-newswire";

const WIRE = "astrologia";
const WITNESS = "astrology-topology ephemeris";

/** This wire's store: its own backstage/store/, absolute. */
const STORE = fileURLToPath(new URL("../../store/astrologia/", import.meta.url));

function titleCase(atom: string): string {
  return atom.charAt(0).toUpperCase() + atom.slice(1);
}

const date = resolveDate(process.argv.slice(2).find((argument) => argument !== "--"));
const asserted = assertedNow();

function chartClaim(input: Readonly<{ id: string; predicate: string; object: unknown; valid: string }>): AssertedClaim {
  return computesClaim({
    ...input,
    asserted,
    witness: WITNESS,
    method: EPHEMERIS_PROVENANCE.algorithm,
    accuracy: EPHEMERIS_PROVENANCE.accuracy,
  });
}

// — (1) The daily chart bundle. —

const chartTime = `${date}T16:00:00Z`;
const chart = computeChart(chartTime);
const claims: AssertedClaim[] = [
  chartClaim({ id: "title", predicate: "title", object: `The chart of ${date}`, valid: chartTime }),
];
for (const body of BODIES) {
  const state = chart.bodies[body];
  const placement = signPlacement(state.longitude);
  claims.push(
    chartClaim({
      id: `placement-${body}`,
      predicate: `placement-${body}`,
      object: {
        longitude: state.longitude,
        sign: placement.sign.name,
        degreeInSign: placement.degreeInSign,
        speed: state.speed,
        motion: motionOf(state),
      },
      valid: chartTime,
    }),
  );
}
const lunation = lunationOf(chart.bodies);
claims.push(
  chartClaim({
    id: "lunation",
    predicate: "lunation",
    object: {
      phase: lunation.phase,
      elongation: lunation.elongation,
      illuminatedFraction: lunation.illuminatedFraction,
      trend: lunation.trend,
    },
    valid: chartTime,
  }),
);
const chartBundle: ClaimStateBundle = Object.freeze({
  subject: `chart-${date}`,
  claims: Object.freeze(claims),
});
reportWrite(WIRE, chartBundle.subject, await writeBundleIfAbsent(STORE, chartBundle));

// — (2) Event bundles over [date, date + 30 days]. —

const windowStart = `${date}T00:00:00Z`;
const windowEnd = `${addDays(date, 30)}T00:00:00Z`;

function eventBundle(subject: string, title: string, occursAt: string): ClaimStateBundle {
  return Object.freeze({
    subject,
    claims: Object.freeze([
      chartClaim({ id: "title", predicate: "title", object: title, valid: occursAt }),
      chartClaim({ id: "occurs-at", predicate: "occurs-at", object: occursAt, valid: occursAt }),
    ]),
  });
}

for (const body of BODIES) {
  for (const event of findIngresses(body, windowStart, windowEnd)) {
    const sign = event.signTo.name;
    const subject = `ingress-${body}-${sign.toLowerCase()}-${event.time.slice(0, 10)}`;
    const note = event.direction === "retrograde" ? ", moving retrograde," : "";
    const title = `${titleCase(body)} enters ${sign}${note} at ${event.time}`;
    reportWrite(WIRE, subject, await writeBundleIfAbsent(STORE, eventBundle(subject, title, event.time)));
  }
}

for (const body of BODIES.filter((candidate) => candidate !== "sun" && candidate !== "moon")) {
  for (const event of findStations(body, windowStart, windowEnd)) {
    const subject = `station-${body}-${event.time.slice(0, 10)}`;
    const placement = signPlacement(event.longitude);
    const title = `${titleCase(body)} stations ${event.stationTo} at ${event.time}, at ${placement.degreeInSign.toFixed(1)}° ${placement.sign.name}`;
    reportWrite(WIRE, subject, await writeBundleIfAbsent(STORE, eventBundle(subject, title, event.time)));
  }
}

for (const event of findLunationQuarters(windowStart, windowEnd)) {
  const subject = `quarter-${event.quarter.replace(/ /g, "-")}-${event.time.slice(0, 10)}`;
  const title = `${titleCase(event.quarter)} at ${event.time}`;
  reportWrite(WIRE, subject, await writeBundleIfAbsent(STORE, eventBundle(subject, title, event.time)));
}
