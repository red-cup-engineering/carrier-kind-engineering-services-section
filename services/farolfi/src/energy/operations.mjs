/**
 * Physical-energy accounting for Metroplat operations and its configured book
 * of record.  This is an application integration: callers use it through the
 * Metroplat catalog, not through a separate ad-hoc command package.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readLedgerReport } from "@red-cup-engineering/farolfi/ledger/reports";
import { ledgerJournalPath } from "../ledger/operations.mjs";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u;
const FACTOR_FOR_ASSET = Object.freeze({
  "cpu-seconds": "cpuSecondsToJoules",
  "network-ingress-bytes": "byteToJoules",
  "network-egress-bytes": "byteToJoules",
});

export const energyPriceDirectiveRequestContract = schemaFrom({
  $id: "metroplat/energy/price-directives-request",
  type: "object", required: ["date", "electricity", "propane", "diesel"], additionalProperties: false,
  properties: { date: { type: "string" }, electricity: { type: "object" }, propane: { type: "object" }, diesel: { type: "object" } },
});

export const settlementEnergyRequestContract = schemaFrom({
  $id: "metroplat/energy/settlement-allocation-request",
  type: "object", required: ["settledRows", "resourceReceipts", "conversionFactors", "boundary"], additionalProperties: false,
  properties: { settledRows: { type: "array" }, resourceReceipts: { type: "array" }, conversionFactors: { type: "object" }, boundary: { type: "array", minItems: 1 } },
});

export const ledgerEnergyValuationRequestContract = schemaFrom({
  $id: "metroplat/energy/ledger-valuation-request",
  type: "object", required: ["asOf"], additionalProperties: false,
  properties: { asOf: { type: "string", minLength: 1 } },
});

function decimal(text) {
  const match = /^(-)?(?:(\d+)(?:\.(\d+))?|\.(\d+))$/u.exec(String(text).trim());
  if (match === null) throw new TypeError(`energy accounting: not a plain decimal ${JSON.stringify(text)}`);
  return { negative: match[1] === "-", whole: match[2] ?? "0", fraction: match[4] ?? match[3] ?? "" };
}

function scaled(value, scale) {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, "0");
  const whole = scale === 0 ? digits : digits.slice(0, -scale);
  const fraction = scale === 0 ? "" : digits.slice(-scale).replace(/0+$/u, "");
  const body = fraction === "" ? whole : `${whole}.${fraction}`;
  return negative && /[1-9]/u.test(body) ? `-${body}` : body;
}

function divide(leftText, rightText, places = 10) {
  const left = decimal(leftText);
  const right = decimal(rightText);
  const leftMagnitude = BigInt(`${left.whole}${left.fraction}`);
  const rightMagnitude = BigInt(`${right.whole}${right.fraction}`);
  if (rightMagnitude === 0n) throw new RangeError("energy accounting: cannot divide by zero");
  const numerator = leftMagnitude * 10n ** BigInt(right.fraction.length + places);
  const denominator = rightMagnitude * 10n ** BigInt(left.fraction.length);
  const quotient = numerator / denominator;
  return scaled(left.negative === right.negative ? quotient : -quotient, places);
}

function multiply(leftText, rightText, places = 10) {
  const left = decimal(leftText);
  const right = decimal(rightText);
  const magnitude = BigInt(`${left.whole}${left.fraction}`) * BigInt(`${right.whole}${right.fraction}`);
  const raw = scaled(left.negative === right.negative ? magnitude : -magnitude, left.fraction.length + right.fraction.length);
  const value = decimal(raw);
  const fraction = value.fraction.slice(0, places).replace(/0+$/u, "");
  return `${value.negative ? "-" : ""}${value.whole}${fraction === "" ? "" : `.${fraction}`}`;
}

function sum(values) {
  if (!Array.isArray(values) || values.length === 0) throw new RangeError("energy accounting: expected at least one value");
  const parsed = values.map(decimal);
  const scale = Math.max(...parsed.map((value) => value.fraction.length));
  return scaled(parsed.reduce((total, value) => {
    const magnitude = BigInt(`${value.whole}${value.fraction.padEnd(scale, "0")}`);
    return total + (value.negative ? -magnitude : magnitude);
  }, 0n), scale);
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`energy accounting: ${name} must be a non-empty string`);
  return value;
}

function requiredDate(value, name) {
  if (typeof value !== "string" || !DATE.test(value)) throw new TypeError(`energy accounting: ${name} must be YYYY-MM-DD`);
  return value;
}

function weeklyRows(seriesText, name) {
  const rows = String(seriesText).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).slice(1).map((line) => {
    const comma = line.indexOf(",");
    if (comma === -1) throw new TypeError(`energy accounting: ${name} row is not date,value`);
    const sourceDate = line.slice(0, comma).trim();
    const usDate = US_DATE.exec(sourceDate);
    const date = DATE.test(sourceDate) ? sourceDate : usDate === null ? undefined : `${usDate[3]}-${usDate[1].padStart(2, "0")}-${usDate[2].padStart(2, "0")}`;
    if (date === undefined) throw new TypeError(`energy accounting: ${name} has an invalid date`);
    const value = line.slice(comma + 1).trim();
    decimal(value);
    return { date, value };
  });
  return rows.sort((left, right) => left.date.localeCompare(right.date));
}

function renderPrice({ date, commodity, price, quote = "USD", metadata }) {
  const lines = [`${date} price ${commodity} ${price} ${quote}`];
  for (const [key, value] of Object.entries(metadata)) lines.push(`  ${key}: "${value}"`);
  return lines.join("\n");
}

function pricedCommodity({ commodity, date, usdPrice, sourceKind, sourceUrl, observedDate }) {
  const inversePrice = divide("1", usdPrice);
  const metadata = { source_kind: sourceKind, source_url: sourceUrl ?? "", observed_date: observedDate };
  return Object.freeze({
    commodity, usdPrice, inversePrice, sourceKind, sourceUrl: sourceUrl ?? null, observedDate,
    directive: renderPrice({ date, commodity, price: usdPrice, metadata }),
    inverseDirective: renderPrice({ date, commodity: "USD", price: inversePrice, quote: commodity, metadata: { ...metadata, inverse_of: commodity } }),
  });
}

/** Derive source-attributed KWH, propane, and diesel prices for the book of record. */
export function deriveEnergyPriceDirectives(input) {
  if (input === null || typeof input !== "object") throw new TypeError("energy accounting: request must be an object");
  const date = requiredDate(input.date, "date");
  const electricity = input.electricity;
  if (electricity === null || typeof electricity !== "object") throw new TypeError("energy accounting: electricity is required");
  const usdPerKwh = requiredString(electricity.usdPerKwh, "electricity.usdPerKwh"); decimal(usdPerKwh);
  const electricityUrl = requiredString(electricity.sourceUrl, "electricity.sourceUrl");
  const electricityAsOf = requiredDate(electricity.asOf, "electricity.asOf");
  const priced = [pricedCommodity({ commodity: "KWH", date, usdPrice: usdPerKwh, sourceKind: "declared", sourceUrl: electricityUrl, observedDate: electricityAsOf })];
  const unpriced = [];
  for (const [commodity, sourceName] of [["PROPANE_GAL", "propane"], ["DIESEL_GAL", "diesel"]]) {
    const source = input[sourceName];
    if (source === null || typeof source !== "object" || !["fetched-csv", "fixture"].includes(source.sourceKind)) throw new TypeError(`energy accounting: ${sourceName} must name a supported source`);
    if (source.sourceKind === "fetched-csv") requiredString(source.sourceUrl, `${sourceName}.sourceUrl`);
    if ("apiKey" in source) throw new TypeError(`energy accounting: ${sourceName}.apiKey is refused`);
    const latest = weeklyRows(requiredString(source.seriesText, `${sourceName}.seriesText`), sourceName).filter((row) => row.date <= date).at(-1);
    if (latest === undefined) unpriced.push(Object.freeze({ commodity, reason: `no weekly observation at or before ${date}` }));
    else priced.push(pricedCommodity({ commodity, date, usdPrice: latest.value, sourceKind: source.sourceKind, sourceUrl: source.sourceUrl ?? null, observedDate: latest.date }));
  }
  return Object.freeze({ type: "EnergyPriceDirectiveSet", version: 1, date, directiveCount: priced.length * 2, priced: Object.freeze(priced), unpriced: Object.freeze(unpriced) });
}

/** Attribute metered CPU/network receipts to every overlapping settlement row. */
export function allocateSettlementEnergy(input) {
  if (!Array.isArray(input?.settledRows) || !Array.isArray(input?.resourceReceipts)) throw new TypeError("energy accounting: settledRows and resourceReceipts must be arrays");
  if (input.conversionFactors === null || typeof input.conversionFactors !== "object" || !Array.isArray(input.boundary) || input.boundary.length === 0) throw new TypeError("energy accounting: conversionFactors and a non-empty boundary are required");
  const receipts = [];
  const unmatchedRowIds = [];
  for (const row of input.settledRows) {
    const matched = input.resourceReceipts.filter((receipt) => receipt.intervalStart < row.intervalEnd && receipt.intervalEnd > row.intervalStart);
    if (matched.length === 0) { unmatchedRowIds.push(row.rowId); continue; }
    const contributions = [];
    for (const receipt of matched) {
      const asset = receipt?.price?.denomination?.asset;
      const factorKey = FACTOR_FOR_ASSET[asset];
      const factor = factorKey === undefined ? undefined : input.conversionFactors[factorKey];
      if (factor === undefined) return Object.freeze({ refused: true, reason: "no-conversion-factor-for-asset", asset });
      contributions.push(multiply(divide(receipt.price.amount.numerator, receipt.price.amount.denominator), factor.value));
    }
    receipts.push(Object.freeze({ type: "SettledRowEnergyReceipt", version: 1, rowId: row.rowId, joules: sum(contributions), boundary: input.boundary, conversionFactors: input.conversionFactors, sourceReceipts: matched }));
  }
  return Object.freeze({ receipts: Object.freeze(receipts), unmatchedRowIds: Object.freeze(unmatchedRowIds) });
}

function unpricedCommodities(report) {
  return [...new Set((report.rows ?? []).filter((row) => row.marketPrice === null).map((row) => row.units?.grade).filter((grade) => typeof grade === "string"))];
}

/** Value Metroplat's configured book in USD and, when fully priced, KWH. */
export async function valueConfiguredLedgerInKwh(input) {
  const asOf = requiredDate(input?.asOf, "asOf");
  const journal = { path: ledgerJournalPath() };
  const usdValuation = await readLedgerReport({ journal, report: "valuation", end: asOf });
  const unpriced = unpricedCommodities(usdValuation);
  if (unpriced.length > 0) return Object.freeze({ refused: true, reason: "commodity-unpriced", commodity: unpriced[0], asOf });
  const candidate = await readLedgerReport({ journal, report: "valuation", end: asOf, reportingCommodity: "KWH" });
  return Object.freeze({ type: "KilowattHourValuation", version: 1, generatedAt: usdValuation.generatedAt, usdValuation, kwhValuation: candidate.reportingCommodity === "KWH" && unpricedCommodities(candidate).length === 0 ? candidate : null, unpricedCommodities: unpriced });
}

/** Metroplat's public, usable energy-accounting verbs. */
export function energyAccountingOperations() {
  return Object.freeze([
    operation({ verb: "energy-price-directives", inputFormat: "json", outputFormat: "json", domain: energyPriceDirectiveRequestContract, summary: "Derive source-attributed KWH, propane, and diesel price directives.", description: "Accepts declared tariff and recorded or fetched weekly series data; returns forward and inverse Beancount price directives without fetching or storing secrets.", run: deriveEnergyPriceDirectives }),
    operation({ verb: "settlement-energy-allocation", inputFormat: "json", outputFormat: "json", domain: settlementEnergyRequestContract, summary: "Allocate metered CPU and network energy to settlement rows.", description: "Overlapping resource receipts are converted using declared factors and returned as evidence-carrying joule receipts.", run: allocateSettlementEnergy }),
    operation({ verb: "ledger-energy-valuation", inputFormat: "json", outputFormat: "json", domain: ledgerEnergyValuationRequestContract, summary: "Value Metroplat's configured book of record in USD and KWH.", description: "Uses only METROPLAT_LEDGER_JOURNAL; callers cannot substitute a journal path or inline book.", run: valueConfiguredLedgerInKwh }),
  ]);
}
