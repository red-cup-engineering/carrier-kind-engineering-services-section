#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { searchBareCedarFogMarkdownVaults } from "../src/index.mjs";

export function parseSearchArguments(argv) {
  const options = { root: process.cwd(), vaultIds: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--query") options.query = argv[++index];
    else if (argument === "--policy") options.policyPath = argv[++index];
    else if (argument === "--vault") options.vaultIds.push(argv[++index]);
    else if (argument === "--generation") options.generation = argv[++index];
    else if (argument === "--limit") options.limit = Number(argv[++index]);
    else if (argument === "--case-sensitive") options.caseSensitive = true;
    else if (argument === "--regex") options.regularExpression = true;
    else throw new TypeError(`unrecognized argument: ${argument}`);
  }
  if (options.vaultIds.length === 0) delete options.vaultIds;
  return options;
}

export async function runSearchBareCedarFogMarkdownVaults(argv = process.argv.slice(2), io = process) {
  const result = await searchBareCedarFogMarkdownVaults(parseSearchArguments(argv));
  io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

runMain(({ argv, stdout, stderr }) => runSearchBareCedarFogMarkdownVaults(argv, { stdout, stderr }), {
  moduleUrl: import.meta.url,
  isEntry: (url, entry) => resolve(fileURLToPath(url)) === resolve(entry ?? ""),
  formatError: (error) => `search-bare-cedar-fog-markdown-vaults: ${error.message}\n`,
  exitCode: 64,
});
