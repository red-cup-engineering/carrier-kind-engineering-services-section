#!/usr/bin/env node
import { readLedgerReport } from "@red-cup-engineering/read-ledger-report-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

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
  const result = await runJavascriptNodeOperation({ name: "value-ledger-in-kilowatt-hours", description: "Reads a Beancount or hledger journal's valuation report at a cutoff date, in USD and, where the composed service reports in kilowatt-hours, in kilowatt-hours.", operation: valueLedgerInKilowattHours }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
