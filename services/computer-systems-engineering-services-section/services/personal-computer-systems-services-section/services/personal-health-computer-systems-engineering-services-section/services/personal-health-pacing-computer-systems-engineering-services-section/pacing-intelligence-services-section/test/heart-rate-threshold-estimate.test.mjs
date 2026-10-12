import test from "node:test";
import assert from "node:assert/strict";
import { heartRateThresholdEstimate } from "../src/pacing-intelligence.mjs";

test("applies the Workwell resting-heart-rate-plus-15 heuristic", () => {
  const result = heartRateThresholdEstimate({ restingHr: 60 });
  assert.equal(result.ceilingBpm, 75);
  assert.equal(result.restingHr, 60);
  assert.match(result.formula, /\+ 15 bpm/);
});

test("labels the result as an unvalidated heuristic, not a tested instrument", () => {
  const result = heartRateThresholdEstimate({ restingHr: 55 });
  assert.match(result.evidenceStatus, /rule of thumb/i);
  assert.match(result.evidenceStatus, /no validating primary study/i);
});

test("throws TypeError for a non-positive or non-finite restingHr", () => {
  assert.throws(() => heartRateThresholdEstimate({ restingHr: 0 }), TypeError);
  assert.throws(() => heartRateThresholdEstimate({ restingHr: -10 }), TypeError);
  assert.throws(() => heartRateThresholdEstimate({ restingHr: NaN }), TypeError);
  assert.throws(() => heartRateThresholdEstimate({ restingHr: "60" }), TypeError);
  assert.throws(() => heartRateThresholdEstimate({}), TypeError);
});
