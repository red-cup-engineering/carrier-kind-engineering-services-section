# read-ledger-report
## Requirements
- `ledger-report-result`: The operation returns one Farolfi accounting report for a journal, wrapped in a kind/report/journal/generatedAt envelope.
- `journal-path-or-text`: The operation accepts a journal named by an absolute on-disk path or by inline text with an optional beancount-or-hledger format override.
- `reproducible-generated-at`: When input.now is a string, the operation uses it as generatedAt instead of the real current time.
- `reporting-commodity-threading`: When input.reportingCommodity is a string, the operation threads it into farolfi's valuation report as opts.reportingCommodity instead of leaving every valuation reported in USD.
## Prohibitions
- `unsupported-report-refusal`: The operation must refuse a report name outside the eleven Farolfi reports it dispatches.
- `missing-journal-refusal`: The operation must refuse a journal naming neither path nor text.
- `no-own-report-logic`: The operation must contain no balance, settlement, or report-rendering logic of its own, composing farolfi's dispatch and detectJournalFormat for every report.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | local-jsnode-package-readme | Applies to shared import/command examples. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
- `primitives-live-once` | Primitives live once, on the registry (owner-stated 2026-08-30) | v1 | .claude/rules/org-layering.md | Applies to composing farolfi and file-services rather than reimplementing them. | Primitives exist once, on the registry, interdependent, never copied.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to .mjs sources and package-birth assays. | The package uses one executable ESM operation source file.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/read-ledger-report-service","packageVersion":"0.1.1","license":"UNLICENSED","dependencies":{"@red-cup-engineering/farolfi":"0.1.14","@red-cup-engineering/file-services":"0.2.1","@red-cup-engineering/remove-path-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/read-ledger-report.mjs
#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectJournalFormat, dispatch } from "@red-cup-engineering/farolfi";
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { removePath } from "@red-cup-engineering/remove-path-service";

const REPORT_COMMANDS = Object.freeze({
  "balance": "bal",
  "balance-sheet": "bs",
  "income-statement": "is",
  "cashflow": "cashflow",
  "register": "reg",
  "accounts": "accounts",
  "stats": "stats",
  "lots": "lots",
  "valuation": "valuation",
  "reconcile": "reconcile",
  "check": "check",
});

function cliOptionsFrom(input) {
  return {
    format: null,
    output: "json",
    account: input.account ?? null,
    begin: input.begin ?? null,
    end: input.end ?? null,
    depth: input.depth ?? null,
    status: input.status ?? null,
    payee: input.payee ?? null,
    requireMeta: input.requireMeta ?? null,
    to: null,
    reportingCommodity: input.reportingCommodity ?? null,
    help: false,
  };
}

/**
 * Reads one Farolfi accounting report from a Beancount or hledger journal, given either an
 * on-disk journal path or inline journal text. Composes `@red-cup-engineering/farolfi`'s
 * `dispatch` (for every report) and `detectJournalFormat` (for inline text), and
 * `@red-cup-engineering/file-services`/`@red-cup-engineering/remove-path-service` for every
 * filesystem access this operation itself performs; it contains no balance, settlement, or
 * report-rendering logic of its own.
 * @param {{ journal: ({ path: string } | { text: string, format?: ("beancount"|"hledger") }),
 *   report: ("balance"|"balance-sheet"|"income-statement"|"cashflow"|"register"|"accounts"|
 *     "stats"|"lots"|"valuation"|"reconcile"|"check"),
 *   begin?: string, end?: string, account?: string, depth?: number, status?: string,
 *   payee?: string, requireMeta?: string, reportingCommodity?: string, now?: string }} input
 *   `reportingCommodity` selects the "valuation" report's target commodity (default "USD"),
 *   using the journal's own price directives to convert each position; every other report
 *   ignores it.
 * @returns {Promise<object>} Farolfi's `-o json` report shape for `input.report`, merged with
 *   `{ kind: "ledger-report", report, journal, generatedAt }`; `generatedAt` is `input.now`
 *   when given (for reproducible fabrication examples and tests), else the real current time.
 * @throws {TypeError} When `input.report` is not one of the eleven supported reports, or
 *   `input.journal` names neither `path` nor `text`.
 */
export async function readLedgerReport(input) {
  if (!input || typeof input !== "object") throw new TypeError("read-ledger-report: input must be an object");
  const command = REPORT_COMMANDS[input.report];
  if (!command) {
    throw new TypeError(`read-ledger-report: report must be one of ${Object.keys(REPORT_COMMANDS).join(", ")}, got ${JSON.stringify(input.report)}`);
  }
  const journal = input.journal;
  if (!journal || typeof journal !== "object") throw new TypeError("read-ledger-report: input.journal must be an object");

  let filePath;
  let journalDescriptor;
  let cleanup = async () => {};
  if (typeof journal.path === "string" && journal.path.length > 0) {
    await readFileText(journal.path); // validates the top-level journal is present and readable before farolfi resolves its includes
    filePath = journal.path;
    journalDescriptor = { path: journal.path, format: detectJournalFormat({ path: journal.path }) };
  } else if (typeof journal.text === "string") {
    const format = journal.format === "beancount" || journal.format === "hledger"
      ? journal.format
      : detectJournalFormat({ text: journal.text });
    filePath = join(tmpdir(), `read-ledger-report-${randomUUID()}.${format === "beancount" ? "beancount" : "journal"}`);
    await writeFileText(filePath, journal.text);
    cleanup = () => removePath({ path: filePath });
    journalDescriptor = { text: true, format };
  } else {
    throw new TypeError("read-ledger-report: input.journal must name either path or text");
  }

  try {
    const result = dispatch(command, [filePath], cliOptionsFrom(input));
    return Object.freeze({
      ...JSON.parse(result.text),
      kind: "ledger-report",
      report: input.report,
      journal: journalDescriptor,
      generatedAt: typeof input.now === "string" ? input.now : new Date().toISOString(),
    });
  } finally {
    await cleanup();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("readLedgerReport — Reads one Farolfi accounting report from a Beancount or hledger journal, given either an on-disk journal path or inline journal text. Composes `@red-cup-engineering/farolfi`'s `dispatch` (for every report) and `detectJournalFormat` (for inline text), and `@red-cup-engineering/file-services`/`@red-cup-engineering/remove-path-service` for every filesystem access this operation itself performs; it contains no balance, settlement, or report-rendering logic of its own.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(await readLedgerReport(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/read-ledger-report.test.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { removePath } from "@red-cup-engineering/remove-path-service";
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
    await removePath({ path });
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
```
## Examples
```json name="reads a stats report from inline text with a pinned generatedAt"
{"input":{"journal":{"text":"option \"title\" \"Test Ledger\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Assets:Cash:Reserve USD\n2026-01-01 open Equity:Opening-Balances\n2026-01-01 open Income:Consulting\n2026-01-01 open Expenses:Software\n\n2026-01-01 * \"Opening balance\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n\n2026-01-05 * \"Client payment\" \"Acme Corp\"\n  Assets:Cash:Operating  500.00 USD\n  Income:Consulting  -500.00 USD\n\n2026-01-10 * \"Software subscription\"\n  Assets:Cash:Operating  -20.00 USD\n  Expenses:Software  20.00 USD\n\n2026-01-15 balance Assets:Cash:Operating  1480.00 USD\n\n2026-01-20 balance Assets:Cash:Reserve  50.00 USD\n"},"report":"stats","now":"2026-09-05T00:00:00.000Z"},"output":{"transactions":3,"postings":6,"accounts":5,"commodities":1,"directives":9,"span":"2026-01-01 … 2026-01-10","malformed":0,"held":1,"synthesized":0,"kind":"ledger-report","report":"stats","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"}}
```
```json name="values a mixed KWH/USD journal in KWH using reportingCommodity"
{"input":{"journal":{"text":"2026-01-01 open Assets:Solar:PVBank KWH\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Equity:Opening-Balances\n\n2026-01-01 * \"Opening PV bank\"\n  Assets:Solar:PVBank  100 KWH\n  Equity:Opening-Balances  -100 KWH\n\n2026-01-01 * \"Opening cash\"\n  Assets:Cash:Operating  20 USD\n  Equity:Opening-Balances  -20 USD\n\n2026-01-15 price KWH 0.20 USD\n2026-01-15 price USD 5 KWH\n"},"report":"valuation","reportingCommodity":"KWH","now":"2026-09-06T00:00:00.000Z"},"output":{"rows":[{"account":"Assets:Cash:Operating","units":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"},"lot":null,"bookValue":null,"marketPrice":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"5","den":"1"},"grade":"KWH"},"marketValue":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"100","den":"1"},"grade":"KWH"},"unrealized":null,"priceDate":"2026-01-15"},{"account":"Assets:Solar:PVBank","units":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"100","den":"1"},"grade":"KWH"},"lot":null,"bookValue":null,"marketPrice":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1","den":"1"},"grade":"KWH"},"marketValue":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"100","den":"1"},"grade":"KWH"},"unrealized":null,"priceDate":null}],"end":null,"reportingCommodity":"KWH","kind":"ledger-report","report":"valuation","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-06T00:00:00.000Z"}}
```
## Traceability
- `ledger-report-result` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `primitives-live-once`, `node-esm-operation`
- `journal-path-or-text` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `reproducible-generated-at` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `unsupported-report-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `missing-journal-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-own-report-logic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-live-once`, `node-esm-operation`
- `reporting-commodity-threading` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `primitives-live-once`, `node-esm-operation`
