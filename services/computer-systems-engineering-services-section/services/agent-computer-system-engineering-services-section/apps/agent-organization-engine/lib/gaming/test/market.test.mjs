import assert from "node:assert/strict";
import test from "node:test";

import { admitOrderBook, marketStructure } from "../src/market/index.mjs";
import { admitGraded, gradedAdd, gradedFromParts, gradedNegate, gradedOfDecimal, gradedToDecimalString, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";
import { gradedComplete, gradedConserved } from "@red-cup-engineering/exact-number-data-service/graded";

test("production money keeps ordinary ledger decimals compact and exact", () => {
  const hive = gradedFromParts(142423n, 1000n, "HIVE");
  const eth = gradedOfDecimal("0.01532910", "ETH");

  assert.deepEqual(hive.value, { kind: "exactNumber.rational", num: "142423", den: "1000" });
  assert.deepEqual(eth.value, { kind: "exactNumber.rational", num: "153291", den: "10000000" });
  assert.equal(gradedToDecimalString(hive), "142.423");
  assert.equal(gradedToDecimalString(eth), "0.0153291");
  assert.equal(gradedToExactString(eth), "153291/10000000 ETH");
});

test("non-terminating values render as exact fractions instead of rounded decimals", () => {
  assert.equal(gradedToDecimalString(gradedFromParts(1n, 3n, "USD")), "1/3");
  assert.equal(gradedToDecimalString(gradedFromParts(-2n, 7n, "USD")), "-2/7");
});

test("JSON money admission rejects malformed carriers and restores canonical form", () => {
  const admitted = admitGraded({
    kind: "exactNumber.gradedRational",
    value: { kind: "exactNumber.rational", num: "0006", den: "8" },
    grade: "USD",
  });
  assert.deepEqual(admitted.value, { kind: "exactNumber.rational", num: "3", den: "4" });
  assert.throws(
    () => admitGraded({ kind: "exactNumber.gradedRational", value: { kind: "exactNumber.rational", num: "1", den: "0" }, grade: "USD" }),
    /positive integer decimal string/,
  );
  assert.throws(
    () => admitGraded({ kind: "exactNumber.gradedRational", value: { kind: "exactNumber.rational", num: "1", den: "2" }, grade: "", extra: true }),
    /expected exactly kind, value, grade/,
  );
  assert.throws(
    () => admitGraded({ kind: "exactNumber.gradedRational", value: { kind: "exactNumber.rational", num: "1", den: "2" }, grade: "" }),
    /grade must be a non-empty string/,
  );
});

test("order-book admission enforces shape, signs, and common commodities", () => {
  const money = (amount, grade) => gradedOfDecimal(amount, grade);
  const admitted = admitOrderBook({
    bids: [{ price: money("99", "USD"), quantity: money("1", "BTC") }],
    asks: [{ price: money("100", "USD"), quantity: money("2", "BTC") }],
  });
  assert.equal(admitted.bids[0].price.value.num, "99");
  assert.ok(Object.isFrozen(admitted));
  assert.throws(
    () => admitOrderBook({ bids: [], asks: "not-an-array" }),
    /bids and asks must be arrays/,
  );
  assert.throws(
    () => admitOrderBook({ bids: [{ price: money("99", "USD"), quantity: money("-1", "BTC") }], asks: [] }),
    /negative price or quantity/,
  );
  assert.throws(
    () => admitOrderBook({
      bids: [{ price: money("99", "USD"), quantity: money("1", "BTC") }],
      asks: [{ price: money("100", "EUR"), quantity: money("1", "BTC") }],
    }),
    /price commodities differ/,
  );
});

test("market arenas contain fill events only for prices that cross", () => {
  const structure = marketStructure({
    bids: [{ price: gradedOfDecimal("99", "USD"), quantity: gradedOfDecimal("1", "BTC") }],
    asks: [
      { price: gradedOfDecimal("100", "USD"), quantity: gradedOfDecimal("1", "BTC") },
      { price: gradedOfDecimal("98", "USD"), quantity: gradedOfDecimal("1", "BTC") },
    ],
  });
  const ids = structure.events.map((event) => event.id);
  assert.ok(!ids.includes("fill:0-0"));
  assert.ok(ids.includes("fill:0-1"));
});

test("compact graded conservation balances and infers by commodity", () => {
  const asset = gradedOfDecimal("921.247", "HP");
  const equity = gradedNegate(asset);
  const judgment = gradedConserved([asset, equity]);
  assert.equal(judgment.kind, "meme-analysis.conservation.graded:witness");

  const completion = gradedComplete([asset]);
  assert.equal(completion.kind, "meme-analysis.conservation.graded-completion:witness");
  assert.equal(gradedToExactString(completion.inferred), "-921247/1000 HP");
  assert.equal(gradedToExactString(gradedAdd(asset, completion.inferred)), "0/1 HP");
});
