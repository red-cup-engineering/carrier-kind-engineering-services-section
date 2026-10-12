# derive-joules-per-settled-row
## Requirements
- `joules-per-row-result`: For each settled row, the operation folds every already-derived resource receipt whose interval overlaps the row's own interval, converts each receipt's amount to joules through a declared conversion factor, and returns one `SettledRowEnergyReceipt` per matched row naming its joules total, the caller-declared boundary, the declared conversion factors, and the unchanged matched receipts as `sourceReceipts`.
- `unmatched-row-collection`: Rows with no overlapping resource receipt are collected separately into `unmatchedRowIds`, never silently dropped and never assigned a fabricated zero joules figure.
- `declared-conversion-factor-only`: Every joules figure is computed only from `conversionFactors` values the caller declared (each a `DeclaredFactor` with its own `value`, `sourceUrl`, and `asOf`), using the house's own exact decimal-string arithmetic, never a constant baked into the script and never a float.
## Prohibitions
- `no-invented-conversion-factor`: The operation must refuse as data, never invent or approximate, when a matched receipt's `price.denomination.asset` has no declared factor in `conversionFactors`.
- `no-invented-boundary-claim`: The operation must not add, remove, or infer a boundary class; it states exactly the `boundary` array the caller declared, on every row, and never silently prices a class the caller did not declare as if its cost were zero.
- `no-receipt-derivation`: The operation must not itself call `deriveSetOfUnitResourceReceipts` or otherwise derive resource receipts; `resourceReceipts` arrives already derived, and this operation stays a pure fold over it.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-joules-per-settled-row-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/computer-ledger-system-services-section":"0.4.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-joules-per-settled-row.mjs
#!/usr/bin/env node
import { addDecimalStrings, divideDecimalStrings, multiplyDecimalStrings } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

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
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveJoulesPerSettledRow — Prices each settled row in the joules the house spent to settle it, over a declared boundary, folding already-derived resource receipts by interval overlap.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(deriveJoulesPerSettledRow(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-joules-per-settled-row.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveJoulesPerSettledRow } from "../scripts/derive-joules-per-settled-row.mjs";

const conversionFactors = {
  cpuSecondsToJoules: { value: "65", sourceUrl: "https://example.org/tdp-note", asOf: "2026-09-01" },
  byteToJoules: { value: "0.0000001", sourceUrl: "https://example.org/network-energy-note", asOf: "2026-09-01" },
};

function cpuReceipt(intervalStart, intervalEnd, numerator, denominator) {
  return {
    type: "bare-cedar-fog.resource-metering/unit-resource-consumed",
    version: 1,
    host: "bare-cedar-fog",
    unit: "example.service",
    provider: "bare-cedar-fog",
    actor: "example.service",
    intervalStart,
    intervalEnd,
    derivedFrom: {},
    price: { denomination: { kind: "resource", asset: "cpu-seconds", unit: "second" }, amount: { numerator, denominator } },
  };
}

test("prices a matched row in joules from a declared cpu-seconds factor", () => {
  const result = deriveJoulesPerSettledRow({
    settledRows: [{ rowId: "row-1", intervalStart: "2026-09-05T00:00:00.000Z", intervalEnd: "2026-09-05T00:05:00.000Z" }],
    resourceReceipts: [cpuReceipt("2026-09-05T00:00:00.000Z", "2026-09-05T00:05:00.000Z", "2000000000", "1000000000")],
    conversionFactors,
    boundary: ["hosts"],
  });
  assert.equal(result.unmatchedRowIds.length, 0);
  assert.equal(result.receipts.length, 1);
  assert.equal(result.receipts[0].joules, "130");
  assert.deepEqual(result.receipts[0].boundary, ["hosts"]);
  assert.equal(result.receipts[0].sourceReceipts.length, 1);
});

test("collects a row with no overlapping receipt into unmatchedRowIds", () => {
  const result = deriveJoulesPerSettledRow({
    settledRows: [{ rowId: "row-2", intervalStart: "2026-09-05T00:00:00.000Z", intervalEnd: "2026-09-05T00:05:00.000Z" }],
    resourceReceipts: [cpuReceipt("2026-09-06T00:00:00.000Z", "2026-09-06T00:05:00.000Z", "2000000000", "1000000000")],
    conversionFactors,
    boundary: ["hosts"],
  });
  assert.deepEqual(result, { receipts: [], unmatchedRowIds: ["row-2"] });
});

test("refuses as data on an asset with no declared conversion factor, never inventing one", () => {
  const memoryReceipt = {
    ...cpuReceipt("2026-09-05T00:00:00.000Z", "2026-09-05T00:05:00.000Z", "500", "1"),
    price: { denomination: { kind: "resource", asset: "memory-peak-bytes", unit: "byte" }, amount: { numerator: "500", denominator: "1" } },
  };
  const result = deriveJoulesPerSettledRow({
    settledRows: [{ rowId: "row-3", intervalStart: "2026-09-05T00:00:00.000Z", intervalEnd: "2026-09-05T00:05:00.000Z" }],
    resourceReceipts: [memoryReceipt],
    conversionFactors,
    boundary: ["hosts"],
  });
  assert.deepEqual(result, { refused: true, reason: "no-conversion-factor-for-asset", asset: "memory-peak-bytes" });
});

test("refuses a missing boundary", () => {
  assert.throws(
    () => deriveJoulesPerSettledRow({ settledRows: [], resourceReceipts: [], conversionFactors }),
    /boundary must be a non-empty array/u,
  );
});
```
## Examples
```json name="prices a matched row from a declared cpu-seconds factor"
{"input":{"settledRows":[{"rowId":"row-1","intervalStart":"2026-09-05T00:00:00.000Z","intervalEnd":"2026-09-05T00:05:00.000Z"}],"resourceReceipts":[{"type":"bare-cedar-fog.resource-metering/unit-resource-consumed","version":1,"host":"bare-cedar-fog","unit":"example.service","provider":"bare-cedar-fog","actor":"example.service","intervalStart":"2026-09-05T00:00:00.000Z","intervalEnd":"2026-09-05T00:05:00.000Z","derivedFrom":{},"price":{"denomination":{"kind":"resource","asset":"cpu-seconds","unit":"second"},"amount":{"numerator":"2000000000","denominator":"1000000000"}}}],"conversionFactors":{"cpuSecondsToJoules":{"value":"65","sourceUrl":"https://example.org/tdp-note","asOf":"2026-09-01"},"byteToJoules":{"value":"0.0000001","sourceUrl":"https://example.org/network-energy-note","asOf":"2026-09-01"}},"boundary":["hosts"]},"output":{"receipts":[{"type":"SettledRowEnergyReceipt","version":1,"rowId":"row-1","joules":"130","boundary":["hosts"],"conversionFactors":{"cpuSecondsToJoules":{"value":"65","sourceUrl":"https://example.org/tdp-note","asOf":"2026-09-01"},"byteToJoules":{"value":"0.0000001","sourceUrl":"https://example.org/network-energy-note","asOf":"2026-09-01"}},"sourceReceipts":[{"type":"bare-cedar-fog.resource-metering/unit-resource-consumed","version":1,"host":"bare-cedar-fog","unit":"example.service","provider":"bare-cedar-fog","actor":"example.service","intervalStart":"2026-09-05T00:00:00.000Z","intervalEnd":"2026-09-05T00:05:00.000Z","derivedFrom":{},"price":{"denomination":{"kind":"resource","asset":"cpu-seconds","unit":"second"},"amount":{"numerator":"2000000000","denominator":"1000000000"}}}]}],"unmatchedRowIds":[]}}
```
```json name="refuses as data on an asset with no declared conversion factor"
{"input":{"settledRows":[{"rowId":"row-3","intervalStart":"2026-09-05T00:00:00.000Z","intervalEnd":"2026-09-05T00:05:00.000Z"}],"resourceReceipts":[{"type":"bare-cedar-fog.resource-metering/unit-resource-consumed","version":1,"host":"bare-cedar-fog","unit":"example.service","provider":"bare-cedar-fog","actor":"example.service","intervalStart":"2026-09-05T00:00:00.000Z","intervalEnd":"2026-09-05T00:05:00.000Z","derivedFrom":{},"price":{"denomination":{"kind":"resource","asset":"memory-peak-bytes","unit":"byte"},"amount":{"numerator":"500","denominator":"1"}}}],"conversionFactors":{"cpuSecondsToJoules":{"value":"65","sourceUrl":"https://example.org/tdp-note","asOf":"2026-09-01"},"byteToJoules":{"value":"0.0000001","sourceUrl":"https://example.org/network-energy-note","asOf":"2026-09-01"}},"boundary":["hosts"]},"output":{"refused":true,"reason":"no-conversion-factor-for-asset","asset":"memory-peak-bytes"}}
```
## Traceability
- `joules-per-row-result` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `unmatched-row-collection` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `declared-conversion-factor-only` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-invented-conversion-factor` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-invented-boundary-claim` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-receipt-derivation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
