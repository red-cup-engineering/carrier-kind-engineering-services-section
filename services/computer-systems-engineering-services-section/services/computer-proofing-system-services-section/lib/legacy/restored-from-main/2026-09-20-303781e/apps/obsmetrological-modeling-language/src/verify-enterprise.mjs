#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "AGENTS.md",
  "lib/ownership.json",
  "lib/management/roster.json",
  "content/offices/mathematical-library-steward.json",
  "content/services/pure-mathematics-development.json",
  "content/services/pure-mathematics-change-bundle-qualification.json",
  "lib/schemas/pure-mathematics-change-bundle.schema.json",
  "src/contract-change-bundle-qualification.mjs",
  "test/contract-change-bundle-qualification.test.mjs",
];
const failures = required.filter((path) => !existsSync(join(ROOT, path))).map((path) => `missing ${path}`);
for (const path of ["content/services/pure-mathematics-development.json", "content/services/pure-mathematics-change-bundle-qualification.json", "lib/schemas/pure-mathematics-change-bundle.schema.json"]) {
  try { JSON.parse(readFileSync(join(ROOT, path), "utf8")); }
  catch (error) { failures.push(`${path} is not valid JSON: ${error.message}`); }
}
const result = { enterprise: "oml", ok: failures.length === 0, failures };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
