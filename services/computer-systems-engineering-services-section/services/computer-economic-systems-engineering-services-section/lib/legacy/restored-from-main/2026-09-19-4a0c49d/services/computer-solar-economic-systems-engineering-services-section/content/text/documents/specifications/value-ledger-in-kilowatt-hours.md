# value-ledger-in-kilowatt-hours
## Requirements
- `usd-valuation-result`: The operation reads a Beancount or hledger journal's `valuation` report at a cutoff date through `read-ledger-report-service`, and returns it unchanged as `usdValuation`, never re-implementing Farolfi's own valuation algorithm.
- `unpriced-commodity-collection`: The operation collects every commodity the `usdValuation` report shows with a null `marketPrice` into `unpricedCommodities`, reading the already-computed report's own rows rather than recomputing a price.
- `kwh-valuation-attempt`: The operation composes a second `read-ledger-report-service` `valuation` call, passing `reportingCommodity: "KWH"`, and returns its result as `kwhValuation` only when that result's own `reportingCommodity` field reads `"KWH"` AND every one of its rows carries a non-null `marketPrice`; otherwise it returns `kwhValuation: null`. The composed service echoes back whatever `reportingCommodity` was requested even when it lacks a price directive to actually convert a position into it (verified live against `read-ledger-report-service@0.1.1`: a USD-only journal with no KWH price directive, asked to report in KWH, returns `reportingCommodity: "KWH"` with that row's `marketPrice: null`), so the `reportingCommodity` field alone cannot distinguish a real conversion from an unconvertible echo; checking every row for a non-null `marketPrice`, the same signal `unpriced-commodity-collection` already reads off the USD report, is required so an unpriced figure is never presented as a kilowatt-hour valuation.
## Prohibitions
- `no-hand-rolled-valuation`: The operation must not parse or render Beancount/hledger text itself, and must not implement a second valuation algorithm of its own.
- `no-direct-file-access`: The operation must not read or write a file directly; all filesystem access happens inside the composed `read-ledger-report-service`.
- `no-fabricated-valuation`: The operation must refuse as data, never fabricate a valuation, when any commodity the ledger holds a position in carries no price directive as of `asOf`.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/value-ledger-in-kilowatt-hours-service","packageVersion":"0.1.1","license":"MIT","dependencies":{"@red-cup-engineering/read-ledger-report-service":"0.1.1"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/value-ledger-in-kilowatt-hours.mjs
#!/usr/bin/env node
import { readLedgerReport } from "@red-cup-engineering/read-ledger-report-service";

function unpricedCommoditiesOf(report) {
  const commodities = (report.rows ?? [])
    .filter((row) => row.marketPrice === null)
    .map((row) => row.units?.grade)
    .filter((grade) => typeof grade === "string");
  return [...new Set(commodities)];
}

/**
 * Reads a Beancount or hledger journal's valuation report at a cutoff date, in USD and, where
 * the composed service reports in kilowatt-hours, in kilowatt-hours.
 * @param {object} request A record with journal ({path} or {text, format?}), asOf, and optional
 *   now (ISO timestamp, for reproducible fabrication examples and tests).
 * @returns {Promise<object>} A KilowattHourValuation record, or a commodity-unpriced refusal
 *   datum.
 * @throws {TypeError} When journal or asOf is malformed.
 */
export async function valueLedgerInKilowattHours(request) {
  if (typeof request?.asOf !== "string" || request.asOf.length === 0) {
    throw new TypeError("asOf is required");
  }
  if (!request?.journal || typeof request.journal !== "object") {
    throw new TypeError("journal is required");
  }
  const usdValuation = await readLedgerReport({ journal: request.journal, report: "valuation", end: request.asOf, now: request.now });
  const unpricedCommodities = unpricedCommoditiesOf(usdValuation);
  if (unpricedCommodities.length > 0) {
    return { refused: true, reason: "commodity-unpriced", commodity: unpricedCommodities[0], asOf: request.asOf };
  }
  const kwhAttempt = await readLedgerReport({ journal: request.journal, report: "valuation", end: request.asOf, now: request.now, reportingCommodity: "KWH" });
  const kwhValuation = kwhAttempt.reportingCommodity === "KWH" && unpricedCommoditiesOf(kwhAttempt).length === 0 ? kwhAttempt : null;
  return {
    type: "KilowattHourValuation",
    version: 1,
    generatedAt: usdValuation.generatedAt,
    usdValuation,
    kwhValuation,
    unpricedCommodities,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("valueLedgerInKilowattHours — Reads a Beancount or hledger journal's valuation report at a cutoff date, in USD and, where the composed service reports in kilowatt-hours, in kilowatt-hours.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(await valueLedgerInKilowattHours(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/value-ledger-in-kilowatt-hours.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { valueLedgerInKilowattHours } from "../scripts/value-ledger-in-kilowatt-hours.mjs";

const fullyPricedJournal = `option "title" "Test"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Equity:Opening-Balances

2026-01-01 * "Opening"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD
`;

const unpricedJournal = `option "title" "Test"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Assets:Solar:PVBank KWH
2026-01-01 open Equity:Opening-Balances

2026-01-01 * "Opening"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD

2026-01-01 * "PV credit"
  Assets:Solar:PVBank  50.00 KWH
  Equity:Opening-Balances  -50.00 KWH
`;

const kwhPricedJournal = `option "title" "Test"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Assets:Solar:PVBank KWH
2026-01-01 open Equity:Opening-Balances

2026-01-01 price KWH 0.15 USD
2026-01-01 price USD 6.666667 KWH

2026-01-01 * "Opening"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD

2026-01-01 * "PV credit"
  Assets:Solar:PVBank  50.00 KWH
  Equity:Opening-Balances  -50.00 KWH
`;

test("returns a usdValuation and null kwhValuation when every commodity is priced", async () => {
  const result = await valueLedgerInKilowattHours({ journal: { text: fullyPricedJournal }, asOf: "2026-09-05" });
  assert.equal(result.type, "KilowattHourValuation");
  assert.equal(result.usdValuation.reportingCommodity, "USD");
  assert.equal(result.kwhValuation, null);
  assert.deepEqual(result.unpricedCommodities, []);
});

test("yields a non-null kwhValuation with reportingCommodity KWH when forward and inverse KWH/USD price directives are present", async () => {
  const result = await valueLedgerInKilowattHours({ journal: { text: kwhPricedJournal }, asOf: "2026-09-05" });
  assert.equal(result.type, "KilowattHourValuation");
  assert.ok(result.kwhValuation !== null);
  assert.equal(result.kwhValuation.reportingCommodity, "KWH");
});

test("refuses as data on an unpriced commodity, never fabricating a valuation", async () => {
  const result = await valueLedgerInKilowattHours({ journal: { text: unpricedJournal }, asOf: "2026-09-05" });
  assert.deepEqual(result, { refused: true, reason: "commodity-unpriced", commodity: "KWH", asOf: "2026-09-05" });
});

test("refuses a missing journal", async () => {
  await assert.rejects(() => valueLedgerInKilowattHours({ asOf: "2026-09-05" }), /journal is required/u);
});

test("refuses a missing asOf", async () => {
  await assert.rejects(() => valueLedgerInKilowattHours({ journal: { text: fullyPricedJournal } }), /asOf is required/u);
});
```
## Examples
```json name="fully priced journal values in USD with no unpriced commodities"
{"input":{"journal":{"text":"option \"title\" \"Test\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Equity:Opening-Balances\n\n2026-01-01 * \"Opening\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n"},"asOf":"2026-09-05","now":"2026-09-05T00:00:00.000Z"},"output":{"type":"KilowattHourValuation","version":1,"generatedAt":"2026-09-05T00:00:00.000Z","usdValuation":{"rows":[{"account":"Assets:Cash:Operating","units":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1000","den":"1"},"grade":"USD"},"lot":null,"bookValue":null,"marketPrice":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1","den":"1"},"grade":"USD"},"marketValue":{"kind":"exactNumber.gradedRational","value":{"kind":"exactNumber.rational","num":"1000","den":"1"},"grade":"USD"},"unrealized":null,"priceDate":null}],"end":"2026-09-05","reportingCommodity":"USD","kind":"ledger-report","report":"valuation","journal":{"text":true,"format":"beancount"},"generatedAt":"2026-09-05T00:00:00.000Z"},"kwhValuation":null,"unpricedCommodities":[]}}
```
## Traceability
- `usd-valuation-result` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `unpriced-commodity-collection` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `kwh-valuation-attempt` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-hand-rolled-valuation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-direct-file-access` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-fabricated-valuation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
