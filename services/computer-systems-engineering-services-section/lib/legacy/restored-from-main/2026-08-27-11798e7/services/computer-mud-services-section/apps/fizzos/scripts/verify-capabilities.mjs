#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const concordance = JSON.parse(await readFile(join(root, "content/capability-concordance.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const archivedPackageDirectories = [
  join(root, "lib/legacy/2026-07-12-emsenn-fizzos-0.0.1"),
  join(root, "lib/legacy/2026-08-01-red-cup-engineering-fizzos-0.0.2")
];
const nestedCorpus = join(archivedPackageDirectories[1], "lib/legacy");

async function archivedTestNames(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && path !== nestedCorpus) result.push(...await archivedTestNames(path));
    else if (entry.isFile() && entry.name.endsWith(".test.mts")) result.push(entry.name);
  }
  return result;
}

const errors = [];
const ids = new Set();
const registeredArchiveTests = new Set();
for (const capability of concordance.capabilities) {
  if (ids.has(capability.id)) errors.push(`duplicate capability id: ${capability.id}`);
  ids.add(capability.id);
  registeredArchiveTests.add(capability.archive);
  for (const evidence of [capability.module, capability.test]) {
    try { await access(join(root, evidence)); }
    catch { errors.push(`${capability.id}: missing current evidence ${evidence}`); }
  }
  try {
    const testSource = await readFile(join(root, capability.test), "utf8");
    if (!testSource.includes("test(")) errors.push(`${capability.id}: ${capability.test} contains no test declaration`);
  } catch {}
}

// A source checkout proves that the register is the complete union, rather than
// a hand-picked subset. A packed install has no legacy corpus and instead uses
// the sealed register plus its shipped current tests.
const archivedTests = new Set();
let archivePresent = false;
for (const directory of archivedPackageDirectories) {
  try {
    const names = await archivedTestNames(directory);
    archivePresent = true;
    for (const name of names) archivedTests.add(name);
  } catch {}
}
if (archivePresent) {
  for (const name of archivedTests) if (!registeredArchiveTests.has(name)) errors.push(`unregistered archived capability: ${name}`);
  for (const name of registeredArchiveTests) if (!archivedTests.has(name)) errors.push(`registered capability has no archived test: ${name}`);
}

for (const [specifier, target] of Object.entries(packageJson.exports)) {
  try {
    await access(join(root, target));
    if (!target.endsWith(".json")) await import(pathToFileURL(join(root, target)));
  } catch (error) {
    errors.push(`broken package export ${specifier} -> ${target}: ${error.message}`);
  }
}
for (const [name, target] of Object.entries(packageJson.bin)) {
  try { await access(join(root, target)); }
  catch { errors.push(`broken executable ${name} -> ${target}`); }
}
// The source-direct package carries no bespoke or drifting external substrate: at most the one
// canonical, house-consolidated math floor, exact-pinned (never a range) so the carrier a `verify`
// run resolves against is the identical carrier that gets packed and published.
const dependencies = packageJson.dependencies ?? {};
const permittedDependencies = { "@lenticule-science/metrologic": /^\d+\.\d+\.\d+$/ };
for (const [name, version] of Object.entries(dependencies)) {
  const exactVersionPattern = permittedDependencies[name];
  if (!exactVersionPattern) errors.push(`dependency not permitted in the source-direct package: ${name}`);
  else if (!exactVersionPattern.test(version)) errors.push(`dependency ${name} must be an exact pinned version, not a range: ${version}`);
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  const archiveStatement = archivePresent ? `the complete ${archivedTests.size}-category archived union` : "the sealed archived register";
  process.stdout.write(`FizzOS capability concordance verified: ${concordance.capabilities.length} mappings cover ${archiveStatement}; ${Object.keys(packageJson.exports).length} exports and ${Object.keys(packageJson.bin).length} executables load from current source.\n`);
}
