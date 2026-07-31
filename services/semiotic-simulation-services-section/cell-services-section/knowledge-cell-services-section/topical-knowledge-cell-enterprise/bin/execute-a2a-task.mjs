#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { executeRelationalOperationMessage } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
import { admitTopicalKnowledgeCellInstance } from "../lib/cell.mjs";
import { cellEnterpriseProtocol } from "../src/protocol.mjs";
import { loadCellEnterpriseRuntime } from "../src/runtime.mjs";
const operations = Object.freeze({ "admit-topical-knowledge-cell-instance": (input, runtime) => admitTopicalKnowledgeCellInstance(input, runtime.providers, runtime.options) });
export function executeA2aMessage(source, runtimeLoader = loadCellEnterpriseRuntime) {
  return executeRelationalOperationMessage(source, { protocol: cellEnterpriseProtocol, operations, runtimeLoader, responseFilename: "topical-cell-enterprise-response.rmn.cbor", unknownOperationMessage: "unknown topical-cell-enterprise operation" });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}
