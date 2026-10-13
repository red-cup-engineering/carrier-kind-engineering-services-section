import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { decimalOfRational, rationalOfDecimal, terminatingPlaces } from "@red-cup-engineering/exact-number-data-service/decimal-string";
import { rationalOfBigInts, ratAdd, ratMultiply, ratSign, ratZero } from "@red-cup-engineering/exact-number-data-service/exact-number";

const FACTOR_FOR_ASSET = Object.freeze({
  "cpu-seconds": "cpuSecondsToJoules",
  "network-ingress-bytes": "byteToJoules",
  "network-egress-bytes": "byteToJoules",
});

const UNIT_FOR_ASSET = Object.freeze({
  "cpu-seconds": "second",
  "network-ingress-bytes": "byte",
  "network-egress-bytes": "byte",
});

function resourceQuantity(receipt) {
  const { numerator, denominator } = receipt?.price?.amount ?? {};
  if (typeof numerator !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(numerator)
    || typeof denominator !== "string" || !/^[1-9][0-9]*$/u.test(denominator)) {
    throw new TypeError("energy accounting: resource amount requires nonnegative canonical integer numerator and positive denominator");
  }
  return rationalOfBigInts(BigInt(numerator), BigInt(denominator));
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`energy accounting: ${name} must be a non-empty string`);
  return value;
}

function meteringInterval(value, name) {
  for (const endpoint of [value?.intervalStart, value?.intervalEnd]) {
    const stamp = typeof endpoint === "string"
      ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d+))?(?:Z|[+-]\d{2}:\d{2})$/u.exec(endpoint) : null;
    if (stamp === null || /[1-9]/u.test(stamp[1]?.slice(3) ?? "")) {
      throw new TypeError(`energy accounting: ${name} requires explicit dated instants representable at millisecond precision`);
    }
  }
  const start = typeof value?.intervalStart === "string" ? Date.parse(value.intervalStart) : NaN;
  const end = typeof value?.intervalEnd === "string" ? Date.parse(value.intervalEnd) : NaN;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start) {
    throw new TypeError(`energy accounting: ${name} requires one positive dated interval`);
  }
  return { start, end };
}

/** Attribute complete CPU/network meter intervals once. An overlap alone does
 * not locate consumption within a receipt, authorize prorating, or establish
 * causal ownership. Retain unresolved source witnesses rather than double book
 * them or infer zero. A row's declared actor/unit must agree with its meter. */
export function allocateSettlementEnergy(input) {
  if (!Array.isArray(input?.settledRows) || !Array.isArray(input?.resourceReceipts)) throw new TypeError("energy accounting: settledRows and resourceReceipts must be arrays");
  if (input.conversionFactors === null || typeof input.conversionFactors !== "object" || !Array.isArray(input.boundary) || input.boundary.length === 0) throw new TypeError("energy accounting: conversionFactors and a non-empty boundary are required");
  const rowIds = new Set();
  const rows = input.settledRows.map((row, index) => {
    requiredString(row?.rowId, `settledRows[${index}].rowId`);
    if (rowIds.has(row.rowId)) throw new TypeError("energy accounting: settlement row identities must be unique");
    rowIds.add(row.rowId);
    return { row, ...meteringInterval(row, `settledRows[${index}]`) };
  });
  const attributed = new Map(rows.map(({ row }) => [row.rowId, []]));
  const witnesses = new Set();
  for (const [index, receipt] of input.resourceReceipts.entries()) {
    const interval = meteringInterval(receipt, `resourceReceipts[${index}]`);
    // Metering and settlement intervals are half open: an adjacent endpoint
    // shares no consumption. Compare actual instants rather than ISO text.
    const overlaps = rows.filter(({ start, end }) => interval.start < end && interval.end > start);
    if (overlaps.length === 0) continue;
    const refusal = (reason) => Object.freeze({ refused: true, reason,
      rowIds: Object.freeze(overlaps.map(({ row }) => row.rowId)), sourceReceipts: Object.freeze([receipt]) });
    if (overlaps.length !== 1) return refusal("resource-attribution-ambiguous");
    const [{ row, start, end }] = overlaps;
    if (interval.start < start || interval.end > end) return refusal("resource-interval-not-contained");
    if (["actor", "unit"].some((field) => row[field] !== undefined && row[field] !== receipt[field])) {
      return refusal("resource-owner-disagreement");
    }
    const witness = canonicalJson(receipt);
    if (witnesses.has(witness)) return refusal("duplicate-resource-receipt");
    witnesses.add(witness);
    attributed.get(row.rowId).push(receipt);
  }
  const receipts = [];
  const unmatchedRowIds = [];
  for (const { row } of rows) {
    const matched = attributed.get(row.rowId);
    if (matched.length === 0) { unmatchedRowIds.push(row.rowId); continue; }
    let joulesExact = ratZero;
    for (const receipt of matched) {
      const denomination = receipt?.price?.denomination;
      const asset = denomination?.asset;
      const factorKey = FACTOR_FOR_ASSET[asset];
      const factor = factorKey === undefined ? undefined : input.conversionFactors[factorKey];
      if (factor === undefined) return Object.freeze({ refused: true, reason: "no-conversion-factor-for-asset", asset });
      if ((denomination.kind !== undefined && denomination.kind !== "resource")
        || (denomination.unit !== undefined && denomination.unit !== UNIT_FOR_ASSET[asset])) {
        return Object.freeze({ refused: true, reason: "resource-denomination-disagreement", asset, sourceReceipts: Object.freeze([receipt]) });
      }
      if (typeof factor?.value !== "string") throw new TypeError("energy accounting: conversion factor must be a nonnegative decimal string");
      const conversion = rationalOfDecimal(factor.value);
      if (ratSign(conversion) < 0) throw new TypeError("energy accounting: conversion factor must be a nonnegative decimal string");
      // Composition takes place in the upstream exact rational carrier. A
      // decimal projection at each receipt loses positive usage and violates
      // conservation under partitioning; render only the complete total.
      joulesExact = ratAdd(joulesExact, ratMultiply(resourceQuantity(receipt), conversion));
    }
    const places = terminatingPlaces(joulesExact);
    const joules = decimalOfRational(joulesExact, places ?? 10, { rounding: "toward-zero" });
    receipts.push(Object.freeze({ type: "SettledRowEnergyReceipt", version: 1, rowId: row.rowId,
      joules, joulesExact, joulesRounding: places === null ? "toward-zero" : "exact",
      boundary: input.boundary, conversionFactors: input.conversionFactors, sourceReceipts: matched }));
  }
  return Object.freeze({ receipts: Object.freeze(receipts), unmatchedRowIds: Object.freeze(unmatchedRowIds) });
}


