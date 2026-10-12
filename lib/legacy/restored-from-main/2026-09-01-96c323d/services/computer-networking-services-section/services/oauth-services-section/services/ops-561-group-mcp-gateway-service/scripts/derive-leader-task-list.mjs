#!/usr/bin/env node
/**
 * CLI effect wrapper over task-list.mjs's pure derivation: prints the ops.561.group v0 leader
 * task list, derived on demand from a records directory — never a handwritten task database
 * (owner ruling 2026-08-31 A2). Defaults to the PM custody's own `data/records/` (the same
 * source scripts/push-ops-data.sh syncs to cold-red-gate); pass an explicit directory, or set
 * OPS_DATA_DIR, to read a deployed control-plane's records tree instead.
 * @module
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { deriveLeaderTaskList, loadRoadmapRecords } from "../src/task-list.mjs";

/** Repo-relative path to the PM custody's records directory (mirrors scripts/push-ops-data.sh). */
const DEFAULT_PM_RECORDS_RELATIVE_PATH =
  "lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-enterprise-services-section/services/561-group-enterprise-project-management-services-section/data/records";

/**
 * The records directory this run should read: an explicit CLI argument, `OPS_DATA_DIR/records`,
 * or the repo's PM custody records path (resolved via `git rev-parse --show-toplevel`).
 * @param {readonly string[]} argv - positional CLI arguments (no flag parsing)
 * @param {NodeJS.ProcessEnv} env
 * @returns {string} absolute directory path
 */
export function resolveRecordsRoot(argv, env) {
  if (argv[0]) return resolve(argv[0]);
  if (env.OPS_DATA_DIR) return resolve(env.OPS_DATA_DIR, "records");
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  return resolve(repoRoot, DEFAULT_PM_RECORDS_RELATIVE_PATH);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recordsRoot = resolveRecordsRoot(process.argv.slice(2), process.env);
  const tasks = deriveLeaderTaskList(loadRoadmapRecords(recordsRoot));
  process.stdout.write(`${JSON.stringify({ recordsRoot, tasks }, null, 2)}\n`);
}
