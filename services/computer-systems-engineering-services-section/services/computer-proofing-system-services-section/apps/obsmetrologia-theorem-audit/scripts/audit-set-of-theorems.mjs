#!/usr/bin/env node
/**
 * Effect: check named Lean theorems exist in the built Obsmetrologia
 * package and report their axiom profile via `lake env lean`, never by
 * reading a maturity label or a date.
 * @module audit-set-of-theorems
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
// friction (obsmetrological-services-section-node-import-migration, 2026-09-04): no house
// scratch-directory creation service (mkdtemp) or explicit-file-mode write service exists yet;
// this scratch .lean file for `lake env lean` stays hand-rolled here.
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { parseJavascriptArgv } from "@red-cup-engineering/javascript-node-services-section/argv";
import {
  allTheoremsExist,
  assembleTheoremAuditReport,
  buildScratchLeanSource,
  parseAxiomAuditOutput,
  sourceDeclaresName,
} from "../src/theorem-audit.mjs";

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/", import.meta.url).href);

/**
 * Run a command and capture its exit code and combined-by-stream output.
 * The default I/O edge for `runTheoremAudit`; tests inject a fake in its
 * place so the pure control flow can be exercised without invoking Lean.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{cwd: string}} options
 * @returns {Promise<{code: number|null, stdout: string, stderr: string}>}
 */
export function runCommand(command, args, { cwd }) {
  const receipt = executeJavascriptNodeCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command,
    arguments: args,
    directory: confinePath({ root: cwd }).path,
    environment: null,
    input: null,
  });
  return Promise.resolve({
    code: receipt.result.status,
    stdout: receipt.result.stdout,
    stderr: receipt.result.stderr,
  });
}

/**
 * Parse argv into the die's options. `--source <path>` may repeat; each
 * occurrence pairs positionally with the theorem names given.
 *
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{theoremNames: string[], sourcePaths: string[], importModule: string|undefined, build: boolean}}
 */
export function parseArgv(argv) {
  const parsed = parseJavascriptArgv({
    type: "JavascriptArgvParsingRequest",
    version: 1,
    argumentVector: { type: "JavascriptArgumentVector", version: 1, arguments: ["node", "script", ...argv] },
    options: {
      module: { type: "string" },
      source: { type: "string", multiple: true },
      build: { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });
  return {
    theoremNames: [...parsed.positionals],
    sourcePaths: parsed.options.source ?? [],
    importModule: parsed.options.module,
    build: parsed.options.build ?? false,
  };
}

/**
 * Read all of stdin and parse it as a JSON array of theorem names.
 *
 * @returns {Promise<string[]>}
 */
export async function readTheoremNamesFromStdin() {
  process.stdin.setEncoding("utf8");
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new TypeError("theorem-audit-stdin-array-required");
  return parsed;
}

/**
 * Verify a `--source` pairing: file exists under `packageRoot` and declares the theorem.
 *
 * @param {string} packageRoot
 * @param {string} relativePath
 * @param {string} theoremName
 * @returns {Promise<boolean>}
 */
export async function checkSourceDeclares(packageRoot, relativePath, theoremName) {
  try {
    const sourceText = await readFileText(confinePath({ root: packageRoot, path: relativePath }).path);
    return sourceDeclaresName(sourceText, theoremName);
  } catch {
    return false;
  }
}

/**
 * Run the full audit: optionally build, write a scratch .lean file, run
 * `lake env lean` on it, parse the output, and attach source-declares
 * checks. Pure control flow over an injectable `runCommand` so it is
 * testable without Lean installed.
 *
 * @param {{
 *   theoremNames: string[],
 *   sourcePaths?: string[],
 *   importModule?: string,
 *   packageRoot?: string,
 *   build?: boolean,
 *   runCommand: typeof runCommand,
 * }} options
 * @returns {Promise<Array<object>>} Rows, in request order.
 */
export async function runTheoremAudit({
  theoremNames,
  sourcePaths = [],
  importModule = "Obsmetrologia",
  packageRoot = DEFAULT_PACKAGE_ROOT,
  build = false,
  runCommand: run,
}) {
  if (build) {
    const buildResult = await run("lake", ["build"], { cwd: packageRoot });
    if (buildResult.code !== 0) {
      throw new Error(`theorem-audit-build-refused:${buildResult.stdout}${buildResult.stderr}`);
    }
  }

  const source = buildScratchLeanSource({ importModule, theoremNames });
  const scratchDir = await mkdtemp(`${tmpdir()}/obsmetrologia-theorem-audit-`);
  const scratchPath = `${scratchDir}/TheoremAudit.lean`;
  let rows;
  try {
    await writeFile(scratchPath, source, { encoding: "utf8", mode: 0o600 });
    const result = await run("lake", ["env", "lean", scratchPath], { cwd: packageRoot });
    const combined = `${result.stdout}\n${result.stderr}`;
    rows = parseAxiomAuditOutput(combined, theoremNames);
  } finally {
    await rm(scratchDir, { recursive: true, force: true });
  }

  for (let index = 0; index < rows.length; index += 1) {
    rows[index].module = importModule;
    const sourcePath = sourcePaths[index];
    if (sourcePath) {
      rows[index].source = sourcePath;
      rows[index].sourceDeclares = await checkSourceDeclares(packageRoot, sourcePath, rows[index].theorem);
    }
  }
  return rows;
}

async function main() {
  const { theoremNames: argvNames, sourcePaths, importModule, build } = parseArgv(process.argv.slice(2));
  const theoremNames = argvNames.length > 0 ? argvNames : await readTheoremNamesFromStdin();
  if (theoremNames.length === 0) {
    process.stderr.write("theorem-audit-no-theorem-names-given\n");
    process.exit(2);
    return;
  }

  const packageRoot = DEFAULT_PACKAGE_ROOT;
  let rows;
  try {
    rows = await runTheoremAudit({
      theoremNames,
      sourcePaths,
      importModule: importModule ?? "Obsmetrologia",
      packageRoot,
      build,
      runCommand,
    });
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(2);
    return;
  }

  const report = assembleTheoremAuditReport({
    checkedAt: new Date().toISOString(),
    packageRoot,
    rows,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(allTheoremsExist(rows) ? 0 : 1);
}

if (isMain(import.meta.url)) {
  main();
}
