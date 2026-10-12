import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readSetOfLedgerReadings } from "../scripts/read-set-of-ledger-readings.mjs";

const FIXTURE_PATH = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "minimal-ledger.beancount");

test("refuses a journal naming neither path nor text", async () => {
  await assert.rejects(readSetOfLedgerReadings({ journal: {} }), /must name either path or text/u);
});

test("reads the standard set of readings in one call", async () => {
  const result = await readSetOfLedgerReadings({ journal: { path: FIXTURE_PATH } });
  assert.equal(result.kind, "ledger-readings");
  const { readings } = result;
  assert.equal(readings.balanceSheet.report, "balance-sheet");
  assert.equal(readings.incomeStatement.report, "income-statement");
  assert.equal(readings.reconcile.report, "reconcile");
  assert.equal(readings.stats.report, "stats");
  assert.equal(readings.accounts.report, "accounts");
  assert.equal(readings.stats.transactions, 3);
  assert.equal(readings.reconcile.summary.agreed, 1);
  assert.equal(readings.reconcile.summary.mismatch, 1);
});
