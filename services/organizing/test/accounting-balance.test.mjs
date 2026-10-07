/**
 * accounting-balance — organizing's accounting adapter over gaming market money.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { accountingBalance } from "../src/accounting-balance.mjs";

const amount = (num, den, commodity) => ({ num, den, commodity });
const posting = (account, value) => ({
  account,
  amount: value,
  cost: null,
  price: null,
  balanceAssertion: null,
  meta: {},
});
const transaction = (postings) => ({
  id: "txn:test",
  date: "2026-06-26",
  time: null,
  flag: "*",
  payee: null,
  narration: "test",
  postings,
  tags: [],
  links: [],
  meta: {},
  code: null,
  source: null,
});

test("balanced transactions conserve in each commodity", () => {
  const report = accountingBalance(transaction([
    posting("Assets:Cash", amount("10", "1", "USD")),
    posting("Income:Sales", amount("-10", "1", "USD")),
  ]));

  assert.equal(report.kind, "organizing.accounting.balance");
  assert.equal(report.balanced, true);
  assert.deepEqual(report.residual, []);
  assert.deepEqual(report.residualExact, []);
  assert.equal(report.inferredPostingIndex, null);
  assert.equal(report.inferredAmount, null);
});

test("imbalanced transactions carry exact residuals", () => {
  const report = accountingBalance(transaction([
    posting("Assets:Cash", amount("10", "1", "USD")),
    posting("Income:Sales", amount("-8", "1", "USD")),
  ]));

  assert.equal(report.balanced, false);
  assert.deepEqual(report.residual, [amount("2", "1", "USD")]);
  assert.deepEqual(report.residualExact, ["2/1 USD"]);
});

test("one elided posting is inferred through gaming market completion", () => {
  const report = accountingBalance(transaction([
    posting("Assets:Cash", amount("10", "1", "USD")),
    posting("Income:Sales", null),
  ]));

  assert.equal(report.balanced, false);
  assert.equal(report.inferredPostingIndex, 1);
  assert.deepEqual(report.inferredAmount, amount("-10", "1", "USD"));
});

test("total price/cost preserves the face sign over the reducer commodity", () => {
  const sharePosting = {
    ...posting("Assets:Shares", amount("-2", "1", "SHARE")),
    price: { kind: "@@", amount: amount("12", "1", "USD") },
  };
  const cashPosting = posting("Assets:Cash", amount("12", "1", "USD"));
  const report = accountingBalance(transaction([sharePosting, cashPosting]));

  assert.equal(report.balanced, true);
  assert.deepEqual(report.residualExact, []);
});

test("per-unit price multiplies native quantity into the price commodity", () => {
  const shares = {
    ...posting("Assets:Shares", amount("3", "2", "SHARE")),
    price: { kind: "@", amount: amount("8", "1", "USD") },
  };
  const cash = posting("Assets:Cash", amount("-12", "1", "USD"));

  assert.equal(accountingBalance(transaction([shares, cash])).balanced, true);
});

test("per-unit cost supplies book weight while the face remains native quantity", () => {
  const shares = {
    ...posting("Assets:Shares", amount("2", "1", "SHARE")),
    cost: { kind: "per-unit", amount: amount("5", "1", "USD") },
  };
  const cash = posting("Assets:Cash", amount("-10", "1", "USD"));

  assert.equal(accountingBalance(transaction([shares, cash])).balanced, true);
});

test("total cost is not multiplied by native quantity", () => {
  const shares = {
    ...posting("Assets:Shares", amount("2", "1", "SHARE")),
    cost: { kind: "total", amount: amount("11", "1", "USD") },
  };
  const cash = posting("Assets:Cash", amount("-11", "1", "USD"));

  assert.equal(accountingBalance(transaction([shares, cash])).balanced, true);
});

test("historical cost controls balancing when a transaction price is also present", () => {
  const sold = {
    ...posting("Assets:Shares", amount("-2", "1", "SHARE")),
    cost: { kind: "per-unit", amount: amount("5", "1", "USD") },
    price: { kind: "@", amount: amount("8", "1", "USD") },
  };
  const cash = posting("Assets:Cash", amount("16", "1", "USD"));
  const gain = posting("Income:CapitalGains", amount("-6", "1", "USD"));

  assert.equal(accountingBalance(transaction([sold, cash, gain])).balanced, true);
});

test("an unresolved empty cost selector cannot masquerade as a balanced face posting", () => {
  const unresolved = {
    ...posting("Assets:Shares", amount("-2", "1", "SHARE")),
    cost: { kind: "per-unit", amount: null },
  };
  const faceOffset = posting("Equity:Offset", amount("2", "1", "SHARE"));
  const report = accountingBalance(transaction([unresolved, faceOffset]));

  assert.equal(report.balanced, false);
  assert.deepEqual(report.unresolvedPostingIndices, [0]);
});
