#!/usr/bin/env node
/** Operator-only startup provisioner for MetroPlat provider delegation. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { defaultFilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { isDirectEntrypoint, processArguments, processDataRootConfig, processEntrypointArgument, processIsoNow, processPackageRoot, runProcessMain, writeProcessStdout } from "@red-cup-engineering/node-process-services-section";
import { admitProviderDelegationAuthoritySource, type ProviderDelegationAuthoritySource } from "../work/provider-delegation-authority.mts";

function argumentValue(args: readonly string[], flag: string): string {
  const matches: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === flag) { matches.push(args[index + 1] ?? ""); index += 1; }
    else if (argument.startsWith(`${flag}=`)) matches.push(argument.slice(flag.length + 1));
  }
  if (matches.length !== 1 || !isAbsolute(matches[0] ?? "")) throw new TypeError(`infograph-provision-provider-delegation-authority-anchor: ${flag} requires one absolute local path`);
  return matches[0]!;
}

function sourceFile(path: string): ProviderDelegationAuthoritySource {
  try { return JSON.parse(readFileSync(path, "utf8")) as ProviderDelegationAuthoritySource; }
  catch (error) { throw new TypeError(`infograph-provision-provider-delegation-authority-anchor: cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}

async function main(): Promise<number> {
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
  void runProcessMain(main, { name: "infograph-provision-provider-delegation-authority-anchor" });
}
