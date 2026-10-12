import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readLedgerReport } from "../scripts/read-ledger-report.mjs";

const FIXTURE_PATH = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "minimal-ledger.beancount");
const FIXTURE_TEXT = readFileSync(FIXTURE_PATH, "utf8");

test("refuses an unsupported report name", async () => {
  await assert.rejects(
    readLedgerReport({ journal: { path: FIXTURE_PATH }, report: "unheard-of" }),
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
  const result = await readLedgerReport({ journal: { path: FIXTURE_PATH }, report: "stats" });
  assert.equal(result.kind, "ledger-report");
  assert.equal(result.report, "stats");
  assert.equal(result.journal.path, FIXTURE_PATH);
  assert.equal(result.journal.format, "beancount");
  assert.equal(typeof result.generatedAt, "string");
  assert.equal(result.transactions, 3);
  assert.equal(result.malformed, 0);
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

test("reads a balance-sheet report whose asset total reflects the fixture's postings", async () => {
  const result = await readLedgerReport({ journal: { path: FIXTURE_PATH }, report: "balance-sheet" });
  assert.equal(result.kind, "ledger-report");
  assert.equal(result.report, "balance-sheet");
  assert.equal(result.tree.children.Assets.total.USD.value.num, "1480");
});

test("reads a reconcile report carrying the house's five verdicts", async () => {
  const result = await readLedgerReport({ journal: { path: FIXTURE_PATH }, report: "reconcile" });
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
  const result = await readLedgerReport({ journal: { path: FIXTURE_PATH }, report: "accounts", account: "Income" });
  assert.equal(result.report, "accounts");
  assert.ok(JSON.stringify(result).includes("Income:Consulting"));
  assert.ok(!JSON.stringify(result).includes("Assets:Cash:Operating"));
});

test("check --require-meta reports missing metadata without changing exit-worthy settlement", async () => {
  const result = await readLedgerReport({ journal: { path: FIXTURE_PATH }, report: "check", requireMeta: "source_id" });
  assert.equal(result.report, "check");
  assert.equal(result.policy.requiredMetadata, "source_id");
  assert.equal(result.policy.missingMetadata.length, 3);
});
