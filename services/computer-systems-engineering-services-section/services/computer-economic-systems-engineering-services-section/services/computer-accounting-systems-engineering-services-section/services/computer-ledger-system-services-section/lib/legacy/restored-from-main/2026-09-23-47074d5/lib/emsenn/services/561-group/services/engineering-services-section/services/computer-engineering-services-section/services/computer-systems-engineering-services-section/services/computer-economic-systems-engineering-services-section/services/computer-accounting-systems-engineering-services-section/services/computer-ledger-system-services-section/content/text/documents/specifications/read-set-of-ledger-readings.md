# read-set-of-ledger-readings
## Requirements
- `ledger-readings-result`: The operation returns the standard set of five ledger readings for a journal in one call: balance sheet, income statement, reconcile, stats, and accounts.
- `shared-journal-and-filters`: Every one of the five readings is read against the same journal and the same optional begin/end/account/depth/status/payee/requireMeta/now filters.
## Prohibitions
- `missing-journal-refusal`: The operation must refuse a journal naming neither path nor text.
- `no-own-report-logic`: The operation must contain no balance, settlement, or report-rendering logic of its own, composing read-ledger-report once per reading.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | local-jsnode-package-readme | Applies to shared import/command examples. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
- `primitives-live-once` | Primitives live once, on the registry (owner-stated 2026-08-30) | v1 | .claude/rules/org-layering.md | Applies to composing read-ledger-report rather than reimplementing it. | Primitives exist once, on the registry, interdependent, never copied.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to .mjs sources and package-birth assays. | The package uses one executable ESM operation source file.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/read-set-of-ledger-readings-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/read-ledger-report-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/read-set-of-ledger-readings.mjs
#!/usr/bin/env node
import { readLedgerReport } from "@red-cup-engineering/read-ledger-report-service";

const READING_REPORTS = Object.freeze({
  balanceSheet: "balance-sheet",
  incomeStatement: "income-statement",
  reconcile: "reconcile",
  stats: "stats",
  accounts: "accounts",
});

/**
 * Reads the standard set of ledger reports a books page needs in one call — balance sheet,
 * income statement, the reconcile worklist, journal statistics, and the account list — by
 * composing `readLedgerReport` once per reading against the same journal. Contains no report
 * logic of its own.
 * @param {{ journal: ({ path: string } | { text: string, format?: ("beancount"|"hledger") }),
 *   begin?: string, end?: string, account?: string, depth?: number, status?: string,
 *   payee?: string, requireMeta?: string, now?: string }} input
 * @returns {Promise<{ kind: "ledger-readings", readings: { balanceSheet: object,
 *   incomeStatement: object, reconcile: object, stats: object, accounts: object } }>}
 * @throws {TypeError} When `input.journal` names neither `path` nor `text`.
 */
export async function readSetOfLedgerReadings(input) {
  if (!input || typeof input !== "object") throw new TypeError("read-set-of-ledger-readings: input must be an object");
  const { journal, ...filters } = input;
  const entries = await Promise.all(
    Object.entries(READING_REPORTS).map(async ([key, report]) => [key, await readLedgerReport({ journal, report, ...filters })]),
  );
  return Object.freeze({ kind: "ledger-readings", readings: Object.freeze(Object.fromEntries(entries)) });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("readSetOfLedgerReadings — Reads the standard set of ledger reports a books page needs in one call — balance sheet, income statement, the reconcile worklist, journal statistics, and the account list — by composing `readLedgerReport` once per reading against the same journal. Contains no report logic of its own.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(await readSetOfLedgerReadings(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/read-set-of-ledger-readings.test.mjs
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
```
## Examples
```json name="reads the standard set of readings from inline text with a pinned generatedAt"
{"input":{"journal":{"text":"option \"title\" \"Test Ledger\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Assets:Cash:Reserve USD\n2026-01-01 open Equity:Opening-Balances\n2026-01-01 open Income:Consulting\n2026-01-01 open Expenses:Software\n\n2026-01-01 * \"Opening balance\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n\n2026-01-05 * \"Client payment\" \"Acme Corp\"\n  Assets:Cash:Operating  500.00 USD\n  Income:Consulting  -500.00 USD\n\n2026-01-10 * \"Software subscription\"\n  Assets:Cash:Operating  -20.00 USD\n  Expenses:Software  20.00 USD\n\n2026-01-15 balance Assets:Cash:Operating  1480.00 USD\n\n2026-01-20 balance Assets:Cash:Reserve  50.00 USD\n"},"now":"2026-09-05T00:00:00.000Z"},"output":{"kind":"ledger-readings","readings":{"balanceSheet":{"tree":{"name":"","segment":"","depth":-1,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"0","den":"1"},"grade":"USD"}},"children":{"Assets":{"name":"Assets","segment":"Assets","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"children":{"Cash":{"name":"Assets:Cash","segment":"Cash","depth":1,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"children":{"Operating":{"name":"Assets:Cash:Operating","segment":"Operating","depth":2,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"children":{}}}}}},"Equity":{"name":"Equity","segment":"Equity","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-1000","den":"1"},"grade":"USD"}},"children":{"Opening-Balances":{"name":"Equity:Opening-Balances","segment":"Opening-Balances","depth":1,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-1000","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-1000","den":"1"},"grade":"USD"}},"children":{}}}},"Income":{"name":"Income","segment":"Income","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-500","den":"1"},"grade":"USD"}},"children":{"Consulting":{"name":"Income:Consulting","segment":"Consulting","depth":1,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-500","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-500","den":"1"},"grade":"USD"}},"children":{}}}},"Expenses":{"name":"Expenses","segment":"Expenses","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"}},"children":{"Software":{"name":"Expenses:Software","segment":"Software","depth":1,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"}},"children":{}}}}}},"kind":"ledger-report","report":"balance-sheet","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"},"incomeStatement":{"tree":{"name":"","segment":"","depth":-1,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"0","den":"1"},"grade":"USD"}},"children":{"Assets":{"name":"Assets","segment":"Assets","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"children":{"Cash":{"name":"Assets:Cash","segment":"Cash","depth":1,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"children":{"Operating":{"name":"Assets:Cash:Operating","segment":"Operating","depth":2,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1480","den":"1"},"grade":"USD"}},"children":{}}}}}},"Equity":{"name":"Equity","segment":"Equity","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-1000","den":"1"},"grade":"USD"}},"children":{"Opening-Balances":{"name":"Equity:Opening-Balances","segment":"Opening-Balances","depth":1,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-1000","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-1000","den":"1"},"grade":"USD"}},"children":{}}}},"Income":{"name":"Income","segment":"Income","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-500","den":"1"},"grade":"USD"}},"children":{"Consulting":{"name":"Income:Consulting","segment":"Consulting","depth":1,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-500","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"-500","den":"1"},"grade":"USD"}},"children":{}}}},"Expenses":{"name":"Expenses","segment":"Expenses","depth":0,"own":{},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"}},"children":{"Software":{"name":"Expenses:Software","segment":"Software","depth":1,"own":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"}},"total":{"USD":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"20","den":"1"},"grade":"USD"}},"children":{}}}}}},"kind":"ledger-report","report":"income-statement","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"},"reconcile":{"rows":[{"account":"Assets:Cash:Operating","commodity":"USD","posted":"1480/1 USD","asserted":"1480/1 USD","assertedAt":"2026-01-15","verdict":"agreed"},{"account":"Assets:Cash:Reserve","commodity":"USD","posted":null,"asserted":"50/1 USD","assertedAt":"2026-01-20","verdict":"mismatch"},{"account":"Equity:Opening-Balances","commodity":"USD","posted":"-1000/1 USD","asserted":null,"assertedAt":null,"verdict":"posted-only"},{"account":"Expenses:Software","commodity":"USD","posted":"20/1 USD","asserted":null,"assertedAt":null,"verdict":"posted-only"},{"account":"Income:Consulting","commodity":"USD","posted":"-500/1 USD","asserted":null,"assertedAt":null,"verdict":"posted-only"}],"summary":{"agreed":1,"mismatch":1,"posted-only":3,"asserted-only":0,"inactive":0},"kind":"ledger-report","report":"reconcile","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"},"stats":{"transactions":3,"postings":6,"accounts":5,"commodities":1,"directives":9,"span":"2026-01-01 … 2026-01-10","malformed":0,"held":1,"synthesized":0,"kind":"ledger-report","report":"stats","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"},"accounts":{"accounts":["Assets:Cash:Operating","Assets:Cash:Reserve","Equity:Opening-Balances","Expenses:Software","Income:Consulting"],"kind":"ledger-report","report":"accounts","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"}}}}
```
## Traceability
- `ledger-readings-result` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `primitives-live-once`, `node-esm-operation`
- `shared-journal-and-filters` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `missing-journal-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-own-report-logic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-live-once`, `node-esm-operation`
