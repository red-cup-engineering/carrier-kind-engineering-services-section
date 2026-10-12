#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { sellHiveExitTightnessResource } from "../src/hive/sell-hive-exit-tightness-resource.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HIVE_ENGINE_EXIT_TIGHTNESS_SCRIPT = fileURLToPath(import.meta.resolve("@red-cup-engineering/hive-fleet-operations-service/hive-engine-exit-tightness"));
const HIVE_NODES = ["https://api.hive.blog", "https://api.openhive.network"];

/**
 * Composes `sellHiveExitTightnessResource` with the canonical Hive fleet read-only probe (invoked as an
 * external command, never imported or modified) and, on a settled sale, the real semantic record
 * journal, wiring both the live default Hive node pair and the sold report's own account/symbol.
 * @param {object} request A `sellHiveExitTightnessResource` request plus `reportRequest` ({account, symbol, quantity?}) and `journalRoot` (the ancestor services-section path the settlement witness is recorded under).
 * @returns {Promise<object>} The `{status, body}` response, with `body.settlement.journal` set to the recorded receipt's `id` on a 200.
 */
export async function serveHiveExitTightnessX402Resource(request) {
  const { reportRequest, journalRoot, ...sellRequest } = request;
  const args = ["--account", reportRequest.account, "--symbol", reportRequest.symbol];
  if (reportRequest.quantity) args.push("--quantity", reportRequest.quantity);
  const response = await sellHiveExitTightnessResource({
    ...sellRequest,
    hiveNodes: sellRequest.hiveNodes ?? HIVE_NODES,
    reportCommand: { command: "node", arguments: [HIVE_ENGINE_EXIT_TIGHTNESS_SCRIPT, ...args], directory: HERE },
  });
  if (response.body?.settlement && journalRoot) {
    const address = put(journalRoot, "x402-hbd-purchase-settlement", { ...response.body.settlement, at: new Date().toISOString() });
    response.body.settlement = { ...response.body.settlement, journal: { id: address, type: "x402-hbd-purchase-settlement" } };
  }
  return response;
}

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  for (const line of text.split("\n")) {
    if (line.length > 0) process.stdout.write(`${JSON.stringify(await serveHiveExitTightnessX402Resource(JSON.parse(line)))}\n`);
  }
}
