/**
 * accounting report - settled readings over organizing ledger state.
 */
import test from "node:test";
import assert from "node:assert/strict";

import loadLedger, { balance, event, note, open, posting, price, transaction } from "../src/accounting/ledger.mjs";
import {
  balanceReport,
  balancesRange,
  cashflowReport,
  checkReport,
  lotsReport,
  printReport,
  reconciliationReport,
  renderBalance,
  renderCheck,
  renderLots,
  renderPrint,
  renderReconciliation,
  statsReport,
  valuationReport,
  renderValuation,
} from "../src/accounting/report.mjs";
import { gradedFromParts, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";

const usd = (num) => gradedFromParts(BigInt(num), 1n, "USD");

test("print preserves Beancount notes and events", () => {
  const entries = [
    note({ date: "2026-08-27", account: "Assets:Cash", comment: "Statement requested" }),
    event({ date: "2026-08-27", type: "source", description: "CHAIN-HIVE-20260827" }),
  ];
  assert.equal(renderPrint(printReport(entries)), [
    '2026-08-27 note Assets:Cash "Statement requested"',
    '2026-08-27 event "source" "CHAIN-HIVE-20260827"',
  ].join("\n"));
});

test("organizing accounting reports read balances, held checks, stats, and print text", () => {
  const tx = transaction({
    id: "txn:report",
    date: "2026-06-26",
    narration: "reportable settlement",
    postings: [
      posting({ account: "Assets:Cash", amount: usd(10) }),
      posting({ account: "Income:Sales", amount: usd(-8) }),
    ],
  });
  const ledger = loadLedger([tx]);

  const balance = balanceReport(ledger, {});
  const renderedBalance = renderBalance(balance, ledger);
  assert.match(renderedBalance, /Assets/);
  assert.match(renderedBalance, /Cash/);
  assert.match(renderedBalance, /Income/);
  assert.match(renderedBalance, /Sales/);

  const check = checkReport(ledger);
  assert.equal(check.exitCode, 0);
  assert.equal(check.ok, false);
  assert.match(renderCheck(check), /held problems/);

  const stats = statsReport(ledger);
  assert.equal(stats.transactions, 1);
  assert.equal(stats.held >= 1, true);

  const printed = printReport([tx]);
  assert.match(renderPrint(printed), /reportable settlement/);
  assert.match(renderPrint(printed), /Assets:Cash/);
});

test("lots report keeps native units, historical unit cost, and book value distinct", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:lot-report",
      date: "2026-01-01",
      narration: "acquire shares",
      postings: [
        posting({
          account: "Assets:Broker:Shares",
          amount: gradedFromParts(3n, 1n, "SHARE"),
          cost: { kind: "per-unit", amount: usd(5), label: "tax-lot-a" },
        }),
        posting({ account: "Assets:Broker:Cash", amount: usd(-15) }),
      ],
    }),
  ]);

  const report = lotsReport(ledger, { account: "Broker" });
  assert.equal(report.lots.length, 1);
  assert.match(renderLots(report, ledger), /3 SHARE/);
  assert.match(renderLots(report, ledger), /5 USD/);
  assert.match(renderLots(report, ledger), /15 USD/);
  assert.match(renderLots(report, ledger), /tax-lot-a/);
});

test("valuation report uses the latest eligible dated quote without rewriting cost", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:valued-lot",
      date: "2026-01-01",
      narration: "acquire shares",
      postings: [
        posting({
          account: "Assets:Broker:Shares",
          amount: gradedFromParts(3n, 1n, "SHARE"),
          cost: { kind: "per-unit", amount: usd(5) },
        }),
        posting({ account: "Assets:Broker:Cash", amount: usd(-15) }),
      ],
    }),
    price({ date: "2026-02-01", commodity: "SHARE", amount: usd(7) }),
    price({ date: "2026-03-01", commodity: "SHARE", amount: usd(8) }),
  ]);

  const beforeMarch = valuationReport(ledger, { end: "2026-02-15" });
  const beforeMarchLot = beforeMarch.rows.find((row) => row.lot !== null);
  assert.equal(beforeMarchLot.priceDate, "2026-02-01");
  assert.match(renderValuation(beforeMarch, ledger), /21 USD/);
  assert.match(renderValuation(beforeMarch, ledger), /6 USD/);

  const latest = valuationReport(ledger);
  const latestLot = latest.rows.find((row) => row.lot !== null);
  assert.equal(latestLot.priceDate, "2026-03-01");
  assert.match(renderValuation(latest, ledger), /24 USD/);
  assert.match(renderValuation(latest, ledger), /9 USD/);
  assert.equal(gradedToExactString(latestLot.lot.unitCost), "5/1 USD");
});

test("valuation reports uncosted asset quantities without inventing book value", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:opening-native",
      date: "2026-01-01",
      narration: "opening native quantity",
      postings: [
        posting({ account: "Assets:Digital:Native", amount: gradedFromParts(2n, 1n, "TOKEN") }),
        posting({ account: "Equity:Opening", amount: gradedFromParts(-2n, 1n, "TOKEN") }),
      ],
    }),
    price({ date: "2026-02-01", commodity: "TOKEN", amount: usd(3) }),
  ]);

  const report = valuationReport(ledger);
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].lot, null);
  assert.equal(report.rows[0].bookValue, null);
  assert.equal(report.rows[0].unrealized, null);
  assert.equal(gradedToExactString(report.rows[0].marketValue), "6/1 USD");
  assert.match(renderValuation(report, ledger), /\(missing\)/);
});

test("report periods use one exclusive end boundary", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:inside-period",
      date: "2026-12-31",
      narration: "inside",
      postings: [
        posting({ account: "Assets:Cash:Operating", amount: usd(10) }),
        posting({ account: "Income:Sales", amount: usd(-10) }),
      ],
    }),
    transaction({
      id: "txn:next-period",
      date: "2027-01-01",
      narration: "outside",
      postings: [
        posting({ account: "Assets:Cash:Operating", amount: usd(20) }),
        posting({ account: "Income:Sales", amount: usd(-20) }),
      ],
    }),
  ]);

  const range = balancesRange(ledger, { begin: "2026-01-01", end: "2027-01-01" });
  assert.equal(gradedToExactString(range.get("Assets:Cash:Operating").get("USD")), "10/1 USD");
  const balance = balanceReport(ledger, { end: "2027-01-01" });
  assert.equal(gradedToExactString(balance.tree.children.get("Assets").total.get("USD")), "10/1 USD");
});

test("historical lots and valuation use positions at the report cutoff", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:historical-acquisition",
      date: "2026-01-01",
      narration: "acquire",
      postings: [
        posting({
          account: "Assets:Broker:Shares",
          amount: gradedFromParts(2n, 1n, "SHARE"),
          cost: { kind: "per-unit", amount: usd(5) },
        }),
        posting({ account: "Assets:Cash:Operating", amount: usd(-10) }),
      ],
    }),
    price({ date: "2026-02-01", commodity: "SHARE", amount: usd(7) }),
    transaction({
      id: "txn:later-disposal",
      date: "2026-03-01",
      narration: "dispose",
      postings: [
        posting({
          account: "Assets:Broker:Shares",
          amount: gradedFromParts(-2n, 1n, "SHARE"),
          cost: { kind: "per-unit", amount: usd(5) },
        }),
        posting({ account: "Assets:Cash:Operating", amount: usd(10) }),
      ],
    }),
  ]);

  assert.equal(lotsReport(ledger).lots.length, 0);
  assert.equal(lotsReport(ledger, { end: "2026-03-01" }).lots.length, 1);
  const historical = valuationReport(ledger, { end: "2026-03-01" });
  assert.equal(gradedToExactString(historical.rows[0].units), "2/1 SHARE");
  assert.equal(gradedToExactString(historical.rows[0].marketValue), "14/1 USD");
});

test("cash movement defaults to cash accounts rather than every asset", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:cash-and-equipment",
      date: "2026-01-01",
      narration: "fund and acquire",
      postings: [
        posting({ account: "Assets:Cash:Operating", amount: usd(10) }),
        posting({ account: "Assets:Equipment", amount: usd(40) }),
        posting({ account: "Equity:Opening", amount: usd(-50) }),
      ],
    }),
  ]);

  const report = cashflowReport(ledger);
  assert.equal(gradedToExactString(report.tree.total.get("USD")), "10/1 USD");
  assert.equal(report.tree.children.has("Assets"), true);
  assert.equal(report.tree.children.get("Assets").children.has("Equipment"), false);
});

test("reconciliation report joins posted balances against balance assertions, all five verdicts", () => {
  const ledger = loadLedger([
    open({ date: "2026-01-01", account: "Assets:Cash" }),
    open({ date: "2026-01-01", account: "Assets:Wrong" }),
    open({ date: "2026-01-01", account: "Assets:PostedOnly" }),
    open({ date: "2026-01-01", account: "Assets:AssertedOnly" }),
    open({ date: "2026-01-01", account: "Assets:Empty" }),
    open({ date: "2026-01-01", account: "Equity:Opening" }),
    transaction({
      id: "txn:cash",
      date: "2026-02-01",
      narration: "fund cash",
      postings: [
        posting({ account: "Assets:Cash", amount: usd(100) }),
        posting({ account: "Equity:Opening", amount: usd(-100) }),
      ],
    }),
    transaction({
      id: "txn:wrong",
      date: "2026-02-01",
      narration: "fund wrong",
      postings: [
        posting({ account: "Assets:Wrong", amount: usd(50) }),
        posting({ account: "Equity:Opening", amount: usd(-50) }),
      ],
    }),
    transaction({
      id: "txn:posted-only",
      date: "2026-02-01",
      narration: "fund posted-only",
      postings: [
        posting({ account: "Assets:PostedOnly", amount: usd(30) }),
        posting({ account: "Equity:Opening", amount: usd(-30) }),
      ],
    }),
    balance({ date: "2026-03-01", account: "Assets:Cash", amount: usd(100) }),
    balance({ date: "2026-03-01", account: "Assets:Wrong", amount: usd(999) }),
    balance({ date: "2026-03-01", account: "Assets:AssertedOnly", amount: usd(0) }),
  ]);

  const report = reconciliationReport(ledger);
  const byAccount = Object.fromEntries(report.rows.map((r) => [r.account, r]));

  assert.equal(byAccount["Assets:Cash"].verdict, "agreed");
  assert.equal(byAccount["Assets:Cash"].posted, "100/1 USD");
  assert.equal(byAccount["Assets:Cash"].asserted, "100/1 USD");
  assert.equal(byAccount["Assets:Cash"].assertedAt, "2026-03-01");

  assert.equal(byAccount["Assets:Wrong"].verdict, "mismatch");
  assert.equal(byAccount["Assets:Wrong"].posted, "50/1 USD");
  assert.equal(byAccount["Assets:Wrong"].asserted, "999/1 USD");

  assert.equal(byAccount["Assets:PostedOnly"].verdict, "posted-only");
  assert.equal(byAccount["Assets:PostedOnly"].posted, "30/1 USD");
  assert.equal(byAccount["Assets:PostedOnly"].asserted, null);

  assert.equal(byAccount["Assets:AssertedOnly"].verdict, "asserted-only");
  assert.equal(byAccount["Assets:AssertedOnly"].posted, null);
  assert.equal(byAccount["Assets:AssertedOnly"].asserted, gradedToExactString(usd(0)));

  assert.equal(byAccount["Assets:Empty"].verdict, "inactive");
  assert.equal(byAccount["Assets:Empty"].commodity, null);
  assert.equal(byAccount["Assets:Empty"].posted, null);
  assert.equal(byAccount["Assets:Empty"].asserted, null);
  assert.equal(byAccount["Assets:Empty"].assertedAt, null);

  assert.equal(byAccount["Equity:Opening"].verdict, "posted-only");

  assert.deepEqual(report.summary, {
    agreed: 1,
    mismatch: 1,
    "posted-only": 2,
    "asserted-only": 1,
    inactive: 1,
  });

  const rendered = renderReconciliation(report);
  assert.match(rendered, /Assets:Cash/);
  assert.match(rendered, /agreed: 1/);
  assert.match(rendered, /mismatch: 1/);
  assert.match(rendered, /posted-only: 2/);
  assert.match(rendered, /asserted-only: 1/);
  assert.match(rendered, /inactive: 1/);

  const scoped = reconciliationReport(ledger, { account: "^Assets:Cash$" });
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].account, "Assets:Cash");
});
