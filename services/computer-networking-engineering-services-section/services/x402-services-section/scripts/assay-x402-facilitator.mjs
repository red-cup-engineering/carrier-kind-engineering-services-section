/**
 * Assay one or more x402 facilitators and record the receipt through the
 * house semantic record journal. Read-only against every probed facilitator.
 *   node scripts/assay-x402-facilitator.mjs [--network eip155:8453] [--rpc URL] [--no-record] <facilitatorUrl>...
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

import { assayX402Facilitator } from "../src/facilitator-assay.mjs";

/** This package's own root, the semantic-record-journal custody root for facilitator assay receipts. */
export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The store type facilitator assay receipts are written under. */
export const FACILITATOR_ASSAY_TYPE = "facilitator-assay";

/**
 * Record one facilitator assay result into this section's semantic record journal.
 * @param {object} assayResult the object returned by {@link assayX402Facilitator}
 * @param {{dataRoot?: string, recordedAt?: string}} [options]
 * @returns {{id: string}} the address of the recorded assay
 */
export function recordFacilitatorAssay(assayResult, options = {}) {
  const dataRoot = resolve(options.dataRoot ?? NODE_ROOT);
  return { id: put(dataRoot, FACILITATOR_ASSAY_TYPE, { ...assayResult, at: options.recordedAt ?? new Date().toISOString() }) };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

if (import.meta.main) {
  const network = arg("network", "eip155:8453");
  const rpcUrl = arg("rpc", "https://mainnet.base.org");
  const record = !process.argv.includes("--no-record");
  const facilitatorUrls = process.argv.slice(2).filter((value) => /^https:\/\//u.test(value));
  if (facilitatorUrls.length === 0) {
    process.stderr.write("usage: assay-x402-facilitator.mjs [--network eip155:8453] [--rpc URL] [--no-record] <facilitatorUrl>...\n");
    process.exitCode = 2;
  } else {
    const results = [];
    for (const facilitatorUrl of facilitatorUrls) {
      const result = await assayX402Facilitator({ facilitatorUrl, network, rpcUrl });
      results.push(result);
      const receipt = record ? recordFacilitatorAssay(result) : { id: "not-recorded" };
      process.stdout.write(`${JSON.stringify({ ...result, journalReceiptId: receipt.id }, null, 2)}\n`);
      process.stderr.write(
        `${result.facilitatorUrl}: ${result.qualified ? "QUALIFIED" : "FAILED"}` +
        (result.qualified ? "" : ` -- ${result.problems.join("; ")}`) + "\n",
      );
    }
    process.exitCode = results.every((result) => result.qualified) ? 0 : 1;
  }
}
