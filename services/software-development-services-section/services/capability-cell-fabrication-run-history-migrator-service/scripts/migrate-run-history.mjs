#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { migrateFabricationRunHistory } from "../src/migrate-run-history.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const sourceRuns = option("--source-runs");
const targetRoot = option("--target-root");
const receiptPath = option("--receipt");
const stageLawMigrationsPath = option("--stage-law-migrations");
if (![sourceRuns, targetRoot, receiptPath].every((value) => typeof value === "string" && value !== "")) {
  throw new Error("--source-runs, --target-root, and --receipt are required");
}
const result = migrateFabricationRunHistory({
  sourceRuns: resolve(sourceRuns),
  targetRoot: resolve(targetRoot),
  receiptPath: resolve(receiptPath),
  migratedAt: new Date().toISOString(),
  ...(stageLawMigrationsPath ? {
    stageLawMigrations: JSON.parse(readFileSync(resolve(stageLawMigrationsPath), "utf8")),
  } : {}),
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
