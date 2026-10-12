import assert from "node:assert/strict";
import test from "node:test";

import {
  addMoney,
  admitMoney,
  admitOrderBook,
  gradedBalanceOf,
  inferElidedMoney,
  marketStructure,
  moneyFromParts,
  negateMoney,
  parseDecimalMoney,
  toDecimalString,
  toExactString,
} from "../dist/market/index.mjs";

test("production money keeps ordinary ledger decimals compact and exact", () => {
  const hive = moneyFromParts(142423n, 1000n, "HIVE");
  const eth = parseDecimalMoney("0.01532910", "ETH");

  assert.deepEqual(hive.value, { kind: "exactNumber.rational", num: "142423", den: "1000" });
  assert.deepEqual(eth.value, { kind: "exactNumber.rational", num: "153291", den: "10000000" });
  assert.equal(toDecimalString(hive), "142.423");
  assert.equal(toDecimalString(eth), "0.0153291");
  assert.equal(toExactString(eth), "153291/10000000 ETH");
});

test("non-terminating values render as exact fractions instead of rounded decimals", () => {
  assert.equal(toDecimalString(moneyFromParts(1n, 3n, "USD")), "1/3");
  assert.equal(toDecimalString(moneyFromParts(-2n, 7n, "USD")), "-2/7");
});

test("JSON money admission rejects malformed carriers and restores canonical form", () => {
  const admitted = admitMoney({
    kind: "exactNumber.gradedRational",
    value: { kind: "exactNumber.rational", num: "0006", den: "8" },
    grade: "USD",
  });
  assert.deepEqual(admitted.value, { kind: "exactNumber.rational", num: "3", den: "4" });
  assert.throws(
    () => admitMoney({ kind: "exactNumber.gradedRational", value: { kind: "exactNumber.rational", num: "1", den: "0" }, grade: "USD" }),
    /positive integer decimal string/,
  );
  assert.throws(
    () => admitMoney({ kind: "exactNumber.gradedRational", value: { kind: "exactNumber.rational", num: "1", den: "2" }, grade: "", extra: true }),
    /expected exactly kind, value, grade/,
  );
  assert.throws(
    () => admitMoney({ kind: "exactNumber.gradedRational", value: { kind: "exactNumber.rational", num: "1", den: "2" }, grade: "" }),
    /grade must be a non-empty string/,
  );
});

test("order-book admission enforces shape, signs, and common commodities", () => {
  const money = (amount, grade) => parseDecimalMoney(amount, grade);
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
    bids: [{ price: parseDecimalMoney("99", "USD"), quantity: parseDecimalMoney("1", "BTC") }],
    asks: [
      { price: parseDecimalMoney("100", "USD"), quantity: parseDecimalMoney("1", "BTC") },
      { price: parseDecimalMoney("98", "USD"), quantity: parseDecimalMoney("1", "BTC") },
    ],
  });
  const ids = structure.events.map((event) => event.id);
  assert.ok(!ids.includes("fill:0-0"));
  assert.ok(ids.includes("fill:0-1"));
});

test("compact graded conservation balances and infers by commodity", () => {
  const asset = parseDecimalMoney("921.247", "HP");
  const equity = negateMoney(asset);
  const judgment = gradedBalanceOf([asset, equity]);
  assert.equal(judgment.kind, "meme-analysis.conservation.graded:witness");

  const completion = inferElidedMoney([asset]);
  assert.equal(completion.kind, "meme-analysis.conservation.graded-completion:witness");
  assert.equal(toExactString(completion.inferred), "-921247/1000 HP");
  assert.equal(toExactString(addMoney(asset, completion.inferred)), "0/1 HP");
});
