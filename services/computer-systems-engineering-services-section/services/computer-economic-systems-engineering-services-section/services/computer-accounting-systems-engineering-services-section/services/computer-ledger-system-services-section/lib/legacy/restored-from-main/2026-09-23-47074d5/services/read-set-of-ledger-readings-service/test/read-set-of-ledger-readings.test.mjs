import assert from "node:assert/strict";
import test from "node:test";
import { readSetOfLedgerReadings } from "../scripts/read-set-of-ledger-readings.mjs";

const FIXTURE_TEXT = `option "title" "Test Ledger"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Assets:Cash:Reserve USD
2026-01-01 open Equity:Opening-Balances
2026-01-01 open Income:Consulting
2026-01-01 open Expenses:Software

2026-01-01 * "Opening balance"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD

2026-01-05 * "Client payment" "Acme Corp"
  Assets:Cash:Operating  500.00 USD
  Income:Consulting  -500.00 USD

2026-01-10 * "Software subscription"
  Assets:Cash:Operating  -20.00 USD
  Expenses:Software  20.00 USD

2026-01-15 balance Assets:Cash:Operating  1480.00 USD

2026-01-20 balance Assets:Cash:Reserve  50.00 USD
`;

test("refuses a journal naming neither path nor text", async () => {
  await assert.rejects(readSetOfLedgerReadings({ journal: {} }), /must name either path or text/u);
});

test("reads the standard set of readings in one call", async () => {
  const result = await readSetOfLedgerReadings({ journal: { text: FIXTURE_TEXT } });
  assert.equal(result.kind, "ledger-readings");
  const { readings } = result;
  assert.equal(readings.balanceSheet.report, "balance-sheet");
  assert.equal(readings.incomeStatement.report, "income-statement");
  assert.equal(readings.reconcile.report, "reconcile");
  assert.equal(readings.stats.report, "stats");
  assert.equal(readings.accounts.report, "accounts");
  assert.equal(readings.stats.transactions, 3);
  assert.equal(readings.stats.malformed, 0);
  assert.equal(readings.reconcile.summary.agreed, 1);
  assert.equal(readings.reconcile.summary.mismatch, 1);
});

test("input.now pins every reading's generatedAt for reproducible callers", async () => {
  const result = await readSetOfLedgerReadings({ journal: { text: FIXTURE_TEXT }, now: "2026-09-05T00:00:00.000Z" });
  for (const reading of Object.values(result.readings)) {
    assert.equal(reading.generatedAt, "2026-09-05T00:00:00.000Z");
  }
});
