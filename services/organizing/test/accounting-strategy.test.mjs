import assert from "node:assert/strict";
import test from "node:test";

import { strategyActions } from "../src/accounting/strategy.mjs";

const exact = (num, den, grade) => ({
  kind: "exactNumber.gradedRational",
  value: { kind: "exactNumber.rational", num, den },
  grade,
});

const bestExecutionAction = strategyActions.find((candidate) => candidate.verb === "best-execution");

test("best-execution admits canonical exact carriers at its JSON boundary", () => {
  assert.ok(bestExecutionAction);
  const result = bestExecutionAction.execute({
    book: {
      bids: [],
      asks: [{ price: exact("2", "1", "USD"), quantity: exact("3", "1", "BTC") }],
    },
    baseQuantity: exact("0001", "2", "BTC"),
  }, {});

  assert.equal(result.walk.filled.value.num, "1");
  assert.equal(result.walk.filled.value.den, "2");
  assert.equal(result.walk.cost.value.num, "1");
  assert.equal(result.walk.cost.grade, "USD");
});

test("best-execution rejects malformed money before strategy evaluation", () => {
  assert.ok(bestExecutionAction);
  assert.throws(
    () => bestExecutionAction.execute({
      book: { bids: [], asks: [] },
      baseQuantity: exact("1", "0", "BTC"),
    }, {}),
    /best-execution\.baseQuantity\.value\.den/,
  );
  assert.throws(
    () => bestExecutionAction.execute({
      book: {
        bids: [],
        asks: [{ price: exact("-1", "1", "USD"), quantity: exact("1", "1", "BTC") }],
      },
      baseQuantity: exact("1", "1", "BTC"),
    }, {}),
    /negative price or quantity/,
  );
});
