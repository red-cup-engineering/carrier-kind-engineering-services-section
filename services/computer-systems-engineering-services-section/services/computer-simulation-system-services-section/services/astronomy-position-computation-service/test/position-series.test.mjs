import test from "node:test";
import assert from "node:assert/strict";
import {
  admitAstronomyPositionSeries, computeAstronomyPositionSeries,
  MAX_ASTRONOMY_SERIES_SAMPLES, MAX_ASTRONOMY_SERIES_DAYS,
} from "../src/position-series.mjs";
import { computeAstronomyPositions } from "../src/astronomy-positions.mjs";

const origin = "2026-07-18T00:00:00Z";
const other = "2026-07-20T00:00:00Z";

test("admit a canonical exact batch with no accidental body-order or time reinterpretation", () => {
  const admitted = admitAstronomyPositionSeries({
    start: origin, end: other, stepMinutes: 1440,
    bodies: ["moon", "sun"], includeLunarPhase: true,
  });
  assert.equal(admitted.start, "2026-07-18T00:00:00.000Z");
  assert.equal(admitted.end, "2026-07-20T00:00:00.000Z");
  assert.deepEqual(admitted.bodies, ["sun", "moon"]);
  assert.equal(admitted.sampleCount, 3);
  assert.ok(Object.isFrozen(admitted.bodies));
  assert.equal(MAX_ASTRONOMY_SERIES_SAMPLES, 256);
  assert.equal(MAX_ASTRONOMY_SERIES_DAYS, 35);
});

test("three daily data records equal independently invoked single-instant source records", () => {
  const result = computeAstronomyPositionSeries({
    start: origin, end: other, stepMinutes: 1440,
    bodies: ["moon", "sun"], includeLunarPhase: true,
  });
  assert.equal(result.type, "561.astronomy-position-series.v1");
  assert.equal(result.frame, "geocentric ecliptic-of-date, tropical, apparent");
  assert.equal(result.samples.length, 3);
  assert.equal(result.unsampledRemainderMinutes, 0);
  assert.equal(result.sampledEnd, "2026-07-20T00:00:00.000Z");
  for (const sample of result.samples) {
    const independent = computeAstronomyPositions(sample.time);
    assert.deepEqual(sample.bodies, { sun: independent.bodies.sun, moon: independent.bodies.moon });
    assert.deepEqual(sample.lunarPhase, independent.lunarPhase);
  }
  assert.deepEqual(result.provenance, computeAstronomyPositions(origin).provenance);
  assert.deepEqual(Object.keys(result.accuracy.perBodyDegrees), ["sun", "moon"]);
  assert.match(result.deliveryNotice, /Bounded deterministic/);
});

test("off-grid requested endpoints remain honestly stated, not interpolated or silently added", () => {
  const result = computeAstronomyPositionSeries({
    start: "2026-10-12T00:00:00Z",
    end: "2026-10-12T02:30:00Z",
    stepMinutes: 60, bodies: ["saturn"],
  });
  assert.deepEqual(result.samples.map(x => x.time), [
    "2026-10-12T00:00:00.000Z",
    "2026-10-12T01:00:00.000Z",
    "2026-10-12T02:00:00.000Z",
  ]);
  assert.equal(result.unsampledRemainderMinutes, 30);
  assert.equal(result.samples[0].lunarPhase, undefined);
  assert.equal(result.samples[0].bodies.saturn.speed, computeAstronomyPositions(result.samples[0].time).bodies.saturn.speed);
});

test("bound true cardinality, not just duration, and refuse unbounded paid work", () => {
  const seed = { start: origin, stepMinutes: 1, bodies: ["sun"] };
  const inRange = admitAstronomyPositionSeries({ ...seed, end: "2026-07-18T04:15:00Z" });
  assert.equal(inRange.sampleCount, 256);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: "2026-07-18T04:16:00Z" }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: "2026-09-01T00:00:00Z", stepMinutes: 10080 }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: "2026-07-17T23:59:59Z" }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: other, stepMinutes: 0 }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: other, stepMinutes: 0.5 }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: other, stepMinutes: 10_081 }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: other, stepMinutes: NaN }), RangeError);
});

test("refuse duplicate, forbidden, and badly typed body panels, plus unknowable time", () => {
  const seed = { start: origin, end: other, stepMinutes: 1440 };
  assert.throws(() => admitAstronomyPositionSeries(null), TypeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, bodies: [] }), TypeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, bodies: ["sun", "sun"] }), TypeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, bodies: ["galaxy"] }), TypeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, bodies: ["sun"], includeLunarPhase: "yes" }), TypeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, start: "1600-01-01" }), RangeError);
  assert.throws(() => admitAstronomyPositionSeries({ ...seed, end: "2200-01-01" }), RangeError);
});

test("equivalent body order requests yield byte-for-byte deterministic astronomy series", () => {
  const a = computeAstronomyPositionSeries({
    start: origin, end: other, stepMinutes: 1440, bodies: ["sun", "moon"],
  });
  const b = computeAstronomyPositionSeries({
    start: origin, end: other, stepMinutes: 1440, bodies: ["moon", "sun"],
  });
  assert.deepEqual(a, b);
  assert.ok(Object.isFrozen(a.samples));
  assert.ok(Object.isFrozen(a.request));
});
