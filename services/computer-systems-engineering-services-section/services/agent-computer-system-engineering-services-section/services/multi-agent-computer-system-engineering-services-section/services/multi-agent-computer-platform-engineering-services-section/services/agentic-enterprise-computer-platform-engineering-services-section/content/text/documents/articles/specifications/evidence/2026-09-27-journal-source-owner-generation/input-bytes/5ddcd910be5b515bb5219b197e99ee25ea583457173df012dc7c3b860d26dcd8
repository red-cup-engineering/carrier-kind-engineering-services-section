#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import {
  JSONL_JCS_SHA256_SEQUENCE_V1,
  commitJsonlRecords,
} from "./commit-jsonl-records.mjs";

export const inputSchema = Object.freeze({
  type: "object",
  required: ["records", "commitment"],
  properties: { records: { type: "array" }, commitment: { type: "object" } },
  additionalProperties: false,
});
export const outputSchema = Object.freeze({ type: "object", required: ["ok", "records", "failure"] });

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  }
  return value;
}

function failed(code, message, ordinal = null) {
  return freeze({ ok: false, records: 0, failure: { code, message, ordinal } });
}

/** Recompute a JSONL commitment and name the first supplied commitment field
 * that differs. Verification reports mismatch; it does not silently repair it. */
export function verifyJsonlCommitment({ records, commitment } = {}) {
  if (!commitment || typeof commitment !== "object" || Array.isArray(commitment)) {
    return failed("invalid-commitment", "commitment must be an object");
  }
  if (commitment.profile !== JSONL_JCS_SHA256_SEQUENCE_V1) {
    return failed("unsupported-profile", "commitment profile is not supported");
  }
  let expected;
  try {
    expected = commitJsonlRecords({ records, profile: commitment.profile });
  } catch (error) {
    return failed("record-not-admitted", error instanceof Error ? error.message : "records are not admitted JSON values");
  }
  if (commitment.records !== expected.records) {
    return failed("record-count-mismatch", `expected ${expected.records} records, received ${String(commitment.records)}`);
  }
  if (!Array.isArray(commitment.entries)) return failed("invalid-entries", "commitment entries must be an array");
  for (const entry of expected.entries) {
    const supplied = commitment.entries[entry.ordinal - 1];
    if (!supplied || typeof supplied !== "object") return failed("missing-entry", "commitment entry is missing", entry.ordinal);
    for (const field of ["ordinal", "canonical", "digest", "rollingDigest"]) {
      if (supplied[field] !== entry[field]) {
        return failed(`${field}-mismatch`, `commitment ${field} differs at ordinal ${entry.ordinal}`, entry.ordinal);
      }
    }
  }
  if (commitment.entries.length !== expected.entries.length) return failed("entry-count-mismatch", "commitment has an unexpected entry count");
  for (const field of ["rollingDigest", "merkleRoot"]) {
    if (commitment[field] !== expected[field]) return failed(`${field}-mismatch`, `commitment ${field} differs`);
  }
  return freeze({ ok: true, records: expected.records, failure: null });
}

if (import.meta.main) {
  process.stdout.write(`${JSON.stringify(verifyJsonlCommitment(JSON.parse(readInput(0, "utf8"))))}\n`);
}
