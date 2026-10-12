#!/usr/bin/env node
import { runPaymentRequirementAssayCli } from "./payment-requirement-assay.mjs";

try {
  const result = await runPaymentRequirementAssayCli(process.argv.slice(2));
  if (result.help) process.stdout.write("usage: assay-payment-requirements --declaration <path> --network <caip-2> --asset <asset-address>\n");
  else if (result.failed) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`assay-payment-requirements: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
