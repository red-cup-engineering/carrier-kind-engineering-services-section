#!/usr/bin/env node
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { paidSellerRows } from "../src/market.mjs";

/**
 * Derive the house seller catalog (the rows the comptroller's paid-sellers
 * assay observes against) from the market catalog on one set of rails, so
 * the catalog is never authored a second time by hand.
 *
 * Usage: derive-paid-sellers <output.json> [--pay-to 0x...] [--network eip155:8453] [--asset 0x...]
 */
export function derivePaidSellers({ network = "eip155:8453", asset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo } = {}) {
  if (!payTo) throw new Error("--pay-to is required: the ruled payout address is a deployment value, never a source constant");
  return {
    note: "Derived from x402-services-section/data/market-561-group/records/catalog.json by derive-paid-sellers; do not hand-edit. One row per priced route the market sells, for the comptroller's paid-sellers assay to observe against.",
    network,
    asset: asset,
    payTo,
    rows: paidSellerRows({ network, asset, payTo }),
  };
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

await runMain(async ({ argv }) => {
  const [output, ...rest] = argv;
  if (!output || output.startsWith("--")) throw new Error("Usage: derive-paid-sellers <output.json> --pay-to 0x... [--network eip155:8453] [--asset 0x...]");
  const record = derivePaidSellers({ network: argument(rest, "--network"), asset: argument(rest, "--asset"), payTo: argument(rest, "--pay-to") });
  await writeFileText(output, `${JSON.stringify(record, null, 2)}\n`);
  return { output, rows: record.rows.length };
}, { moduleUrl: import.meta.url, formatResult: (result) => `${JSON.stringify(result)}\n` });
