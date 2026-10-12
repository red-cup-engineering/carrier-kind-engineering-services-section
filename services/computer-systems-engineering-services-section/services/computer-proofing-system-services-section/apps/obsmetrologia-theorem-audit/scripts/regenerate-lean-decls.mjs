#!/usr/bin/env node
/**
 * Effect: run the whole-library Obsmetrologia declaration-inventory Lean
 * meta program (`list-lean-decls.lean`, beside this file) via
 * `lake env lean`, parse, sort, and render its stdout, and write the
 * result to `$LIB/docs/blueprint/lean_decls` -- the one blueprint doc this
 * app may write, and only ever as this regenerated output, never by hand.
 * @module regenerate-lean-decls
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { runCommand } from "./audit-set-of-theorems.mjs";
import { parseDeclNames, renderDeclList, sortDeclNames } from "../src/lean-decls.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
const DEFAULT_LEAN_SOURCE_PATH = projectFileUrlFilepath(new URL("./list-lean-decls.lean", import.meta.url).href);
const DEFAULT_OUT_PATH = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/docs/blueprint/lean_decls", import.meta.url).href);

/**
 * Parse argv into the die's options.
 *
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{outPath: string|undefined}}
 */
export function parseArgv(argv) {
  return { outPath: argument("--out-path", argv) };
}

/**
 * Run the regeneration: invoke `lake env lean <leanSourcePath>` in
 * `packageRoot` and parse/sort its stdout into the declaration-name list.
 * Pure control flow over an injectable `runCommand` so it is testable
 * without Lean installed.
 *
 * @param {{packageRoot: string, leanSourcePath: string, runCommand: typeof runCommand}} options
 * @returns {Promise<{names: string[]}>}
 * @throws {Error} `regenerate-lean-decls-failed:<stderr>` on nonzero exit or zero names.
 */
export async function runRegenerateLeanDecls({ packageRoot, leanSourcePath, runCommand: run }) {
  const result = await run("lake", ["env", "lean", leanSourcePath], { cwd: packageRoot });
  const names = sortDeclNames(parseDeclNames(result.stdout));
  if (result.code !== 0 || names.length === 0) {
    throw new Error(`regenerate-lean-decls-failed:${result.stderr || result.stdout}`);
  }
  return { names };
}

async function main() {
  const { outPath: argvOutPath } = parseArgv(process.argv.slice(2));
  const outPath = confinePath({ root: argvOutPath ?? DEFAULT_OUT_PATH }).path;
  const packageRoot = DEFAULT_PACKAGE_ROOT;
  const leanSourcePath = DEFAULT_LEAN_SOURCE_PATH;

  let names;
  try {
    ({ names } = await runRegenerateLeanDecls({ packageRoot, leanSourcePath, runCommand }));
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }

  await writeFileText(outPath, renderDeclList(names));

  process.stdout.write(`${JSON.stringify({ outPath, count: names.length }, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
