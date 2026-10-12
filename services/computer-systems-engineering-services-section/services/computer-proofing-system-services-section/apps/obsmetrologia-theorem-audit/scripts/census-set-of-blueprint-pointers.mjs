#!/usr/bin/env node
/**
 * Effect: walk every `.tex` file under the Obsmetrologia blueprint's
 * `docs/blueprint/src/`, extract every `\lean{...}` pointer (label,
 * chapter file, `\leanok`/`\notready` status), check the union of their
 * names against the live, built Lean environment by generating a scratch
 * `.lean` file in a temp dir (`os.tmpdir()`, never inside the Lean
 * package -- the same discipline `audit-set-of-theorems.mjs` uses) and
 * running it via `lake env lean`, classify the results, and write the
 * dated record and rows TSV to the section's `data/records/`.
 * @module census-set-of-blueprint-pointers
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { runCommand } from "./audit-set-of-theorems.mjs";
import {
  assemblePointerCensusRecord,
  buildBlueprintScratchLeanSource,
  classifyRows,
  extractAllPointers,
  flattenPointerRows,
  parseBlueprintLeanOutput,
  renderPointerRowsTsv,
  uniquePointerNames,
} from "../src/blueprint-pointer-census.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
const DEFAULT_BLUEPRINT_SOURCE_ROOT = `${DEFAULT_PACKAGE_ROOT}/docs/blueprint/src`;
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
 * Read every `.tex` file under the blueprint source root into
 * `{path, text}` pairs, `path` relative to `blueprintSourceRoot`.
 *
 * @param {string} blueprintSourceRoot
 * @returns {Promise<Array<{path: string, text: string}>>} Sorted by `path`.
 */
export async function readBlueprintTexFiles(blueprintSourceRoot) {
  const walk = await walkPosixPaths({ root: blueprintSourceRoot, extensions: [".tex"] });
  const files = await Promise.all(
    walk.files
      .filter(({ kind }) => kind === "file")
      .map(async (file) => ({ path: file.path, text: await readFileText(`${blueprintSourceRoot}/${file.path}`) })),
  );
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * Run the classification query: write `buildBlueprintScratchLeanSource`'s
 * output to a scratch `.lean` file under a fresh `os.tmpdir()` directory,
 * run `lake env lean` on it in `packageRoot`, and parse the result. Pure
 * control flow over an injectable `runCommand` so it is testable without
 * Lean installed; the temp-file I/O itself is not injected (mirrors
 * `runTheoremAudit` in `audit-set-of-theorems.mjs`).
 *
 * @param {{names: string[], packageRoot: string, runCommand: typeof runCommand}} options
 * @returns {Promise<{stdout: string, leanByName: ReturnType<typeof parseBlueprintLeanOutput>}>}
 * @throws {Error} `census-set-of-blueprint-pointers-failed:<stderr>` on nonzero exit.
 */
export async function runBlueprintPointerQuery({ names, packageRoot, runCommand: run }) {
  const source = buildBlueprintScratchLeanSource({ names });
  const scratchDir = await mkdtemp(`${tmpdir()}/obsmetrologia-blueprint-pointer-census-`);
  const scratchPath = `${scratchDir}/BlueprintPointerCensus.lean`;
  try {
    await writeFile(scratchPath, source, { encoding: "utf8", mode: 0o600 });
    const result = await run("lake", ["env", "lean", scratchPath], { cwd: packageRoot });
    const leanByName = parseBlueprintLeanOutput(result.stdout);
    if (result.code !== 0 || leanByName.size === 0) {
      throw new Error(`census-set-of-blueprint-pointers-failed:${result.stderr || result.stdout}`);
    }
    return { stdout: result.stdout, leanByName };
  } finally {
    await rm(scratchDir, { recursive: true, force: true });
  }
}

async function main() {
  const { outDir: argvOutDir, date: argvDate } = parseArgv(process.argv.slice(2));
  const outDir = confinePath({ root: argvOutDir ?? DEFAULT_OUT_DIR }).path;
  const date = argvDate ?? todayStamp();
  const packageRoot = DEFAULT_PACKAGE_ROOT;
  const blueprintSourceRoot = DEFAULT_BLUEPRINT_SOURCE_ROOT;

  const files = await readBlueprintTexFiles(blueprintSourceRoot);
  const pointers = extractAllPointers(files);
  const rows = flattenPointerRows(pointers);
  const names = uniquePointerNames(rows);

  let leanByName;
  try {
    ({ leanByName } = await runBlueprintPointerQuery({ names, packageRoot, runCommand }));
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }

  const classifiedRows = classifyRows(rows, leanByName);
  const record = assemblePointerCensusRecord({
    checkedAt: new Date().toISOString(),
    packageRoot,
    blueprintSourceRoot,
    leanSourcePath: "scratch (generated per run, see src/blueprint-pointer-census.mjs#buildBlueprintScratchLeanSource)",
    pointers,
    rows: classifiedRows,
  });

  const recordPath = `${outDir}/${date}-blueprint-pointer-census.json`;
  const rowsPath = `${outDir}/${date}-blueprint-pointer-census-rows.tsv`;
  await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  await writeFileText(rowsPath, renderPointerRowsTsv(classifiedRows));

  process.stdout.write(`${JSON.stringify(record.summary, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
