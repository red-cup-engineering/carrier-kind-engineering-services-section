import test from "node:test";
import assert from "node:assert/strict";
import { obstacleOfAllocation } from "../src/enterprise/work-arena.mjs";

test("the item's own reasons bind every carrier", () => {
  assert.equal(obstacleOfAllocation({ reasons: ["coordination-obstructed"], candidates: [{ reasons: ["provider-in-flight"] }] }), "dependency");
});

test("the work waits on the carrier nearest to clearing", () => {
  const item = { reasons: ["no-qualified-available-character"], candidates: [
    { reasons: ["capability-missing:work-board", "provider-unavailable"] },
    { reasons: ["provider-in-flight"] },
  ] };
  assert.equal(obstacleOfAllocation(item), "capacity");
});

test("each carrier is held by the most binding of its own reasons", () => {
  const item = { candidates: [
    { reasons: ["order-incomplete", "provider-unavailable"] },
    { reasons: ["order-incomplete", "capability-missing:agency"] },
  ] };
  assert.equal(obstacleOfAllocation(item), "information");
});

test("a carrier held only by the taker's own records is no obstacle to tell", () => {
  assert.equal(obstacleOfAllocation({ candidates: [{ reasons: ["capability-missing:agency"] }, { reasons: ["failed-attempt-unwitnessed"] }] }), undefined);
  assert.equal(obstacleOfAllocation({ reasons: ["no-qualified-available-character"], candidates: [] }), undefined);
});
