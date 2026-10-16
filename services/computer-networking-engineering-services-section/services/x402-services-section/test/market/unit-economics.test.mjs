import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMarketUnitEconomics } from "../../src/market/unit-economics.mjs";

const NOW = new Date("2026-10-13T18:00:00.000Z");
const ASSET = "0x833589fcD6eDb6e08f4c7C32D4f71b54bdA02913";
const scenario = {
  feeAtomic: "1000",
  feeSource: "https://www.coinbase.com/developer-platform/discover/launches/x402facilitator-polygon",
  feeObservedAt: "2026-10-13T17:59:00Z",
  minimumPrecomputeHeadroomAtomic: "500",
  now: NOW
};
const ACTORS = Object.freeze({
  supplierActorRef: "urn:ame:red-cup-compute",
  consumerActorRef: "urn:ame:causeway-market",
});
const reading = (resource, unit, numerator, denominator = "1") =>
  ({ resource, unit, amount: { numerator, denominator } });

function offer(operation, amount, overrides = {}) {
  return {
    amount,
    declaration: {
      gateway: "data",
      operation, route: "/v1/data/" + operation,
      price: "$" + (Number(amount) / 1_000_000).toFixed(6),
      ...(overrides.declaration ?? {})
    }
  };
}

test("one canonical catalog produces actionable fee-only warnings, not fake profits", () => {
  const offers = [
    offer("free-margin", "1000"),
    offer("codec", "1200"),
    offer("livable", "4000"),
    offer("dynamic", "1200", { declaration: { requestPricing: { minimumAtomic: "1200" } } }),
    offer("hidden", "900", { declaration: { listed: false } }),
  ];
  const r = analyzeMarketUnitEconomics(offers, scenario);
  assert.equal(r.totalOffers, 5);
  assert.equal(r.listedOffers, 4);
  assert.equal(r.comparableOffers, 4);
  assert.equal(r.atOrBelowFeeCount, 1);
  assert.equal(r.belowTargetHeadroomCount, 3);
  assert.equal(r.gateways.data.atOrBelowFee, 1);
  assert.deepEqual(r.exposedOffers.map(x => x.operation), ["free-margin","codec","dynamic"]);
  assert.equal(r.exposedOffers.find(x => x.operation === "codec").preComputeHeadroomAtomic, "200");
  assert.equal(r.exposedOffers.find(x => x.operation === "dynamic").quoteBasis, "starting-tariff");
  assert.equal(r.finalContributionMargin, "unknown");
  assert.equal(r.actualTransactions, "not observed");
  assert.equal(r.exposedOffers[0].realizedRevenueAtomic, null);
});

test("unit-economics engine has no ambient clock; owner must supply exact observation time", () => {
  const inputs = [offer("one", "1200")];
  assert.throws(() => analyzeMarketUnitEconomics(inputs, { ...scenario, now: undefined }), /stale|future dated/u);
  assert.throws(() => analyzeMarketUnitEconomics(inputs, { ...scenario, now: "2026-10-13T18:00:00Z" }), /stale|future dated/u);
  const one = analyzeMarketUnitEconomics(inputs, scenario);
  const again = analyzeMarketUnitEconomics(inputs, { ...scenario, now: new Date(NOW.toISOString()) });
  assert.deepEqual(one, again, "same typed clock and offers produce identical evidence");
});

test("unclear native settlement asset never becomes a fictitious USD comparison", () => {
  const native = offer("other-asset", "10", { declaration: {
    price: { amountAtomic: "10", asset: "eip155:8453/erc20:0x1234567890123456789012345678901234567890" }
  } });
  const r = analyzeMarketUnitEconomics([native], scenario);
  assert.equal(r.nonComparableCount, 1);
  assert.equal(r.atOrBelowFeeCount, 0);
  assert.equal(r.exposedOffers.length, 0);
  assert.equal(r.gateways.data.nonComparable, 1);
});

test("a fee scenario is never silently inferred from missing or stale provider prices", () => {
  const one = [offer("codec", "1200")];
  for (const invalid of [
    { ...scenario, feeAtomic: undefined },
    { ...scenario, feeAtomic: "1e3" },
    { ...scenario, feeAtomic: "-100" },
    { ...scenario, feeSource: "" },
    { ...scenario, feeObservedAt: "2026-09-01T10:00:00Z" },
    { ...scenario, feeObservedAt: "2026-10-14T00:00:00Z" },
    { ...scenario, network: "eip155:1" },
    { ...scenario, asset: "0x1111111111111111111111111111111111111111" }
  ]) assert.throws(() => analyzeMarketUnitEconomics(one, invalid), /fee|scenario|observation|Base USDC|source/u);
});

test("the report refuses duplicate economic identities and malformed prices", () => {
  assert.throws(() => analyzeMarketUnitEconomics([offer("a", "1000"),offer("a", "1200")], scenario), /duplicate/u);
  assert.throws(() => analyzeMarketUnitEconomics([offer("a", "0.0012")], scenario), /atomic/u);
  assert.throws(() => analyzeMarketUnitEconomics([offer("a", "0001200")], scenario), /atomic/u);
});

test("without an explicit reserve there is no invented floor on compute", () => {
  const { minimumPrecomputeHeadroomAtomic, ...without } = scenario;
  const r = analyzeMarketUnitEconomics([offer("codec", "1200")], without);
  assert.equal(r.belowTargetHeadroomCount, null);
  assert.deepEqual(r.exposedOffers, []);
  assert.equal(r.gateways.data.belowTargetHeadroom, 0);
});


test("graded resource receipts contribute to scenario economics without falsifying observed cash", () => {
  const SKU = "ni:///sha-256;" + "A".repeat(43);
  const receipt = {
    sku: SKU,
    source: "https://evidence.example.test/compute-costs",
    evidenceNi: "ni:///sha-256;" + "B".repeat(43),
    observedAt: "2026-10-13T17:59:00Z",
    asset: "eip155:8453/erc20:" + ASSET.toLowerCase(),
    marginalCostAtomic: "2500",
    ...ACTORS,
    resourceReadings: [
      reading("cpu-runtime", "millisecond", "1000"),
      reading("inference-output", "token", "12"),
      reading("network-egress", "byte", "4096"),
      reading("ram-residency", "byte-second", "4096"),
    ]
  };
  const offers = [{ ...offer("compute", "3000"), sku: SKU }];
  const r = analyzeMarketUnitEconomics(offers, { ...scenario, resourceCostReceipts: [receipt] });
  assert.equal(r.costReceiptsMatched, 1);
  assert.equal(r.modeledLossMakingCount, 1);
  assert.equal(r.modeledMarginsWithoutCostEvidence, 0);
  assert.equal(r.exposedOffers.length, 1);
  assert.equal(r.exposedOffers[0].modeledContributionAtomic, "-500");
  const row = analyzeMarketUnitEconomics(offers, { ...scenario, resourceCostReceipts: [receipt],
    minimumPrecomputeHeadroomAtomic: "3000" }).exposedOffers[0];
  assert.equal(row.preComputeHeadroomAtomic, "2000");
  assert.equal(row.modeledContributionAtomic, "-500");
  assert.equal(row.modeledContributionBelowZero, true);
  assert.deepEqual(row.resourceCostEvidence.resourceReadings.map(({ resource, unit, amount }) =>
    ({ resource, unit, amount })), [
    reading("cpu-runtime", "s", "1"),
    reading("inference-output", "{token}", "12"),
    reading("network-egress", "By", "4096"),
    reading("ram-residency", "By.s", "4096"),
  ]);
  assert.equal(row.resourceCostEvidence.supplierActorRef, ACTORS.supplierActorRef);
  assert.equal(row.resourceCostEvidence.consumerActorRef, ACTORS.consumerActorRef);
  assert.ok(row.resourceCostEvidence.resourceReadings[0].grade.includes(ACTORS.consumerActorRef));
  assert.equal(row.finalContributionMarginAtomic, null);
  assert.equal(row.realizedRevenueAtomic, null);
  const unknown = analyzeMarketUnitEconomics(offers, scenario);
  assert.equal(unknown.costReceiptsMatched, 0);
  assert.equal(unknown.modeledMarginsWithoutCostEvidence, 1);
  assert.equal(unknown.modeledLossMakingCount, 0);
});

test("cost evidence cannot silently cross unit, identity, freshness or provenance boundaries", () => {
  const SKU = "ni:///sha-256;" + "A".repeat(43);
  const valid = {
    sku: SKU, source: "https://costs.example.test/witness",
    evidenceNi: "ni:///sha-256;" + "B".repeat(43),
    observedAt: "2026-10-13T17:59:00Z",
    asset: "eip155:8453/erc20:" + ASSET.toLowerCase(),
    marginalCostAtomic: "500", ...ACTORS,
    resourceReadings: [reading("cpu-runtime", "millisecond", "100")]
  };
  const offers = [{ ...offer("cpu", "3000"), sku: SKU }];
  for (const bad of [
    { sku: "ni:///sha-256;" + "C".repeat(43) },
    { asset: "eip155:5615611/erc20:" + ASSET.toLowerCase() },
    { observedAt: "2026-01-01T00:00:00Z" },
    { marginalCostAtomic: "0.0001" },
    { resourceReadings: [] },
    { resourceReadings: [reading("cpu-runtime", "millisecond", "100"),
      reading("cpu-runtime", "s", "1")] },
    { resourceReadings: [reading("cpu-runtime", "millisecond", "100.5")] },
    { resourceReadings: [reading("energy", "USD", "1")] },
    { resourceReadings: [{commodity:"CPU:nanosecond",quantity:"100"}] },
    { supplierActorRef: undefined },
    { consumerActorRef: "unscoped-market" },
    { evidenceNi: "an unaddressed assertion" },
  ]) assert.throws(() => analyzeMarketUnitEconomics(offers, {
    ...scenario, resourceCostReceipts: [{ ...valid, ...bad }]
  }), /resource|cost|SKU|atomic|stale|observation|actor|grade/u);
  assert.throws(() => analyzeMarketUnitEconomics(offers, {
    ...scenario, resourceCostReceipts: [valid, valid]
  }), /duplicate/u);
});


test("facilitator and resource observations reject nonexistent UTC dates", () => {
  const simple = [offer("codec", "1200")];
  // Date.parse silently normalizes Feb 30 to Mar 2; commercial evidence must not.
  assert.throws(() => analyzeMarketUnitEconomics(simple, {
    ...scenario,
    feeObservedAt: "2026-02-30T12:00:00Z",
    now: new Date("2026-03-03T00:00:00Z"),
  }), /UTC instant/u);
  assert.throws(() => analyzeMarketUnitEconomics(simple, {
    ...scenario,
    feeObservedAt: "2026-04-31T12:00:00Z",
    now: new Date("2026-05-02T00:00:00Z"),
  }), /UTC instant/u);

  const sku = "ni:///sha-256;" + "A".repeat(43);
  const receipt = {
    sku, source: "https://example.org/observed-costs",
    evidenceNi: "ni:///sha-256;" + "B".repeat(43),
    observedAt: "2026-04-31T12:00:00Z",
    asset: "eip155:8453/erc20:" + ASSET.toLowerCase(),
    marginalCostAtomic: "100", ...ACTORS,
    resourceReadings: [reading("cpu-runtime", "millisecond", "1000")],
  };
  assert.throws(() => analyzeMarketUnitEconomics([{ ...simple[0], sku }], {
    ...scenario,
    feeObservedAt: "2026-05-01T12:00:00Z",
    now: new Date("2026-05-02T00:00:00Z"),
    resourceCostReceipts: [receipt],
  }), /UTC instant/u);
});


const SKU = "ni:///sha-256;" + "A".repeat(43);
const EVIDENCE_NI = "ni:///sha-256;" + "B".repeat(43);

test("fee/headroom plans source-bound exact decimal replacement prices without changing sale contracts", () => {
  const source = { ...offer("codec", "1000"), sku: SKU };
  const report = analyzeMarketUnitEconomics([source], scenario);
  assert.equal(report.tariffCandidateCount, 1);
  assert.deepEqual(report.tariffCandidates[0], {
    state: "catalogue-amendment-candidate", sku: SKU, declarationIndex: 0,
    gateway: "data", operation: "codec", route: "/v1/data/codec",
    originalPrice: "$0.001000", replacementPrice: "$0.0015",
    minimumScenarioPriceAtomic: "1500", requiredIncreaseAtomic: "500",
    resourceCostObserved: false, limitedToFeeAndHeadroom: true,
    commercialEffect: false
  });
  assert.equal(source.declaration.price, "$0.001000", "analysis cannot change a marketed offer");
  assert.equal(report.actualTransactions, "not observed");
});

test("held, hidden, missing-identity, and cross-asset offers cannot produce payable price amendments", () => {
  const held = { ...offer("held", "1000"), sku: SKU, declaration: {
    ...offer("held", "1000").declaration, saleStatus: "held"
  } };
  const hidden = { ...offer("hidden", "1000"), sku: EVIDENCE_NI, declaration: {
    ...offer("hidden", "1000").declaration, listed: false
  } };
  const unbound = offer("unbound", "1000");
  const native = { ...offer("native", "1000"), sku: "ni:///sha-256;" + "C".repeat(43),
    declaration: { ...offer("native", "1000").declaration,
      price: { amountAtomic: "1000", asset: "eip155:8453/erc20:0x1111111111111111111111111111111111111111" } } };
  const result = analyzeMarketUnitEconomics([held, hidden, unbound, native], scenario);
  assert.equal(result.listedOffers, 2, "one unbound and one incomparable native offer are listed");
  assert.equal(result.nonComparableCount, 1);
  assert.equal(result.tariffCandidateCount, 0);
  assert.deepEqual(result.exposedOffers.map(row => row.operation), ["unbound"]);
});

test("cost-backed target yields an actual candidate floor, never unknown-cost fiction", () => {
  const original = { ...offer("measured", "3000"), sku: SKU };
  const cost = {
    sku: SKU, source: "https://evidence.example.test/cost", evidenceNi: EVIDENCE_NI,
    observedAt: "2026-10-13T17:59:00Z", asset: "eip155:8453/erc20:" + ASSET.toLowerCase(),
    marginalCostAtomic: "2500", ...ACTORS,
    resourceReadings: [reading("cpu-runtime", "millisecond", "100")]
  };
  const candidate = analyzeMarketUnitEconomics([original], {
    ...scenario, resourceCostReceipts: [cost], minimumNetContributionAtomic: "400"
  });
  assert.equal(candidate.tariffCandidateCount, 1);
  assert.equal(candidate.tariffCandidates[0].replacementPrice, "$0.0039");
  assert.equal(candidate.tariffCandidates[0].requiredIncreaseAtomic, "900");
  assert.equal(candidate.tariffCandidates[0].resourceCostObserved, true);
  const unknown = analyzeMarketUnitEconomics([original], {
    ...scenario, minimumNetContributionAtomic: "400"
  });
  assert.equal(unknown.tariffCandidateCount, 0);
  assert.equal(unknown.tariffBlockedForUnknownCosts, 1);
});

test("bounded request tariffs reject a proposed floor above their existing cap", () => {
  const original = { ...offer("band", "1000"), sku: SKU, declaration: {
    ...offer("band", "1000").declaration,
    requestPricing: { maximumAtomic: "1400" }
  } };
  const r = analyzeMarketUnitEconomics([original], scenario);
  assert.equal(r.tariffCandidates.length, 0);
  assert.equal(r.tariffBlockedForMaximum, 1);
  assert.equal(r.exposedOffers[0].priceCandidate.state, "request-tariff-maximum-blocks-price");
  assert.equal(r.exposedOffers[0].priceCandidate.replacementPrice, null);
});

test("without a priced objective, preserve an unknown instead of inventing a price plan", () => {
  const { minimumPrecomputeHeadroomAtomic, ...onlyFee } = scenario;
  const r = analyzeMarketUnitEconomics([{ ...offer("unpriced", "1200"), sku: SKU }], onlyFee);
  assert.equal(r.tariffCandidateCount, 0);
  assert.equal(r.exposedOffers.length, 0);
});
