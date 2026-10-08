/**
 * accounting ledger — organizing's adjudicated accounting record-state.
 */
import test from "node:test";
import assert from "node:assert/strict";

import loadLedger, {
  balance,
  balanceAt,
  balances,
  commodity,
  event,
  inferElided,
  makeRegistry,
  note,
  open,
  posting,
  runningBalances,
  transaction,
} from "../src/accounting/ledger.mjs";
import { gradedFromParts, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";

const usd = (num) => gradedFromParts(BigInt(num), 1n, "USD");
const shares = (num) => gradedFromParts(BigInt(num), 1n, "SHARE");
const cost = (num) => ({ kind: "per-unit", amount: usd(num) });

test("notes and events remain typed non-posting ledger records", () => {
  const entries = [
    note({ date: "2026-08-27", account: "Assets:Cash", comment: "Statement requested", meta: { status: "pending-evidence" } }),
    event({ date: "2026-08-27", type: "source", description: "CHAIN-HIVE-20260827", meta: { status: "available" } }),
  ];
  const ledger = loadLedger(entries);
  assert.equal(ledger.directives.length, 2);
  assert.equal(ledger.transactions.length, 0);
  assert.equal(ledger.worklist.length, 0);
});

test("one elided posting is inferred by the organizing ledger engine", () => {
  const registry = makeRegistry();
  const tx = transaction({
    id: "txn:elided",
    date: "2026-06-26",
    narration: "elided leg",
    postings: [
      posting({ account: "Assets:Cash", amount: usd(10) }),
      posting({ account: "Income:Sales", amount: null }),
    ],
  });

  const inferred = inferElided(tx, registry);

  assert.equal(inferred.postings[1].amount === null, false);
  assert.equal(gradedToExactString(inferred.postings[1].amount), "-10/1 USD");
  assert.equal(balances(inferred, registry).balanced, true);
});

test("loadLedger computes balances even when an imbalanced transaction is held", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:imbalanced",
      date: "2026-06-26",
      narration: "held imbalance",
      postings: [
        posting({ account: "Assets:Cash", amount: usd(10) }),
        posting({ account: "Income:Sales", amount: usd(-8) }),
      ],
    }),
  ]);

  assert.equal(ledger.transactions.length, 1);
  assert.equal(ledger.worklist.length >= 1, true);
  assert.equal(gradedToExactString(ledger.balances.get("Assets:Cash").get("USD")), "10/1 USD");
  assert.equal(gradedToExactString(ledger.balances.get("Income:Sales").get("USD")), "-8/1 USD");
});

test("balance directives can synthesize pad transactions without halting the ledger", () => {
  const ledger = loadLedger([
    commodity({ symbol: "USD", precision: 2 }),
    transaction({
      id: "txn:opening",
      date: "2026-06-25",
      narration: "opening",
      postings: [
        posting({ account: "Assets:Cash", amount: usd(5) }),
        posting({ account: "Equity:Opening", amount: usd(-5) }),
      ],
    }),
    { directive: "pad", date: "2026-06-26", account: "Assets:Cash", padAccount: "Equity:Opening", source: null },
    balance({ date: "2026-06-27", account: "Assets:Cash", amount: usd(8) }),
  ]);

  assert.equal(ledger.synthesized.length, 1);
  assert.equal(gradedToExactString(balanceAt([...ledger.transactions, ...ledger.synthesized], ledger.registry, "Assets:Cash", "USD", "2026-06-28")), "8/1 USD");
  assert.equal(runningBalances([...ledger.transactions, ...ledger.synthesized], ledger.registry).get("Assets:Cash").has("USD"), true);
});

test("empty cost selectors relieve the one matching historical lot", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:buy",
      date: "2026-01-01",
      narration: "buy",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(10), cost: cost(5) }),
        posting({ account: "Assets:Cash", amount: usd(-50) }),
      ],
    }),
    transaction({
      id: "txn:sell",
      date: "2026-02-01",
      narration: "sell",
      postings: [
        posting({
          account: "Assets:Shares",
          amount: shares(-4),
          cost: { kind: "per-unit", amount: null },
          price: { kind: "@", amount: usd(7) },
        }),
        posting({ account: "Assets:Cash", amount: usd(28) }),
        posting({ account: "Income:Gains", amount: usd(-8) }),
      ],
    }),
  ]);

  assert.deepEqual(ledger.lotProblems, []);
  assert.equal(ledger.lots.length, 1);
  assert.equal(gradedToExactString(ledger.lots[0].units), "6/1 SHARE");
  assert.equal(gradedToExactString(ledger.lots[0].unitCost), "5/1 USD");
  assert.equal(gradedToExactString(ledger.transactions[1].postings[0].cost.amount), "5/1 USD");
  assert.equal(ledger.worklist.length, 0);
});

test("STRICT holds an ambiguous partial reduction without consuming a guessed lot", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:buy-a",
      date: "2026-01-01",
      narration: "buy a",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(5), cost: cost(5) }),
        posting({ account: "Assets:Cash", amount: usd(-25) }),
      ],
    }),
    transaction({
      id: "txn:buy-b",
      date: "2026-01-02",
      narration: "buy b",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(5), cost: cost(6) }),
        posting({ account: "Assets:Cash", amount: usd(-30) }),
      ],
    }),
    transaction({
      id: "txn:sell",
      date: "2026-02-01",
      narration: "ambiguous sale",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(-2), cost: { kind: "per-unit", amount: null } }),
        posting({ account: "Assets:Cash", amount: usd(10) }),
      ],
    }),
  ]);

  assert.equal(ledger.lotProblems.length, 1);
  assert.equal(ledger.lotProblems[0].reason, "ambiguous");
  assert.deepEqual(ledger.lots.map((lot) => gradedToExactString(lot.units)), ["5/1 SHARE", "5/1 SHARE"]);
  assert.equal(ledger.worklist.some((entry) => entry.cell.predicate === "ledger.lot-booking-problem"), true);
});

test("FIFO splits a reduction across homogeneous lot legs and preserves total quantity", () => {
  const ledger = loadLedger([
    open({ account: "Assets:Shares", booking: "FIFO" }),
    transaction({
      id: "txn:buy-a",
      date: "2026-01-01",
      narration: "buy a",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(5), cost: cost(5) }),
        posting({ account: "Assets:Cash", amount: usd(-25) }),
      ],
    }),
    transaction({
      id: "txn:buy-b",
      date: "2026-01-02",
      narration: "buy b",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(5), cost: cost(6) }),
        posting({ account: "Assets:Cash", amount: usd(-30) }),
      ],
    }),
    transaction({
      id: "txn:sell",
      date: "2026-02-01",
      narration: "fifo sale",
      postings: [
        posting({
          account: "Assets:Shares",
          amount: shares(-7),
          cost: { kind: "per-unit", amount: null },
          price: { kind: "@", amount: usd(7) },
        }),
        posting({ account: "Assets:Cash", amount: usd(49) }),
        posting({ account: "Income:Gains", amount: usd(-12) }),
      ],
    }),
  ]);

  const sale = ledger.transactions.find((txn) => txn.id === "txn:sell");
  assert.deepEqual(ledger.lotProblems, []);
  assert.equal(sale.postings.length, 4);
  assert.deepEqual(
    sale.postings.slice(0, 2).map((p) => [gradedToExactString(p.amount), gradedToExactString(p.cost.amount)]),
    [["-5/1 SHARE", "5/1 USD"], ["-2/1 SHARE", "6/1 USD"]],
  );
  assert.equal(gradedToExactString(ledger.lots[0].units), "3/1 SHARE");
  assert.equal(gradedToExactString(ledger.lots[0].unitCost), "6/1 USD");
  assert.equal(ledger.worklist.length, 0);
});

test("total acquisition cost is normalized exactly to historical unit cost", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:total-cost",
      date: "2026-01-01",
      narration: "total cost",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(10), cost: { kind: "total", amount: usd(50) } }),
        posting({ account: "Assets:Cash", amount: usd(-50) }),
      ],
    }),
  ]);

  assert.deepEqual(ledger.lotProblems, []);
  assert.equal(gradedToExactString(ledger.lots[0].unitCost), "5/1 USD");
  assert.equal(ledger.transactions[0].postings[0].cost.kind, "per-unit");
});

test("unsupported booking methods and signed annotations are held instead of guessed", () => {
  const ledger = loadLedger([
    open({ account: "Assets:Shares", booking: "AVERAGE" }),
    transaction({
      id: "txn:buy",
      date: "2026-01-01",
      narration: "signed cost",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(2), cost: cost(-5) }),
        posting({ account: "Assets:Cash", amount: usd(-10) }),
      ],
    }),
    transaction({
      id: "txn:sell",
      date: "2026-02-01",
      narration: "unsupported relief",
      postings: [
        posting({ account: "Assets:Shares", amount: shares(-1), cost: { kind: "per-unit", amount: null } }),
        posting({ account: "Assets:Cash", amount: usd(5) }),
      ],
    }),
  ]);

  assert.deepEqual(ledger.lotProblems.map((problem) => problem.reason), [
    "negative-annotation",
    "unsupported-booking",
  ]);
  assert.equal(gradedToExactString(ledger.lots[0].unitCost), "5/1 USD");
});
