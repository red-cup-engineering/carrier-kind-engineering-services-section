#!/usr/bin/env node
/**
 * Effect: walk the whole Obsmetrologia Lean package for `import` lines
 * (no `lake`/Lean invocation — this census only parses text), build the
 * top-level-module import graph, check it against the session-declared
 * four-stratum layering, and write the dated record to `data/records/`.
 * @module census-set-of-module-strata
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";
import { assembleRecord, buildGraph, DECLARED_STRATA } from "../src/module-strata-census.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";
// friction (obsmetrological-services-section-node-import-migration, 2026-09-04):
// semiotic-eavt-services-section writes an append-only JSONL log under data/logs/, never
// an exact named path under data/records/ that other carriers already cite. Kept as a
// house-file-services writer (not raw node:fs) of this exact-path carrier until the
// journal grows that shape.

const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia", import.meta.url).href);
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
 * Collect the whole-library scan scope: every `.lean` file recursively
 * under `<root>/Obsmetrologia/`, plus the single root manifest
 * `<root>/Obsmetrologia.lean` (present in the corpus proper — the
 * `docs/` Verso manual tree and `.lake` build cache that also live under
 * `root` are out of scope and never walked).
 *
 * @param {string} root - Absolute Lean package root (e.g. `.../lib/obsmetrologia`).
 * @returns {Promise<Array<{path: string, text: string}>>} Sorted by `path`.
 */
export async function readLeanFiles(root) {
  const obsmetrologiaDir = `${root}/Obsmetrologia`;
  const walk = await walkPosixPaths({ root: obsmetrologiaDir, extensions: [".lean"] });
  const files = await Promise.all(
    walk.files
      .filter(({ kind }) => kind === "file")
      .map(async (file) => ({
        path: `Obsmetrologia/${file.path}`,
        text: await readFileText(`${obsmetrologiaDir}/${file.path}`),
      })),
  );
  try {
    files.push({ path: "Obsmetrologia.lean", text: await readFileText(`${root}/Obsmetrologia.lean`) });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * Render the per-module table and upward-import totals as plain text for
 * stdout.
 *
 * @param {ReturnType<typeof assembleRecord>} record
 * @returns {string}
 */
export function renderSummary(record) {
  const lines = [];
  lines.push(
    `files=${record.reading.totalFiles} importLines=${record.reading.totalImportLines} ` +
      `dagEdges=${record.reading.totalImportEdges} acyclic=${record.dag.acyclic ? "yes" : "no"}`,
  );
  lines.push("");
  lines.push("module\tstratum\tfileCount\trank\timports\timportedBy");
  for (const name of Object.keys(record.modules).sort()) {
    const module = record.modules[name];
    lines.push(
      `${name}\t${module.stratum}\t${module.fileCount}\t${module.rank}\t${module.imports.length}\t${module.importedBy.length}`,
    );
  }
  lines.push("");
  lines.push(`upward total=${record.upward.total} intoUnstratified=${record.upward.totalIntoUnstratified}`);
  for (const pair of Object.keys(record.upward.perStratumPair).sort()) {
    lines.push(`  ${pair}: ${record.upward.perStratumPair[pair]}`);
  }
  lines.push(`unstratified modules: ${record.reading.unstratifiedModules.join(", ") || "(none)"}`);
  if (!record.dag.acyclic) {
    for (const cycle of record.dag.cycles) {
      lines.push(`cycle: ${cycle.modules.join(" <-> ")}`);
      for (const edge of cycle.edges) lines.push(`  ${edge.from} -> ${edge.to}: ${edge.files.join(", ")}`);
    }
  }
  const move = record.bestMove;
  if (move.module) {
    lines.push(
      `best single move: ${move.module} ${move.fromStratum} -> ${move.toStratum} ` +
        `removes ${move.upwardImportsRemoved} upward imports (baseline ${move.baselineUpward})`,
    );
  } else {
    lines.push(`best single move: none (baseline ${move.baselineUpward})`);
  }
  return lines.join("\n");
}

async function main() {
  const { outDir: argvOutDir, date: argvDate } = parseArgv(process.argv.slice(2));
  const outDir = confinePath({ root: argvOutDir ?? DEFAULT_OUT_DIR }).path;
  const date = argvDate ?? todayStamp();
  const packageRoot = DEFAULT_PACKAGE_ROOT;

  const files = await readLeanFiles(packageRoot);
  const graph = buildGraph(files);
  const record = assembleRecord({ checkedAt: new Date().toISOString(), packageRoot, graph, config: DECLARED_STRATA });

  const recordPath = `${outDir}/${date}-module-strata-census.json`;
  await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  process.stdout.write(`${renderSummary(record)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
