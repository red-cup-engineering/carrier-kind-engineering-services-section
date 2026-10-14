import assert from "node:assert/strict";
import test from "node:test";

import { declareOffer } from "@red-cup-engineering/x402-services-section/offer";

import { createOfferSeller, createOfferSellerWorker, sellerAgentCard, sellerPageModel, sellerRails } from "../src/offer-seller.mjs";
import { startOfferSeller } from "../src/node.mjs";

const NETWORK = "eip155:84532";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const ENV = Object.freeze({
  X402_NETWORK: NETWORK,
  X402_PAY_TO: PAY_TO,
  X402_FACILITATOR: "https://facilitator.invalid",
});

function postOffer(overrides = {}) {
  return declareOffer({
    name: "Demo Reading",
    gateway: "demo-gateway",
    gatewayPackageName: "@red-cup-engineering/demo-gateway",
    section: "lib/emsenn/services/561-group/services/engineering-services-section/services/demo-services-section",
    operation: "read-demo",
    origin: "https://demo.test",
    route: "/v1/demo",
    method: "POST",
    price: "$0.02",
    bodyExample: { seed: 1 },
    bodySchema: { properties: { seed: { type: "integer" } }, required: ["seed"] },
    output: { schema: { type: "object" }, example: { value: 1 } },
    framings: [{ key: "default", title: "Demo Reading", description: "One demo reading.", tags: ["demo"], serviceName: "demo-reading" }],
    ledgerAccount: "Income:Sales:X402:Demo-gateway",
    markets: ["x402-bazaar", "house-seller-catalog"],
    ...overrides,
  });
}

function getOffer(overrides = {}) {
  return declareOffer({
    name: "Demo Lookup",
    gateway: "demo-gateway",
    gatewayPackageName: "@red-cup-engineering/demo-gateway",
    section: "lib/emsenn/services/561-group/services/engineering-services-section/services/demo-services-section",
    operation: "look-up-demo",
    origin: "https://demo.test",
    route: "/v1/lookup",
    method: "GET",
    price: "$0.01",
    output: { schema: { type: "object" }, example: { value: 1 } },
    framings: [{ key: "default", title: "Demo Lookup", description: "One demo lookup.", tags: ["demo"], serviceName: "demo-lookup" }],
    ledgerAccount: "Income:Sales:X402:Demo-gateway",
    markets: ["x402-bazaar"],
    ...overrides,
  });
}

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid request must never verify"); },
    async settle() { throw new Error("an unpaid request must never settle"); },
  };
}

function paidFacilitator(counts = {}) {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { counts.verifications = (counts.verifications ?? 0) + 1; return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { counts.settlements = (counts.settlements ?? 0) + 1; return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
}

const challengeOf = (response) => JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));

test("dated GET and HEAD requests require payment before computation", async () => {
  const offer = getOffer({ route: "/v1/lookup/{date}" });
  let computed = 0;
  const seller = createOfferSeller({
    offers: [offer], env: ENV, facilitatorClient: unpaidFacilitator(),
    compute: { [offer.declaration.route]: () => { computed += 1; return {}; } },
  });
  for (const method of ["GET", "HEAD"]) {
    const response = await seller.fetch(new Request("https://demo.test/v1/lookup/2026-09-08", { method }));
    assert.equal(response.status, 402);
    assert.equal(challengeOf(response).extensions.bazaar.routeTemplate, "/v1/lookup/{date}");
  }
  assert.equal(computed, 0);
});

function demoSeller(overrides = {}) {
  return createOfferSeller({
    offers: [postOffer(), getOffer()],
    env: ENV,
    compute: {
      "/v1/demo": ({ body }) => ({ value: body.seed * 2 }),
      "/v1/lookup": ({ query }) => ({ value: Number(query.n ?? 0) + 1 }),
    },
    facilitatorClient: unpaidFacilitator(),
    ...overrides,
  });
}

test("sellerRails reads the deployment and never invents a payout address", () => {
  assert.deepEqual(sellerRails(ENV), { network: NETWORK, payTo: PAY_TO, asset: USDC, facilitatorUrl: "https://facilitator.invalid" });
  assert.throws(() => sellerRails({ X402_NETWORK: NETWORK, X402_FACILITATOR: "https://f.invalid" }), /X402_PAY_TO/u);
  assert.throws(() => sellerRails({ X402_PAY_TO: PAY_TO }), /X402_FACILITATOR/u);
  assert.throws(() => sellerRails({ X402_NETWORK: "mainnet", X402_PAY_TO: PAY_TO }), /CAIP-2/u);
  assert.throws(() => sellerRails({ X402_NETWORK: "eip155:99999", X402_PAY_TO: PAY_TO, X402_FACILITATOR: "https://f.invalid" }), /X402_ASSET/u);
});

test("createOfferSeller refuses offers from more than one gateway, or none", () => {
  assert.throws(() => createOfferSeller({ offers: [] }), /nonempty set of admitted offers/u);
  assert.throws(
    () => createOfferSeller({ offers: [postOffer(), postOffer({ gateway: "other-gateway", ledgerAccount: "Income:Sales:X402:Other-gateway", route: "/v1/other" })] }),
    /same gateway/u,
  );
});

test("createOfferSeller refuses an offer with neither compute nor proxy", () => {
  assert.throws(() => createOfferSeller({ offers: [postOffer()], env: ENV, compute: {} }), /neither compute nor proxy/u);
});

test("a priced POST route answers 402 unpaid, with the derived challenge", async () => {
  const seller = demoSeller();
  const response = await seller.fetch(new Request("https://demo.test/v1/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seed: 2 }),
  }));
  assert.equal(response.status, 402);
  const challenge = challengeOf(response);
  assert.equal(challenge.accepts[0].amount, "20000");
  assert.equal(challenge.accepts[0].network, NETWORK);
  assert.equal(challenge.accepts[0].payTo.toLowerCase(), PAY_TO.toLowerCase());
  assert.equal(challenge.accepts[0].asset.toLowerCase(), USDC.toLowerCase());
  assert.equal(challenge.extensions.bazaar.routeTemplate, "/v1/demo");
  assert.equal(challenge.extensions.bazaar.info.input.method, "POST");
});

test("a priced GET route answers 402 unpaid, with its own route template", async () => {
  const seller = demoSeller();
  const response = await seller.fetch(new Request("https://demo.test/v1/lookup?n=4"));
  assert.equal(response.status, 402);
  const challenge = challengeOf(response);
  assert.equal(challenge.accepts[0].amount, "10000");
  assert.equal(challenge.extensions.bazaar.routeTemplate, "/v1/lookup");
  assert.equal(challenge.extensions.bazaar.info.input.method, "GET");
});

test("a settled payment reaches compute and returns its result", async () => {
  const counts = {};
  const seller = demoSeller({ facilitatorClient: paidFacilitator(counts) });
  const unpaid = await seller.fetch(new Request("https://demo.test/v1/demo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 21 }),
  }));
  const payment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challengeOf(unpaid).accepts[0], payload: { signature: "0xtest" } })).toString("base64");
  const paid = await seller.fetch(new Request("https://demo.test/v1/demo", {
    method: "POST",
    headers: { "content-type": "application/json", "payment-signature": payment },
    body: JSON.stringify({ seed: 21 }),
  }));
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.json(), { value: 42 });
  assert.ok(paid.headers.get("payment-response"));
  assert.equal(counts.settlements, 1);
});

test("compute never runs for an unpaid request", async () => {
  let ran = 0;
  const seller = demoSeller({ compute: { "/v1/demo": () => { ran += 1; return {}; }, "/v1/lookup": () => ({}) } });
  await seller.fetch(new Request("https://demo.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: "{\"seed\":1}" }));
  assert.equal(ran, 0);
});

test("semantic validation refuses before any payment challenge is issued", async () => {
  const seller = demoSeller({
    validate: { "/v1/demo": ({ body }) => { if (body.seed < 0) throw new TypeError("seed must not be negative"); } },
  });
  const response = await seller.fetch(new Request("https://demo.test/v1/demo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: -1 }),
  }));
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("payment-required"), null);
  assert.deepEqual(await response.json(), { error: "seed must not be negative" });
});

test("the engine refuses a malformed, mistyped, or oversized body before pricing", async () => {
  const seller = demoSeller({ maxBodyBytes: 1024 });
  const cases = [
    ["{", "application/json", 400],
    ["{}", "text/plain", 415],
    [JSON.stringify({ seed: 1, pad: "x".repeat(4096) }), "application/json", 413],
  ];
  for (const [body, contentType, expected] of cases) {
    const response = await seller.fetch(new Request("https://demo.test/v1/demo", { method: "POST", headers: { "content-type": contentType }, body }));
    assert.equal(response.status, expected, `${contentType} ${body.length} bytes`);
    assert.equal(response.headers.get("payment-required"), null);
  }
});

test("status is served unpriced on both probes", async () => {
  const seller = demoSeller();
  for (const path of ["/v1/status", "/healthz"]) {
    const response = await seller.fetch(new Request(`https://demo.test${path}`));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "demo-gateway" });
  }
});

test("the 402index verification hash is served from its binding, and 404s without one", async () => {
  const withHash = createOfferSeller({
    offers: [postOffer()],
    env: { ...ENV, INDEX_VERIFICATION_HASH: "a7918cd92c19049c165a775d79078c98" },
    compute: { "/v1/demo": () => ({}) },
    facilitatorClient: unpaidFacilitator(),
  });
  const served = await withHash.fetch(new Request("https://demo.test/.well-known/402index-verify.txt"));
  assert.equal(served.status, 200);
  assert.match(served.headers.get("content-type"), /^text\/plain/u);
  assert.equal(await served.text(), "a7918cd92c19049c165a775d79078c98\n");

  const absent = await demoSeller().fetch(new Request("https://demo.test/.well-known/402index-verify.txt"));
  assert.equal(absent.status, 404);
});

test("the agent card is derived from the offers, one skill per offer", async () => {
  const response = await demoSeller().fetch(new Request("https://demo.test/.well-known/agent-card.json"));
  assert.equal(response.status, 200);
  const card = await response.json();
  assert.equal(card.name, "demo-gateway");
  assert.equal(card.url, "https://demo.test");
  assert.deepEqual(card.skills.map((skill) => skill.id), ["read-demo", "look-up-demo"]);
  assert.deepEqual(card.skills[0].tags, ["demo"]);
  assert.equal(card.skills[0].examples[0], "POST https://demo.test/v1/demo");
  assert.equal(card.skills[1].examples[0], "GET https://demo.test/v1/lookup");
  assert.deepEqual(sellerAgentCard([postOffer()]).skills.length, 1);
});

test("the public page is rendered by the TUFTE engine and lists every offer and price", async () => {
  const response = await demoSeller().fetch(new Request("https://demo.test/"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/u);
  const html = await response.text();
  assert.match(html, /<!DOCTYPE html>/iu);
  assert.match(html, /demo-gateway/u);
  assert.match(html, /Demo Reading/u);
  assert.match(html, /\$0\.02/u);
  assert.match(html, /Demo Lookup/u);
  assert.match(html, /\$0\.01/u);
  assert.match(html, /tufte/iu);
});

test("sellerPageModel names every offer, its price, and its markets", () => {
  const model = sellerPageModel([postOffer(), getOffer()], { network: NETWORK, asset: USDC });
  assert.equal(model.title, "demo-gateway");
  const table = model.tiles.find((tile) => tile.id === "offers").table;
  assert.deepEqual(table.columns, ["Offer", "Method", "Route", "Price", "Operation"]);
  assert.deepEqual(table.rows[0], ["Demo Reading", "POST", "/v1/demo", "$0.02", "read-demo"]);
  assert.deepEqual(table.rows[1], ["Demo Lookup", "GET", "/v1/lookup", "$0.01", "look-up-demo"]);
  assert.deepEqual(model.tiles.find((tile) => tile.id === "settlement").table.rows[1], ["Network", NETWORK]);
});

test("an unknown path is a 404, not a challenge", async () => {
  const response = await demoSeller().fetch(new Request("https://demo.test/nope"));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("payment-required"), null);
});

test("the origin alone owns payment for a proxied offer", async () => {
  const seen = [];
  const seller = createOfferSeller({
    offers: [getOffer({ route: "/v1/precision", operation: "read-precision" })],
    env: {},
    proxy: { "/v1/precision": "http://origin.invalid:8086" },
    facilitatorClient: { getSupported() { throw new Error("edge must not initialize payment"); } },
    fetch: async (url, init) => {
      seen.push({ url, method: init.method, signature: init.headers.get("payment-signature") });
      if (init.headers.has("payment-signature")) return Response.json({ precise: true }, { headers: { "payment-response": "settled-once" } });
      const challenge = { x402Version: 2, resource: { url }, accepts: [{ amount: "10000" }] };
      return new Response("{}", { status: 402, headers: { "payment-required": Buffer.from(JSON.stringify(challenge)).toString("base64") } });
    },
  });
  const url = "https://demo.test/v1/precision?lat=1";
  const unpaid = await seller.fetch(new Request(url));
  assert.equal(unpaid.status, 402);
  assert.equal(challengeOf(unpaid).resource.url, url);
  const paid = await seller.fetch(new Request(url, { headers: { "payment-signature": "signed" } }));
  assert.equal(paid.status, 200);
  assert.equal(paid.headers.get("payment-response"), "settled-once");
  assert.deepEqual(await paid.json(), { precise: true });
  assert.deepEqual(seen, [
    { url: "http://origin.invalid:8086/v1/precision?lat=1", method: "GET", signature: null },
    { url: "http://origin.invalid:8086/v1/precision?lat=1", method: "GET", signature: "signed" },
  ]);
});

test("a misconfigured deployment reports itself instead of crashing", async () => {
  const seller = createOfferSeller({ offers: [postOffer()], env: {}, compute: { "/v1/demo": () => ({}) } });
  const response = await seller.fetch(new Request("https://demo.test/v1/demo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 1 }),
  }));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /gateway misconfigured: X402_PAY_TO/u);
});

test("the same engine serves the Workers face and the Node transport identically", async (t) => {
  const worker = createOfferSellerWorker((env) => createOfferSeller({
    offers: [postOffer(), getOffer()],
    env,
    compute: { "/v1/demo": ({ body }) => ({ value: body.seed * 2 }), "/v1/lookup": ({ query }) => ({ value: Number(query.n ?? 0) + 1 }) },
    facilitatorClient: unpaidFacilitator(),
  }));
  const server = await startOfferSeller(demoSeller(), 0);
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.port}`;

  for (const [path, expected] of [["/v1/status", 200], ["/nope", 404], ["/.well-known/agent-card.json", 200]]) {
    const overNode = await fetch(origin + path);
    const overWorker = await worker.fetch(new Request(`https://demo.test${path}`), ENV);
    assert.equal(overNode.status, expected, `node ${path}`);
    assert.equal(overWorker.status, expected, `worker ${path}`);
    assert.deepEqual(await overNode.text(), await overWorker.text(), `body ${path}`);
  }

  const init = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 3 }) };
  const overNode = await fetch(`${origin}/v1/demo`, init);
  const overWorker = await worker.fetch(new Request("https://demo.test/v1/demo", init), ENV);
  assert.equal(overNode.status, 402);
  assert.equal(overWorker.status, 402);
  assert.deepEqual(challengeOf(overNode).accepts, challengeOf(overWorker).accepts);

  for (const [body, contentType, expected] of [["{", "application/json", 400], ["{}", "text/plain", 415]]) {
    const node = await fetch(`${origin}/v1/demo`, { method: "POST", headers: { "content-type": contentType }, body });
    const workerResponse = await worker.fetch(new Request("https://demo.test/v1/demo", { method: "POST", headers: { "content-type": contentType }, body }), ENV);
    assert.equal(node.status, expected, `node ${contentType}`);
    assert.equal(workerResponse.status, expected, `worker ${contentType}`);
  }
});

test("an over-limit body is refused on the Node transport too, the defect the legacy server had", async (t) => {
  const server = await startOfferSeller(demoSeller({ maxBodyBytes: 1024 }), 0);
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.port}/v1/demo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seed: 1, pad: "x".repeat(8192) }),
  });
  assert.equal(response.status, 413);
  assert.equal(response.headers.get("payment-required"), null);
});

test("settlementWitness is installed as afterSettle and names the settled route", async () => {
  const witnessed = [];
  const counts = {};
  const seller = demoSeller({
    facilitatorClient: paidFacilitator(counts),
    env: { ...ENV, WITNESS_SINK_URL: "" },
    afterSettle: undefined,
    now: () => "2026-09-08T06:00:00.000Z",
  });
  const originalLog = console.log;
  console.log = (line) => witnessed.push(line);
  try {
    const unpaid = await seller.fetch(new Request("https://demo.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 1 }) }));
    const payment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challengeOf(unpaid).accepts[0], payload: { signature: "0xtest" } })).toString("base64");
    await seller.fetch(new Request("https://demo.test/v1/demo", { method: "POST", headers: { "content-type": "application/json", "payment-signature": payment }, body: JSON.stringify({ seed: 1 }) }));
  } finally {
    console.log = originalLog;
  }
  const record = witnessed.map((line) => JSON.parse(line)).find((entry) => entry.event === "demo-gateway.x402-settlement-witness");
  assert.ok(record, "the settlement was witnessed");
  assert.equal(record.route, "/v1/demo");
  assert.equal(record.network, NETWORK);
  assert.equal(record.recordedAt, "2026-09-08T06:00:00.000Z");
});
