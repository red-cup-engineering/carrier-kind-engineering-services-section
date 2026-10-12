#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync as readInput } from "node:fs";
import { canonicalJson } from "../../../scripts/canonical-json.mjs";

/** The one currently admitted sequence-commitment profile.
 *
 * Each record is RFC 8785 canonical JSON encoded as UTF-8. Its item digest
 * is SHA-256 of those bytes; the rolling digest starts at the first item
 * digest and then hashes the preceding 32 digest bytes followed by the next
 * record's canonical bytes. The Merkle tree hashes adjacent item digests and
 * duplicates an odd final node at every level. */
export const JSONL_JCS_SHA256_SEQUENCE_V1 = "jsonl-jcs-sha256-sequence-v1";

export const inputSchema = Object.freeze({
  type: "object",
  required: ["records"],
  properties: {
    records: { type: "array" },
    profile: { const: JSONL_JCS_SHA256_SEQUENCE_V1 },
  },
  additionalProperties: false,
});

export const outputSchema = Object.freeze({
  type: "object",
  required: ["profile", "records", "entries", "rollingDigest", "merkleRoot"],
});

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  }
  return value;
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function supportedProfile(profile) {
  if (profile === undefined || profile === JSONL_JCS_SHA256_SEQUENCE_V1) {
    return JSONL_JCS_SHA256_SEQUENCE_V1;
  }
  throw new TypeError(`unsupported JSONL commitment profile: ${String(profile)}`);
}

function merkleRoot(digests) {
  if (digests.length === 0) return null;
  let level = digests.map((digest) => Buffer.from(digest, "hex"));
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      next.push(Buffer.from(sha256Hex(Buffer.concat([left, right])), "hex"));
    }
    level = next;
  }
  return level[0].toString("hex");
}

/** Commit an ordered sequence of JSON records without assigning it event meaning.
 * The returned canonical bytes and per-position digests are sufficient for an
 * independent verifier to identify the first divergent item. */
export function commitJsonlRecords({ records, profile } = {}) {
  if (!Array.isArray(records)) throw new TypeError("JSONL commitment records must be an array");
  const admittedProfile = supportedProfile(profile);
  let previousRollingBytes = null;
  const entries = records.map((record, index) => {
    const canonical = canonicalJson(record);
    const canonicalBytes = Buffer.from(canonical, "utf8");
    const digest = sha256Hex(canonicalBytes);
    const rollingDigest = previousRollingBytes === null
      ? digest
      : sha256Hex(Buffer.concat([previousRollingBytes, canonicalBytes]));
    previousRollingBytes = Buffer.from(rollingDigest, "hex");
    return { ordinal: index + 1, canonical, digest, rollingDigest };
  });
  return freeze({
    profile: admittedProfile,
    records: entries.length,
    entries,
    rollingDigest: entries.length === 0 ? null : entries.at(-1).rollingDigest,
    merkleRoot: merkleRoot(entries.map((entry) => entry.digest)),
  });
}

if (import.meta.main) {
  process.stdout.write(`${JSON.stringify(commitJsonlRecords(JSON.parse(readInput(0, "utf8"))))}\n`);
}
