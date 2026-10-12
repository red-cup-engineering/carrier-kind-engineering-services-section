import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfFillTransactions } from "../scripts/derive-set-of-fill-transactions.mjs";

test("refuses a non-array fills input", () => {
  assert.throws(() => deriveSetOfFillTransactions({}), /input\.fills must be an array/u);
});

test("a buy opens a cost-basis lot and a sell against it posts the realized gain", () => {
  const result = deriveSetOfFillTransactions({
    openAccounts: ["Assets:X", "Income:Investment:Realized-Gains"],
    fills: [
      {
        venue: "hive-engine", account: "michael561", fillId: "BUY-1", date: "2026-09-05", side: "buy",
        baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "4.1917", quoteAmount: "0.99502065",
        custodyAccount: "Assets:X", mandateId: "manual",
      },
      {
        venue: "hive-engine", account: "michael561", fillId: "SELL-1", date: "2026-09-05", side: "sell",
        baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "4.1917", quoteAmount: "1.02172637",
        custodyAccount: "Assets:X", mandateId: "manual",
      },
    ],
  });
  assert.equal(result.transactionCount, 2);
  const [buy, sell] = result.transactions;
  assert.match(buy.directive, /Assets:X {2}4\.1917 GLD \{\{0\.99502065 SWAP\.HIVE\}\}/u);
  assert.equal(sell.costBasisConsumed, "0.99502065");
  assert.equal(sell.realized, "0.02670572");
  assert.equal(sell.realizedAccount, "Income:Investment:Realized-Gains");
  assert.match(sell.directive, /Income:Investment:Realized-Gains {2}-0\.02670572 SWAP\.HIVE/u);
});

test("a loss on a closing fill posts to the loss account", () => {
  const result = deriveSetOfFillTransactions({
    fills: [
      { venue: "v", account: "a", fillId: "B1", date: "2026-09-01", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "10",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "S1", date: "2026-09-02", side: "sell",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "7",
        custodyAccount: "Assets:X", mandateId: "m" },
    ],
  });
  const sell = result.transactions[1];
  assert.equal(sell.realized, "-3");
  assert.equal(sell.realizedAccount, "Expenses:Investment:Realized-Losses");
  assert.match(sell.directive, /Expenses:Investment:Realized-Losses {2}3 USD/u);
});

test("an explicit fee posts to the fee account on both sides without altering the cost basis of the other leg", () => {
  const buy = deriveSetOfFillTransactions({
    fills: [{
      venue: "alpaca", account: "esther", fillId: "F1", date: "2026-09-05", side: "buy",
      baseCommodity: "AAPL", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "100",
      feeAmount: "1", feeCommodity: "USD", feeAccount: "Expenses:Investment:Fees:Alpaca",
      custodyAccount: "Assets:Brk", mandateId: "m",
    }],
  }).transactions[0];
  assert.match(buy.directive, /Expenses:Investment:Fees:Alpaca {2}1 USD/u);

  const sell = deriveSetOfFillTransactions({
    fills: [
      { venue: "alpaca", account: "esther", fillId: "F1", date: "2026-09-05", side: "buy",
        baseCommodity: "AAPL", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "100",
        custodyAccount: "Assets:Brk", mandateId: "m" },
      { venue: "alpaca", account: "esther", fillId: "F2", date: "2026-09-06", side: "sell",
        baseCommodity: "AAPL", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "110",
        feeAmount: "1", feeCommodity: "USD", feeAccount: "Expenses:Investment:Fees:Alpaca",
        custodyAccount: "Assets:Brk", mandateId: "m" },
    ],
  }).transactions[1];
  assert.equal(sell.realized, "10");
  assert.match(sell.directive, /Assets:Brk {2}110 USD/u);
  assert.match(sell.directive, /Expenses:Investment:Fees:Alpaca {2}1 USD/u);
});

test("a sell exceeding the open lot inventory throws", () => {
  assert.throws(() => deriveSetOfFillTransactions({
    fills: [{ venue: "v", account: "a", fillId: "S1", date: "2026-09-05", side: "sell",
      baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m" }],
  }), /insufficient lot inventory/u);
});

test("a sell partially consumes across two FIFO lots, prorating cost exactly", () => {
  const result = deriveSetOfFillTransactions({
    fills: [
      { venue: "v", account: "a", fillId: "B1", date: "2026-09-01", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "2", quoteAmount: "20",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "B2", date: "2026-09-02", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "3", quoteAmount: "33",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "S1", date: "2026-09-03", side: "sell",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "3", quoteAmount: "36",
        custodyAccount: "Assets:X", mandateId: "m" },
    ],
  });
  const sell = result.transactions[2];
  assert.equal(sell.costBasisConsumed, "31");
  assert.equal(sell.realized, "5");
  assert.deepEqual(sell.consumedLots, [
    { fillId: "B1", quantity: "2", cost: "20" },
    { fillId: "B2", quantity: "1", cost: "11" },
  ]);
});

test("witness disagreement refuses the fill without booking or opening any account", () => {
  const result = deriveSetOfFillTransactions({
    fills: [{
      venue: "hive-engine", account: "a", fillId: "X", date: "2026-09-05", side: "buy",
      baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m",
      witnesses: [{ node: "n1", databaseHash: "aaa" }, { node: "n2", databaseHash: "bbb" }],
    }],
  });
  assert.equal(result.transactionCount, 0);
  assert.equal(result.accountsToOpen.length, 0);
  assert.deepEqual(result.refusals, [{
    fillId: "X", reason: "witness-disagreement",
    witnesses: [{ node: "n1", databaseHash: "aaa" }, { node: "n2", databaseHash: "bbb" }],
  }]);
});

test("agreeing witnesses book normally", () => {
  const result = deriveSetOfFillTransactions({
    fills: [{
      venue: "hive-engine", account: "a", fillId: "X", date: "2026-09-05", side: "buy",
      baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m",
      witnesses: [{ node: "n1", databaseHash: "aaa" }, { node: "n2", databaseHash: "aaa" }],
    }],
  });
  assert.equal(result.transactionCount, 1);
  assert.equal(result.refusals.length, 0);
});

test("a missing required field throws TypeError", () => {
  assert.throws(() => deriveSetOfFillTransactions({ fills: [{}] }), TypeError);
});

test("an unrecognized side throws TypeError", () => {
  assert.throws(() => deriveSetOfFillTransactions({
    fills: [{
      venue: "v", account: "a", fillId: "X", date: "2026-09-05", side: "hold",
      baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m",
    }],
  }), /side must be "buy" or "sell"/u);
});

test("a missing counter account for the realized-gain leg is listed once under accountsToOpen", () => {
  const result = deriveSetOfFillTransactions({
    fills: [
      { venue: "v", account: "a", fillId: "B1", date: "2026-09-01", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "10",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "S1", date: "2026-09-02", side: "sell",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "12",
        custodyAccount: "Assets:X", mandateId: "m" },
    ],
    openAccounts: [],
  });
  const accounts = result.accountsToOpen.map((a) => a.account);
  assert.ok(accounts.includes("Assets:X"));
  assert.ok(accounts.includes("Income:Investment:Realized-Gains"));
});
