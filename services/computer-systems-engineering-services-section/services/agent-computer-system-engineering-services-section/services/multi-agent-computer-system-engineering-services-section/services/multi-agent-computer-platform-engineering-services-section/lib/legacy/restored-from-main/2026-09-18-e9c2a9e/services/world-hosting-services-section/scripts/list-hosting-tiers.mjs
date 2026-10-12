#!/usr/bin/env node
import { listHostingTiers } from "../src/world-hosting.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Print the hosting tier catalog as JSON to stdout.
 * @returns {ReadonlyArray<import("../src/world-hosting.mjs").HostingTier>}
 */
export function printHostingTiers() {
  const tiers = listHostingTiers();
  process.stdout.write(`${JSON.stringify(tiers, null, 2)}\n`);
  return tiers;
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "list-hosting-tiers", description: "Print the hosting tier catalog as JSON to stdout.", operation: printHostingTiers }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
