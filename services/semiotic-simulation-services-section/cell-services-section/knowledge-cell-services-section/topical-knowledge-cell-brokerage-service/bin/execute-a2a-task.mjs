#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { executeRelationalOperationMessage } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
import { qualifyTopicalKnowledgeCellProducts } from "../lib/brokerage.mjs";
import { brokerageServiceProtocol } from "../src/protocol.mjs";
import { loadBrokerageRuntime } from "../src/runtime.mjs";
const operations = Object.freeze({ "qualify-topical-knowledge-cell-products": (input, runtime) => qualifyTopicalKnowledgeCellProducts(input, runtime.providers, runtime.options) });
export function executeA2aMessage(source, runtimeLoader = loadBrokerageRuntime) {
  return executeRelationalOperationMessage(source, { protocol: brokerageServiceProtocol, operations, runtimeLoader, responseFilename: "topical-brokerage-service-response.rmn.cbor", unknownOperationMessage: "unknown brokerage-service operation" });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}
