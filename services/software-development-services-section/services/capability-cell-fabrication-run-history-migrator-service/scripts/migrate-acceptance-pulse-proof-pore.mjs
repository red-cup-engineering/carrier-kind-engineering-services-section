#!/usr/bin/env node
import { resolve } from "node:path";
import { migrateAcceptancePulseProofPore } from "../src/migrate-acceptance-pulse-proof-pore.mjs";

function one(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
function many(name) {
  return process.argv.flatMap((value, index) => value === name ? [process.argv[index + 1]] : []).filter(Boolean);
}
const subject = one("--subject"), targetRoot = one("--target-root"), receiptPath = one("--receipt");
const exchangePaths = many("--exchange");
if (![subject, targetRoot, receiptPath].every((value) => typeof value === "string" && value !== "") || exchangePaths.length === 0) {
  throw new Error("--subject, --target-root, --receipt, and one or more --exchange paths are required");
}
const receipt = migrateAcceptancePulseProofPore({
  subject,
  targetRoot: resolve(targetRoot),
  receiptPath: resolve(receiptPath),
  exchangePaths: exchangePaths.map((path) => resolve(path)),
  migratedAt: new Date().toISOString(),
});
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
