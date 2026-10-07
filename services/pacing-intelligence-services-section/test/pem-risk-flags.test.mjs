import test from "node:test";
import assert from "node:assert/strict";
import { pemRiskFlags } from "../src/pacing-intelligence.mjs";

function ok(deviation) {
  return { deviation, rawDelta: deviation, status: "ok", median: 0, mad: 1 };
}
const MISSING = { deviation: null, rawDelta: null, status: "missing-today", median: 0, mad: 1 };

test("returns no flags when nothing deviates notably", () => {
  const result = pemRiskFlags({ hrvDeviation: ok(-1), sleepDeviation: ok(-1), priorDayActivity: ok(1) });
  assert.deepEqual(result.flags, []);
  assert.deepEqual(result.dataQuality, { hrv: "ok", sleep: "ok", activity: "ok" });
});

test("flags suppressed HRV vs baseline", () => {
  const result = pemRiskFlags({ hrvDeviation: ok(-4), sleepDeviation: ok(0), priorDayActivity: ok(0) });
  assert.equal(result.flags.length, 1);
  assert.equal(result.flags[0].code, "HRV_SUPPRESSED_VS_OWN_BASELINE");
  assert.match(result.flags[0].evidenceStatus, /Aboagye/);
});

test("flags short sleep vs baseline", () => {
  const result = pemRiskFlags({ hrvDeviation: ok(0), sleepDeviation: ok(-5), priorDayActivity: ok(0) });
  assert.equal(result.flags.length, 1);
  assert.equal(result.flags[0].code, "SLEEP_SHORT_VS_OWN_BASELINE");
});

test("flags elevated prior-day activity vs baseline", () => {
  const result = pemRiskFlags({ hrvDeviation: ok(0), sleepDeviation: ok(0), priorDayActivity: ok(4) });
  assert.equal(result.flags.length, 1);
  assert.equal(result.flags[0].code, "PRIOR_DAY_ACTIVITY_ELEVATED_VS_OWN_BASELINE");
});

test("adds the composite flag only when all three trigger together", () => {
  const result = pemRiskFlags({ hrvDeviation: ok(-4), sleepDeviation: ok(-4), priorDayActivity: ok(4) });
  const codes = result.flags.map((flag) => flag.code);
  assert.equal(codes.length, 4);
  assert.ok(codes.includes("MULTIPLE_CONSERVATIVE_INDICATORS_PRESENT"));
});

test("never flags a signal whose status is not ok, even at an extreme value", () => {
  const result = pemRiskFlags({ hrvDeviation: MISSING, sleepDeviation: ok(0), priorDayActivity: ok(0) });
  assert.deepEqual(result.flags, []);
  assert.equal(result.dataQuality.hrv, "missing-today");
});

test("carries the never-diagnostic note", () => {
  const result = pemRiskFlags({ hrvDeviation: ok(0), sleepDeviation: ok(0), priorDayActivity: ok(0) });
  assert.match(result.note, /diagnoses, predicts, or confirms/i);
});

test("throws TypeError for malformed inputs", () => {
  assert.throws(() => pemRiskFlags({ hrvDeviation: ok(0), sleepDeviation: ok(0) }), TypeError);
  assert.throws(() => pemRiskFlags({ hrvDeviation: null, sleepDeviation: ok(0), priorDayActivity: ok(0) }), TypeError);
  assert.throws(() => pemRiskFlags({}), TypeError);
});
