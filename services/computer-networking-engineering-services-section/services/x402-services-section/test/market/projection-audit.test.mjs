import assert from "node:assert/strict";
import test from "node:test";

import { auditPublicMarketProjection } from "../../apps/market-561-group/scripts/audit-public-projection.mjs";
import { catalog } from "../../apps/market-561-group/src/market.mjs";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function paidChallenge(url) {
  const value = { x402Version: 2, resource: { url }, accepts: [{}] };
  return new Response("", { status: 402, headers: { "payment-required": Buffer.from(JSON.stringify(value)).toString("base64") } });
}

test("projection audit compares source/public catalog and probes every listed offer", async () => {
  const source = catalog({ admit: false });
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
});

test("projection audit exposes proxy/runtime failures instead of collapsing them into missing inventory", async () => {
  const source = catalog({ admit: false });
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

  const receipt = await auditPublicMarketProjection({ fetch });
  const row = receipt.offers.find((offer) => offer.operation === failing.declaration.operation);
  assert.equal(row.status, 503);
  assert.equal(row.classification, failing.declaration.runtime === "node" ? "proxy-failed" : "runtime-unreachable");
  assert.equal(receipt.summary.notReady, 1);
});


test("projection audit rejects a bare 402 challenge", async () => {
  const source = catalog({ admit: false });
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
  const receipt = await auditPublicMarketProjection({ fetch });
  const row = receipt.offers.find((offer) => offer.operation === target.declaration.operation);
  assert.equal(row.classification, "402-invalid-challenge");
  assert.equal(receipt.summary.notReady, 1);
});

test("projection audit rejects a mismatched challenge resource", async () => {
  const source = catalog({ admit: false });
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
  const receipt = await auditPublicMarketProjection({ fetch });
  const row = receipt.offers.find((offer) => offer.operation === target.declaration.operation);
  assert.equal(row.classification, "402-resource-mismatch");
  assert.equal(receipt.summary.notReady, 1);
});
