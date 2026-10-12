#!/usr/bin/env node
/**
 * Effect: none beyond stdout. The pre-blueprint step: read every proof work
 * order under content/work-orders/, find the one that seats --label as a red
 * frontier node, and print the draft order that promotes that node to a
 * headline — blueprint seat, axiom budget, corpus, and references carried
 * over; module, headline, declarations, requirements, and verse left empty
 * for the proof to settle. Exit 0 with the draft, 1 with the typed refusal.
 * @module draft-proof-work-order
 */
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";
import { DEFAULT_PACKAGE_ROOT, DEFAULT_SECTION_ROOT, readProofWorkOrders } from "./admit-proof-work-order.mjs";
import { draftOrderOfFrontier, nextNodeFileNumber } from "../src/proof-work-order.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

/**
 * Parse argv into the die's options.
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{label: string|undefined}}
 */
export function parseArgv(argv) {
  return { label: argument("--label", argv) };
}

/**
 * Draft the promoting order for one frontier label. Pure over injectable readers.
 *
 * @param {{label: string, sectionRoot: string, packageRoot: string, readText?: typeof readFileText, walk?: typeof walkPosixPaths}} options
 * @returns {Promise<{draft: object, seededBy: string}>}
 */
export async function draftProofWorkOrder({ label, sectionRoot, packageRoot, readText = readFileText, walk = walkPosixPaths }) {
  const orders = await readProofWorkOrders({ sectionRoot, readText, walk });
  const parent = orders.find((order) => (order.blueprint.frontier ?? []).some((node) => node.label === label));
  const chapterDir = parent === undefined ? undefined : confinePath({ root: packageRoot, path: `docs/blueprint/src/chapters/${parent.blueprint.chapter}` }).path;
  const names = chapterDir === undefined ? [] : (await walk({ root: chapterDir, extensions: [".tex"], maxDepth: 0 })).files.map(({ path }) => path);
  return draftOrderOfFrontier({ orders, label, nodeFileNumber: nextNodeFileNumber(names) });
}

async function main() {
  const { label } = parseArgv(process.argv.slice(2));
  if (!label) {
    process.stderr.write("draft-proof-work-order: --label <thm:name> is required\n");
    process.exit(2);
    return;
  }
  try {
    const { draft } = await draftProofWorkOrder({ label, sectionRoot: DEFAULT_SECTION_ROOT, packageRoot: DEFAULT_PACKAGE_ROOT });
    process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ type: "ProofWorkOrderDraftRefusal", code: error.code ?? "ERROR", message: error.message ?? String(error) }, null, 2)}\n`);
    process.exit(1);
  }
}

if (isMain(import.meta.url)) {
  main();
}
