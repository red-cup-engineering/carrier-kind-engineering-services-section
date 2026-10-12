import { test } from "node:test";
import assert from "node:assert/strict";
import { computeKellyFraction, sizeRiskStake } from "../src/kelly-sizing.mjs";

test("computeKellyFraction: classic formula, p=0.6 R=1 -> f*=0.2", () => {
  const f = computeKellyFraction({ hitRate: 0.6, averageWin: 0.02, averageLoss: 0.02 });
  assert.ok(Math.abs(f - 0.2) < 1e-9);
});

test("computeKellyFraction: a coin-flip edge (p=0.5, R=1) gives zero", () => {
  const f = computeKellyFraction({ hitRate: 0.5, averageWin: 0.01, averageLoss: 0.01 });
  assert.ok(Math.abs(f - 0) < 1e-9);
});

test("computeKellyFraction: a losing edge never goes negative -- clamped to 0, meaning 'no bet'", () => {
  const f = computeKellyFraction({ hitRate: 0.3, averageWin: 0.01, averageLoss: 0.02 });
  assert.equal(f, 0);
});

test("computeKellyFraction: refuses non-positive averageWin/averageLoss", () => {
  assert.throws(() => computeKellyFraction({ hitRate: 0.6, averageWin: 0, averageLoss: 0.02 }), TypeError);
});

test("sizeRiskStake: sizes full Kelly against the stake with no haircut", () => {
  const result = sizeRiskStake({ riskStakeAmount: 1000, kellyFraction: 0.2 });
  assert.equal(result.notional, 200);
  assert.equal(result.cappedByUnleveredStake, false);
});

test("sizeRiskStake: 'or beyond' -- an aggressionMultiplier past full Kelly is honored up to the stake", () => {
  const result = sizeRiskStake({ riskStakeAmount: 1000, kellyFraction: 0.4, aggressionMultiplier: 2 });
  assert.equal(result.appliedFraction, 0.8);
  assert.equal(result.notional, 800);
});

test("sizeRiskStake: the ONLY clamp is the unlevered stake ceiling, never a fractional-Kelly caution haircut", () => {
  const result = sizeRiskStake({ riskStakeAmount: 500, kellyFraction: 0.9, aggressionMultiplier: 3 });
  assert.equal(result.notional, 500);
  assert.equal(result.cappedByUnleveredStake, true);
});

test("sizeRiskStake: refuses a non-positive riskStakeAmount", () => {
  assert.throws(() => sizeRiskStake({ riskStakeAmount: 0, kellyFraction: 0.2 }), TypeError);
});
