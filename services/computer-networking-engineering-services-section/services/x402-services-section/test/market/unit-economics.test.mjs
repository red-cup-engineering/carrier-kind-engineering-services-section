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
    resourceReadings: [
      { commodity: "CPU:nanosecond", quantity: "1000000" },
      { commodity: "Inference:token", quantity: "12" },
      { commodity: "Network:byte", quantity: "4096" },
      { commodity: "RAM:byte-second", quantity: "4096" },
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
  assert.deepEqual(row.resourceCostEvidence.resourceReadings, receipt.resourceReadings);
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
    marginalCostAtomic: "500", resourceReadings: [{ commodity: "CPU:nanosecond", quantity: "100" }]
  };
  const offers = [{ ...offer("cpu", "3000"), sku: SKU }];
  for (const bad of [
    { sku: "ni:///sha-256;" + "C".repeat(43) },
    { asset: "eip155:5615611/erc20:" + ASSET.toLowerCase() },
    { observedAt: "2026-01-01T00:00:00Z" },
    { marginalCostAtomic: "0.0001" },
    { resourceReadings: [] },
    { resourceReadings: [{commodity:"CPU:nanosecond",quantity:"100"}, {commodity:"CPU:nanosecond",quantity:"101"}] },
    { resourceReadings: [{commodity:"CPU:nanosecond",quantity:"100.5"}] },
    { evidenceNi: "an unaddressed assertion" },
  ]) assert.throws(() => analyzeMarketUnitEconomics(offers, {
    ...scenario, resourceCostReceipts: [{ ...valid, ...bad }]
  }), /resource|cost|SKU|atomic|stale|observation/u);
  assert.throws(() => analyzeMarketUnitEconomics(offers, {
    ...scenario, resourceCostReceipts: [valid, valid]
  }), /duplicate/u);
});
