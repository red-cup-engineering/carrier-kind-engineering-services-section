#!/usr/bin/env node
/**
 * Effect: run the whole-library Obsmetrologia spine-lineage census Lean
 * meta program (`census-set-of-spine-lineage.lean`, beside this file) via
 * `lake env lean`, parse and aggregate its output, and write the dated
 * record and rows TSV to the section's `data/records/`, never by
 * hand-running the Lean program. The record embeds the Lean source so it
 * reproduces from the record alone.
 * @module census-set-of-spine-lineage
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFile } from "node:fs/promises";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { runCommand } from "./audit-set-of-theorems.mjs";
import { assembleSpineRecord, parseSpineRows } from "../src/spine-lineage-census.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
const DEFAULT_LEAN_SOURCE_PATH = projectFileUrlFilepath(new URL("./census-set-of-spine-lineage.lean", import.meta.url).href);
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
 * and parse its stdout into `{rows}`. Pure control flow over an
 * injectable `runCommand` so it is testable without Lean installed.
 *
 * @param {{packageRoot: string, leanSourcePath: string, runCommand: typeof runCommand}} options
 * @returns {Promise<{stdout: string, parsed: {rows: Array<object>}}>}
 * @throws {Error} `census-set-of-spine-lineage-failed:<stderr>` on nonzero exit or zero rows.
 */
export async function runSpineCensus({ packageRoot, leanSourcePath, runCommand: run }) {
  const result = await run("lake", ["env", "lean", leanSourcePath], { cwd: packageRoot });
  const parsed = parseSpineRows(result.stdout);
  if (result.code !== 0 || parsed.rows.length === 0) {
    throw new Error(`census-set-of-spine-lineage-failed:${result.stderr || result.stdout}`);
  }
  return { stdout: result.stdout, parsed };
}

async function main() {
  const { outDir: argvOutDir, date: argvDate } = parseArgv(process.argv.slice(2));
  const outDir = confinePath({ root: argvOutDir ?? DEFAULT_OUT_DIR }).path;
  const date = argvDate ?? todayStamp();
  const packageRoot = DEFAULT_PACKAGE_ROOT;
  const leanSourcePath = DEFAULT_LEAN_SOURCE_PATH;

  let stdout;
  let parsed;
  try {
    ({ stdout, parsed } = await runSpineCensus({ packageRoot, leanSourcePath, runCommand }));
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }

  const leanSource = await readFile(leanSourcePath, "utf8");
  const record = assembleSpineRecord({
    checkedAt: new Date().toISOString(),
    packageRoot,
    leanSourcePath,
    leanSource,
    parsed,
  });

  const recordPath = `${outDir}/${date}-spine-lineage-census.json`;
  const rowsPath = `${outDir}/${date}-spine-lineage-census-rows.tsv`;
  await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  await writeFileText(rowsPath, stdout.endsWith("\n") ? stdout : `${stdout}\n`);

  process.stdout.write(`${JSON.stringify(record.summary, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
