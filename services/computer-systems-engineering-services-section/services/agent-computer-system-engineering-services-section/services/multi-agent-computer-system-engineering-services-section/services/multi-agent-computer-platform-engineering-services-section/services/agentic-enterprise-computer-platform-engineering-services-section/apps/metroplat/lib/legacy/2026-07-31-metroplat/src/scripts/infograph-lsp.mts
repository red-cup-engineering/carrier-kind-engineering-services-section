#!/usr/bin/env node
/** infograph-lsp - JSON request/response access to the derived LSP surface. */
import { readFileSync } from "node:fs";
import { argv, stdout } from "node:process";

import { parse as parseJson } from "../lib/codecs/json/core.mts";
import {
  LSP_METHODS,
  lspRequestEnvelopeContract,
  projectLsp,
  type LspRequestEnvelope,
} from "../integrations/lsp/index.mts";
import {
  isDirectEntrypoint,
  processEntrypointArgument,
  runProcessMain,
} from "../integrations/process/index.mts";

function printHelp(): void {
  stdout.write(`infograph-lsp methods\n\n${Object.values(LSP_METHODS).join("\n")}\n`);
}

async function main(): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }

  const input = readFileSync(0, "utf8").trim();
  if (input === "") {
    printHelp();
    return 0;
  }

  const request = lspRequestEnvelopeContract.assert(parseJson(input), "infograph-lsp request") as LspRequestEnvelope;
  stdout.write(`${JSON.stringify(projectLsp().handle(request))}\n`);
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-lsp" });
}
