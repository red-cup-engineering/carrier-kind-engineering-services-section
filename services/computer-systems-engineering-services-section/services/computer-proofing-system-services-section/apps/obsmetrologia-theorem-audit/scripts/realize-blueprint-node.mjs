#!/usr/bin/env node
/**
 * Effect: write the order's Blueprint node file into the Lean package's
 * blueprint source and seat its `\input` line in the owning chapter. The
 * headline node is `\notready` (red) unless --receipt names a proof
 * realization record whose admitted receipt binds this order's own
 * specification digest, in which case it is `\leanok` (green). Frontier
 * nodes the order seats beside it are always red. A frontier node another
 * order has promoted to its headline is left to that order's file, and the
 * files of the orders whose frontier seated THIS order's headline are
 * re-rendered without it, their own headline status read back off their text.
 * @module realize-blueprint-node
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confinePath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { admitProofWorkOrder, DEFAULT_PACKAGE_ROOT, DEFAULT_SECTION_ROOT, readProofWorkOrders } from "./admit-proof-work-order.mjs";
import {
  blueprintChapterPath,
  blueprintNodePath,
  headlineStatusOf,
  parentOrdersOf,
  promotedFrontierLabels,
  renderBlueprintNode,
  seatInChapter,
} from "../src/proof-work-order.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

/**
 * Parse argv into the die's options.
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{orderPath: string|undefined, receiptPath: string|undefined}}
 */
export function parseArgv(argv) {
  return { orderPath: argument("--order", argv), receiptPath: argument("--receipt", argv) };
}

/**
 * Decide the node's status from an optional realization record: settled only
 * when the record's admitted receipt binds this order's artifact id and digest.
 *
 * @param {{admitted: {type: string, artifact?: {id: string}, specificationDigest?: string}}} admission
 * @param {object|undefined} record - A parsed proof realization record, or undefined.
 * @returns {"frontier"|"settled"}
 * @throws {Error} When a record is given but does not bind this order.
 */
export function statusOf(admission, record) {
  if (record === undefined) return "frontier";
  const receipt = record.receipt;
  if (receipt?.type !== "ArtifactFabricationRealizationReceipt") throw new Error("realize-blueprint-node: --receipt does not carry an admitted realization receipt");
  if (receipt.artifactId !== admission.admitted.artifact?.id || receipt.specificationDigest !== admission.admitted.specificationDigest) {
    throw new Error("realize-blueprint-node: the receipt binds a different order or a different revision of this order");
  }
  return "settled";
}

async function main() {
  const { orderPath, receiptPath } = parseArgv(process.argv.slice(2));
  if (!orderPath) {
    process.stderr.write("realize-blueprint-node: --order <content/work-orders/<id>.json> [--receipt <data/records/...json>] is required\n");
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
    const record = receiptPath === undefined ? undefined : JSON.parse(await readFileText(confinePath({ root: DEFAULT_SECTION_ROOT, path: receiptPath }).path));
    const status = statusOf(admission, record);
    const { order } = admission;
    const nodePath = confinePath({ root: DEFAULT_PACKAGE_ROOT, path: blueprintNodePath(order.blueprint) }).path;
    const chapterPath = confinePath({ root: DEFAULT_PACKAGE_ROOT, path: blueprintChapterPath(order.blueprint) }).path;
    const orders = await readProofWorkOrders({ sectionRoot: DEFAULT_SECTION_ROOT });
    await writeFileText(nodePath, renderBlueprintNode(order, { status, promoted: promotedFrontierLabels(order, orders) }));
    const seated = seatInChapter(await readFileText(chapterPath), order.blueprint);
    if (seated.changed) await writeFileText(chapterPath, seated.text);
    const promotedFrom = [];
    for (const parent of parentOrdersOf(order, orders)) {
      const parentPath = confinePath({ root: DEFAULT_PACKAGE_ROOT, path: blueprintNodePath(parent.blueprint) }).path;
      const parentStatus = headlineStatusOf(await readFileText(parentPath), parent.blueprint.label);
      await writeFileText(parentPath, renderBlueprintNode(parent, { status: parentStatus, promoted: promotedFrontierLabels(parent, orders) }));
      promotedFrom.push({ order: parent.id, nodePath: parentPath, status: parentStatus });
    }
    process.stdout.write(`${JSON.stringify({ status, nodePath, chapterPath, chapterChanged: seated.changed, label: order.blueprint.label, promotedFrom }, null, 2)}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`${error.message ?? String(error)}\n`);
    process.exit(1);
  }
}

if (isMain(import.meta.url)) {
  main();
}
