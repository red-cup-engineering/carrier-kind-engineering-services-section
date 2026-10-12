#!/usr/bin/env node
import { canonicalizeJson } from "@red-cup-engineering/computer-data-engine/identity";
import { makeNiUriService } from "@red-cup-engineering/computer-data-engine/identity";
import { runJavascriptNodeOperation } from "../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";

const DECIMAL = /^-?[0-9]+(?:\.[0-9]+)?$/u;
const RECORD_FIELDS = ["kind", "period", "commodity", "quantity", "from", "to", "place", "witnesses", "price", "tariff"];

function decimalScale(text) {
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function decimalToBigInt(text, scale) {
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const paddedFrac = (fracPart + "0".repeat(scale)).slice(0, scale);
  const value = BigInt(`${intPart}${paddedFrac}`);
  return negative ? -value : value;
}

function bigIntToDecimal(value, scale) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const digits = abs.toString().padStart(scale + 1, "0");
  const intPart = digits.slice(0, digits.length - scale) || "0";
  const fracPart = scale > 0 ? digits.slice(digits.length - scale).replace(/0+$/u, "") : "";
  const text = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  return negative && text !== "0" ? `-${text}` : text;
}

function decimalAbsDiff(a, b) {
  const scale = Math.max(decimalScale(a), decimalScale(b));
  const diff = decimalToBigInt(a, scale) - decimalToBigInt(b, scale);
  return bigIntToDecimal(diff < 0n ? -diff : diff, scale);
}

function decimalLte(a, b) {
  const scale = Math.max(decimalScale(a), decimalScale(b));
  return decimalToBigInt(a, scale) <= decimalToBigInt(b, scale);
}

/**
 * Computes settlement and content identity for one energy-exchange record without settlement, composing @red-cup-engineering/computer-data-engine/identity's own `canonicalizeJson` and @red-cup-engineering/computer-data-engine/identity's own `makeNiUriService` for the whole canonicalization and digesting; never hashes or canonicalizes itself.
 * @param {object} request A record with `record` (an EnergyExchangeRecord carrying no `id` and no `settlement`, with a `witnesses` array of at least two entries) and an optional `tolerance` (a decimal string, default `"0"`, the maximum absolute difference between two witnesses of different kinds that still counts as agreement).
 * @returns {object} The same record fields with `settlement` computed from `witnesses` (two witnesses of the first two distinct kinds, by first appearance, agreeing within `tolerance` settle it at the later of their two `asOf` timestamps; disagreeing beyond `tolerance` is a declared `mismatch` naming the exact decimal difference; fewer than two distinct witness kinds leaves it `posted`) and `id` set to the RFC 6920 sha-256 `ni:` URI of the RFC 8785 canonical JSON of those same fields plus the computed `settlement`, with `id` itself excluded from what is hashed.
 * @throws {TypeError} When `record` is not an object, already carries `id` or `settlement`, carries fewer than two witnesses, or `tolerance` is not a decimal string.
 */
export function settleEnergyExchangeRecord(request) {
  const record = request?.record;
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new TypeError("record is required");
  if ("id" in record) throw new TypeError("record must not already carry id");
  if ("settlement" in record) throw new TypeError("record must not already carry settlement");
  if (!Array.isArray(record.witnesses) || record.witnesses.length < 2) throw new TypeError("record.witnesses must carry at least two entries");
  const tolerance = request.tolerance === undefined ? "0" : request.tolerance;
  if (typeof tolerance !== "string" || !DECIMAL.test(tolerance)) throw new TypeError("tolerance must be a decimal string");

  const firstByKind = new Map();
  for (const witness of record.witnesses) {
    if (!firstByKind.has(witness.kind)) firstByKind.set(witness.kind, witness);
  }
  const distinctKinds = [...firstByKind.keys()];

  let settlement;
  if (distinctKinds.length < 2) {
    settlement = { status: "posted", mismatch: null, settledAt: null };
  } else {
    const witnessA = firstByKind.get(distinctKinds[0]);
    const witnessB = firstByKind.get(distinctKinds[1]);
    const diff = decimalAbsDiff(witnessA.value, witnessB.value);
    const settledAt = witnessA.asOf > witnessB.asOf ? witnessA.asOf : witnessB.asOf;
    settlement = decimalLte(diff, tolerance)
      ? { status: "settled", mismatch: null, settledAt }
      : { status: "mismatch", mismatch: diff, settledAt: null };
  }

  const settledFields = {};
  for (const field of RECORD_FIELDS) if (field in record) settledFields[field] = record[field];
  settledFields.settlement = settlement;

  const { text } = canonicalizeJson({ value: settledFields });
  const { uri } = makeNiUriService({ text });

  return { id: uri, ...settledFields };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "settle-energy-exchange-record", description: "Computes settlement and content identity for one energy-exchange record without settlement, composing", operation: settleEnergyExchangeRecord }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
