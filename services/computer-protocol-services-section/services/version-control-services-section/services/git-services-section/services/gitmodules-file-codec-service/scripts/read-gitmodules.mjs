#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseGitmodules } from "../src/gitmodules.mjs";

export async function readGitmodules({ file = ".gitmodules" } = {}) {
  const path = resolve(file);
  const entries = parseGitmodules(await readFile(path, "utf8"));
  return Object.freeze({ path, entries });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write("usage: read-gitmodules [--file <path>]\n");
    return;
  }
  if (args.length > 2 || (args.length > 0 && args[0] !== "--file") || (args[0] === "--file" && args[1] === undefined)) {
    throw new TypeError("usage: read-gitmodules [--file <path>]");
  }
  process.stdout.write(`${JSON.stringify(await readGitmodules({ file: args[1] }))}\n`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "")) {
  main().catch((error) => {
    process.stderr.write(`read-gitmodules: ${error.message}\n`);
    process.exitCode = 1;
  });
}
