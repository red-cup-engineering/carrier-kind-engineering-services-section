#!/usr/bin/env node
/**
 * Effect: run the whole-library Obsmetrologia theorem/axiom census Lean
 * meta program (`census-set-of-theorem-axioms.lean`) via `lake env lean`,
 * parse and aggregate its output, and write the dated record and rows
 * TSV to `data/records/`, never by hand-running the Lean program.
 * @module census-set-of-theorem-axioms
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { runCommand } from "./audit-set-of-theorems.mjs";
import { assembleCensusRecord, parseCensusRows } from "../src/theorem-census.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";
// friction (obsmetrological-services-section-node-import-migration, 2026-09-04):
// semiotic-eavt-services-section writes an append-only JSONL log under data/logs/, never
// an exact named path under data/records/ that other carriers already cite (e.g.
// <date>-theorem-axiom-census.json / -rows.tsv here). Kept as a house-file-services writer
// (not raw node:fs) of these two exact-path carriers until the journal grows that shape.

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
// The Lean meta program lives beside this wrapper since the science→engineering code
// migration; the former section-side `scripts/` seat no longer exists.
const DEFAULT_LEAN_SOURCE_PATH = projectFileUrlFilepath(new URL("./census-set-of-theorem-axioms.lean", import.meta.url).href);
const DEFAULT_OUT_DIR = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/data/records", import.meta.url).href);

/**
 * Parse argv into the die's options.
 *
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{outDir: string|undefined, date: string|undefined}}
 */
export function parseArgv(argv) {
  return { outDir: argument("--out-dir", argv), date: argument("--date", argv) };
}

/**
 * Today's date as `YYYY-MM-DD`, in UTC.
 *
 * @returns {string}
 */
export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Run the census: invoke `lake env lean <leanSourcePath>` in `packageRoot`
 * and parse its stdout into rows. Pure control flow over an injectable
 * `runCommand` so it is testable without Lean installed.
 *
 * @param {{packageRoot: string, leanSourcePath: string, runCommand: typeof runCommand}} options
 * @returns {Promise<Array<{name: string, axioms: string[]}>>} Rows, in the program's own (sorted) output order.
 * @throws {Error} `census-set-of-theorem-axioms-failed:<stderr>` on nonzero exit or zero rows.
 */
export async function runCensus({ packageRoot, leanSourcePath, runCommand: run }) {
  const result = await run("lake", ["env", "lean", leanSourcePath], { cwd: packageRoot });
  const rows = parseCensusRows(result.stdout);
  if (result.code !== 0 || rows.length === 0) {
    throw new Error(`census-set-of-theorem-axioms-failed:${result.stderr || result.stdout}`);
  }
  return rows;
}

/**
 * Render census rows back into the checked-in TSV shape (`name\taxioms`,
 * one row per line, comma-joined axioms, trailing newline).
 *
 * @param {Array<{name: string, axioms: string[]}>} rows
 * @returns {string}
 */
export function renderRowsTsv(rows) {
  return rows.map((row) => `${row.name}\t${row.axioms.join(",")}`).join("\n") + "\n";
}

async function main() {
  const { outDir: argvOutDir, date: argvDate } = parseArgv(process.argv.slice(2));
  const outDir = confinePath({ root: argvOutDir ?? DEFAULT_OUT_DIR }).path;
  const date = argvDate ?? todayStamp();
  const packageRoot = DEFAULT_PACKAGE_ROOT;
  const leanSourcePath = DEFAULT_LEAN_SOURCE_PATH;

  let rows;
  try {
    rows = await runCensus({ packageRoot, leanSourcePath, runCommand });
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }

  const record = assembleCensusRecord({
    checkedAt: new Date().toISOString(),
    packageRoot,
    leanSourcePath,
    rows,
  });

  const recordPath = `${outDir}/${date}-theorem-axiom-census.json`;
  const rowsPath = `${outDir}/${date}-theorem-axiom-census-rows.tsv`;
  await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  await writeFileText(rowsPath, renderRowsTsv(rows));

  process.stdout.write(`${JSON.stringify(record.summary, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
