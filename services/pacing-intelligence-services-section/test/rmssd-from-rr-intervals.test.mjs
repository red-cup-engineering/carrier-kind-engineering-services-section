import test from "node:test";
import assert from "node:assert/strict";
import { rmssdFromRrIntervals } from "../src/pacing-intelligence.mjs";

test("computes RMSSD from two RR intervals via the standard formula", () => {
  assert.equal(rmssdFromRrIntervals([800, 810, 790]), Math.sqrt(250));
});

test("returns 0 for perfectly regular RR intervals", () => {
  assert.equal(rmssdFromRrIntervals([800, 800, 800, 800]), 0);
});

test("throws RangeError for fewer than 2 intervals", () => {
  assert.throws(() => rmssdFromRrIntervals([800]), RangeError);
  assert.throws(() => rmssdFromRrIntervals([]), RangeError);
});

test("throws TypeError for non-array input", () => {
  assert.throws(() => rmssdFromRrIntervals("800,810,790"), TypeError);
  assert.throws(() => rmssdFromRrIntervals(null), TypeError);
});

test("throws TypeError for non-finite or non-positive intervals", () => {
  assert.throws(() => rmssdFromRrIntervals([800, NaN]), TypeError);
  assert.throws(() => rmssdFromRrIntervals([800, -10]), TypeError);
  assert.throws(() => rmssdFromRrIntervals([800, 0]), TypeError);
  assert.throws(() => rmssdFromRrIntervals([800, "810"]), TypeError);
});
