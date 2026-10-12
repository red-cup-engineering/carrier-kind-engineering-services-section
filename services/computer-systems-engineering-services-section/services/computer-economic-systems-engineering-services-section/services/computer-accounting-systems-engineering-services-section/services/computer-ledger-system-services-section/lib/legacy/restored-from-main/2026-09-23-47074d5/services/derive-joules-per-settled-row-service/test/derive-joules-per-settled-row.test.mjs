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
