#!/usr/bin/env node
import process from "node:process";
import { materializeNodeRuntimeRelease } from "../src/materialize-release.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return process.argv[index + 1];
}

const receipt = await materializeNodeRuntimeRelease({
  entryPackageDirectory: option("--entry"),
  providerSources: JSON.parse(await (await import("node:fs/promises")).readFile(option("--providers"), "utf8")),
  outputRoot: option("--output"),
});
process.stdout.write(`${JSON.stringify(receipt)}\n`);
