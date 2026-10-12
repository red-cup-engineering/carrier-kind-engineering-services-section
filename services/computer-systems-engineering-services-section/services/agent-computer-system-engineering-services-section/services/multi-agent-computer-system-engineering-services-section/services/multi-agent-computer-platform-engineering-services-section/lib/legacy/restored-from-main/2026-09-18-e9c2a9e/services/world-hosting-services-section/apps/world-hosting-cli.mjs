#!/usr/bin/env node
import { listHostingTiers } from "../src/world-hosting.mjs";
import { quoteFromInput } from "../scripts/quote-hosting-tenant.mjs";
import { provisionTenantWorkspace } from "../scripts/provision-tenant-workspace.mjs";

/**
 * Compose the world-hosting scripts and src into one CLI face: `list`, `quote`, `provision`.
 * @param {string[]} argv - subcommand plus its own arguments (process.argv.slice(2))
 * @returns {Promise<unknown>} the subcommand's result
 * @throws {TypeError} on a missing/unknown subcommand or required argument
 */
export async function runWorldHostingCli(argv) {
  const [command, ...rest] = argv;
  if (command === "list") return listHostingTiers();
  if (command === "quote") return quoteFromInput(rest);
  if (command === "provision") {
    const flags = new Map();
    for (let index = 0; index < rest.length; index += 2) flags.set(rest[index], rest[index + 1]);
    const tenantId = flags.get("--tenant");
    const tier = flags.get("--tier");
    const dataRoot = flags.get("--data-root");
    if (!tenantId || !tier || !dataRoot) {
      throw new TypeError("usage: world-hosting-cli.mjs provision --tenant <id> --tier <name> --data-root <absolute-path>");
    }
    return provisionTenantWorkspace({ tenantId, tier, dataRoot });
  }
  throw new TypeError(`unknown world-hosting-cli command: ${String(command)} (expected: list, quote, provision)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runWorldHostingCli(process.argv.slice(2));
    if (result !== undefined) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}
