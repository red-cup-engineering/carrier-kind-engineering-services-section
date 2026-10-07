import assert from "node:assert/strict";
import test from "node:test";

import { analyzePacingRequest, heartRateThresholdRequest, validateHeartRateThresholdRequest, validatePacingAnalysisRequest } from "../src/pacing-intelligence.mjs";

const observation = { metric: "hrv-rmssd", measuredAt: "2026-08-30T07:00:00Z", measurement: { value: "42.1", unit: "ms", precision: "1" }, missingness: { status: "observed" } };

test("validatePacingAnalysisRequest refuses malformed bodies before any computation", () => {
  assert.throws(() => validatePacingAnalysisRequest(null), TypeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: "x" }), TypeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: [] }), RangeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: [{ metric: "" }] }), TypeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: [{ metric: "hrv-rmssd", measuredAt: "t" }] }), /measurement.value/u);
  assert.throws(() => validatePacingAnalysisRequest({ observations: [observation], windowDays: 0 }), /windowDays/u);
  assert.equal(validatePacingAnalysisRequest({ observations: [observation] }).observations.length, 1);
});

test("analyzePacingRequest admits then analyzes one request body", () => {
  const report = analyzePacingRequest({ observations: [observation], windowDays: 14 });
  assert.equal(typeof report, "object");
  assert.throws(() => analyzePacingRequest({ observations: [] }), RangeError);
});

test("heart-rate threshold request faces admit by the estimator's own check", () => {
  assert.throws(() => validateHeartRateThresholdRequest({}), TypeError);
  assert.throws(() => heartRateThresholdRequest({ restingHr: -1 }), TypeError);
  assert.deepEqual(heartRateThresholdRequest({ restingHr: 60 }), heartRateThresholdRequest({ restingHr: 60 }));
  assert.equal(validateHeartRateThresholdRequest({ restingHr: 60 }).restingHr, 60);
});
