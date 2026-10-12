#!/usr/bin/env node
// Usage: check-identity-vectors [--vectors <directory>]
//
// Recomputes every identity carried by the FARS conformance vectors through
// the JavaScript owner and compares it with the recorded ni: URI.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  identity,
  identityOfRecord,
} from "../../../../../../../../computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/flatfile-resource-graph-service/src/kernel/identity.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const section = resolve(here, "..");

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}
const vectorsDirectory = flag(
  "vectors",
  resolve(section, "lib", "conformance"),
);

let identityVectors;
let recordVectors;
try {
  identityVectors = JSON.parse(readFileSync(resolve(vectorsDirectory, "identity-vectors.json"), "utf8"));
  recordVectors = JSON.parse(readFileSync(resolve(vectorsDirectory, "record-vectors.json"), "utf8"));
} catch (error) {
  process.stderr.write(`refusal: unreadable vectors at ${vectorsDirectory}: ${error.message}\n`);
  process.exit(2);
}

const mismatches = [];
let checked = 0;
function compare(vector, value, compute = identity) {
  checked += 1;
  const computed = compute(value);
  if (computed !== vector.ni && computed !== vector.id) {
    mismatches.push({ vector: vector.name ?? vector.type, expected: vector.ni ?? vector.id, computed });
  }
}

for (const vector of identityVectors.vectors) compare(vector, vector.value);
for (const vector of identityVectors.recordVectors) compare(vector, vector.body, identityOfRecord);
for (const record of Object.values(recordVectors.support ?? {})) compare(record, record, identityOfRecord);
for (const vector of recordVectors.vectors) {
  compare({ name: `${vector.name}:valid`, id: vector.valid.id }, vector.valid, identityOfRecord);
}

process.stdout.write(
  `${JSON.stringify({ laws: [identityVectors.law, recordVectors.law], owner: "@red-cup-engineering/flatfile-resource-graph-service/kernel/identity", checked, mismatches }, null, 1)}\n`,
);
process.exit(mismatches.length === 0 ? 0 : 1);
