#!/usr/bin/env node
// push-ops-data — pushes ops.561.group's OPS_DATA_DIR content (world.eavt + records/ + ledgers/)
// to cold-red-gate: LAGOON's world.eavt, the newest *goal-stack-roadmap.json under the PM records
// custody, the 561-group org-machines record, and the whole 561-group-services-section ledgers
// directory (the main ledger plus its glob-included *.beancount sidecars). This package's routes
// (/world, /records, /books) only ever READ that directory; this is the one place that writes
// it — any session may run it.
// Usage: node scripts/push-ops-data.mjs [--apply]   (default: dry run)

import { existsSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBusinessCatalogSources } from "@red-cup-engineering/computer-business-systems-engineering-services-section/read-business-catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`push-ops-data: could not find repo root (no .git above ${startDir})`);
    dir = parent;
  }
}

const repoRoot = findRepoRoot(__dirname);

const DEFAULT_LAGOON_WORLD_EAVT = path.join(
  repoRoot,
  "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/apps/lagoon/data/state/world.eavt",
);
const DEFAULT_GOAL_STACK_ROADMAP_DIR = path.join(
  repoRoot,
  "lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-enterprise-services-section/services/561-group-enterprise-project-management-services-section/data/records",
);
const DEFAULT_ORG_MACHINES = path.join(repoRoot, "lib/emsenn/services/561-group/services/561-group-services-section/data/records/2026-08-30-org-machines.json");
const DEFAULT_LEDGERS_DIR = path.join(repoRoot, "lib/emsenn/services/561-group/services/561-group-services-section/data/logs/ledgers");
const DEFAULT_DEST_HOST = "cold-red-gate";
const DEFAULT_DEST_DIR = "~/.local/state/561-group/ops-561-group-mcp-gateway/data";

/**
 * The newest `*goal-stack-roadmap.json` file directly under `dir`, by filename — the PM records
 * custody names these dated/timestamped, so lexical sort order is chronological order.
 *
 * @param {string} dir A directory of `*.json` records (PM records custody).
 * @returns {string} The absolute path to the newest matching file.
 * @throws {Error} When no file in `dir` matches `*goal-stack-roadmap.json`.
 */
export function newestGoalStackRoadmap(dir) {
  const matches = readdirSync(dir).filter((name) => name.endsWith("goal-stack-roadmap.json")).sort();
  if (matches.length === 0) throw new Error(`push-ops-data: no *goal-stack-roadmap.json found under ${dir}`);
  return path.join(dir, matches[matches.length - 1]);
}

/**
 * Builds the push plan: every source file/directory this script reads, and where each lands
 * under the destination data directory. Verifies every source exists before returning.
 *
 * @param {{worldEavt?: string, goalStackRoadmapDir?: string, orgMachines?: string,
 *   ledgersDir?: string, destHost?: string, destDir?: string}} [opts] Overridable for tests;
 *   defaults are the real repo-relative sources and the real cold-red-gate destination.
 * @returns {{worldEavt: string, goalStackRoadmap: string, orgMachines: string, ledgersDir: string,
 *   destHost: string, destDir: string}} The resolved, existence-verified push plan.
 * @throws {Error} When a source file/directory is missing, or no goal-stack roadmap record is found.
 */
export function plan({
  worldEavt = DEFAULT_LAGOON_WORLD_EAVT,
  goalStackRoadmapDir = DEFAULT_GOAL_STACK_ROADMAP_DIR,
  orgMachines = DEFAULT_ORG_MACHINES,
  ledgersDir = DEFAULT_LEDGERS_DIR,
  destHost = DEFAULT_DEST_HOST,
  destDir = DEFAULT_DEST_DIR,
} = {}) {
  const goalStackRoadmap = newestGoalStackRoadmap(goalStackRoadmapDir);
  for (const f of [worldEavt, goalStackRoadmap, orgMachines, ledgersDir]) {
    if (!existsSync(f)) throw new Error(`push-ops-data: missing source file: ${f}`);
  }
  return { worldEavt, goalStackRoadmap, orgMachines, ledgersDir, destHost, destDir };
}

/**
 * The rsync argv lists one push plan compiles to (world.eavt as its own transfer, the two record
 * files together into `records/`, and the ledgers directory's `*.beancount` files into
 * `ledgers/`), with `--dry-run` appended unless `apply` is true.
 *
 * @param {{worldEavt: string, goalStackRoadmap: string, orgMachines: string, ledgersDir: string,
 *   destHost: string, destDir: string}} pushPlan From plan().
 * @param {{apply?: boolean}} [opts] apply (default false) omits `--dry-run`.
 * @returns {string[][]} Three rsync argv lists, in the order they should run.
 */
export function rsyncInvocations(pushPlan, { apply = false, businessesOnly = false } = {}) {
  const rsyncOpts = ["-av", "-e", "ssh -o BatchMode=yes -o ConnectTimeout=8", ...(apply ? [] : ["--dry-run"])];
  const businessTransfer = pushPlan.businessCatalog === undefined ? [] : [
    [...rsyncOpts, pushPlan.businessCatalog, `${pushPlan.destHost}:${pushPlan.destDir}/records/business-catalog.json`],
  ];
  if (businessesOnly) {
    if (businessTransfer.length === 0) throw new TypeError("businessCatalog is required for businessesOnly");
    return businessTransfer;
  }
  const ledgersSource = pushPlan.ledgersDir.endsWith("/") ? pushPlan.ledgersDir : `${pushPlan.ledgersDir}/`;
  return [
    [...rsyncOpts, pushPlan.worldEavt, `${pushPlan.destHost}:${pushPlan.destDir}/world.eavt`],
    [...rsyncOpts, pushPlan.goalStackRoadmap, pushPlan.orgMachines, `${pushPlan.destHost}:${pushPlan.destDir}/records/`],
    [...rsyncOpts, "--include=*.beancount", "--exclude=*", ledgersSource, `${pushPlan.destHost}:${pushPlan.destDir}/ledgers/`],
    ...businessTransfer,
  ];
}

/**
 * Runs (or dry-runs) one push plan's rsync transfers, in order.
 *
 * @param {{worldEavt: string, goalStackRoadmap: string, orgMachines: string, ledgersDir: string,
 *   destHost: string, destDir: string}} pushPlan From plan().
 * @param {{apply?: boolean, runArgs?: (args: string[]) => void}} [opts] runArgs (default: a real
 *   `rsync` child process, 60s timeout) is overridable so tests never shell out for real.
 * @returns {string[][]} The rsync argv lists actually run, in order.
 */
export function push(pushPlan, { apply = false, businessesOnly = false, runArgs = (args) => execFileSync("rsync", args, { stdio: "inherit", timeout: 60_000 }) } = {}) {
  const invocations = rsyncInvocations(pushPlan, { apply, businessesOnly });
  for (const args of invocations) runArgs(args);
  return invocations;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const apply = process.argv.includes("--apply");
  const businessesOnly = process.argv.includes("--businesses-only");
  const scratch = mkdtempSync(path.join(tmpdir(), "ops-business-sources-"));
  try {
    const businessCatalog = path.join(scratch, "business-catalog.json");
    const sources = await readBusinessCatalogSources({ root: repoRoot });
    writeFileSync(businessCatalog, JSON.stringify(sources));
    const pushPlan = {
      ...(businessesOnly ? { destHost: DEFAULT_DEST_HOST, destDir: DEFAULT_DEST_DIR } : plan()),
      businessCatalog,
    };
    console.log(JSON.stringify({ apply, businessesOnly, records: sources.records.length, truncated: sources.scan.truncated, findings: sources.scan.findings.length }));
    push(pushPlan, { apply, businessesOnly });
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
