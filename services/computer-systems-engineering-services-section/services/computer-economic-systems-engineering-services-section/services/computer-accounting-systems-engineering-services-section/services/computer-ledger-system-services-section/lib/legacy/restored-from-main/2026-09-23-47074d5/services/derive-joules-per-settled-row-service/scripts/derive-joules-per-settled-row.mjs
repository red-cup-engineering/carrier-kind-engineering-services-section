#!/usr/bin/env node
import { addDecimalStrings, divideDecimalStrings, multiplyDecimalStrings } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { runJavascriptNodeOperation } from "../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";

const ASSET_FACTOR_KEYS = Object.freeze({
  "cpu-seconds": "cpuSecondsToJoules",
  "network-ingress-bytes": "byteToJoules",
  "network-egress-bytes": "byteToJoules",
});

function overlaps(row, receipt) {
  return receipt.intervalStart < row.intervalEnd && receipt.intervalEnd > row.intervalStart;
}

/**
 * Prices each settled row in the joules the house spent to settle it, over a declared
 * boundary, folding already-derived resource receipts by interval overlap.
 * @param {object} request A record with settledRows ({rowId, intervalStart, intervalEnd}[]),
 *   resourceReceipts (ResourceConsumedReceipt[]), conversionFactors ({cpuSecondsToJoules?,
 *   byteToJoules?}, each a DeclaredFactor {value, sourceUrl, asOf}), and boundary
 *   (("hosts"|"inference"|"signer")[]).
 * @returns {object} {receipts: SettledRowEnergyReceipt[], unmatchedRowIds: string[]}, or a
 *   no-conversion-factor-for-asset refusal datum.
 * @throws {TypeError} When settledRows, resourceReceipts, conversionFactors, or boundary is
 *   malformed.
 */
export function deriveJoulesPerSettledRow(request) {
  if (!Array.isArray(request?.settledRows)) throw new TypeError("settledRows must be an array");
  if (!Array.isArray(request?.resourceReceipts)) throw new TypeError("resourceReceipts must be an array");
  if (!request?.conversionFactors || typeof request.conversionFactors !== "object") {
    throw new TypeError("conversionFactors is required");
  }
  if (!Array.isArray(request?.boundary) || request.boundary.length === 0) {
    throw new TypeError("boundary must be a non-empty array");
  }
  const receipts = [];
  const unmatchedRowIds = [];
  for (const row of request.settledRows) {
    const matched = request.resourceReceipts.filter((receipt) => overlaps(row, receipt));
    if (matched.length === 0) {
      unmatchedRowIds.push(row.rowId);
      continue;
    }
    const contributions = [];
    for (const receipt of matched) {
      const asset = receipt.price.denomination.asset;
      const factorKey = ASSET_FACTOR_KEYS[asset];
      const factor = factorKey ? request.conversionFactors[factorKey] : undefined;
      if (!factor) {
        return { refused: true, reason: "no-conversion-factor-for-asset", asset };
      }
      const amount = divideDecimalStrings(receipt.price.amount.numerator, receipt.price.amount.denominator, 10);
      contributions.push(multiplyDecimalStrings(amount, factor.value, 10));
    }
    receipts.push({
      type: "SettledRowEnergyReceipt",
      version: 1,
      rowId: row.rowId,
      joules: addDecimalStrings(contributions),
      boundary: request.boundary,
      conversionFactors: request.conversionFactors,
      sourceReceipts: matched,
    });
  }
  return { receipts, unmatchedRowIds };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-joules-per-settled-row", description: "Prices each settled row in the joules the house spent to settle it, over a declared boundary, folding already-derived resource receipts by interval overlap.", operation: deriveJoulesPerSettledRow }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
