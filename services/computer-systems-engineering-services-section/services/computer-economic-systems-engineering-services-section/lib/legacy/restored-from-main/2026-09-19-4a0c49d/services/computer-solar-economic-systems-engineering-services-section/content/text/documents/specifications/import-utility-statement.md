# import-utility-statement
## Requirements
- `csv-and-text-formats`: `format:"csv"` reads `statementText` as a header row plus comma-separated data rows, with `parserConfig.columnMap` values naming header column names; `format:"text"` reads `statementText` as headerless comma-separated data rows, with `parserConfig.columnMap` values naming zero-based column indices -- both declared entirely by `parserConfig`, never by a named-utility branch inside the operation.
- `per-row-household-energy-record`: Each data row that resolves its required `columnMap` fields (`householdId`, `periodStart`, `periodEnd`, `kwhUsed`) becomes one `HouseholdEnergyRecord` (`kwhGenerated` defaults to a `"0"` statement value with no second witness when `columnMap.kwhGenerated` is not declared), carrying `request.tariff` through unchanged as the record's own `tariff` field (the `household-energy-record` schema requires `tariff` on every instance, and this operation is the one place a statement import can attach the household's own already-known tariff).
- `two-witness-kwh-used`: `kwhUsed.meterOrBankValue` is the `meterReadings` entry whose `date` equals the row's `periodEnd`, falling back to the matching `bankRows` entry's `amount` when no `meterReadings` entry matches, or `null` when neither source has a matching date; a disagreement (`compareDecimalStrings` non-zero) sets `mismatch:true` and `mismatchAmount` to the exact decimal difference (`addDecimalStrings([statementValue, negateDecimalString(meterOrBankValue)])`), never silently resolved in either direction.
- `optional-footing-check`: When `parserConfig.columnMap` declares both `lineItems` (an array of columnMap key names) and `totalCharge`, each row's resolved line-item values are summed exactly (`addDecimalStrings`) and compared to the resolved `totalCharge`; a row whose line items do not foot against its declared total is refused rather than accepted with a silently wrong total.
- `date-normalization`: `parserConfig.dateFormat` of `"YYYY-MM-DD"` passes a row's date fields through unchanged (after validating the shape); `"MM/DD/YYYY"` normalizes them to `YYYY-MM-DD`, mirroring `derive-set-of-energy-price-directives`'s own `normalizeSeriesDate` shape without importing it (that function is private to its own package).
## Prohibitions
- `no-per-utility-code`: The operation must never branch on `parserConfig.utility`'s value; every utility-specific column name, index, or date format is read from `parserConfig`, never hardcoded.
- `no-dropped-unparseable-row`: A row whose required `columnMap` fields cannot be resolved (a missing CSV column, an out-of-range text index, or a row with fewer fields than the header) must be reported at that row's position as `{refused:true, reason:"unparseable-row", rowText}`, never dropped from the returned array or silently skipped.
- `no-silent-footing-failure`: A row whose declared line items do not sum to its declared total must be reported at that row's position as `{refused:true, reason:"statement-does-not-foot", rowText, declaredTotal, summedTotal}`, never accepted with the statement's own declared (wrong) total.
- `no-second-decimal-arithmetic`: The operation must not reimplement decimal addition, negation, or comparison; it composes `@red-cup-engineering/computer-ledger-system-services-section`'s own `addDecimalStrings`, `negateDecimalString`, and `compareDecimalStrings`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to every decimal comparison, negation, and sum in this operation. | Exact decimal add/negate/compare live once in `computer-ledger-system-services-section@0.6.0`; this operation composes them by exact pin instead of re-deriving any of them.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
- `two-witness-discipline` | Soft Dyson specification, citing the program carrier's distal-bypass bullet | 2026-09-05 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/services/computer-solar-economic-systems-engineering-services-section/content/text/documents/articles/specifications/2026-09-05-soft-dyson-specification.md | Applies to `kwhUsed`'s `witnessedValue`. | A `witnessedValue` with a non-null `meterOrBankValue` that disagrees with `statementValue` MUST set `mismatch:true` and carry the exact `mismatchAmount`; it MUST NOT be silently resolved in either direction.
- `parser-config-as-data` | Soft Dyson specification | 2026-09-05 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/services/computer-solar-economic-systems-engineering-services-section/content/text/documents/articles/specifications/2026-09-05-soft-dyson-specification.md | Applies to every column-name, index, and date-format decision in this operation. | `parserConfig` is declared per-utility data, never per-utility code, mirroring `farolfi check --require-meta`'s policy-as-parameter shape; every utility-specific column mapping is admitted data, never a branch in this script.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
- `tariff-not-in-original-parameter-list` [nonblocking]: The Soft Dyson specification's own prose parameter list for `import-utility-statement` names only `statementText`, `format`, `parserConfig`, `meterReadings`, and `bankRows`, but the same specification's `household-energy-record` schema requires `tariff` on every instance; this work order adds `request.tariff: EnergyTariff` as a required parameter so every returned record is schema-conformant, since no other operation in this section's build order is positioned to attach a household's tariff to a statement import's own output rows.
## Package
```json
{"packageName":"@red-cup-engineering/import-utility-statement-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/computer-ledger-system-services-section":"0.6.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/import-utility-statement.mjs
#!/usr/bin/env node
import { addDecimalStrings, negateDecimalString, compareDecimalStrings } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const US_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u;

function requireObject(value, context) {
  if (value === null || typeof value !== "object") throw new TypeError(`import-utility-statement: ${context} must be an object`);
  return value;
}

function splitCsvLine(line) {
  return line.split(",").map((field) => field.trim());
}

/**
 * Normalize one statement date field to `YYYY-MM-DD` per `parserConfig.dateFormat`.
 * @param {string} value
 * @param {"YYYY-MM-DD"|"MM/DD/YYYY"} dateFormat
 * @returns {string|null} `null` when `value` does not match `dateFormat`'s own shape.
 */
function normalizeStatementDate(value, dateFormat) {
  if (typeof value !== "string") return null;
  if (dateFormat === "YYYY-MM-DD") return ISO_DATE_PATTERN.test(value) ? value : null;
  const match = US_DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Resolve one output field's raw value from a split row, by header name (`format:"csv"`) or by
 * zero-based index (`format:"text"`).
 * @param {readonly string[]} row
 * @param {readonly string[]|null} header
 * @param {string|number} columnRef
 * @returns {string|undefined}
 */
function resolveField(row, header, columnRef) {
  const index = header === null ? Number(columnRef) : header.indexOf(String(columnRef));
  if (index === -1 || !Number.isInteger(index) || index < 0 || index >= row.length) return undefined;
  return row[index];
}

function requireHeaderColumn(header, columnRef, context) {
  if (header !== null && header.indexOf(String(columnRef)) === -1) {
    throw new TypeError(`import-utility-statement: parserConfig.columnMap.${context} names a column not present in the statement header: ${JSON.stringify(columnRef)}`);
  }
}

function witnessAgainst(statementValue, witnesses, periodEnd) {
  const witness = witnesses.find((entry) => entry.date === periodEnd);
  if (witness === undefined) return { statementValue, meterOrBankValue: null, mismatch: null, mismatchAmount: null };
  const meterOrBankValue = witness.kwh ?? witness.amount;
  const mismatch = compareDecimalStrings(statementValue, meterOrBankValue) !== 0;
  const mismatchAmount = mismatch ? addDecimalStrings([statementValue, negateDecimalString(meterOrBankValue)]) : null;
  return { statementValue, meterOrBankValue, mismatch, mismatchAmount };
}

/**
 * Imports one utility statement's rows into `HouseholdEnergyRecord` rows, reconciling `kwhUsed`
 * against a meter or bank row and holding any mismatch open, and refusing rather than dropping a
 * row this section's declared `parserConfig` cannot resolve or foot.
 * @param {{ statementText: string, format: "csv"|"text", parserConfig: { utility: string, columnMap: { householdId: string|number, periodStart: string|number, periodEnd: string|number, kwhUsed: string|number, kwhGenerated?: string|number, lineItems?: readonly (string|number)[], totalCharge?: string|number }, dateFormat: "YYYY-MM-DD"|"MM/DD/YYYY", sourceUrl: string }, tariff: object, meterReadings?: readonly { date: string, kwh: string }[], bankRows?: readonly { date: string, amount: string }[] }} request
 * @returns {readonly (object|{refused: true, reason: "unparseable-row"|"statement-does-not-foot", rowText: string})[]} One `HouseholdEnergyRecord` or refusal datum per data row, in row order.
 * @throws {TypeError} When `request` is malformed, or `parserConfig.columnMap` names a header column the statement does not have (`format:"csv"` only).
 */
export function importUtilityStatement(request) {
  requireObject(request, "request");
  if (typeof request.statementText !== "string") throw new TypeError("import-utility-statement: request.statementText must be a string");
  if (request.format !== "csv" && request.format !== "text") throw new TypeError('import-utility-statement: request.format must be "csv" or "text"');
  const parserConfig = requireObject(request.parserConfig, "request.parserConfig");
  const columnMap = requireObject(parserConfig.columnMap, "request.parserConfig.columnMap");
  const tariff = requireObject(request.tariff, "request.tariff");
  const meterReadings = Array.isArray(request.meterReadings) ? request.meterReadings : [];
  const bankRows = Array.isArray(request.bankRows) ? request.bankRows : [];

  const lines = request.statementText.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length > 0);
  const header = request.format === "csv" ? splitCsvLine(lines[0] ?? "") : null;
  const dataLines = request.format === "csv" ? lines.slice(1) : lines;

  for (const key of ["householdId", "periodStart", "periodEnd", "kwhUsed"]) requireHeaderColumn(header, columnMap[key], key);
  if (columnMap.kwhGenerated !== undefined) requireHeaderColumn(header, columnMap.kwhGenerated, "kwhGenerated");
  if (columnMap.totalCharge !== undefined) requireHeaderColumn(header, columnMap.totalCharge, "totalCharge");
  if (Array.isArray(columnMap.lineItems)) for (const item of columnMap.lineItems) requireHeaderColumn(header, item, "lineItems");

  return dataLines.map((rowText) => {
    const row = splitCsvLine(rowText);
    const householdId = resolveField(row, header, columnMap.householdId);
    const periodStartRaw = resolveField(row, header, columnMap.periodStart);
    const periodEndRaw = resolveField(row, header, columnMap.periodEnd);
    const kwhUsedStatementValue = resolveField(row, header, columnMap.kwhUsed);
    const periodStart = normalizeStatementDate(periodStartRaw, parserConfig.dateFormat);
    const periodEnd = normalizeStatementDate(periodEndRaw, parserConfig.dateFormat);
    if (householdId === undefined || periodStart === null || periodEnd === null || kwhUsedStatementValue === undefined) {
      return { refused: true, reason: "unparseable-row", rowText };
    }

    if (Array.isArray(columnMap.lineItems) && columnMap.totalCharge !== undefined) {
      const lineItemValues = columnMap.lineItems.map((item) => resolveField(row, header, item));
      const totalChargeValue = resolveField(row, header, columnMap.totalCharge);
      if (lineItemValues.some((value) => value === undefined) || totalChargeValue === undefined) {
        return { refused: true, reason: "unparseable-row", rowText };
      }
      const summedTotal = addDecimalStrings(lineItemValues);
      if (compareDecimalStrings(summedTotal, totalChargeValue) !== 0) {
        return { refused: true, reason: "statement-does-not-foot", rowText, declaredTotal: totalChargeValue, summedTotal };
      }
    }

    const kwhUsed = witnessAgainst(kwhUsedStatementValue, [...meterReadings, ...bankRows], periodEnd);
    const kwhGeneratedStatementValue = columnMap.kwhGenerated !== undefined ? resolveField(row, header, columnMap.kwhGenerated) : "0";
    const kwhGenerated = { statementValue: kwhGeneratedStatementValue ?? "0", meterOrBankValue: null, mismatch: null, mismatchAmount: null };

    return { type: "HouseholdEnergyRecord", version: 1, householdId, periodStart, periodEnd, kwhUsed, kwhGenerated, tariff };
  });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("importUtilityStatement — Imports one utility statement's rows into HouseholdEnergyRecord rows, reconciling kwhUsed against a meter or bank row and holding any mismatch open, and refusing rather than dropping a row this section's declared parserConfig cannot resolve or foot.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length > 0) process.stdout.write(`${JSON.stringify(importUtilityStatement(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/import-utility-statement.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { importUtilityStatement } from "../scripts/import-utility-statement.mjs";

const TARIFF = { utility: "Example Coop", rateScheduleName: "Residential", usdPerKwhTiers: [{ usdPerKwh: "0.1423" }], sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" };
const CSV_HEADER = "Account,From,To,kWh Used,kWh Generated";
const COLUMN_MAP = { householdId: "Account", periodStart: "From", periodEnd: "To", kwhUsed: "kWh Used", kwhGenerated: "kWh Generated" };

test("imports a CSV row into a HouseholdEnergyRecord with no mismatch when the meter agrees", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
    meterReadings: [{ date: "2026-08-31", kwh: "450.00" }],
  });
  assert.equal(record.type, "HouseholdEnergyRecord");
  assert.equal(record.householdId, "12345");
  assert.equal(record.kwhUsed.mismatch, false);
  assert.equal(record.kwhGenerated.statementValue, "120.00");
  assert.deepEqual(record.tariff, TARIFF);
});

test("holds a meter mismatch open with the exact difference, never resolving it silently", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
    meterReadings: [{ date: "2026-08-31", kwh: "448.50" }],
  });
  assert.equal(record.kwhUsed.mismatch, true);
  assert.equal(record.kwhUsed.mismatchAmount, "1.5");
});

test("falls back to a bank row when no meter reading matches the period end", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
    bankRows: [{ date: "2026-08-31", amount: "450.00" }],
  });
  assert.equal(record.kwhUsed.meterOrBankValue, "450.00");
  assert.equal(record.kwhUsed.mismatch, false);
});

test("reads a headerless text-format row by column index", () => {
  const statementText = "12345,2026-08-01,2026-08-31,450.00\n";
  const [record] = importUtilityStatement({
    statementText, format: "text",
    parserConfig: { utility: "Example Coop", columnMap: { householdId: 0, periodStart: 1, periodEnd: 2, kwhUsed: 3 }, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(record.householdId, "12345");
  assert.equal(record.kwhUsed.statementValue, "450.00");
  assert.equal(record.kwhGenerated.statementValue, "0");
});

test("reports an unparseable row at its position instead of dropping it", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01\n`;
  const [refusal] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reason, "unparseable-row");
  assert.equal(refusal.rowText, "12345,2026-08-01");
});

test("refuses a row whose line items do not foot against its declared total", () => {
  const header = "Account,From,To,kWh Used,kWh Generated,Energy Charge,Delivery Charge,Total";
  const columnMap = { ...COLUMN_MAP, lineItems: ["Energy Charge", "Delivery Charge"], totalCharge: "Total" };
  const statementText = `${header}\n12345,2026-09-01,2026-09-30,300.00,80.00,40.00,10.00,60.00\n`;
  const [refusal] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reason, "statement-does-not-foot");
  assert.equal(refusal.declaredTotal, "60.00");
  assert.equal(refusal.summedTotal, "50");
});

test("accepts a row whose line items do foot against its declared total", () => {
  const header = "Account,From,To,kWh Used,kWh Generated,Energy Charge,Delivery Charge,Total";
  const columnMap = { ...COLUMN_MAP, lineItems: ["Energy Charge", "Delivery Charge"], totalCharge: "Total" };
  const statementText = `${header}\n12345,2026-08-01,2026-08-31,450.00,120.00,60.00,15.00,75.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(record.type, "HouseholdEnergyRecord");
});

test("normalizes MM/DD/YYYY dates to YYYY-MM-DD", () => {
  const statementText = `${CSV_HEADER}\n12345,08/01/2026,08/31/2026,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "MM/DD/YYYY", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(record.periodStart, "2026-08-01");
  assert.equal(record.periodEnd, "2026-08-31");
});

test("throws TypeError when columnMap names a header column the statement does not have", () => {
  assert.throws(
    () => importUtilityStatement({
      statementText: `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`,
      format: "csv",
      parserConfig: { utility: "Example Coop", columnMap: { ...COLUMN_MAP, kwhUsed: "Usage (kWh)" }, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
      tariff: TARIFF,
    }),
    TypeError,
  );
});
```
## Examples
```json name="imports a CSV row with a held-open meter mismatch"
{"input":{"statementText":"Account,From,To,kWh Used,kWh Generated\n12345,2026-08-01,2026-08-31,450.00,120.00\n","format":"csv","parserConfig":{"utility":"Example Coop","columnMap":{"householdId":"Account","periodStart":"From","periodEnd":"To","kwhUsed":"kWh Used","kwhGenerated":"kWh Generated"},"dateFormat":"YYYY-MM-DD","sourceUrl":"https://www.example-coop.coop/statement"},"tariff":{"utility":"Example Coop","rateScheduleName":"Residential","usdPerKwhTiers":[{"usdPerKwh":"0.1423"}],"sourceUrl":"https://www.example-coop.coop/rates","asOf":"2026-07-01"},"meterReadings":[{"date":"2026-08-31","kwh":"448.50"}]},"output":[{"type":"HouseholdEnergyRecord","version":1,"householdId":"12345","periodStart":"2026-08-01","periodEnd":"2026-08-31","kwhUsed":{"statementValue":"450.00","meterOrBankValue":"448.50","mismatch":true,"mismatchAmount":"1.5"},"kwhGenerated":{"statementValue":"120.00","meterOrBankValue":null,"mismatch":null,"mismatchAmount":null},"tariff":{"utility":"Example Coop","rateScheduleName":"Residential","usdPerKwhTiers":[{"usdPerKwh":"0.1423"}],"sourceUrl":"https://www.example-coop.coop/rates","asOf":"2026-07-01"}}]}
```
## Traceability
- `csv-and-text-formats` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `parser-config-as-data`
- `per-row-household-energy-record` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `parser-config-as-data`
- `two-witness-kwh-used` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `two-witness-discipline`, `primitives-exist-once`
- `optional-footing-check` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `date-normalization` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `parser-config-as-data`
- `no-per-utility-code` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `parser-config-as-data`
- `no-dropped-unparseable-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `two-witness-discipline`
- `no-silent-footing-failure` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `two-witness-discipline`
- `no-second-decimal-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
