#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { observeBareCedarFogMarkdownVaults } from "../src/index.mjs";

export function parseObserveArguments(argv) {
  const options = { root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--policy") options.policyPath = argv[++index];
    else if (argument === "--sample-limit") options.sampleLimit = Number(argv[++index]);
    else if (argument === "--include-paths") options.includePaths = true;
    else throw new TypeError(`unrecognized argument: ${argument}`);
  }
  return options;
}

export async function runObserveBareCedarFogMarkdownVaults(argv = process.argv.slice(2), io = process) {
  const observation = await observeBareCedarFogMarkdownVaults(parseObserveArguments(argv));
  io.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
  return observation;
}

runMain(({ argv, stdout, stderr }) => runObserveBareCedarFogMarkdownVaults(argv, { stdout, stderr }), {
  moduleUrl: import.meta.url,
  isEntry: (url, entry) => resolve(fileURLToPath(url)) === resolve(entry ?? ""),
  formatError: (error) => `observe-bare-cedar-fog-markdown-vaults: ${error.message}\n`,
  exitCode: 64,
});
