#!/usr/bin/env node
/**
 * Effect: gate the whole-library Obsmetrologia axiom law (a house theorem
 * may rest on `Quot.sound` alone) over `runCensus`'s theorem/axiom rows
 * (`census-set-of-theorem-axioms.mjs`, itself over
 * `census-set-of-theorem-axioms.lean` via `lake env lean`), ratchet the
 * violation-count baseline recorded at `data/records/axiom-law-gate-records/axiom-law-baseline.json`,
 * write the dated gate record to `data/records/`, and exit nonzero on a
 * regression. Frontier (`sorryAx`) theorems are counted in the record, not failed.
 * @module gate-axiom-law
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { assembleGateRecord, decideBaselineUpdate, decideGate, summarizeAxiomLaw } from "../src/axiom-law-gate.mjs";
import { parseCensusRows } from "../src/theorem-census.mjs";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
// No new Lean program: this gate reuses the theorem/axiom census program already
// beside it in scripts/.
const DEFAULT_LEAN_SOURCE_PATH = projectFileUrlFilepath(new URL("./census-set-of-theorem-axioms.lean", import.meta.url).href);
const DEFAULT_OUT_DIR = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/data/records", import.meta.url).href);
const BASELINE_FILE_NAME = "axiom-law-baseline.json";

function argument(name, argumentVector) {
  const index = argumentVector.indexOf(name);
  return index === -1 ? undefined : argumentVector[index + 1];
}

function isMain(moduleUrl, entry = process.argv[1]) {
  return Boolean(entry) && projectFileUrlFilepath(moduleUrl) === resolve(entry);
}

async function readFileText(path) {
  return readFile(path, "utf8");
}

function runCommand(command, args, { cwd }) {
  return new Promise((complete) => {
    execFile(command, args, { cwd, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      complete({ code: error ? (error.code ?? 1) : 0, stdout, stderr });
    });
  });
}

async function runCensus({ packageRoot, leanSourcePath, runCommand: run }) {
  const result = await run("lake", ["env", "lean", leanSourcePath], { cwd: packageRoot });
  const rows = parseCensusRows(result.stdout);
  if (result.code !== 0 || rows.length === 0) {
    throw new Error(`census-set-of-theorem-axioms-failed:${result.stderr || result.stdout}`);
  }
  return rows;
}

/**
 * Parse argv into the die's options.
 *
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{outDir: string|undefined, date: string|undefined, init: boolean, ratchet: boolean}}
 */
export function parseArgv(argv) {
  return {
    outDir: argument("--out-dir", argv),
    date: argument("--date", argv),
    init: argv.includes("--init"),
    ratchet: argv.includes("--ratchet"),
  };
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
 * Read the baseline's recorded violation count. Pure over an injectable
 * `readText`; a missing file (`ENOENT`) reads as "no baseline yet",
 * every other read failure propagates.
 *
 * @param {() => Promise<string>} readText
 * @returns {Promise<number|null>}
 */
export async function readBaselineViolations(readText) {
  let text;
  try {
    text = await readText();
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
  const parsed = JSON.parse(text);
  return typeof parsed.violations === "number" ? parsed.violations : null;
}

/**
 * Run the gate end to end: census the theorem/axiom rows, summarize
 * against the axiom law, read the recorded baseline, decide (and, when
 * called for, perform) the baseline update, then decide the gate's
 * pass/fail outcome against the resulting baseline. Pure control flow
 * over injectable I/O so it is testable without Lean or the filesystem.
 *
 * @param {{
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   runCommand: typeof runCommand,
 *   readBaselineText: () => Promise<string>,
 *   writeBaselineText: (text: string) => Promise<void>,
 *   init?: boolean,
 *   ratchet?: boolean,
 *   now?: () => string,
 * }} options
 * @returns {Promise<{
 *   rows: Array<{name: string, axioms: string[]}>,
 *   summary: ReturnType<typeof summarizeAxiomLaw>,
 *   baseline: number|null,
 *   baselineUpdate: ReturnType<typeof decideBaselineUpdate>,
 *   gate: ReturnType<typeof decideGate>,
 * }>}
 */
export async function runAxiomLawGate({
  packageRoot,
  leanSourcePath,
  runCommand: run,
  readBaselineText,
  writeBaselineText,
  init = false,
  ratchet = false,
  now = () => new Date().toISOString(),
}) {
  const rows = await runCensus({ packageRoot, leanSourcePath, runCommand: run });
  const summary = summarizeAxiomLaw(rows);

  const existing = await readBaselineViolations(readBaselineText);
  const baselineUpdate = decideBaselineUpdate({ existing, violations: summary.violations, init, ratchet });
  if (baselineUpdate.write) {
    await writeBaselineText(`${JSON.stringify({ violations: baselineUpdate.baseline, recordedAt: now() }, null, 2)}\n`);
  }
  const baseline = baselineUpdate.write ? baselineUpdate.baseline : existing;

  const gate = decideGate({ violations: summary.violations, baseline });

  return { rows, summary, baseline, baselineUpdate, gate };
}

async function main() {
  const { outDir: argvOutDir, date: argvDate, init, ratchet } = parseArgv(process.argv.slice(2));
  const outDir = resolve(argvOutDir ?? DEFAULT_OUT_DIR);
  const date = argvDate ?? todayStamp();
  const packageRoot = DEFAULT_PACKAGE_ROOT;
  const leanSourcePath = DEFAULT_LEAN_SOURCE_PATH;
  const baselinePath = `${outDir}/${BASELINE_FILE_NAME}`;

  let outcome;
  try {
    outcome = await runAxiomLawGate({
      packageRoot,
      leanSourcePath,
      runCommand,
      readBaselineText: () => readFileText(baselinePath),
      writeBaselineText: (text) => writeFileText(baselinePath, text),
      init,
      ratchet,
    });
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }

  const { rows, summary, baseline, baselineUpdate, gate } = outcome;
  const record = assembleGateRecord({
    checkedAt: new Date().toISOString(),
    packageRoot,
    leanSourcePath,
    rows,
    baseline,
    gate,
  });

  const recordPath = `${outDir}/${date}-axiom-law-gate.json`;
  await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({ summary, baseline, baselineUpdate, gate }, null, 2)}\n`);
  process.exit(gate.exitCode);
}

if (isMain(import.meta.url)) {
  main();
}
