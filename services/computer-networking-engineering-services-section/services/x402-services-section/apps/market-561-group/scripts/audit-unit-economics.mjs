#!/usr/bin/env node
import { parseArgs } from "node:util";

import { catalog } from "../src/market.mjs";
import { analyzeMarketUnitEconomics } from "../../../src/market/unit-economics.mjs";

/*
 * CEO/CFO readout over the ACTUAL canonical compiled production catalog.
 * Example, only after independently checking published facilitator terms:
 *
 * audit-market-unit-economics \
 *   --fee-atomic 1000 \
 *   --fee-source https://www.coinbase.com/developer-platform/discover/launches/x402facilitator-polygon \
 *   --observed-at 2026-10-13T18:00:00Z \
 *   --minimum-headroom-atomic 500
 *
 * No network calls, secrets, payments, pricing changes or local report files.
 * The externally supplied fee belongs to an observed settlement scenario,
 * not necessarily the merchant's current billed rate or free allowance.
 */
function required(value, flag) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("required --" + flag + " is missing");
  }
  return value;
}

const { values } = parseArgs({
  options: {
    "fee-atomic": { type: "string" },
    "fee-source": { type: "string" },
    "observed-at": { type: "string" },
    "minimum-headroom-atomic": { type: "string" },
    "max-fee-age-days": { type: "string" },
    "detailed": { type: "boolean", default: false }
  },
  strict: true
});

const input = {
  feeAtomic: required(values["fee-atomic"], "fee-atomic"),
  feeSource: required(values["fee-source"], "fee-source"),
  feeObservedAt: required(values["observed-at"], "observed-at"),
  ...(values["minimum-headroom-atomic"] === undefined ? {} :
    { minimumPrecomputeHeadroomAtomic: values["minimum-headroom-atomic"] }),
  ...(values["max-fee-age-days"] === undefined ? {} :
    { maxFeeAgeDays: Number(values["max-fee-age-days"]) })
};

const report = analyzeMarketUnitEconomics(catalog({ admit: false }), input);
const { exposedOffers, ...summary } = report;
process.stdout.write(JSON.stringify(values.detailed ? report : {
  ...summary,
  exposedOperations: exposedOffers.map(({gateway, operation, priceFloorAtomic,
    preComputeHeadroomAtomic, feeOnlyBreakEvenOrWorse, belowSuppliedHeadroomTarget}) => ({
      gateway, operation, priceFloorAtomic, preComputeHeadroomAtomic,
      feeOnlyBreakEvenOrWorse, belowSuppliedHeadroomTarget
    }))
}, null, 2) + "\n");
