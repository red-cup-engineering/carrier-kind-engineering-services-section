#!/usr/bin/env node
/** Operator-only startup provisioner for MetroPlat provider delegation. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";
import { writeProcessStdout } from "@red-cup-engineering/node-process-services-section/stdio";
import { admitProviderDelegationAuthoritySource } from "@red-cup-engineering/feltos/work/provider-delegation-authority";

function argumentValue(args, flag) {
  const matches = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === flag) { matches.push(args[index + 1] ?? ""); index += 1; }
    else if (argument.startsWith(`${flag}=`)) matches.push(argument.slice(flag.length + 1));
  }
  if (matches.length !== 1 || !isAbsolute(matches[0] ?? "")) throw new TypeError(`metroplat-provision-provider-delegation-authority-anchor: ${flag} requires one absolute local path`);
  return matches[0];
}

function sourceFile(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { throw new TypeError(`metroplat-provision-provider-delegation-authority-anchor: cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}

async function main() {
  const args = processArguments();
  const rootSourcePath = argumentValue(args, "--root-source");
  const delegationSourcePath = argumentValue(args, "--delegation-source");
  const anchorPath = argumentValue(args, "--anchor");
  const dataRoot = processDataRootConfig({ defaultRoot: processPackageRoot(import.meta.url), args, envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json", configEnvName: "METROPLAT_CONFIG", legacyEnvNames: Object.freeze(["METROPLAT_DATA"]) }).dataRoot;
  const binding = defaultFilesystemBinding(dataRoot, { packageRoot: processPackageRoot(import.meta.url), now: processIsoNow });
  const at = processIsoNow();
  const rootReceipt = admitProviderDelegationAuthoritySource(binding, sourceFile(rootSourcePath), at);
  const delegationReceipt = admitProviderDelegationAuthoritySource(binding, sourceFile(delegationSourcePath), at);
  mkdirSync(dirname(anchorPath), { recursive: true });
  writeFileSync(anchorPath, `${JSON.stringify({ rootReceipt, delegationReceipts: [delegationReceipt] }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  writeProcessStdout(`${JSON.stringify({ kind: "metroplat.provider-delegation-authority-anchor", anchor: anchorPath, rootReceipt, delegationReceipts: [delegationReceipt] })}\n`);
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "metroplat-provision-provider-delegation-authority-anchor" });
}
