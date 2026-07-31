#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { buildPackageRegistry } from "../src/package-registry.mjs";

function option(name, { required = true } = {}) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    if (!required) return undefined;
    throw new Error(`${name} is required`);
  }
  return process.argv[index + 1];
}

const directPackages = process.argv.flatMap((value, index) => value === "--package" && process.argv[index + 1] ? [process.argv[index + 1]] : []);
const excludedBaseReleases = process.argv.flatMap((value, index) => value === "--exclude-base-release" && process.argv[index + 1] ? [process.argv[index + 1]] : []);
const packageList = option("--packages", { required: false });
if (packageList !== undefined && directPackages.length > 0) throw new Error("supply either --packages or one or more --package values");
if (packageList === undefined && directPackages.length === 0 && excludedBaseReleases.length === 0) throw new Error("supply packages or one or more --exclude-base-release values");
const packageDirectories = packageList === undefined ? directPackages : JSON.parse(await readFile(packageList, "utf8"));
const receipt = await buildPackageRegistry({
  packageDirectories,
  outputDirectory: option("--output"),
  registryUrl: option("--registry-url"),
  baseRegistryDirectory: option("--base-registry", { required: false }),
  excludedBaseReleases,
});
process.stdout.write(`${JSON.stringify({ type: receipt.type, registry: receipt.registry, packages: receipt.packageCount, releases: receipt.packages.length, scopes: receipt.scopes.length, compute: receipt.compute }, null, 2)}\n`);
