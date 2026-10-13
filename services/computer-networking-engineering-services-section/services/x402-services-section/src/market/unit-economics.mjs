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
  now = new Date(),
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
  const seen = new Set();
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
      feeOnlyBreakEvenOrWorse: underFee,
      belowSuppliedHeadroomTarget: underHeadroom,
      finalContributionMarginAtomic: null,
      realizedRevenueAtomic: null
    });
  });
  const live = rows.filter(r => r.listed);
  const comparable = live.filter(r => r.comparable);
  const exposed = comparable.filter(r => r.feeOnlyBreakEvenOrWorse || r.belowSuppliedHeadroomTarget);
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
      "Compute, R2, bandwidth, support, refunds, payment failures and financing costs are unknown",
      "Offsite referrals and paid transactions require independent observations, not this catalog"
    ],
    totalOffers: rows.length,
    listedOffers: live.length,
    comparableOffers: comparable.length,
    atOrBelowFeeCount: comparable.filter(r => r.feeOnlyBreakEvenOrWorse).length,
    belowTargetHeadroomCount: headroom === null ? null :
      comparable.filter(r => r.belowSuppliedHeadroomTarget).length,
    nonComparableCount: live.length - comparable.length,
    exposedOffers: exposed,
    gateways: Object.fromEntries([...gateways].sort(([a],[b]) => a.localeCompare(b))),
    finalContributionMargin: "unknown",
    actualTransactions: "not observed"
  });
}
