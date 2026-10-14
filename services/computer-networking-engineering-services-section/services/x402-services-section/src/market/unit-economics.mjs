/**
 * Read-only, scenario-specific contribution margin exposure for native x402
 * offers. Consumes the SAME admitted offers the real market sells: each
 * offer's .amount is produced by offer.js's one priceAtomicUnits conversion.
 *
 * A quoted USDC price is not realized income; a USD facilitator fee is not
 * a USDC transfer. The comparison below explicitly assumes USD/USDC parity
 * for planning, never claiming actual FX, billing, compute or customer sales.
 * No re-pricing, payment, transaction, provider or event store is created.
 */

const AMOUNT = /^(?:0|[1-9][0-9]{0,77})$/u;
const HTTPS = /^https:\/\//u;
const BASE_USDC = "0x833589fcD6eDb6e08f4c7C32D4f71b54bdA02913".toLowerCase();
const MAX_AMOUNT = (1n << 256n) - 1n;
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const BASE_USDC_ASSET = "eip155:8453/erc20:" + BASE_USDC;

function admitResourceCostReceipts(receipts, { now, maxAgeDays } = {}) {
  if (!Array.isArray(receipts) || receipts.length > 10_000) {
    throw new TypeError("resourceCostReceipts must be a bounded array");
  }
  const records = new Map();
  for (const [index, entry] of receipts.entries()) {
    if (typeof entry?.sku !== "string" || !NI.test(entry.sku) ||
        typeof entry.source !== "string" || !HTTPS.test(entry.source) ||
        typeof entry.evidenceNi !== "string" || !NI.test(entry.evidenceNi) ||
        entry.asset?.toLowerCase() !== BASE_USDC_ASSET) {
      throw new TypeError("resource cost receipt " + index + " requires one SKU, canonical evidence NI, HTTPS source and Base USDC denomination");
    }
    if (records.has(entry.sku)) throw new TypeError("duplicate cost receipt for one SKU");
    const stamp = observedInstant(entry.observedAt);
    if (stamp > now.getTime() || now.getTime() - stamp > maxAgeDays * 86_400_000) {
      throw new TypeError("resource cost receipt is future-dated or stale");
    }
    const cost = atomic(entry.marginalCostAtomic, "resourceCostReceipts.marginalCostAtomic");
    if (!Array.isArray(entry.resourceReadings) || entry.resourceReadings.length < 1 ||
        entry.resourceReadings.length > 32) {
      throw new TypeError("resource cost receipt requires bounded typed resource readings");
    }
    const seen = new Set();
    const readings = entry.resourceReadings.map(({commodity, quantity}) => {
      if (typeof commodity !== "string" || !/^[A-Za-z][A-Za-z0-9:._/-]{0,99}$/u.test(commodity) ||
          seen.has(commodity)) throw new TypeError("resource reading must have a unique typed commodity");
      seen.add(commodity);
      return Object.freeze({commodity, quantity: atomic(quantity, "resource quantity").toString()});
    });
    records.set(entry.sku, Object.freeze({
      sku: entry.sku, source: entry.source, evidenceNi: entry.evidenceNi,
      observedAt: entry.observedAt, asset: BASE_USDC_ASSET,
      marginalCostAtomic: cost.toString(), resourceReadings: Object.freeze(readings),
    }));
  }
  return records;
}


function atomic(value, name) {
  if (typeof value !== "string" || !AMOUNT.test(value) || BigInt(value) > MAX_AMOUNT) {
    throw new TypeError(name + " must be a canonical, bounded nonnegative atomic-unit string");
  }
  return BigInt(value);
}

function observedInstant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new TypeError("facilitator fee observation must carry an ISO-8601 UTC instant");
  }
  return Date.parse(value);
}

function priceEligible(declaration, price) {
  if (typeof declaration.price === "string") return true;
  if (!declaration.price || typeof declaration.price !== "object") return false;
  // Native cross-asset prices are NOT USD equivalents and must never be
  // ordered or subtracted from a USD-denominated fee without a quote.
  return String(declaration.price.asset).toLowerCase() ===
    "eip155:8453/erc20:" + BASE_USDC && price >= 0n;
}

/**
 * Analyze the observable offer price floor against a *supplied* currently
 * sourced fee scenario. Missing compute/support costs stay unknown.
 *
 * @param {readonly object[]} offers Admitted market offers with amount and declaration
 * @param {object} input Source-stamped facilitator fee and optional headroom threshold
 */
export function analyzeMarketUnitEconomics(offers, {
  feeAtomic, feeSource, feeObservedAt,
  network = "eip155:8453",
  asset = BASE_USDC,
  minimumPrecomputeHeadroomAtomic,
  resourceCostReceipts = [],
  now, // a clock observation belongs to the effectful caller, not the pure calculation
  maxFeeAgeDays = 30
} = {}) {
  if (!Array.isArray(offers)) throw new TypeError("admitted offers array is required");
  if (network !== "eip155:8453" || String(asset).toLowerCase() !== BASE_USDC) {
    throw new TypeError("the fee scenario is only defined for Base USDC");
  }
  const fee = atomic(feeAtomic, "feeAtomic");
  if (fee === 0n) throw new TypeError("the beyond-free fee must be positive; free allowances are separate");
  if (typeof feeSource !== "string" || !HTTPS.test(feeSource)) {
    throw new TypeError("fee source must be an HTTPS provider publication");
  }
  const timestamp = observedInstant(feeObservedAt);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !Number.isFinite(maxFeeAgeDays) || maxFeeAgeDays < 0 ||
      timestamp > now.getTime() || now.getTime() - timestamp > maxFeeAgeDays * 86_400_000) {
    throw new TypeError("facilitator fee observation is future dated or stale");
  }
  const headroom = minimumPrecomputeHeadroomAtomic === undefined
    ? null : atomic(minimumPrecomputeHeadroomAtomic, "minimumPrecomputeHeadroomAtomic");
  const costs = admitResourceCostReceipts(resourceCostReceipts, { now, maxAgeDays: maxFeeAgeDays });
  const seen = new Set();
  const seenSkus = new Set();
  const rows = offers.map((offer, index) => {
    const d = offer?.declaration;
    if (d === null || typeof d !== "object" ||
        typeof d.gateway !== "string" || typeof d.operation !== "string") {
      throw new TypeError("each offer requires its admitted declaration");
    }
    const identity = d.gateway + "/" + d.operation;
    if (seen.has(identity)) throw new TypeError("duplicate marketed operation: " + identity);
    seen.add(identity);
    const price = atomic(offer.amount, "offer.amount");
    const listed = d.listed !== false;
    const comparable = priceEligible(d, price);
    const beforeCompute = comparable ? price - fee : null;
    const receipt = costs.get(offer.sku);
    if (receipt) seenSkus.add(offer.sku);
    const resourceCost = receipt === undefined ? null : BigInt(receipt.marginalCostAtomic);
    const modeledContribution = comparable && resourceCost !== null
      ? beforeCompute - resourceCost : null;
    const underFee = listed && beforeCompute !== null && beforeCompute <= 0n;
    const underHeadroom = listed && beforeCompute !== null &&
      headroom !== null && beforeCompute < headroom;
    return Object.freeze({
      gateway: d.gateway,
      operation: d.operation,
      route: d.route ?? null,
      runtime: d.runtime ?? "edge",
      listed,
      comparable,
      // A request tariff may charge more based on admitted content size.
      quoteBasis: d.requestPricing === undefined ? "fixed" : "starting-tariff",
      priceFloorAtomic: price.toString(),
      feeScenarioAtomic: comparable ? fee.toString() : null,
      preComputeHeadroomAtomic: beforeCompute === null ? null : beforeCompute.toString(),
      resourceCostEvidence: receipt === undefined ? null : receipt,
      modeledContributionAtomic: modeledContribution === null ? null : modeledContribution.toString(),
      modeledContributionBelowZero: listed && modeledContribution !== null && modeledContribution < 0n,
      feeOnlyBreakEvenOrWorse: underFee,
      belowSuppliedHeadroomTarget: underHeadroom,
      finalContributionMarginAtomic: null,
      realizedRevenueAtomic: null
    });
  });
  if (seenSkus.size !== costs.size) {
    throw new TypeError("resource cost receipt SKU is not in the admitted market catalog");
  }
  const live = rows.filter(r => r.listed);
  const comparable = live.filter(r => r.comparable);
  const exposed = comparable.filter(r => r.feeOnlyBreakEvenOrWorse || r.belowSuppliedHeadroomTarget || r.modeledContributionBelowZero);
  const gateways = new Map();
  for (const row of live) {
    const count = gateways.get(row.gateway) ?? {
      offers: 0, atOrBelowFee: 0, belowTargetHeadroom: 0, nonComparable: 0
    };
    count.offers++;
    if (row.feeOnlyBreakEvenOrWorse) count.atOrBelowFee++;
    if (row.belowSuppliedHeadroomTarget) count.belowTargetHeadroom++;
    if (!row.comparable) count.nonComparable++;
    gateways.set(row.gateway, count);
  }
  return Object.freeze({
    kind: "x402-market-unit-economics-scenario",
    basis: "admitted-offer-floors-vs-facilitator-fee",
    settlement: { network, asset: BASE_USDC, decimals: 6 },
    facilitatorScenario: {
      feeAtomic: fee.toString(), feeSource, feeObservedAt,
      ...(headroom === null ? {} : { minimumPrecomputeHeadroomAtomic: headroom.toString() })
    },
    assumptions: [
      "USDC denominated offer prices compared with a USD facilitator fee at 1:1 for planning only",
      "Beyond-free marginal fee; no claim about remaining wallet fee allowance or account-specific discounts",
      "Offer price floor is not a realized paid request; request-priced calls may charge more",
      "Compute, R2, bandwidth, support, refunds, payment failures and financing costs are unknown unless explicitly sourced cost observations were supplied",
      "Resource readings preserve commodity grades and exact quantities; no implicit conversion into money or attribution of process-wide cost",
      "Modeled contributions are scenario arithmetic, never booked cash, independently received payment, or realized profit",
      "Offsite referrals and paid transactions require independent observations, not this catalog"
    ],
    totalOffers: rows.length,
    listedOffers: live.length,
    comparableOffers: comparable.length,
    atOrBelowFeeCount: comparable.filter(r => r.feeOnlyBreakEvenOrWorse).length,
    belowTargetHeadroomCount: headroom === null ? null :
      comparable.filter(r => r.belowSuppliedHeadroomTarget).length,
    nonComparableCount: live.length - comparable.length,
    costReceiptsMatched: seenSkus.size,
    modeledLossMakingCount: live.filter(r => r.modeledContributionBelowZero).length,
    modeledMarginsWithoutCostEvidence: comparable.filter(r => r.resourceCostEvidence === null).length,
    exposedOffers: exposed,
    gateways: Object.fromEntries([...gateways].sort(([a],[b]) => a.localeCompare(b))),
    finalContributionMargin: "unknown",
    actualTransactions: "not observed"
  });
}
