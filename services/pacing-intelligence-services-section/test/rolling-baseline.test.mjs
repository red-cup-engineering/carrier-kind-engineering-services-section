import test from "node:test";
import assert from "node:assert/strict";
import { rollingBaseline } from "../src/pacing-intelligence.mjs";

function point(day, value) {
  return { timestamp: `${day}T07:00:00Z`, value };
}

test("computes median and MAD over an unsorted series", () => {
  const series = [point("2026-08-05", 13), point("2026-08-01", 10), point("2026-08-04", 9), point("2026-08-02", 12), point("2026-08-03", 11)];
  const result = rollingBaseline(series, 5);
  assert.equal(result.median, 11);
  assert.equal(result.mad, 1);
  assert.equal(result.n, 5);
  assert.equal(result.missingCount, 0);
  assert.equal(result.insufficientData, false);
});

test("uses only the trailing windowDays points", () => {
  const series = [point("2026-08-01", 100), point("2026-08-02", 10), point("2026-08-03", 11), point("2026-08-04", 12)];
  const result = rollingBaseline(series, 3);
  assert.equal(result.n, 3);
  assert.equal(result.median, 11);
});

test("uses all available points when windowDays exceeds the series length", () => {
  const series = [point("2026-08-01", 10), point("2026-08-02", 12)];
  const result = rollingBaseline(series, 30);
  assert.equal(result.n, 2);
  assert.equal(result.windowDays, 30);
});

test("excludes null (missing) points from the statistic but counts them", () => {
  const series = [point("2026-08-01", 10), point("2026-08-02", null), point("2026-08-03", 12), point("2026-08-04", null)];
  const result = rollingBaseline(series, 4);
  assert.equal(result.n, 2);
  assert.equal(result.missingCount, 2);
  assert.equal(result.median, 11);
});

test("reports insufficientData when every point in the window is missing", () => {
  const series = [point("2026-08-01", null), point("2026-08-02", null)];
  const result = rollingBaseline(series, 2);
  assert.deepEqual(result, { median: null, mad: null, n: 0, windowDays: 2, missingCount: 2, insufficientData: true });
});

test("reports insufficientData for an empty series", () => {
  const result = rollingBaseline([], 14);
  assert.deepEqual(result, { median: null, mad: null, n: 0, windowDays: 14, missingCount: 0, insufficientData: true });
});

test("reports insufficientData for a single-day baseline (n below MIN_BASELINE_POINTS)", () => {
  const result = rollingBaseline([point("2026-08-01", 60)], 14);
  assert.equal(result.n, 1);
  assert.equal(result.median, 60);
  assert.equal(result.mad, 0);
  assert.equal(result.insufficientData, true);
});

test("throws TypeError for a non-array series", () => {
  assert.throws(() => rollingBaseline("not-an-array", 14), TypeError);
});

test("throws TypeError for a non-positive-integer windowDays", () => {
  assert.throws(() => rollingBaseline([], 0), TypeError);
  assert.throws(() => rollingBaseline([], -1), TypeError);
  assert.throws(() => rollingBaseline([], 2.5), TypeError);
  assert.throws(() => rollingBaseline([], "14"), TypeError);
});
