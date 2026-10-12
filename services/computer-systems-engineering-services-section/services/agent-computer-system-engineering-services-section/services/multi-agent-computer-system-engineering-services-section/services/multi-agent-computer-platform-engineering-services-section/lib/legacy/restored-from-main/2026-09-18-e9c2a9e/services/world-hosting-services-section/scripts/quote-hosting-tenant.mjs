#!/usr/bin/env node
import { parseArgs } from "node:util";
import { quoteHostingTenant } from "../src/world-hosting.mjs";

/**
 * Compute a hosting quote, accepting either a pre-parsed input object or CLI argv.
 * @param {{tierName: string, estimatedConcurrentPlayers: number}|string[]} input
 * @returns {import("../src/world-hosting.mjs").HostingQuote}
 * @throws {TypeError} on an unknown tier, a missing/invalid player count, or missing CLI args
 */
export function quoteFromInput(input) {
  if (Array.isArray(input)) {
    const { values } = parseArgs({
      args: input,
      options: {
        tier: { type: "string" },
        players: { type: "string" },
      },
    });
    if (!values.tier || !values.players) {
      throw new TypeError("usage: quote-hosting-tenant.mjs --tier <name> --players <count>");
    }
    return quoteHostingTenant({ tierName: values.tier, estimatedConcurrentPlayers: Number(values.players) });
  }
  return quoteHostingTenant(input);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const quote = quoteFromInput(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(quote, null, 2)}\n`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}
