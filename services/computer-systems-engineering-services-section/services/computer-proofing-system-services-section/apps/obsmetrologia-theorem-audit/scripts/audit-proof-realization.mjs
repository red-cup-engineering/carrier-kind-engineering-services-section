#!/usr/bin/env node
/**
 * Effect: run the four gates of one admitted proof work order — targeted
 * `lake build <module>`, the axiom census of its declarations, the
 * Lean/Blueprint chart, and the manual build — bind their evidence into a
 * realization receipt through the admission service, and write the dated
 * proof realization record to data/records/. Exit 0 only when every gate
 * passed and the receipt admitted; a failed gate is printed and leaves no
 * record.
 * @module audit-proof-realization
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileBytes, readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { admitArtifactFabricationRealizationReceipt } from "@red-cup-engineering/computer-code-development-engine/artifact-fabrication";
import { blueprintLeanWeldFindings, readLeanWorkspace } from "../src/lean-blueprint-chart.mjs";
import { runCommand } from "./audit-set-of-theorems.mjs";
import { admitProofWorkOrder, DEFAULT_PACKAGE_ROOT, DEFAULT_SECTION_ROOT } from "./admit-proof-work-order.mjs";
import { parseCensusRows } from "../src/theorem-census.mjs";
import {
  axiomBudgetFindings,
  axiomCensusProgram,
  blueprintNodePath,
  chartFindings,
  digestOf,
  leanModulePath,
  receiptCandidateOf,
  versePath,
} from "../src/proof-work-order.mjs";
import { todayStamp } from "./census-set-of-theorem-axioms.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const DEFAULT_OUT_DIR = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/data/records/", import.meta.url).href);

/**
 * Parse argv into the die's options.
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{orderPath: string|undefined, outDir: string|undefined, date: string|undefined}}
 */
export function parseArgv(argv) {
  return { orderPath: argument("--order", argv), outDir: argument("--out-dir", argv), date: argument("--date", argv) };
}

function gateOf(id, command, args, cwd, result, findings = []) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    id,
    command: [command, ...args].join(" "),
    cwd,
    code: result.code,
    passed: result.code === 0 && findings.length === 0,
    findings,
    outputDigest: digestOf(output),
    outputTail: output.trim().split(/\r?\n/u).slice(-12),
  };
}

/**
 * Run the four gates for an admitted order. Pure control flow over injectable
 * command and file readers.
 *
 * @param {{order: object, packageRoot: string, runCommand: typeof runCommand, readText: typeof readFileText, writeText: typeof writeFileText}} options
 * @returns {Promise<Array<object>>} One gate result per obligation, in obligation order.
 */
export async function runGates({ order, packageRoot, runCommand: run, readText, writeText }) {
  const gates = [];

  const build = await run("lake", ["build", order.module], { cwd: packageRoot });
  gates.push(gateOf("module-builds", "lake", ["build", order.module], packageRoot, build));

  const programPath = `${packageRoot}/.lake/proof-audit/${order.id}.lean`;
  await writeText(programPath, axiomCensusProgram(order));
  const census = await run("lake", ["env", "lean", programPath], { cwd: packageRoot });
  const rows = census.code === 0 ? parseCensusRows(census.stdout) : [];
  gates.push(gateOf("axiom-budget", "lake", ["env", "lean", programPath], packageRoot, census, census.code === 0 ? axiomBudgetFindings(rows, order) : []));

  const chart = readLeanWorkspace(packageRoot);
  const weld = blueprintLeanWeldFindings(chart.texWorkspaceRead.blueprintClaimGraph, chart.declarationCatalog);
  const chartResult = { code: 0, stdout: JSON.stringify({ modules: chart.modules.length, declarations: chart.declarationCatalog.entries.length, nodes: chart.texWorkspaceRead.blueprintClaimGraph.nodes.length }), stderr: "" };
  gates.push(gateOf("blueprint-chart", "readLeanWorkspace", [packageRoot], packageRoot, chartResult, chartFindings(chart, weld, order)));

  const verseFile = `${packageRoot}/${versePath(order.verse.module)}`;
  let verseFindings = [];
  try {
    const verse = await readText(verseFile);
    if (!verse.split(/\r?\n/u).some((line) => line.trim() === `import ${order.module}`)) verseFindings = [{ code: "verse-does-not-import-module", module: order.module }];
  } catch {
    verseFindings = [{ code: "verse-missing", path: verseFile }];
  }
  const versoRoot = `${packageRoot}/docs/verso`;
  const manual = verseFindings.length === 0 ? await run("lake", ["build"], { cwd: versoRoot }) : { code: 1, stdout: "", stderr: "verse gate not run: " + JSON.stringify(verseFindings) };
  gates.push(gateOf("manual-builds", "lake", ["build"], versoRoot, manual, verseFindings));

  return gates;
}

async function main() {
  const { orderPath, outDir: argvOutDir, date: argvDate } = parseArgv(process.argv.slice(2));
  if (!orderPath) {
    process.stderr.write("audit-proof-realization: --order <content/work-orders/<id>.json> [--out-dir <dir>] [--date YYYY-MM-DD] is required\n");
    process.exit(2);
    return;
  }
  try {
    const admission = await admitProofWorkOrder({ orderPath, sectionRoot: DEFAULT_SECTION_ROOT, packageRoot: DEFAULT_PACKAGE_ROOT });
    if (admission.admitted.type !== "ArtifactFabricationSpecification") {
      process.stderr.write(`${JSON.stringify(admission.admitted, null, 2)}\n`);
      process.exit(1);
      return;
    }
    const { order, admitted } = admission;
    const packageRoot = DEFAULT_PACKAGE_ROOT;
    const gates = await runGates({ order, packageRoot, runCommand, readText: readFileText, writeText: writeFileText });
    const failed = gates.filter((gate) => !gate.passed);
    if (failed.length > 0) {
      process.stderr.write(`${JSON.stringify({ failed }, null, 2)}\n`);
      process.exit(1);
      return;
    }
    const artifactDigest = async (relativePath) => ({ locator: `lib/obsmetrologia/${relativePath}`, digest: digestOf(await readFileBytes(`${packageRoot}/${relativePath}`)) });
    const evidence = {
      projections: {
        "lean-module": await artifactDigest(leanModulePath(order.module)),
        "blueprint-node": await artifactDigest(blueprintNodePath(order.blueprint)),
        "verso-verse": await artifactDigest(versePath(order.verse.module)),
      },
      obligations: Object.fromEntries(gates.map((gate) => [gate.id, { locator: `${gate.command} (exit ${gate.code})`, digest: gate.outputDigest }])),
    };
    const receipt = admitArtifactFabricationRealizationReceipt(admitted, receiptCandidateOf(admitted, evidence));
    if (receipt.type !== "ArtifactFabricationRealizationReceipt") {
      process.stderr.write(`${JSON.stringify(receipt, null, 2)}\n`);
      process.exit(1);
      return;
    }
    const record = {
      type: "ObsmetrologiaProofRealizationRecord",
      version: 1,
      recordedAt: new Date().toISOString(),
      order: { path: admission.locator, digest: admission.digest, id: order.id, module: order.module, headline: order.headline },
      specificationDigest: admitted.specificationDigest,
      gates,
      receipt,
    };
    const outDir = confinePath({ root: argvOutDir ?? DEFAULT_OUT_DIR }).path;
    const recordPath = `${outDir}/${argvDate ?? todayStamp()}-proof-realization-${order.id}.json`;
    await writeFileText(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ recordPath, specificationDigest: admitted.specificationDigest, gates: gates.map(({ id, code, passed }) => ({ id, code, passed })) }, null, 2)}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`audit-proof-realization: ${error.message ?? String(error)}\n`);
    process.exit(1);
  }
}

if (isMain(import.meta.url)) {
  main();
}
