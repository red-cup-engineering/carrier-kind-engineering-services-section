// seed-world — LAGOON's world-genesis seeder. LAGOON is the FAE root: the one seat licensed to
// hold world state (data/state/world.eavt), so this app — not any leaf section — is where the
// org's machines and platforms get constituted as the world's first born entities.
//
// Reads a dated {entities: [{kind, attributes}, ...]} record (measured facts, owned by whichever
// section recorded them — this script does not invent facts, only seeds them), and for each entry
// calls @red-cup-engineering/eavt's constituteEntity({kind, attributes, t}) with a deterministic t
// derived from the record's own measuredAt date plus the entry's index — so re-running this script
// against the same record always derives the same addresses (t feeds the genesis row's own
// content-address digest; see eavt's src/eavt.mjs constituteEntity/entityAddress derivation).
//
// Idempotent: before appending, reads the trace already on disk (torn-line tolerant) and skips any
// entry whose derived address already carries a genesis row (a=="constituted") there, so re-seeding
// the same record never duplicates rows.
//
// Run: node scripts/seed-world.mjs [recordPath] [tracePath]
//   recordPath defaults to the 561-group org-machines record (overridable by argv[0] or
//   SEED_WORLD_RECORD_PATH).
//   tracePath defaults to <this app>/data/state/world.eavt (overridable by argv[1] or
//   LAGOON_WORLD_TRACE_PATH).

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { constitute } from "@red-cup-engineering/eavt/constitute-entity";
import { appendEavtRow } from "@red-cup-engineering/eavt/append-eavt-row";
import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");

// Repo root: walk up from this file until a directory holding .git is found — no hardcoded
// absolute path, so this script works from any checkout location.
function findRepoRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("seed-world: could not find repo root (no .git above " + startDir + ")");
    dir = parent;
  }
}

const repoRoot = findRepoRoot(__dirname);

const DEFAULT_RECORD_PATH = path.join(
  repoRoot,
  "lib/emsenn/services/561-group/services/561-group-services-section/data/records/2026-08-30-org-machines.json",
);
const DEFAULT_TRACE_PATH = path.join(appRoot, "data/state/world.eavt");

const recordPath = process.argv[2] || process.env.SEED_WORLD_RECORD_PATH || DEFAULT_RECORD_PATH;
const tracePath = process.argv[3] || process.env.LAGOON_WORLD_TRACE_PATH || DEFAULT_TRACE_PATH;

function loadRecord(p) {
  const record = JSON.parse(readFileSync(p, "utf8"));
  if (!Array.isArray(record.entities)) {
    throw new TypeError(`seed-world: record at ${p} has no "entities" array`);
  }
  return record;
}

// Existing genesis addresses already on disk, so re-seeding never duplicates a genesis row. A
// missing trace file means an empty world so far — not an error.
function existingGenesisAddresses(p) {
  if (!existsSync(p)) return new Set();
  const rows = readEavtEntries({ path: p });
  const addresses = new Set();
  for (const row of rows) {
    if (row.a === "constituted") addresses.add(row.e);
  }
  return addresses;
}

function seed(recordPath, tracePath) {
  const record = loadRecord(recordPath);
  mkdirSync(path.dirname(tracePath), { recursive: true });
  const already = existingGenesisAddresses(tracePath);
  // t is deterministic across runs: the record's own measuredAt date (parsed once, as UTC
  // midnight — ECMA-262 ISO-date parsing, not wall-clock time) plus the entry's index. Same
  // record, same t per entry, every run.
  const baseT = Date.parse(record.measuredAt);
  if (Number.isNaN(baseT)) {
    throw new TypeError(`seed-world: record.measuredAt is not a parseable date: ${JSON.stringify(record.measuredAt)}`);
  }

  const results = [];
  record.entities.forEach((entry, index) => {
    const t = baseT + index;
    const { address, genesis: genesisRow } = constitute({ kind: entry.kind, attributes: entry.attributes, t });
    if (already.has(address)) {
      results.push({ address, skipped: true });
      return;
    }
    appendEavtRow({ path: tracePath, row: genesisRow });
    already.add(address);
    results.push({ address, skipped: false });
  });
  return results;
}

// Only run when invoked directly (so tests or other scripts can import `seed` without side effects).
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = seed(recordPath, tracePath);
  for (const { address, skipped } of results) {
    console.log(`${skipped ? "skip (already constituted)" : "constituted"}: ${address}`);
  }
}

export { seed, findRepoRoot };
