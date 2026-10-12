import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { readLedgerReport } from "../scripts/read-ledger-report.mjs";

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

async function withFixturePath(run) {
  const path = join(tmpdir(), `read-ledger-report-test-${randomUUID()}.beancount`);
  await writeFileText(path, FIXTURE_TEXT);
  try {
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("refuses an unsupported report name", async () => {
  await assert.rejects(
    readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "unheard-of" }),
    /report must be one of/u,
  );
});

test("refuses a journal naming neither path nor text", async () => {
  await assert.rejects(
    readLedgerReport({ journal: {}, report: "stats" }),
    /must name either path or text/u,
  );
});

test("reads a stats report from a journal path, envelope-wrapped", async () => {
  await withFixturePath(async (path) => {
    const result = await readLedgerReport({ journal: { path }, report: "stats" });
    assert.equal(result.kind, "ledger-report");
    assert.equal(result.report, "stats");
    assert.equal(result.journal.path, path);
    assert.equal(result.journal.format, "beancount");
    assert.equal(typeof result.generatedAt, "string");
    assert.equal(result.transactions, 3);
    assert.equal(result.malformed, 0);
  });
});

test("reads the same stats report from inline text", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "stats" });
  assert.equal(result.journal.text, true);
  assert.equal(result.journal.format, "beancount");
  assert.equal(result.transactions, 3);
});

test("an explicit journal.format overrides auto-detection for inline text", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT, format: "beancount" }, report: "stats" });
  assert.equal(result.journal.format, "beancount");
});

test("input.now pins generatedAt for reproducible callers", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "stats", now: "2026-09-05T00:00:00.000Z" });
  assert.equal(result.generatedAt, "2026-09-05T00:00:00.000Z");
});

test("reads a balance-sheet report whose asset total reflects the fixture's postings", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "balance-sheet" });
  assert.equal(result.kind, "ledger-report");
  assert.equal(result.report, "balance-sheet");
  assert.equal(result.tree.children.Assets.total.USD.value.num, "1480");
});

test("reads a reconcile report carrying the house's five verdicts", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "reconcile" });
  assert.equal(result.report, "reconcile");
  assert.ok(Array.isArray(result.rows));
  assert.equal(result.summary.agreed, 1);
  assert.equal(result.summary.mismatch, 1);
  const reserveRow = result.rows.find((row) => row.account === "Assets:Cash:Reserve");
  assert.equal(reserveRow.verdict, "mismatch");
  const operatingRow = result.rows.find((row) => row.account === "Assets:Cash:Operating");
  assert.equal(operatingRow.verdict, "agreed");
});

test("an account filter narrows the accounts report", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "accounts", account: "Income" });
  assert.equal(result.report, "accounts");
  assert.ok(JSON.stringify(result).includes("Income:Consulting"));
  assert.ok(!JSON.stringify(result).includes("Assets:Cash:Operating"));
});

test("check --require-meta reports missing metadata without changing exit-worthy settlement", async () => {
  const result = await readLedgerReport({ journal: { text: FIXTURE_TEXT }, report: "check", requireMeta: "source_id" });
  assert.equal(result.report, "check");
  assert.equal(result.policy.requiredMetadata, "source_id");
  assert.equal(result.policy.missingMetadata.length, 3);
});

test("reportingCommodity values a mixed KWH/USD journal in KWH using forward and inverse price directives", async () => {
  const mixedCommodityJournal = `2026-01-01 open Assets:Solar:PVBank KWH
2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Equity:Opening-Balances

2026-01-01 * "Opening PV bank"
  Assets:Solar:PVBank  100 KWH
  Equity:Opening-Balances  -100 KWH

2026-01-01 * "Opening cash"
  Assets:Cash:Operating  20 USD
  Equity:Opening-Balances  -20 USD

2026-01-15 price KWH 0.20 USD
2026-01-15 price USD 5 KWH
`;
  const result = await readLedgerReport({ journal: { text: mixedCommodityJournal }, report: "valuation", reportingCommodity: "KWH" });
  assert.equal(result.reportingCommodity, "KWH");
  const pvRow = result.rows.find((row) => row.account === "Assets:Solar:PVBank");
  assert.equal(pvRow.marketValue.value.num, "100");
  assert.equal(pvRow.marketValue.grade, "KWH");
  const cashRow = result.rows.find((row) => row.account === "Assets:Cash:Operating");
  assert.equal(cashRow.marketValue.value.num, "100");
  assert.equal(cashRow.marketValue.grade, "KWH");

  const defaulted = await readLedgerReport({ journal: { text: mixedCommodityJournal }, report: "valuation" });
  assert.equal(defaulted.reportingCommodity, "USD");
});
