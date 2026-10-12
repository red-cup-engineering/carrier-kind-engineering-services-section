#!/usr/bin/env node
/** infograph-lsp - JSON request/response access to the derived LSP surface. */
import { readFileSync } from "node:fs";
import { argv, stdout } from "node:process";

import { parse as parseJson } from "@red-cup-engineering/json-services-section";
import { LSP_METHODS, lspRequestEnvelopeContract } from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/codec";
import { projectLsp } from "@red-cup-engineering/feltos/operations/lsp/bind";
import { isDirectEntrypoint, processEntrypointArgument } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";

function printHelp() {
  stdout.write(`infograph-lsp methods\n\n${Object.values(LSP_METHODS).join("\n")}\n`);
}

async function main() {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }

  const input = readFileSync(0, "utf8").trim();
  if (input === "") {
    printHelp();
    return 0;
  }

  const request = lspRequestEnvelopeContract.assert(parseJson(input), "infograph-lsp request");
  stdout.write(`${JSON.stringify(projectLsp().handle(request))}\n`);
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-lsp" });
}
