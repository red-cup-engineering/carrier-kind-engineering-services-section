#!/usr/bin/env node
/**
 * Effect: run the whole-library Obsmetrologia certificate-shape census Lean
 * meta program (`census-set-of-certificate-shapes.lean`, beside this file)
 * via `lake env lean`, run the pure-JS static scan over every `.lean` file
 * under the package's `Obsmetrologia/`, parse and aggregate both into one
 * record, and write the dated record and combined rows TSV to the
 * section's `data/records/`, never by hand-running the Lean program or
 * hand-grepping the corpus. The record embeds the Lean source so its
 * dynamic half reproduces from the record alone.
 * @module census-set-of-certificate-shapes
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFile } from "node:fs/promises";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { runCommand } from "./audit-set-of-theorems.mjs";
import { readLeanFiles } from "./census-set-of-module-strata.mjs";
import {
  assembleCertificateShapeRecord,
  formatStaticRows,
  parseShapeRows,
  scanStaticFindings,
} from "../src/certificate-shape-census.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
const DEFAULT_LEAN_SOURCE_PATH = projectFileUrlFilepath(new URL("./census-set-of-certificate-shapes.lean", import.meta.url).href);
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
 * Run the dynamic half of the census: invoke `lake env lean <leanSourcePath>`
 * in `packageRoot` and parse its stdout into `{rows}`. Pure control flow
 * over an injectable `runCommand` so it is testable without Lean installed.
 *
 * @param {{packageRoot: string, leanSourcePath: string, runCommand: typeof runCommand}} options
 * @returns {Promise<{stdout: string, parsed: {rows: Array<object>}}>}
 * @throws {Error} `census-set-of-certificate-shapes-failed:<stderr>` on nonzero exit or zero rows.
 */
export async function runShapeCensus({ packageRoot, leanSourcePath, runCommand: run }) {
  const result = await run("lake", ["env", "lean", leanSourcePath], { cwd: packageRoot });
  const parsed = parseShapeRows(result.stdout);
  if (result.code !== 0 || parsed.rows.length === 0) {
    throw new Error(`census-set-of-certificate-shapes-failed:${result.stderr || result.stdout}`);
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
    ({ stdout, parsed } = await runShapeCensus({ packageRoot, leanSourcePath, runCommand }));
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }

  const files = await readLeanFiles(packageRoot);
  const staticFindings = scanStaticFindings(files);

  const leanSource = await readFile(leanSourcePath, "utf8");
  const record = assembleCertificateShapeRecord({
    checkedAt: new Date().toISOString(),
    packageRoot,
    leanSourcePath,
    leanSource,
    rows: parsed.rows,
    staticFindings,
  });

  const staticRowsText = formatStaticRows(staticFindings);
  const combinedRowsText = staticRowsText.length > 0 ? `${stdout.replace(/\n+$/, "")}\n${staticRowsText}\n` : stdout;

  const recordPath = `${outDir}/${date}-certificate-shape-census.json`;
  const rowsPath = `${outDir}/${date}-certificate-shape-census-rows.tsv`;
  await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  await writeFileText(rowsPath, combinedRowsText.endsWith("\n") ? combinedRowsText : `${combinedRowsText}\n`);

  process.stdout.write(`${JSON.stringify(record.summary, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
