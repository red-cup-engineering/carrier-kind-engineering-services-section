import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ledgerReportOperations, ledgerReportRequestContract, ledgerReadingsRequestContract } from "@red-cup-engineering/farolfi/ledger/operations";
import { assembleDefaultService } from "@red-cup-engineering/metroplat/catalog";

const journalText = `2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash  25 USD
  Equity:Opening  -25 USD
2026-01-03 balance Assets:Cash 25 USD
`;

test("ledger domains refuse caller journal paths and inline books", () => {
  for (const journal of [{ path: "/caller/book.beancount" }, { text: journalText }]) {
    assert.throws(() => ledgerReportRequestContract.assert({ report: "stats", journal }, "report"));
    assert.throws(() => ledgerReadingsRequestContract.assert({ journal }, "readings"));
  }
});

test("ledger verbs delegate reports and readings to the configured book only", async () => {
  const root = mkdtempSync(join(tmpdir(), "metroplat-ledger-"));
  const previous = process.env.METROPLAT_LEDGER_JOURNAL;
  const book = join(root, "fixture.beancount");
  writeFileSync(book, journalText);
  process.env.METROPLAT_LEDGER_JOURNAL = book;
  try {
    const [report, readings] = ledgerReportOperations();
    const one = await report.execute({ report: "stats" }, {});
    assert.equal(one.kind, "ledger-report");
    assert.equal(one.journal.path, book);
    assert.equal(one.transactions, 1);
    const all = await readings.execute({}, {});
    assert.equal(all.kind, "ledger-readings");
    assert.deepEqual(Object.keys(all.readings).sort(), ["accounts", "balanceSheet", "incomeStatement", "reconcile", "stats"]);
    for (const value of Object.values(all.readings)) assert.equal(value.journal.path, book);
    assert.equal(all.readings.stats.transactions, 1);
    assert.equal(all.readings.reconcile.summary.mismatch, 0);
  } finally {
    if (previous === undefined) delete process.env.METROPLAT_LEDGER_JOURNAL;
    else process.env.METROPLAT_LEDGER_JOURNAL = previous;
    rmSync(root, { recursive: true, force: true });
  }
});

test("ledger verbs refuse an unconfigured deployment", async () => {
  const previous = process.env.METROPLAT_LEDGER_JOURNAL;
  delete process.env.METROPLAT_LEDGER_JOURNAL;
  try {
    for (const op of ledgerReportOperations()) {
      const input = op.verb === "ledger-report" ? { report: "stats" } : {};
      await assert.rejects(Promise.resolve().then(() => op.execute(input, {})), /METROPLAT_LEDGER_JOURNAL is not set/);
    }
  } finally {
    if (previous !== undefined) process.env.METROPLAT_LEDGER_JOURNAL = previous;
  }
});

test("the default catalog retains both existing ledger verbs exactly once", () => {
  const root = mkdtempSync(join(tmpdir(), "metroplat-ledger-catalog-"));
  try {
    const assembly = assembleDefaultService({ dataRoot: root });
    for (const verb of ["ledger-report", "ledger-readings"]) {
      assert.equal(assembly.operations.filter(operation => operation.verb === verb).length, 1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
