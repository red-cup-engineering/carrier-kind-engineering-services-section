#!/usr/bin/env node
import { addDecimalStrings, negateDecimalString, compareDecimalStrings } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

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
  const result = await runJavascriptNodeOperation({ name: "import-utility-statement", description: "Imports one utility statement's rows into `HouseholdEnergyRecord` rows, reconciling `kwhUsed` against a meter or bank row and holding any mismatch open, and refusing rather than dropping a row this section's declared `parserConfig` cannot resolve or foot.", operation: importUtilityStatement }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
