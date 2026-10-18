import test from "node:test";
import assert from "node:assert/strict";
import { observationOptions, observeMarketReport, readBazaarPage } from "../../apps/observe-market.mjs";

const PAY_TO = "0x" + "ab".repeat(20);
const MERCHANT = { endpoint: "https://discovery.example.test/merchant", payTo: PAY_TO };
const onchain = async () => ({
  ok: true, asset: "0x" + "cd".repeat(20),
  measured: { authorizations: 99, distinctAuthorizers: 10, provenance: { chainId: 8453 } },
  extrapolated: { authorizationsPer30Days: 9900 },
  caveat: "EIP-3009 is not exclusively x402",
});
const entry = (id, calls, payers) => ({
  resource: "https://seller.example.test/" + id,
  accepts: [{ amount: "1000", asset: "0x" + "cd".repeat(20),
    network: "eip155:8453", payTo: PAY_TO }],
  quality: { l30DaysTotalCalls: calls, l30DaysUniquePayers: payers,
    lastCalledAt: "2026-10-17T18:00:00Z" },
});
const page = (resources, total = resources.length) => ({
  payTo: PAY_TO, pagination: { total }, resources,
});
const environment = (fetchJson) => ({
  chainObserver: onchain, fetchJson, now: () => new Date("2026-10-17T23:00:00Z"),
});

test("the unscoped Base observation never queries a global Bazaar resource count as calls", async () => {
  const opts = observationOptions(["--window", "90"]);
  assert.equal(opts.merchant, null);
  const r = await observeMarketReport(opts, environment(() => {
    throw new Error("no merchant was bound; no discovery fetch is allowed");
  }));
  assert.equal(r.settlement.measured.authorizations, 99);
  assert.equal(r.catalog.ok, false);
  assert.equal(r.catalog.scope, "no-seller-selected");
  assert.equal(r.catalogAuthorizationComparison, null);
});

test("original Data snapshot counts actual seller-reported calls, not listed resources", async () => {
  let requests = 0;
  const r = await observeMarketReport({ windowBlocks: 90, merchant: MERCHANT }, environment(async url => {
    requests++;
    const request = new URL(url);
    assert.equal(request.searchParams.get("payTo"), PAY_TO);
    assert.equal(request.searchParams.get("limit"), "20");
    return page([entry("a", 1, 2), entry("b", 7, 3)]);
  }));
  assert.equal(requests, 1);
  assert.equal(r.catalog.scope, "one-merchant");
  assert.equal(r.catalog.listedResources, 2);
  assert.equal(r.catalog.calls30d, 8);
  assert.equal(r.catalog.uniquePayers30d, null,
    "two resources may share the same payer; their distinct counts cannot be summed");
  assert.equal(r.catalog.complete, true);
  assert.equal(r.catalogAuthorizationComparison, null,
    "global EIP-3009 events are not a denominator for this merchant");
  assert.equal(r.settlement.measured.authorizations, 99);
});

test("a complete listing with missing demand readings never invents zero merchant calls", async () => {
  const r = await observeMarketReport({ windowBlocks: 90, merchant: MERCHANT }, environment(
    async () => page([entry("a", null, null), entry("b", 7, 3)]),
  ));
  assert.equal(r.catalog.complete, true);
  assert.equal(r.catalog.calls30d, null);
  assert.equal(r.catalog.resourceReadings[0].calls30d, null);
});

test("incomplete discovery pages do not become measured market demand", async () => {
  const r = await observeMarketReport({ windowBlocks: 90, merchant: MERCHANT }, environment(
    async () => page([entry("a", 1, 1)], 2),
  ));
  assert.equal(r.catalog.ok, true);
  assert.equal(r.catalog.complete, false);
  assert.equal(r.catalog.calls30d, null);
  assert.equal(r.catalog.listedResources, 1);
});

test("bad merchant identity or inappropriate endpoint is refused before external reads", async () => {
  assert.throws(() => observationOptions(["--discovery-endpoint", "https://other.example.test/a"]),
    /requires --merchant-pay-to/u);
  assert.throws(() => observationOptions(["--merchant-pay-to", "0x123"]),
    /payTo/u);
  assert.throws(() => observationOptions(["--merchant-pay-to"]), /requires a value/u);
  assert.throws(() => observationOptions(["--window"]), /requires a value/u);
  let chainCalls = 0;
  await assert.rejects(() => observeMarketReport({
    windowBlocks: 90, merchant: { ...MERCHANT, payTo: "0x123" },
  }, { chainObserver: async () => { chainCalls++; return onchain(); } }), /payTo/u);
  assert.equal(chainCalls, 0);
});

test("provider failure cannot fabricate a paid buyer or erase independent chain evidence", async () => {
  const r = await observeMarketReport({ windowBlocks: 90, merchant: MERCHANT }, environment(
    async () => { throw new Error("catalog origin down"); },
  ));
  assert.equal(r.catalog.ok, false);
  assert.match(r.catalog.reason, /origin down/u);
  assert.equal(r.settlement.measured.authorizations, 99);
  assert.equal(r.catalogAuthorizationComparison, null);
});


test("the official x402 v2 items wire shape reaches Networking without a custom adapter", async () => {
  const r = await observeMarketReport({ windowBlocks: 90, merchant: MERCHANT }, environment(
    async () => ({
      x402Version: 2, payTo: PAY_TO,
      pagination: { limit: 20, offset: 0, total: 2 },
      items: [entry("a", 3, 2), entry("b", 5, 2)],
    }),
  ));
  assert.equal(r.catalog.ok, true);
  assert.equal(r.catalog.complete, true);
  assert.equal(r.catalog.listedResources, 2);
  assert.equal(r.catalog.calls30d, 8);
  assert.equal(r.catalog.uniquePayers30d, null);
});

test("a seller's real call observation survives price-rail uncertainty without invented revenue", async () => {
  const missingAsset = entry("a", 4, 2);
  delete missingAsset.accepts[0].asset;
  const r = await observeMarketReport({ windowBlocks: 90, merchant: MERCHANT }, environment(
    async () => page([missingAsset]),
  ));
  assert.equal(r.catalog.ok, true);
  assert.equal(r.catalog.complete, true,
    "merchant call coverage is distinct from observed asset-price terms");
  assert.equal(r.catalog.calls30d, 4);
  assert.equal(r.catalogAuthorizationComparison, null);
});

test("Coinbase merchant scope is the original discovery entrance, not the global listing", () => {
  const options = observationOptions(["--merchant-pay-to", PAY_TO]);
  assert.equal(new URL(options.merchant.endpoint).pathname,
    "/platform/v2/x402/discovery/merchant");
  assert.equal(options.merchant.payTo, PAY_TO);
});

test("existing CDP JWT owner authenticates merchant discovery without an app-local signer", async () => {
  const calls = [];
  const data = { x402Version: 2, payTo: PAY_TO, resources: [entry("a", 3, 2)],
    pagination: { total: 1, offset: 0, limit: 20 } };
  const target = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=" + PAY_TO;
  const result = await readBazaarPage(target, {
    environment: { CDP_API_KEY_ID: "test-id", CDP_API_KEY_SECRET: "test-secret" },
    tokenFactory: options => {
      calls.push(options);
      return "synthetic-jwt-for-testing-only";
    },
    fetchImpl: async (url, options) => {
      assert.equal(url, target);
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.authorization, "Bearer synthetic-jwt-for-testing-only");
      return { ok: true, headers: { get: () => null }, text: async () => JSON.stringify(data) };
    },
  });
  assert.deepEqual(result, data);
  assert.deepEqual(calls.map(({ method, host, path }) => ({ method, host, path })), [{
    method: "GET", host: "api.cdp.coinbase.com",
    path: "/platform/v2/x402/discovery/merchant",
  }]);
});

test("Coinbase discovery without its original read-only API credentials refuses before fetch", async () => {
  let fetchCalls = 0;
  const target = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=" + PAY_TO;
  await assert.rejects(() => readBazaarPage(target, {
    environment: {},
    fetchImpl: async () => { fetchCalls++; throw Error("must not fetch"); },
  }), /CDP_API_KEY_ID and CDP_API_KEY_SECRET/u);
  assert.equal(fetchCalls, 0);
  await assert.rejects(() => readBazaarPage("https://api.cdp.coinbase.com/other-service", {
    environment: { CDP_API_KEY_ID: "test", CDP_API_KEY_SECRET: "test" },
    fetchImpl: async () => { fetchCalls++; throw Error("must not fetch"); },
  }), /only address its discovery/u);
  assert.equal(fetchCalls, 0);
});

test("an independent approved HTTPS discovery provider receives no Coinbase credentials", async () => {
  const url = "https://bazaar.example.test/discovery/merchant?payTo=" + PAY_TO;
  const data = { payTo: PAY_TO, resources: [], pagination: { total: 0 } };
  const result = await readBazaarPage(url, {
    environment: { CDP_API_KEY_ID: "seller-key", CDP_API_KEY_SECRET: "not-for-other-host" },
    tokenFactory: () => { throw Error("CDP signer must not be called"); },
    fetchImpl: async (got, options) => {
      assert.equal(got, url);
      assert.equal(options.headers.authorization, undefined);
      assert.equal(options.redirect, "error");
      return { ok: true, headers: { get: () => null }, text: async () => JSON.stringify(data) };
    },
  });
  assert.equal(result.pagination.total, 0);
});
