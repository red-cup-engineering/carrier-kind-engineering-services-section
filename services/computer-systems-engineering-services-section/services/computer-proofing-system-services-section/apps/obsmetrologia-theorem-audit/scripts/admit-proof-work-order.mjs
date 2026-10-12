#!/usr/bin/env node
/**
 * Effect: none beyond stdout. Read one proof work order from
 * content/work-orders/, translate it into the artifact-fabrication
 * specification candidate, admit it through the admission service, and
 * print the admitted specification (with its digest) or the typed refusal.
 * Exit 0 on admission, 1 on refusal.
 * @module admit-proof-work-order
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileBytes, readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";
import { admitArtifactFabricationSpecification } from "@red-cup-engineering/computer-code-development-engine/artifact-fabrication";
import { candidateOfProofWorkOrder, digestOf, parseProofWorkOrder } from "../src/proof-work-order.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

export const DEFAULT_SECTION_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/", import.meta.url).href);
export const DEFAULT_PACKAGE_ROOT = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/", import.meta.url).href);

/**
 * Parse argv into the die's options.
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{orderPath: string|undefined}}
 */
export function parseArgv(argv) {
  return { orderPath: argument("--order", argv) };
}

/**
 * Read, translate, and admit one proof work order. Pure over injectable readers.
 *
 * @param {{orderPath: string, sectionRoot: string, packageRoot: string, readBytes?: typeof readFileBytes, readText?: typeof readFileText}} options
 * @returns {Promise<{order: object, candidate: object, admitted: object, digest: string, locator: string}>}
 *   `admitted` is the specification or the refusal.
 */
export async function admitProofWorkOrder({ orderPath, sectionRoot, packageRoot, readBytes = readFileBytes, readText = readFileText }) {
  const confinedOrder = confinePath({ root: sectionRoot, path: orderPath }).path;
  const bytes = await readBytes(confinedOrder);
  const text = new TextDecoder().decode(bytes);
  const order = parseProofWorkOrder(text);
  const digest = digestOf(bytes);
  const locator = confinedOrder.startsWith(sectionRoot) ? confinedOrder.slice(sectionRoot.length).replace(/^\/+/u, "") : confinedOrder;
  const toolchain = await readText(`${packageRoot}/lean-toolchain`);
  const candidate = candidateOfProofWorkOrder(order, { locator, digest, lineCount: text.split(/\r?\n/u).length, toolchain });
  const admitted = admitArtifactFabricationSpecification(candidate);
  return { order, candidate, admitted, digest, locator };
}

/**
 * Read and parse every proof work order under content/work-orders/, sorted by
 * path. A malformed order is a thrown error, never skipped.
 *
 * @param {{sectionRoot: string, readText?: typeof readFileText, walk?: typeof walkPosixPaths}} options
 * @returns {Promise<object[]>} The parsed orders.
 */
export async function readProofWorkOrders({ sectionRoot, readText = readFileText, walk = walkPosixPaths }) {
  const root = `${sectionRoot}/content/work-orders`;
  const listing = await walk({ root, extensions: [".json"], maxDepth: 0 });
  const orders = [];
  for (const file of listing.files.filter(({ kind }) => kind === "file")) {
    orders.push(parseProofWorkOrder(await readText(`${root}/${file.path}`)));
  }
  return orders;
}

async function main() {
  const { orderPath } = parseArgv(process.argv.slice(2));
  if (!orderPath) {
    process.stderr.write("admit-proof-work-order: --order <content/work-orders/<id>.json> is required\n");
    process.exit(2);
    return;
  }
  let result;
  try {
    result = await admitProofWorkOrder({ orderPath, sectionRoot: DEFAULT_SECTION_ROOT, packageRoot: DEFAULT_PACKAGE_ROOT });
  } catch (error) {
    process.stderr.write(`admit-proof-work-order: ${error.message ?? String(error)}\n`);
    process.exit(1);
    return;
  }
  process.stdout.write(`${JSON.stringify(result.admitted, null, 2)}\n`);
  process.exit(result.admitted.type === "ArtifactFabricationSpecification" ? 0 : 1);
}

if (isMain(import.meta.url)) {
  main();
}
