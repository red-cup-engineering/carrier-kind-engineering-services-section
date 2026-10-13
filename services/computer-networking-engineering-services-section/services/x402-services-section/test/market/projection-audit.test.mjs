import assert from "node:assert/strict";
import test from "node:test";

import { auditPublicMarketProjection } from "../../apps/market-561-group/scripts/audit-public-projection.mjs";
import { declareCatalog, declareOffer } from "../../src/offer.mjs";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

function fixtureCatalog() {
  const declaration = {
    name: "Protocol Example", gateway: "protocol-example", gatewayPackageName: "@red-cup-engineering/protocol-example",
    section: "lib/engineering-services-section/services/protocol-example", operation: "read-value", origin: "https://market.561.group", route: "/v1/example",
    method: "GET", price: "$0.001", output: { schema: { type: "object" }, example: { value: 1 } },
    framings: [{ key: "default", title: "Protocol Example", description: "One example value.", tags: ["example"], serviceName: "protocol-example" }],
    ledgerAccount: "Income:Sales:Example", markets: ["x402-bazaar"],
  };
  return declareCatalog([
    declaration,
    { ...declaration, name: "Node Example", operation: "compute-value", route: "/v1/node-example", runtime: "node", method: "POST", bodyExample: { value: 1 } },
    { ...declaration, name: "Unlisted Example", operation: "unlisted-value", route: "/v1/unlisted", listed: false },
  ]);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function paidChallenge(url, overrides = {}) {
  const value = { x402Version: 2, resource: { url }, accepts: [{ scheme: "exact", network: "eip155:8453", amount: "1000",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: `0x${"11".repeat(20)}`, maxTimeoutSeconds: 300 }], ...overrides };
  return new Response("", { status: 402, headers: { "payment-required": Buffer.from(JSON.stringify(value)).toString("base64") } });
}

test("projection audit compares source/public catalog and probes every listed offer", async () => {
  const source = fixtureCatalog();
  const listed = source.filter((offer) => offer.declaration.listed !== false);
  const publicOffers = source.map((offer) => ({
    operation: offer.declaration.operation,
    listed: offer.declaration.listed !== false,
  }));
  const called = [];
  const fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    called.push({ url, method: init.method ?? "GET" });
    if (url === "https://market.561.group/v1/status") {
      return json({ status: "ok", offers: source.length, listedOffers: listed.length });
    }
    if (url === "https://market.561.group/v1/catalog") {
      return json({ offers: publicOffers });
    }
    return paidChallenge(url);
  };

  const receipt = await auditPublicMarketProjection({
    fetch,
    sourceCatalog: source,
    now: () => "2026-10-05T04:00:00.000Z",
  });

  assert.equal(receipt.source.totalOffers, source.length);
  assert.equal(receipt.source.listedOffers, listed.length);
  assert.equal(receipt.summary.probed, listed.length);
  assert.equal(receipt.summary.ready, listed.length);
  assert.equal(receipt.summary.notReady, 0);
  assert.equal(receipt.summary.sourceMatchesPublicCatalog, true);
  assert.equal(receipt.summary.byClassification["402-ready"], listed.length);
  assert.equal(called.length, listed.length + 2);
  for (const offer of receipt.offers) assert.match(offer.observationDigest, /^ni:\/\/\/sha-256;/u);
});

function controlsOr(fetchOffer, source) {
  return async (url, init) => {
    const path = new URL(url).pathname;
    if (path === "/v1/status") return json({ status: "ok" });
    if (path === "/v1/catalog") return json({ offers: source.map(offer => ({ listed: offer.declaration.listed !== false })) });
    return fetchOffer(url, init);
  };
}

test("projection audit rejects incomplete payment requirements instead of counting a superficial 402", async () => {
  const source = fixtureCatalog();
  const fetch = controlsOr(url => paidChallenge(url, { accepts: [{}] }), source);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  assert.equal(result.summary.ready, 0);
  assert.equal(result.summary.byClassification["402-invalid-challenge"], 2);
  for (const row of result.offers) {
    assert.equal(row.status, 402);
    assert.match(row.challengeError, /official schema/u);
  }
});

test("projection audit applies the upstream Bazaar validator to discovery metadata", async () => {
  const source = fixtureCatalog();
  const fetch = controlsOr((url, init) => {
    const extension = declareDiscoveryExtension(init.method === "POST"
      ? { method: "POST", bodyType: "json", input: { value: 1 } }
      : { method: "GET" });
    extension.bazaar.routeTemplate = "/astronomy/{date}";
    return paidChallenge(url, { extensions: extension });
  }, source);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  assert.equal(result.summary.ready, 0);
  for (const row of result.offers) {
    assert.equal(row.classification, "402-invalid-challenge");
    assert.match(row.challengeError, /routeTemplate/u);
  }
});

test("candidate audit probes the selected deployment origin with the original paths, queries and POST bodies", async () => {
  const source = [...fixtureCatalog()];
  source[0] = declareOffer({ ...source[0].declaration, probeUrl: "https://market.561.group/v1/example?unit=bytes&label=a%20b" });
  const requests = [];
  const fetch = controlsOr((url, init) => {
    requests.push({ url, init });
    assert.equal(new URL(url).origin, "https://candidate.example.test");
    assert.equal(init.redirect, "manual");
    assert.ok(init.signal instanceof AbortSignal);
    return paidChallenge(url);
  }, source);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source, market: "https://candidate.example.test/" });
  assert.equal(result.market, "https://candidate.example.test");
  assert.equal(result.summary.ready, 2);
  assert.equal(requests.length, 2, "every offer is fetched once");
  assert.equal(requests[0].url, "https://candidate.example.test/v1/example?unit=bytes&label=a%20b");
  assert.equal(requests[1].init.method, "POST");
  assert.equal(requests[1].init.body, '{"value":1}');
  assert.equal(result.offers[0].sourceUrl, source[0].probeUrl);
});

test("projection audit validates bounded positive concurrency before starting network requests", async () => {
  let calls = 0;
  const fetch = () => { calls += 1; throw new Error("invalid concurrency must not start a request"); };
  for (const concurrency of [0, -1, 1.5, NaN, Infinity, 33, "6"]) {
    await assert.rejects(auditPublicMarketProjection({ fetch, concurrency, sourceCatalog: fixtureCatalog() }), /concurrency/u);
  }
  assert.equal(calls, 0);
});

test("candidate projection retains its selected authority even for a path beginning with two slashes", async () => {
  const source = [declareOffer({ ...fixtureCatalog()[0].declaration, probeUrl: "https://market.561.group//another.example.test/value?unit=bytes" })];
  const fetch = controlsOr(url => {
    assert.equal(url, "https://candidate.example.test//another.example.test/value?unit=bytes");
    return paidChallenge(url);
  }, source);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source, market: "https://candidate.example.test" });
  assert.equal(result.summary.ready, 1);
});

test("projection audit preserves a control response status when reading its body fails", async () => {
  const source = fixtureCatalog();
  const fetch = async (url) => new URL(url).pathname === "/v1/status"
    ? new Response(new ReadableStream({ start(controller) { controller.error(new Error("broken status body")); } }), { status: 503 })
    : new URL(url).pathname === "/v1/catalog" ? json({ offers: [] }) : paidChallenge(url);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  assert.equal(result.deployment.statusHttp, 503);
  assert.match(result.deployment.statusError, /broken status body/u);
});

test("projection audit retains the observed runtime status when its response body cannot be read", async () => {
  const source = fixtureCatalog();
  const fetch = controlsOr(url => url.endsWith("node-example")
    ? new Response(new ReadableStream({ start(controller) { controller.error(new Error("broken diagnostic body")); } }), { status: 503 })
    : paidChallenge(url), source);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  const row = result.offers.find(offer => offer.runtime === "node");
  assert.equal(row.status, 503);
  assert.equal(row.classification, "proxy-failed");
});

test("projection audit refuses redirects without visiting their destinations", async () => {
  const source = fixtureCatalog();
  let calls = 0;
  const fetch = controlsOr((url, init) => {
    calls += 1;
    assert.equal(init.redirect, "manual");
    return new Response("redirect refused", { status: 302, headers: { location: "https://elsewhere.example.test" } });
  }, source);
  const result = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  assert.equal(calls, 2);
  assert.equal(result.summary.ready, 0);
  for (const row of result.offers) {
    assert.equal(row.status, 302);
    assert.equal(row.classification, "unexpected-http-status");
  }
});

test("projection audit exposes proxy/runtime failures instead of collapsing them into missing inventory", async () => {
  const source = fixtureCatalog();
  const listed = source.filter((offer) => offer.declaration.listed !== false);
  const failing = listed.find((offer) => offer.declaration.runtime === "node") ?? listed[0];
  const publicOffers = source.map((offer) => ({
    operation: offer.declaration.operation,
    listed: offer.declaration.listed !== false,
  }));

  const fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url === "https://market.561.group/v1/status") return json({ status: "ok" });
    if (url === "https://market.561.group/v1/catalog") return json({ offers: publicOffers });
    if (url === failing.probeUrl) return new Response("upstream unavailable", { status: 503 });
    return paidChallenge(url);
  };

  const receipt = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  const row = receipt.offers.find((offer) => offer.operation === failing.declaration.operation);
  assert.equal(row.status, 503);
  assert.equal(row.classification, failing.declaration.runtime === "node" ? "proxy-failed" : "runtime-unreachable");
  assert.equal(receipt.summary.notReady, 1);
});


test("projection audit rejects a bare 402 challenge", async () => {
  const source = fixtureCatalog();
  const listed = source.filter((offer) => offer.declaration.listed !== false);
  const target = listed[0];
  const publicOffers = source.map((offer) => ({
    operation: offer.declaration.operation,
    listed: offer.declaration.listed !== false,
  }));
  const targetUrl = target.index402Registration({
    provider: "561 Group",
    paymentAsset: "USD Coin",
    paymentNetwork: "Base",
  }).url;
  const fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url === "https://market.561.group/v1/status") return json({ status: "ok" });
    if (url === "https://market.561.group/v1/catalog") return json({ offers: publicOffers });
    if (url === targetUrl) return new Response("", { status: 402 });
    return paidChallenge(url);
  };
  const receipt = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  const row = receipt.offers.find((offer) => offer.operation === target.declaration.operation);
  assert.equal(row.classification, "402-invalid-challenge");
  assert.equal(receipt.summary.notReady, 1);
});

test("projection audit rejects a mismatched challenge resource", async () => {
  const source = fixtureCatalog();
  const listed = source.filter((offer) => offer.declaration.listed !== false);
  const target = listed[0];
  const publicOffers = source.map((offer) => ({
    operation: offer.declaration.operation,
    listed: offer.declaration.listed !== false,
  }));
  const targetUrl = target.index402Registration({
    provider: "561 Group",
    paymentAsset: "USD Coin",
    paymentNetwork: "Base",
  }).url;
  const fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url === "https://market.561.group/v1/status") return json({ status: "ok" });
    if (url === "https://market.561.group/v1/catalog") return json({ offers: publicOffers });
    if (url === targetUrl) return paidChallenge("https://other.example.test/not-this-resource");
    return paidChallenge(url);
  };
  const receipt = await auditPublicMarketProjection({ fetch, sourceCatalog: source });
  const row = receipt.offers.find((offer) => offer.operation === target.declaration.operation);
  assert.equal(row.classification, "402-resource-mismatch");
  assert.equal(receipt.summary.notReady, 1);
});

