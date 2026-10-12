# derive-set-of-energy-price-directives
## Requirements
- `declared-electricity-tariff`: The operation must price `KWH` only from a declared electricity tariff record (`usdPerKwh`, `sourceUrl`, `asOf`), never a fetched value, because utility tariffs are published as PDFs the operation cannot parse.
- `weekly-series-latest-at-or-before`: For `PROPANE_GAL` and `DIESEL_GAL`, the operation must price each commodity from the latest row of its weekly price series dated at or before `input.date`, parsed from a two-column `date,value` CSV text already obtained by the caller (the EIA's keyless per-series CSV/XLS export, or a recorded-response fixture).
- `source-kind-declared`: Every priced commodity's directive must carry which kind of source produced it (`declared` for electricity, `fetched-csv` or `fixture` for propane and diesel, as the caller's own `sourceKind` field states) plus the source's URL when known and the observation's own date, so a stale or fixture-derived price is never presented as a live one.
- `forward-and-inverse-directive`: The operation must render one forward Beancount `price` directive (`<date> price <COMMODITY> <usd> USD`) and one inverse directive (`<date> price USD <inverse> <COMMODITY>`) per priced commodity, so a ledger can be valued in USD or in the named energy commodity.
- `exact-reciprocal`: The inverse price must be the exact reciprocal of the forward price, computed through the ledger section's `divideDecimalStrings`, truncated (never rounded) to 10 fractional digits.
- `unpriced-when-no-row`: A weekly series with no row dated at or before `input.date` must leave that commodity listed under `unpriced` with a reason naming the cutoff date, and emit no directive (forward or inverse) for it, never fabricating a price.
## Prohibitions
- `no-network-io`: The operation performs no network call, file read, or file write; every source's data (`seriesText`, the declared tariff) arrives already obtained in its input, so it is a pure function of that input.
- `no-float-arithmetic`: No price or its reciprocal is parsed or computed with a native floating-point arithmetic operator; only the ledger section's `parseDecimal`/`divideDecimalStrings`.
- `no-future-row`: The operation must never select a weekly-series row dated after `input.date` as the latest observation.
- `no-eia-api-key`: The operation must refuse an `apiKey` field on a weekly source with a `TypeError`; only the keyless CSV/XLS surface already read into `seriesText`, or a recorded fixture, is ever consulted.
## Laws
- `books-valued-twice` | Fintech under energy descent, section 3.1 (561 Group finance note) | 2026-09-05 | content/text/documents/articles/notes/2026/09/05/2026-09-05-note-on-fintech-under-energy-descent.md (561-group-finance-operations-services-section) | Applies to the whole operation. | A second price-directive series, valued in kWh, propane, and diesel gallons rather than only USD, lets every balance sheet and every sleeve's barrier be read in energy as well as currency, invariant under the currency regime change the note's section 2 describes.
- `pure-data-transformation-law` | The language law (owner-stated 2026-08-30) | v1 | .claude/rules/org-layering.md | Applies to deriveSetOfEnergyPriceDirectives as data transformation, never I/O. | I/O with a system is written in Node; a decision that is only data transformation performs no I/O of its own.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `iso-8601-date` | ISO 8601 | 2019 | https://www.iso.org/iso-8601-date-and-time-format.html | Applies to every date field. | Dates are YYYY-MM-DD calendar-date strings; a weekly series' own MM/DD/YYYY export format is normalized to this before comparison.
- `beancount-double-entry-syntax` | Beancount | v3.2 | https://beancount.github.io/docs/beancount_language_syntax.html | Applies to every rendered price directive, forward and inverse. | Directives use Beancount's plain-text `price` directive syntax, which prices one commodity in terms of any other named commodity, not only USD; conformance is verified by `bean-check`.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-energy-price-directives-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/computer-ledger-system-services-section":"0.4.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-energy-price-directives.mjs
#!/usr/bin/env node
import { divideDecimalStrings, parseDecimal } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { renderPriceDirective } from "@red-cup-engineering/computer-ledger-system-services-section/src/beancount-render.mjs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const US_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u;
const SOURCE_KINDS = ["fetched-csv", "fixture"];
const INVERSE_MAX_DECIMALS = 10;

function requireString(value, context) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`derive-set-of-energy-price-directives: ${context} must be a non-empty string`);
  return value;
}

function requireDate(value, context) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) throw new TypeError(`derive-set-of-energy-price-directives: ${context} must be a YYYY-MM-DD date string`);
  return value;
}

function requireDecimalString(value, context) {
  if (typeof value !== "string") throw new TypeError(`derive-set-of-energy-price-directives: ${context} must be a plain decimal string`);
  try {
    parseDecimal(value);
  } catch {
    throw new TypeError(`derive-set-of-energy-price-directives: ${context} must be a plain decimal string`);
  }
  return value;
}

/**
 * Normalize one weekly-series date field (`YYYY-MM-DD` or the EIA CSV export's own
 * `MM/DD/YYYY`) to `YYYY-MM-DD`.
 * @param {string} value
 * @param {string} context
 * @returns {string}
 * @throws {TypeError} if `value` matches neither date shape
 */
function normalizeSeriesDate(value, context) {
  if (DATE_PATTERN.test(value)) return value;
  const match = US_DATE_PATTERN.exec(value);
  if (!match) throw new TypeError(`derive-set-of-energy-price-directives: ${context} is not a recognized date: ${JSON.stringify(value)}`);
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Parse a two-column weekly price series CSV (a header line naming the series, then one
 * `date,value` row per week, as the EIA's keyless per-series CSV export renders it) into
 * `{ date, value }` rows sorted ascending by date.
 * @param {string} seriesText
 * @param {string} context
 * @returns {readonly { date: string, value: string }[]}
 * @throws {TypeError} if a data row is malformed
 */
function parseWeeklySeriesCsv(seriesText, context) {
  const lines = String(seriesText).split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length > 0);
  const rows = [];
  for (const line of lines.slice(1)) {
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) throw new TypeError(`derive-set-of-energy-price-directives: ${context} row is not "date,value": ${JSON.stringify(line)}`);
    const dateField = line.slice(0, commaIndex).trim();
    const valueField = line.slice(commaIndex + 1).trim();
    const date = normalizeSeriesDate(dateField, `${context} row date`);
    rows.push({ date, value: requireDecimalString(valueField, `${context} row value`) });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return Object.freeze(rows);
}

/**
 * The latest weekly-series row dated at or before `asOf`, or `null` when none qualifies.
 * @param {readonly { date: string, value: string }[]} rows ascending by date
 * @param {string} asOf
 * @returns {{ date: string, value: string } | null}
 */
function latestRowAtOrBefore(rows, asOf) {
  let latest = null;
  for (const row of rows) {
    if (row.date > asOf) break;
    latest = row;
  }
  return latest;
}

function validateWeeklySource(source, context) {
  if (source === null || typeof source !== "object") throw new TypeError(`derive-set-of-energy-price-directives: ${context} must be an object`);
  if (!SOURCE_KINDS.includes(source.sourceKind)) throw new TypeError(`derive-set-of-energy-price-directives: ${context}.sourceKind must be one of ${SOURCE_KINDS.join(", ")}`);
  if (source.sourceKind === "fetched-csv") requireString(source.sourceUrl, `${context}.sourceUrl`);
  requireString(source.seriesText, `${context}.seriesText`);
  if ("apiKey" in source) throw new TypeError(`derive-set-of-energy-price-directives: ${context}.apiKey is refused; only the keyless CSV/XLS surface or a recorded fixture is read`);
}

function priceCommodity({ commodity, date, usdPrice, sourceKind, sourceUrl, observedDate }) {
  const inversePrice = divideDecimalStrings("1", usdPrice, INVERSE_MAX_DECIMALS);
  const metadata = { source_kind: sourceKind, source_url: sourceUrl ?? "", observed_date: observedDate };
  const directive = renderPriceDirective({ date, symbol: commodity, price: usdPrice, metadata });
  const inverseDirective = renderPriceDirective({
    date, symbol: "USD", price: inversePrice, quoteCommodity: commodity,
    metadata: { ...metadata, inverse_of: commodity },
  });
  return { commodity, usdPrice, inversePrice, sourceKind, sourceUrl: sourceUrl ?? null, observedDate, directive, inverseDirective };
}

/**
 * @typedef {Object} EnergyPriceDirective
 * @property {"KWH"|"PROPANE_GAL"|"DIESEL_GAL"} commodity
 * @property {string} usdPrice
 * @property {string} inversePrice
 * @property {"declared"|"fetched-csv"|"fixture"} sourceKind
 * @property {string|null} sourceUrl
 * @property {string} observedDate
 * @property {string} directive
 * @property {string} inverseDirective
 * @typedef {Object} EnergyUnpricedCommodity
 * @property {"PROPANE_GAL"|"DIESEL_GAL"} commodity
 * @property {string} reason
 * @typedef {Object} EnergyPriceDirectiveSet
 * @property {"EnergyPriceDirectiveSet"} type
 * @property {1} version
 * @property {string} date
 * @property {number} directiveCount
 * @property {readonly EnergyPriceDirective[]} priced
 * @property {readonly EnergyUnpricedCommodity[]} unpriced
 */

/**
 * Derives Beancount `price` directives, forward and inverse, for `KWH` (from a declared electricity tariff), `PROPANE_GAL`, and `DIESEL_GAL` (each from a weekly price series' latest row at or before `input.date`), so the main ledger can be valued in USD or in the named energy commodity; a weekly series with no row at or before `input.date` leaves that commodity unpriced rather than fabricating a price.
 * @param {{ date: string, electricity: { usdPerKwh: string, sourceUrl: string, asOf: string }, propane: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string }, diesel: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string } }} input A record with the reporting date, the declared electricity tariff, and each weekly series' already-obtained CSV text.
 * @returns {EnergyPriceDirectiveSet} The priced and unpriced commodities, each with its rendered forward and inverse Beancount price directive.
 * @throws {TypeError} When `input` or one of its declared sources is malformed.
 */
export function deriveSetOfEnergyPriceDirectives(input) {
  if (input === null || typeof input !== "object") throw new TypeError("derive-set-of-energy-price-directives: input must be an object");
  const date = requireDate(input.date, "input.date");

  const electricity = input.electricity;
  if (electricity === null || typeof electricity !== "object") throw new TypeError("derive-set-of-energy-price-directives: input.electricity must be an object");
  const usdPerKwh = requireDecimalString(electricity.usdPerKwh, "input.electricity.usdPerKwh");
  const electricitySourceUrl = requireString(electricity.sourceUrl, "input.electricity.sourceUrl");
  const electricityAsOf = requireDate(electricity.asOf, "input.electricity.asOf");

  validateWeeklySource(input.propane, "input.propane");
  validateWeeklySource(input.diesel, "input.diesel");

  const priced = [
    priceCommodity({
      commodity: "KWH", date, usdPrice: usdPerKwh, sourceKind: "declared",
      sourceUrl: electricitySourceUrl, observedDate: electricityAsOf,
    }),
  ];
  const unpriced = [];

  for (const [commodity, source] of [["PROPANE_GAL", input.propane], ["DIESEL_GAL", input.diesel]]) {
    const rows = parseWeeklySeriesCsv(source.seriesText, `input.${commodity === "PROPANE_GAL" ? "propane" : "diesel"}.seriesText`);
    const latest = latestRowAtOrBefore(rows, date);
    if (latest === null) {
      unpriced.push({ commodity, reason: `no weekly observation at or before ${date}` });
      continue;
    }
    priced.push(priceCommodity({
      commodity, date, usdPrice: latest.value, sourceKind: source.sourceKind,
      sourceUrl: source.sourceUrl ?? null, observedDate: latest.date,
    }));
  }

  return Object.freeze({
    type: "EnergyPriceDirectiveSet",
    version: 1,
    date,
    directiveCount: priced.length * 2,
    priced: Object.freeze(priced),
    unpriced: Object.freeze(unpriced),
  });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveSetOfEnergyPriceDirectives — Derives Beancount `price` directives, forward and inverse, for `KWH` (from a declared electricity tariff), `PROPANE_GAL`, and `DIESEL_GAL` (each from a weekly price series' latest row at or before `input.date`), so the main ledger can be valued in USD or in the named energy commodity; a weekly series with no row at or before `input.date` leaves that commodity unpriced rather than fabricating a price.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length > 0) process.stdout.write(`${JSON.stringify(deriveSetOfEnergyPriceDirectives(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-set-of-energy-price-directives.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfEnergyPriceDirectives } from "../scripts/derive-set-of-energy-price-directives.mjs";

const ELECTRICITY = { usdPerKwh: "0.1423", sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" };
const PROPANE_CSV = "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n09/10/2026,1.3\n";
const DIESEL_CSV = "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n2026-09-10,3.6\n";

test("derives forward and inverse directives for KWH, PROPANE_GAL, and DIESEL_GAL, picking each weekly series' latest row at or before the reporting date (both MM/DD/YYYY and YYYY-MM-DD, never a future row)", () => {
  const result = deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05",
    electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV },
    diesel: { sourceKind: "fetched-csv", sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/", seriesText: DIESEL_CSV },
  });
  assert.equal(result.type, "EnergyPriceDirectiveSet");
  assert.equal(result.directiveCount, 6);
  assert.equal(result.unpriced.length, 0);
  const byCommodity = Object.fromEntries(result.priced.map((p) => [p.commodity, p]));

  assert.equal(byCommodity.KWH.usdPrice, "0.1423");
  assert.equal(byCommodity.KWH.inversePrice, "7.0274068868");
  assert.equal(byCommodity.KWH.sourceKind, "declared");
  assert.equal(byCommodity.KWH.observedDate, "2026-07-01");
  assert.equal(byCommodity.KWH.directive, "2026-09-05 price KWH 0.1423 USD\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"");
  assert.equal(byCommodity.KWH.inverseDirective, "2026-09-05 price USD 7.0274068868 KWH\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"\n  inverse_of: \"KWH\"");

  // 09/01/2026 (MM/DD/YYYY) is the latest PROPANE_GAL row at or before 2026-09-05; 09/10/2026 is a future row and must never be picked.
  assert.equal(byCommodity.PROPANE_GAL.usdPrice, "1.245");
  assert.equal(byCommodity.PROPANE_GAL.observedDate, "2026-09-01");
  assert.equal(byCommodity.PROPANE_GAL.sourceKind, "fixture");
  assert.equal(byCommodity.PROPANE_GAL.sourceUrl, null);
  assert.equal(byCommodity.PROPANE_GAL.inverseDirective, "2026-09-05 price USD 0.8032128514 PROPANE_GAL\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"\n  inverse_of: \"PROPANE_GAL\"");

  // 2026-08-31 (YYYY-MM-DD) is the latest DIESEL_GAL row at or before 2026-09-05; 2026-09-10 is a future row and must never be picked.
  assert.equal(byCommodity.DIESEL_GAL.usdPrice, "3.512");
  assert.equal(byCommodity.DIESEL_GAL.observedDate, "2026-08-31");
  assert.equal(byCommodity.DIESEL_GAL.sourceKind, "fetched-csv");
  assert.match(byCommodity.DIESEL_GAL.inverseDirective, /price USD 0\.284738041 DIESEL_GAL/u);
});

test("a weekly series with no row at or before the reporting date is unpriced, never fabricated", () => {
  const result = deriveSetOfEnergyPriceDirectives({
    date: "2026-08-01",
    electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV },
    diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  });
  assert.deepEqual(result.unpriced, [
    { commodity: "PROPANE_GAL", reason: "no weekly observation at or before 2026-08-01" },
    { commodity: "DIESEL_GAL", reason: "no weekly observation at or before 2026-08-01" },
  ]);
  assert.equal(result.priced.length, 1);
  assert.equal(result.directiveCount, 2);
});

test("refuses a malformed electricity declaration", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: { sourceUrl: "https://x", asOf: "2026-07-01" },
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV }, diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /electricity.usdPerKwh must be a plain decimal string/u);
});

test("refuses an apiKey field on a weekly source, keyless surfaces only", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV, apiKey: "secret" },
    diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /apiKey is refused/u);
});

test("refuses an unrecognized sourceKind", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: ELECTRICITY,
    propane: { sourceKind: "live-api", seriesText: PROPANE_CSV }, diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /sourceKind must be one of/u);
});

test("refuses a weekly-series row that is not \"date,value\"", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: "Date,X\nnotarow\n" }, diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /row is not "date,value"/u);
});
```
## Examples
```json name="derive-set-of-energy-price-directives example"
{"input":{"date":"2026-09-05","electricity":{"usdPerKwh":"0.1423","sourceUrl":"https://www.example-coop.coop/rates","asOf":"2026-07-01"},"propane":{"sourceKind":"fixture","seriesText":"Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n"},"diesel":{"sourceKind":"fetched-csv","sourceUrl":"https://www.eia.gov/petroleum/gasdiesel/","seriesText":"Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n"}},"output":{"type":"EnergyPriceDirectiveSet","version":1,"date":"2026-09-05","directiveCount":6,"priced":[{"commodity":"KWH","usdPrice":"0.1423","inversePrice":"7.0274068868","sourceKind":"declared","sourceUrl":"https://www.example-coop.coop/rates","observedDate":"2026-07-01","directive":"2026-09-05 price KWH 0.1423 USD\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"","inverseDirective":"2026-09-05 price USD 7.0274068868 KWH\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"\n  inverse_of: \"KWH\""},{"commodity":"PROPANE_GAL","usdPrice":"1.245","inversePrice":"0.8032128514","sourceKind":"fixture","sourceUrl":null,"observedDate":"2026-09-01","directive":"2026-09-05 price PROPANE_GAL 1.245 USD\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"","inverseDirective":"2026-09-05 price USD 0.8032128514 PROPANE_GAL\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"\n  inverse_of: \"PROPANE_GAL\""},{"commodity":"DIESEL_GAL","usdPrice":"3.512","inversePrice":"0.284738041","sourceKind":"fetched-csv","sourceUrl":"https://www.eia.gov/petroleum/gasdiesel/","observedDate":"2026-08-31","directive":"2026-09-05 price DIESEL_GAL 3.512 USD\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"","inverseDirective":"2026-09-05 price USD 0.284738041 DIESEL_GAL\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"\n  inverse_of: \"DIESEL_GAL\""}],"unpriced":[]}}
```
## Traceability
- `declared-electricity-tariff` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `books-valued-twice`, `pure-data-transformation-law`
- `weekly-series-latest-at-or-before` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-date`, `node-esm-operation`
- `source-kind-declared` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `books-valued-twice`
- `forward-and-inverse-directive` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-double-entry-syntax`
- `exact-reciprocal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-law`
- `unpriced-when-no-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-date`
- `no-network-io` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-law`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-law`
- `no-future-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-date`
- `no-eia-api-key` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
