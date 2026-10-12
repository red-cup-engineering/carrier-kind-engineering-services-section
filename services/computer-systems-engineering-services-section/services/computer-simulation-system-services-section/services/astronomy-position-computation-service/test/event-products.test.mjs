import test from "node:test";
import assert from "node:assert/strict";
import {
  julianDayFromIso, terrestrialJulianDay, isoFromJulianDay,
  isoUtcFromTerrestrialJulianDay, universalJulianDay,
  admitAstronomyEventWindow, computeAstronomyEventWindow,
  MAX_EVENT_WINDOW_DAYS,
} from "../src/index.mjs";

test("UT -> TT -> UT is a real inverse, unlike formatting TT as UTC", () => {
  for (const instant of [
    "2000-01-01T12:00:00Z",
    "2026-10-12T12:00:00Z",
    "2050-01-01T00:00:00Z",
  ]) {
    const jdUt = julianDayFromIso(instant);
    const jdTt = terrestrialJulianDay(jdUt);
    assert.ok(Math.abs(universalJulianDay(jdTt) - jdUt) < 2e-8);
    const displayed = isoUtcFromTerrestrialJulianDay(jdTt);
    assert.ok(Math.abs(Date.parse(displayed) - Date.parse(instant)) <= 1000);
  }
  const jdTt2026 = terrestrialJulianDay(julianDayFromIso("2026-10-12T12:00:00Z"));
  assert.ok(Date.parse(isoFromJulianDay(jdTt2026)) - Date.parse("2026-10-12T12:00:00Z") > 60000,
    "the old event timestamp silently formatted TT directly as UTC");
  assert.throws(() => universalJulianDay(NaN), TypeError);
});

test("bounded lunar event computation exposes scientific provenance and UTC times", () => {
  const result = computeAstronomyEventWindow({
    kind: "lunation-quarters", start: "2026-10-01", end: "2026-11-01",
  });
  assert.equal(result.type, "561.astronomy-event-window.v1");
  assert.equal(result.request.start, "2026-10-01T00:00:00.000Z");
  assert.ok(result.method.algorithm);
  assert.match(result.timeScale, /TT/);
  assert.match(result.accuracyNotice, /not an absolute/);
  assert.ok(result.events.length >= 3, "at least three lunation quarters in 31 days");
  for (let i = 0; i < result.events.length; i += 1) {
    const event = result.events[i];
    assert.ok(Date.parse(event.time) >= Date.parse(result.request.start));
    assert.ok(Date.parse(event.time) <= Date.parse(result.request.end));
    assert.ok(["new moon", "first quarter", "full moon", "last quarter"].includes(event.quarter));
    if (i > 0) assert.ok(event.time >= result.events[i - 1].time);
  }
});

test("same observation math sells independent geocentric-relative crossings", () => {
  const result = computeAstronomyEventWindow({
    kind: "relative-longitude-crossings",
    start: "2026-10-01", end: "2026-11-01",
    bodyA: "sun", bodyB: "moon", angleDegrees: 0,
  });
  assert.ok(result.events.length >= 1);
  for (const event of result.events) {
    assert.equal(event.bodyA, "sun");
    assert.equal(event.bodyB, "moon");
    assert.equal(event.angle, 0);
    assert.ok(Date.parse(event.time) <= Date.parse(result.request.end));
  }
});

test("apparent station reads are bounded and do not invent events", () => {
  const result = computeAstronomyEventWindow({
    kind: "apparent-stations", start: "2026-07-01", end: "2026-08-01", body: "mercury",
  });
  assert.ok(Array.isArray(result.events));
  for (const event of result.events) {
    assert.equal(event.body, "mercury");
    assert.ok(["retrograde", "direct"].includes(event.stationTo));
  }
});

test("admission rejects unbounded spans, bad bodies, and malformed numerical contracts", () => {
  const basic = { kind: "lunation-quarters", start: "2026-10-01", end: "2026-11-01" };
  assert.equal(MAX_EVENT_WINDOW_DAYS, 35);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, end: "2027-01-01" }), RangeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, end: basic.start }), RangeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, start: "1700-01-01" }), RangeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, kind: "horoscope" }), TypeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, kind: "apparent-stations", body: "moon" }), TypeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, kind: "apparent-stations", body: "mars-bogus" }), TypeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, kind: "relative-longitude-crossings",
    bodyA: "sun", bodyB: "sun", angleDegrees: 0 }), TypeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, kind: "relative-longitude-crossings",
    bodyA: "sun", bodyB: "moon", angleDegrees: Infinity }), RangeError);
  assert.throws(() => admitAstronomyEventWindow({ ...basic, kind: "relative-longitude-crossings",
    bodyA: "sun", bodyB: "moon", angleDegrees: -1 }), RangeError);
});
