#!/usr/bin/env node
import { divideDecimalStrings, parseDecimal } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { renderPriceDirective } from "@red-cup-engineering/computer-ledger-system-services-section/src/beancount-render.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

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
  const result = await runJavascriptNodeOperation({ name: "derive-set-of-energy-price-directives", description: "Derives Beancount `price` directives, forward and inverse, for `KWH` (from a declared electricity tariff), `PROPANE_GAL`, and `DIESEL_GAL` (each from a weekly price series' latest row at or before `input.date`), so the main ledger can be valued in USD or in the named energy commodity; a weekly series with no row at or before `input.date` leaves that commodity unpriced rather than fabricating a price.", operation: deriveSetOfEnergyPriceDirectives }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
