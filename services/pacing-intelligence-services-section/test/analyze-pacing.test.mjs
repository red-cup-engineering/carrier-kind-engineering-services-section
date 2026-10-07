import test from "node:test";
import assert from "node:assert/strict";
import { analyzePacing } from "../src/pacing-intelligence.mjs";
import { dailySeries, observation } from "./fixtures/biometric-observations.mjs";

test("handles a fully empty observation set", () => {
  const result = analyzePacing([]);
  assert.equal(result.observationCount, 0);
  assert.equal(result.usableObservationCount, 0);
  assert.equal(result.windowDays, 14);
  assert.equal(result.restingHeartRate.latestValue, null);
  assert.equal(result.restingHeartRate.thresholdEstimate, null);
  for (const metric of [result.hrv, result.sleep, result.activity]) {
    assert.equal(metric.today, null);
    assert.equal(metric.deviation.status, "missing-today");
  }
  assert.deepEqual(result.risk.flags, []);
  assert.match(result.note, /No diagnosis/);
});

test("handles a single-day observation set (insufficient baseline, but a computable threshold)", () => {
  const observations = [
    observation({ metric: "resting-heart-rate", day: "2026-08-20", value: 58, unit: "{beats}/min" }),
    observation({ metric: "hrv-rmssd", day: "2026-08-20", value: 40, unit: "ms" }),
  ];
  const result = analyzePacing(observations);
  assert.equal(result.restingHeartRate.latestValue, 58);
  assert.equal(result.restingHeartRate.thresholdEstimate.ceilingBpm, 73);
  assert.equal(result.hrv.today.value, 40);
  assert.equal(result.hrv.deviation.status, "insufficient-baseline");
  assert.equal(result.sleep.deviation.status, "missing-today");
});

test("flags suppressed HRV against a 5-point rolling baseline with missing days interspersed", () => {
  const observations = dailySeries("hrv-rmssd", "2026-08-01", [40, null, 42, 41, null, 43, 40, 5], "ms");
  const result = analyzePacing(observations, { windowDays: 14 });
  assert.equal(result.hrv.baseline.n, 5);
  assert.equal(result.hrv.baseline.missingCount, 2);
  assert.equal(result.hrv.baseline.median, 41);
  assert.equal(result.hrv.baseline.mad, 1);
  assert.equal(result.hrv.today.value, 5);
  assert.equal(result.hrv.deviation.status, "ok");
  assert.ok(result.hrv.deviation.deviation < -3.5);
  assert.ok(result.risk.flags.some((flag) => flag.code === "HRV_SUPPRESSED_VS_OWN_BASELINE"));
});

test("raises the composite flag when HRV, sleep, and prior-day activity all deviate at once", () => {
  const observations = [
    ...dailySeries("hrv-rmssd", "2026-08-01", [40, 41, 42, 41, 40, 42, 41, 5], "ms"),
    ...dailySeries("sleep-duration", "2026-08-01", [6.8, 7.1, 7.4, 6.9, 7.6, 7.0, 7.3, 2], "h"),
    ...dailySeries("activity-load", "2026-08-01", [30, 32, 31, 30, 33, 31, 30, 90], "min"),
  ];
  const result = analyzePacing(observations);
  const codes = result.risk.flags.map((flag) => flag.code);
  assert.ok(codes.includes("HRV_SUPPRESSED_VS_OWN_BASELINE"));
  assert.ok(codes.includes("SLEEP_SHORT_VS_OWN_BASELINE"));
  assert.ok(codes.includes("PRIOR_DAY_ACTIVITY_ELEVATED_VS_OWN_BASELINE"));
  assert.ok(codes.includes("MULTIPLE_CONSERVATIVE_INDICATORS_PRESENT"));
});

test("respects a caller-supplied windowDays smaller than the full history", () => {
  const observations = dailySeries("hrv-rmssd", "2026-08-01", [100, 100, 100, 10, 11, 12, 5], "ms");
  const result = analyzePacing(observations, { windowDays: 3 });
  assert.equal(result.hrv.baseline.n, 3);
  assert.equal(result.hrv.baseline.median, 11);
});

test("respects a caller-supplied metricIds mapping", () => {
  const observations = [
    observation({ metric: "resting-hr-custom", day: "2026-08-20", value: 62, unit: "{beats}/min" }),
  ];
  const result = analyzePacing(observations, { metricIds: { restingHeartRate: "resting-hr-custom" } });
  assert.equal(result.restingHeartRate.latestValue, 62);
});

test("skips malformed entries instead of throwing", () => {
  const observations = [null, 42, "not-an-observation", observation({ metric: "resting-heart-rate", day: "2026-08-20", value: 60, unit: "{beats}/min" })];
  const result = analyzePacing(observations);
  assert.equal(result.observationCount, 4);
  assert.equal(result.usableObservationCount, 1);
  assert.equal(result.restingHeartRate.latestValue, 60);
});

test("throws TypeError when observations is not an array", () => {
  assert.throws(() => analyzePacing("not-an-array"), TypeError);
  assert.throws(() => analyzePacing(null), TypeError);
});
