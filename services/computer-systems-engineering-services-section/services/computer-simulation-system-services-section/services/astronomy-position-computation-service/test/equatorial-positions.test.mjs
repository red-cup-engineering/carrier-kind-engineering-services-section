import test from "node:test";
import assert from "node:assert/strict";
import {
  meanObliquityOfDateDegrees,
  eclipticToEquatorial, equatorialToEcliptic,
  computeEquatorialPositions,
} from "../src/equatorial-positions.mjs";
import { J2000 } from "../src/time.mjs";
import { computeChart } from "../src/ephemeris.mjs";
import { BODIES } from "../src/positions.mjs";

const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) < tolerance, "actual " + actual + " expected " + expected);

const circDifference = (a, b) => ((a - b + 540) % 360) - 180;

test("J2000 mean obliquity agrees with the Meeus reference and decreases toward 2026", () => {
  const j2000 = meanObliquityOfDateDegrees(J2000);
  close(j2000, 23 + 26 / 60 + 21.448 / 3600, 1e-14);
  const t2026 = meanObliquityOfDateDegrees(J2000 + 26.75 * 365.25);
  assert.ok(t2026 > 23.43 && t2026 < 23.44);
  assert.ok(t2026 < j2000);
  assert.throws(() => meanObliquityOfDateDegrees(Infinity), TypeError);
});

test("ecliptic cardinal axes transform to the expected equatorial axes", () => {
  const eps = meanObliquityOfDateDegrees(J2000);
  const atZero = eclipticToEquatorial(0, 0, eps);
  close(atZero.rightAscensionDegrees, 0);
  close(atZero.declinationDegrees, 0);
  const at90 = eclipticToEquatorial(90, 0, eps);
  close(at90.rightAscensionDegrees, 90);
  close(at90.declinationDegrees, eps);
  const at180 = eclipticToEquatorial(180, 0, eps);
  close(at180.rightAscensionDegrees, 180);
  close(at180.declinationDegrees, 0);
  const at270 = eclipticToEquatorial(270, 0, eps);
  close(at270.rightAscensionDegrees, 270);
  close(at270.declinationDegrees, -eps);
});

test("forward and inverse vector rotations conserve sky points and angular domains", () => {
  const eps = meanObliquityOfDateDegrees(J2000);
  for (const lon of [-1, 0, 22, 123.456, 270, 359.9999, 361]) {
    for (const lat of [-80, -40, 0, 15, 67, 82]) {
      const eq = eclipticToEquatorial(lon, lat, eps);
      assert.ok(eq.rightAscensionDegrees >= 0 && eq.rightAscensionDegrees < 360);
      assert.ok(eq.declinationDegrees >= -90 && eq.declinationDegrees <= 90);
      const back = equatorialToEcliptic(eq.rightAscensionDegrees, eq.declinationDegrees, eps);
      close(circDifference(back.longitudeDegrees, lon), 0, 2e-12);
      close(back.latitudeDegrees, lat, 2e-12);
    }
  }
});

test("a derived equatorial datum preserves ten source bodies and no fictional precision claim", () => {
  const out = computeEquatorialPositions("2026-09-08T00:00:00Z");
  assert.deepEqual(Object.keys(out.bodies), BODIES);
  assert.equal(out.time, "2026-09-08T00:00:00.000Z");
  assert.equal(out.type, "561.astronomy-equatorial-position.v1");
  assert.deepEqual(out.provenance, computeChart(out.time).provenance);
  assert.match(out.derivedFrame, /mean obliquity/);
  assert.match(out.measurementNote, /not ICRS/);
  for (const row of Object.values(out.bodies)) {
    assert.ok(row.rightAscensionDegrees >= 0 && row.rightAscensionDegrees < 360);
    assert.ok(row.rightAscensionHours >= 0 && row.rightAscensionHours < 24);
    assert.ok(row.declinationDegrees >= -90 && row.declinationDegrees <= 90);
    close(row.rightAscensionDegrees, row.rightAscensionHours * 15, 0.00002);
  }
  assert.deepEqual(out, computeEquatorialPositions("2026-09-08"));
  assert.throws(() => computeEquatorialPositions("1700-01-01"), RangeError);
});

test("coordinate primitives explicitly refuse bad geometry", () => {
  assert.throws(() => eclipticToEquatorial(0, 100, 23), RangeError);
  assert.throws(() => eclipticToEquatorial(NaN, 0, 23), TypeError);
  assert.throws(() => eclipticToEquatorial(0, 0, NaN), RangeError);
  assert.throws(() => equatorialToEcliptic(0, -95, 23), RangeError);
});
