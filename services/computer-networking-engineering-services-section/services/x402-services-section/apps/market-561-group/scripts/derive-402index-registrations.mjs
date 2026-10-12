#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { catalogForRuntime } from "../src/market.mjs";

/**
 * Derive the 402index registration bodies for one face of the market from
 * the catalog, in the field names 402index's own OpenAPI document declares,
 * so a listing is never typed by hand. Usage:
 * derive-402index-registrations [--runtime edge|node] [--contact-email a@b]
 */
export function derive402indexRegistrations({ runtime = "edge", contactEmail } = {}) {
  return catalogForRuntime(runtime).filter(offer => typeof offer.declaration.price === "string").map((offer) => offer.index402Registration({
    provider: "561 Group",
    paymentAsset: "USD Coin",
    paymentNetwork: "Base",
    ...(contactEmail === undefined ? {} : { contactEmail }),
  }));
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

await runMain(async ({ argv }) => derive402indexRegistrations({ runtime: argument(argv, "--runtime") ?? "edge", contactEmail: argument(argv, "--contact-email") }), {
  moduleUrl: import.meta.url,
  formatResult: (result) => `${JSON.stringify(result, null, 2)}\n`,
});
