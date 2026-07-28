#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fabricatePackageRegistry } from "../src/package-registry.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return process.argv[index + 1];
}

const packageDirectories = JSON.parse(await readFile(option("--packages"), "utf8"));
const receipt = await fabricatePackageRegistry({ packageDirectories, outputDirectory: option("--output"), registryUrl: option("--registry-url") });
process.stdout.write(`${JSON.stringify({ type: receipt.type, registry: receipt.registry, packages: receipt.packages.length, scopes: receipt.scopes.length, compute: receipt.compute }, null, 2)}\n`);
