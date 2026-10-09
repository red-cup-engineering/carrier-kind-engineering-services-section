import test from "node:test";
import assert from "node:assert/strict";
import { morningDeviation, rollingBaseline } from "../src/pacing-intelligence.mjs";

const NORMAL_BASELINE = Object.freeze({ median: 11, mad: 1, n: 10, windowDays: 14, missingCount: 0, insufficientData: false });

test("computes the modified z-score against a normal baseline", () => {
  const result = morningDeviation({ value: 14 }, NORMAL_BASELINE);
  assert.equal(result.status, "ok");
  assert.equal(result.rawDelta, 3);
  assert.equal(result.deviation, 0.6745 * 3);
});

test("handles a below-baseline value", () => {
  const result = morningDeviation({ value: 8 }, NORMAL_BASELINE);
  assert.equal(result.status, "ok");
  assert.equal(result.rawDelta, -3);
  assert.equal(result.deviation, 0.6745 * -3);
});

test("reports missing-today when value is null", () => {
  const result = morningDeviation({ value: null }, NORMAL_BASELINE);
  assert.equal(result.status, "missing-today");
  assert.equal(result.deviation, null);
  assert.equal(result.rawDelta, null);
});

test("reports missing-today when status is 'missing' regardless of value", () => {
  const result = morningDeviation({ value: 14, status: "missing" }, NORMAL_BASELINE);
  assert.equal(result.status, "missing-today");
});

test("reports insufficient-baseline when the baseline has too few points", () => {
  const insufficient = rollingBaseline([{ timestamp: "2026-08-01T07:00:00Z", value: 11 }], 14);
  const result = morningDeviation({ value: 14 }, insufficient);
  assert.equal(result.status, "insufficient-baseline");
  assert.equal(result.deviation, null);
});

test("reports insufficient-baseline when the baseline is empty", () => {
  const empty = rollingBaseline([], 14);
  const result = morningDeviation({ value: 14 }, empty);
  assert.equal(result.status, "insufficient-baseline");
});

test("reports baseline-zero-variance instead of dividing by zero MAD", () => {
  const zeroVariance = Object.freeze({ median: 60, mad: 0, n: 5, windowDays: 14, missingCount: 0, insufficientData: false });
  const result = morningDeviation({ value: 65 }, zeroVariance);
  assert.equal(result.status, "baseline-zero-variance");
  assert.equal(result.deviation, null);
  assert.equal(result.rawDelta, 5);
  assert.notEqual(result.deviation, Infinity);
});

test("reports baseline-zero-variance even when today equals the median exactly", () => {
  const zeroVariance = Object.freeze({ median: 60, mad: 0, n: 5, windowDays: 14, missingCount: 0, insufficientData: false });
  const result = morningDeviation({ value: 60 }, zeroVariance);
  assert.equal(result.status, "baseline-zero-variance");
  assert.equal(result.rawDelta, 0);
});

test("throws TypeError for malformed today or baseline", () => {
  assert.throws(() => morningDeviation(null, NORMAL_BASELINE), TypeError);
  assert.throws(() => morningDeviation({ value: "14" }, NORMAL_BASELINE), TypeError);
  assert.throws(() => morningDeviation({ value: 14 }, {}), TypeError);
});
