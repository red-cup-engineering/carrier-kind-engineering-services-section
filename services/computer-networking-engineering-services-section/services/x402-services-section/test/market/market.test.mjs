import assert from "node:assert/strict";
import test from "node:test";
import { ExactEvmScheme as ExactEvmClient } from "@x402/evm/exact/client";

import { declareOffer } from "@red-cup-engineering/x402-services-section/offer";

import { createMarket, createMarketWorker, marketAgentCard, marketApiCatalog, marketCatalogReadout, marketLlmsText, marketPageModel, marketX402Discovery, marketX402Service, marketRails } from "../../src/market/market.mjs";
import { startMarket } from "../../src/market/node.mjs";

const NETWORK = "eip155:84532";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const ENV = Object.freeze({
  X402_NETWORK: NETWORK,
  X402_PAY_TO: PAY_TO,
  X402_FACILITATOR: "https://facilitator.invalid",
});

function postDeclaration(overrides = {}) {
  return {
    name: "Demo Reading",
    gateway: "demo-gateway",
    gatewayPackageName: "@red-cup-engineering/demo-gateway",
    section: "lib/emsenn/services/561-group/services/engineering-services-section/services/demo-services-section",
    operation: "read-demo",
    origin: "https://market.test",
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
  };
}

function getDeclaration(overrides = {}) {
  return {
    name: "Other Lookup",
    gateway: "other-gateway",
    gatewayPackageName: "@red-cup-engineering/other-gateway",
    section: "lib/emsenn/services/561-group/services/engineering-services-section/services/other-services-section",
    operation: "look-up-other",
    origin: "https://market.test",
    route: "/v1/lookup",
    method: "GET",
    price: "$0.01",
    output: { schema: { type: "object" }, example: { value: 1 } },
    framings: [{ key: "default", title: "Other Lookup", description: "One other lookup.", tags: ["other"], serviceName: "other-lookup" }],
    ledgerAccount: "Income:Sales:X402:Other-gateway",
    markets: ["x402-bazaar"],
    ...overrides,
  };
}

const boundDeclaration = () => getDeclaration({
  route: "/v1/positions/{date}",
  operation: "positions",
  compute: { package: "@lenticule-science/demo-astronomy", export: "computePositions" },
  validate: { package: "@lenticule-science/demo-astronomy", export: "normalizeInstant" },
  evidence: { status: "deterministic derivation", citations: [{ title: "Moshier" }] },
});

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid request must never verify"); },
    async settle() { throw new Error("an unpaid request must never settle"); },
  };
}

function paidFacilitator(counts = {}, network = NETWORK) {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network }], extensions: [], signers: {} }; },
    async verify() { counts.verifications = (counts.verifications ?? 0) + 1; return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { counts.settlements = (counts.settlements ?? 0) + 1; return { success: true, network, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
}

/**
 * Connect to a just-listened loopback server with a bounded number of attempts:
 * on this WSL2 host the first connect after `listen` resolves is refused
 * roughly one run in three when other tests precede it, though the server
 * reports listening; three attempts 50 ms apart is the bound, never a wait-out.
 */
async function connect(url, attempts = 3) {
  let refused;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await fetch(url); } catch (error) { refused = error; await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  throw refused;
}

const challengeOf = (response) => JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));

function demoMarket(overrides = {}) {
  return createMarket({
    catalog: [postDeclaration(), getDeclaration()],
    env: ENV,
    compute: {
      "/v1/demo": ({ body }) => ({ value: body.seed * 2 }),
      "/v1/lookup": ({ query }) => ({ value: Number(query.n ?? 0) + 1 }),
    },
    facilitatorClient: unpaidFacilitator(),
    ...overrides,
  });
}

async function pay(market, url, init = {}) {
  const unpaid = await market.fetch(new Request(url, init));
  assert.equal(unpaid.status, 402);
  const payment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challengeOf(unpaid).accepts[0], payload: { signature: "0xtest" } })).toString("base64");
  return market.fetch(new Request(url, { ...init, headers: { ...(init.headers ?? {}), "payment-signature": payment } }));
}

test("a standard x402 client can sign the quoted token domain and receive its purchase", async () => {
  for (const [network, asset, name, version = "2"] of [
    [NETWORK, USDC, "USDC"],
    ["eip155:8453", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USD Coin"],
    ["eip155:8453", `0x${"22".repeat(20)}`, "Custom USD", "1"],
  ]) {
    const facilitator = paidFacilitator({}, network);
    const market = demoMarket({ env: { ...ENV, X402_NETWORK: network, X402_ASSET: asset, X402_ASSET_NAME: name, X402_ASSET_VERSION: version }, facilitatorClient: facilitator });
    const url = "https://market.test/v1/lookup?n=7";
    const unsigned = await market.fetch(new Request(url));
    assert.equal(unsigned.status, 402);
    const quote = challengeOf(unsigned);
    let authorization;
    const client = new ExactEvmClient({
      address: `0x${"11".repeat(20)}`,
      async signTypedData(data) { authorization = data; return `0x${"00".repeat(65)}`; },
    });
    const payload = await client.createPaymentPayload(quote.x402Version, quote.accepts[0]);
    assert.deepEqual(authorization.domain, { name, version, chainId: Number(network.split(":")[1]), verifyingContract: asset });
    assert.equal(authorization.message.value, 10000n);
    assert.equal(authorization.message.to, PAY_TO);
    const signature = Buffer.from(JSON.stringify({ ...payload, accepted: quote.accepts[0] })).toString("base64");
    const result = await market.fetch(new Request(url, { headers: { "payment-signature": signature } }));
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { value: 8 });
    assert.ok(result.headers.has("payment-response"));
  }
});

test("marketRails reads the deployment and never invents a payout address", () => {
  assert.deepEqual(marketRails(ENV), { network: NETWORK, payTo: PAY_TO, asset: USDC, facilitatorUrl: "https://facilitator.invalid" });
  assert.throws(() => marketRails({ X402_NETWORK: NETWORK, X402_FACILITATOR: "https://f.invalid" }), /X402_PAY_TO/u);
  assert.throws(() => marketRails({ X402_PAY_TO: PAY_TO }), /X402_FACILITATOR/u);
  assert.throws(() => marketRails({ X402_NETWORK: "mainnet", X402_PAY_TO: PAY_TO }), /CAIP-2/u);
  assert.throws(() => marketRails({ X402_NETWORK: "eip155:99999", X402_PAY_TO: PAY_TO, X402_FACILITATOR: "https://f.invalid" }), /X402_ASSET/u);
});

test("one market serves offers from many gateways and refuses an empty or colliding catalog", () => {
  const market = demoMarket();
  assert.deepEqual(market.offers.map((offer) => offer.declaration.gateway), ["demo-gateway", "other-gateway"]);
  assert.throws(() => createMarket({ catalog: [] }), /nonempty/u);
  assert.throws(() => createMarket({ catalog: [postDeclaration(), getDeclaration({ route: "/v1/demo", method: "POST", bodyExample: {} })], env: ENV, compute: { "/v1/demo": () => ({}) } }), /declared by both/u);
});

test("an offer without a compute binding and without a supplied compute is refused at construction", () => {
  assert.throws(() => createMarket({ catalog: [postDeclaration()], env: ENV, compute: {} }), /declares no compute binding/u);
});

test("a declared compute binding is resolved by import, once, and called with the projected arguments", async () => {
  const loads = [];
  const counts = {};
  const market = createMarket({
    catalog: [boundDeclaration()],
    env: ENV,
    facilitatorClient: paidFacilitator(counts),
    load: async (specifier) => {
      loads.push(specifier);
      return {
        computePositions: (date) => ({ date, bodies: [] }),
        normalizeInstant: (date) => { if (!/^\d{4}-\d{2}-\d{2}/u.test(date)) throw new TypeError("date must be ISO-8601"); },
      };
    },
  });
  const refused = await market.fetch(new Request("https://market.test/v1/positions/yesterday"));
  assert.equal(refused.status, 422);
  assert.equal(refused.headers.get("payment-required"), null);
  assert.deepEqual(await refused.json(), { error: "date must be ISO-8601" });
  const paid = await pay(market, "https://market.test/v1/positions/2026-07-21T00:00:00Z");
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.json(), { date: "2026-07-21T00:00:00Z", bodies: [] });
  await pay(market, "https://market.test/v1/positions/2026-07-22T00:00:00Z");
  assert.deepEqual(loads, ["@lenticule-science/demo-astronomy"]);
  assert.equal(counts.settlements, 2);
});

test("a supplied compute wins over the declared binding and the loader is never asked", async () => {
  const market = createMarket({
    catalog: [boundDeclaration()],
    env: ENV,
    facilitatorClient: paidFacilitator(),
    compute: { "/v1/positions/{date}": ({ params }) => ({ explicit: params.date }) },
    validate: { "/v1/positions/{date}": () => {} },
    load: async () => { throw new Error("the loader must not be asked"); },
  });
  const paid = await pay(market, "https://market.test/v1/positions/2026-07-21T00:00:00Z");
  assert.deepEqual(await paid.json(), { explicit: "2026-07-21T00:00:00Z" });
});

test("dated GET and HEAD requests require payment before computation", async () => {
  let computed = 0;
  const market = createMarket({
    catalog: [getDeclaration({ route: "/v1/lookup/{date}" })], env: ENV, facilitatorClient: unpaidFacilitator(),
    compute: { "/v1/lookup/{date}": () => { computed += 1; return {}; } },
  });
  for (const method of ["GET", "HEAD"]) {
    const response = await market.fetch(new Request("https://market.test/v1/lookup/2026-09-08", { method }));
    assert.equal(response.status, 402);
    assert.equal(challengeOf(response).extensions.bazaar.routeTemplate, "/v1/lookup/{date}");
  }
  assert.equal(computed, 0);
});

test("a priced POST route answers 402 unpaid, with the derived challenge", async () => {
  const market = demoMarket();
  const response = await market.fetch(new Request("https://market.test/v1/demo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 1 }),
  }));
  assert.equal(response.status, 402);
  const challenge = challengeOf(response);
  assert.equal(challenge.accepts[0].amount, "20000");
  assert.equal(challenge.accepts[0].payTo, PAY_TO);
  assert.equal(challenge.accepts[0].asset, USDC);
  assert.equal(challenge.accepts[0].network, NETWORK);
  assert.equal(challenge.resource.url, "https://market.test/v1/demo");
});

test("a settled payment reaches compute and returns its result", async () => {
  const counts = {};
  const market = demoMarket({ facilitatorClient: paidFacilitator(counts) });
  const paid = await pay(market, "https://market.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 21 }) });
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.json(), { value: 42 });
  assert.ok(paid.headers.get("payment-response"));
  assert.equal(counts.settlements, 1);
});

test("compute never runs for an unpaid request", async () => {
  let ran = 0;
  const market = demoMarket({ compute: { "/v1/demo": () => { ran += 1; return {}; }, "/v1/lookup": () => ({}) } });
  await market.fetch(new Request("https://market.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: "{\"seed\":1}" }));
  assert.equal(ran, 0);
});

test("semantic validation refuses before any payment challenge is issued", async () => {
  const market = demoMarket({
    validate: { "/v1/demo": ({ body }) => { if (body.seed < 0) throw new TypeError("seed must not be negative"); } },
  });
  const response = await market.fetch(new Request("https://market.test/v1/demo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: -1 }),
  }));
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("payment-required"), null);
  assert.deepEqual(await response.json(), { error: "seed must not be negative" });
});

test("the engine refuses a malformed, mistyped, or oversized body before pricing", async () => {
  const market = demoMarket({ maxBodyBytes: 1024 });
  const cases = [
    ["{", "application/json", 400],
    ["{}", "text/plain", 415],
    [JSON.stringify({ seed: 1, pad: "x".repeat(4096) }), "application/json", 413],
  ];
  for (const [body, contentType, expected] of cases) {
    const response = await market.fetch(new Request("https://market.test/v1/demo", { method: "POST", headers: { "content-type": contentType }, body }));
    assert.equal(response.status, expected, `${contentType} ${body.length} bytes`);
    assert.equal(response.headers.get("payment-required"), null);
  }
});

test("Node and edge faces enforce the same body contract before payment", async () => {
  for (const runtime of ["node", "edge"]) {
    const market = demoMarket({ env: { ...ENV, MARKET_RUNTIME: runtime }, facilitatorClient: paidFacilitator() });
    const response = await market.fetch(new Request("https://market.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("payment-required"), null);
  }
});

test("a compute failure carrying an HTTP status is reported with that status", async () => {
  const market = demoMarket({
    facilitatorClient: paidFacilitator(),
    compute: { "/v1/demo": () => { const error = new Error("upstream chain unavailable"); error.status = 502; throw error; }, "/v1/lookup": () => ({}) },
  });
  const paid = await pay(market, "https://market.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 1 }) });
  assert.equal(paid.status, 502);
  assert.deepEqual(await paid.json(), { error: "upstream chain unavailable" });
});

test("Node proxy fails closed on public HTTP origins before forwarding signed purchase credentials or bodies", async () => {
  const market = demoMarket({
    catalog: [postDeclaration()],
    nodeOrigin: "http://node-market.561.group:8087",
    proxyCatalog: [getDeclaration(), getDeclaration({
      route: "/v1/private-compute", method: "POST", operation: "private-compute",
      bodyExample: { input: "confidential" }, bodySchema: { type: "object" },
    })],
  });
  const health = await market.fetch(new Request("https://market.test/v1/status"));
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.nodeProxyConfigured, true);
  assert.equal(healthBody.nodeProxyTransport, "insecure-refused");
  for (const [path, init] of [
    ["/v1/lookup?q=private", { headers: { "PAYMENT-SIGNATURE": "signed-secret", "X-Payment-Recovery": "recovery-secret" } }],
    ["/v1/private-compute", {
      method: "POST", headers: { "content-type": "application/json", "PAYMENT-SIGNATURE": "signed-secret" },
      body: JSON.stringify({ input: "confidential" }),
    }],
  ]) {
    const response = await market.fetch(new Request(`https://market.test${path}`, init));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), "120");
    assert.match((await response.json()).error, /HTTPS/u);
  }
});

test("status is served unpriced on both probes and counts the catalog", async () => {
  const market = demoMarket();
  for (const path of ["/v1/status", "/healthz"]) {
    const response = await market.fetch(new Request(`https://market.test${path}`));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "market.561.group", offers: 2, listedOffers: 2, directOffers: 2, directListedOffers: 2, proxyOffers: 0, proxyListedOffers: 0, runtime: null, nodeProxyConfigured: false, nodeProxyTransport: "not-used", build: null, workerVersion: null });
  }
});

test("the 402index verification hash is served from its binding, and 404s without one", async () => {
  const claimed = demoMarket({ env: { ...ENV, INDEX_VERIFICATION_HASH: "abc123" } });
  const response = await claimed.fetch(new Request("https://market.test/.well-known/402index-verify.txt"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "abc123\n");
  const unclaimed = await demoMarket().fetch(new Request("https://market.test/.well-known/402index-verify.txt"));
  assert.equal(unclaimed.status, 404);
});

test("the agent card is derived from the whole catalog, one skill per offer, keyed by gateway and operation", async () => {
  const market = demoMarket();
  const response = await market.fetch(new Request("https://market.test/.well-known/agent-card.json"));
  const card = await response.json();
  assert.equal(card.name, "market.561.group");
  assert.deepEqual(card.skills.map((skill) => skill.id), ["demo-gateway/read-demo", "other-gateway/look-up-other"]);
  assert.deepEqual(card, marketAgentCard(market.offers));
});

test("the RFC 9727 API catalog lists every offer as an item, answers HEAD with its link relation, and points at the catalog and llms.txt", async () => {
  const market = demoMarket();
  const response = await market.fetch(new Request("https://market.test/.well-known/api-catalog"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
  const catalog = await response.json();
  assert.deepEqual(catalog, marketApiCatalog(market.offers, { origin: "https://market.test" }));
  const [set] = catalog.linkset;
  assert.equal(set.item.length, market.offers.length);
  assert.ok(set.item.every((item, index) => item.href.endsWith(market.offers[index].declaration.route)));
  assert.ok(set["service-desc"][0].href.endsWith("/v1/catalog"));
  assert.ok(set["service-doc"].some((link) => link.href.endsWith("/llms.txt")));
  const head = await market.fetch(new Request("https://market.test/.well-known/api-catalog", { method: "HEAD" }));
  assert.equal(head.status, 200);
  assert.match(head.headers.get("link"), /rel="api-catalog"/u);
});

test("the origin-level x402 discovery document and true402 descriptor list every priced offer on the market's rails", async () => {
  const market = demoMarket();
  const discovery = await (await market.fetch(new Request("https://market.test/.well-known/x402"))).json();
  assert.deepEqual(discovery, marketX402Discovery(market.offers, market.rails(), { name: "market.561.group", origin: "https://market.test" }));
  assert.equal(discovery.x402Version, 2);
  assert.equal(discovery.resources.length, market.offers.filter((offer) => offer.declaration.price).length);
  assert.ok(discovery.resources.every((resource) => resource.network === market.rails().network));
  assert.deepEqual(await (await market.fetch(new Request("https://market.test/.well-known/x402.json"))).json(), discovery);
  const service = await (await market.fetch(new Request("https://market.test/.well-known/x402-service.json"))).json();
  assert.deepEqual(service, marketX402Service(market.offers, market.rails(), { name: "market.561.group", origin: "https://market.test" }));
  assert.equal(service.x402, "1.0");
  assert.equal(service.payment.address, market.rails().payTo);
  assert.equal(service.services.length, discovery.resources.length);
});

test("llms.txt names every offer with its route and price", async () => {
  const market = demoMarket();
  const response = await market.fetch(new Request("https://market.test/llms.txt"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/markdown/u);
  const text = await response.text();
  assert.equal(text, marketLlmsText(market.offers, { name: "market.561.group", origin: "https://market.test" }));
  for (const { declaration } of market.offers) assert.ok(text.includes(declaration.route));
  assert.match(text, /^# market\.561\.group/u);
});

test("the public catalog readout lists every offer with its contract, price, evidence, and compute owner, unpriced", async () => {
  const market = createMarket({ catalog: [postDeclaration(), boundDeclaration()], env: ENV, compute: { "/v1/demo": () => ({}) }, load: async () => ({}) });
  const response = await market.fetch(new Request("https://market.test/v1/catalog"));
  assert.equal(response.status, 200);
  const readout = await response.json();
  assert.equal(readout.recordType, "561-group.x402-market-catalog");
  assert.equal(readout.offers.length, 2);
  assert.equal(readout.offers[1].evidence.status, "deterministic derivation");
  assert.deepEqual(readout.offers[1].compute, { package: "@lenticule-science/demo-astronomy", export: "computePositions" });
  assert.equal(readout.offers[0].amountAtomic, "20000");
  assert.deepEqual(readout, marketCatalogReadout(market.offers, market.rails()));
  assert.equal(readout.settlement.network, NETWORK);
  assert.equal(readout.settlement.asset, USDC);
  assert.equal(readout.offers[1].request.example.url, null, "an unresolved template is not a runnable example");
});

test("the public page is rendered by the TUFTE engine and lists every offer, gateway, and price", async () => {
  const market = demoMarket();
  const response = await market.fetch(new Request("https://market.test/"));
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const needle of ["Demo Reading", "Other Lookup", "$0.02", "$0.01", "demo-gateway", "other-gateway", "/v1/catalog"]) assert.ok(html.includes(needle), needle);
  const model = marketPageModel(market.offers);
  assert.ok(model.tiles.find(tile => tile.id === "offers").html.includes('href="#demo-gateway-read-demo"'));
  for (const needle of ["How to buy", "curl --include", "Input contract", "Response contract", "PAYMENT-RESPONSE"]) assert.ok(html.includes(needle), needle);
});

test("a buyer can discover inputs, obtain terms, and receive a result using only the public catalog", async () => {
  const counts = {};
  const market = demoMarket({ facilitatorClient: paidFacilitator(counts) });
  const catalog = await (await market.fetch(new Request("https://market.test/v1/catalog"))).json();
  const offer = catalog.offers.find(offer => offer.method === "POST");
  assert.deepEqual(offer.request.bodySchema.required, ["seed"]);
  const { url, body, ...init } = offer.request.example;
  const request = { ...init, body: JSON.stringify(body) };
  const unpaid = await market.fetch(new Request(url, request));
  assert.equal(unpaid.status, 402);
  assert.equal(challengeOf(unpaid).accepts[0].amount, offer.amountAtomic);
  assert.equal(counts.settlements, undefined);
  const paid = await pay(market, url, request);
  assert.equal(paid.headers.get("content-type").split(";")[0], offer.mimeType);
  assert.deepEqual(await paid.json(), { value: 2 });
  assert.equal(counts.settlements, 1);
});

test("GET examples preserve concrete paths and query inputs, and page examples escape markup", async () => {
  const declaration = getDeclaration({
    route: "/v1/lookup/{id}",
    probeUrl: "https://market.test/v1/lookup/sample?existing=1",
    queryExample: { search: "reader's </code><script>alert(1)</script> & $(id)" },
    querySchema: { required: ["search"], properties: { search: { type: "string" } } },
    pathParamsSchema: { required: ["id"], properties: { id: { type: "string" } } },
    mimeType: "application/zip",
    output: { schema: { type: "string" }, example: "</code><script>alert(1)</script>" },
  });
  const market = createMarket({ catalog: [declaration], compute: { [declaration.route]: () => ({}) } });
  const offer = market.catalog().offers[0];
  const url = new URL(offer.request.example.url);
  assert.equal(url.pathname, "/v1/lookup/sample");
  assert.equal(url.searchParams.get("existing"), "1");
  assert.equal(url.searchParams.get("search"), declaration.queryExample.search);
  assert.deepEqual(offer.request.pathParamsSchema, declaration.pathParamsSchema);
  assert.deepEqual(offer.request.querySchema, declaration.querySchema);
  assert.equal(offer.request.example.headers.accept, "application/zip");
  const html = await (await market.fetch(new Request("https://market.test/"))).text();
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("an unknown path is a 404, not a challenge", async () => {
  const response = await demoMarket().fetch(new Request("https://market.test/v1/nothing"));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("payment-required"), null);
});

test("a misconfigured deployment reports itself instead of crashing", async () => {
  const market = createMarket({ catalog: [postDeclaration()], env: {}, compute: { "/v1/demo": () => ({}) } });
  const response = await market.fetch(new Request("https://market.test/v1/demo", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 1 }),
  }));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /market misconfigured: X402_PAY_TO/u);
});

test("the same engine serves the Workers face and the Node transport identically", async (t) => {
  const worker = createMarketWorker((env) => createMarket({
    catalog: [postDeclaration(), getDeclaration()],
    env,
    compute: { "/v1/demo": ({ body }) => ({ value: body.seed }), "/v1/lookup": () => ({ value: 1 }) },
    facilitatorClient: unpaidFacilitator(),
  }));
  const viaWorker = await worker.fetch(new Request("https://market.test/v1/status"), ENV);
  assert.deepEqual(await viaWorker.json(), { status: "ok", service: "market.561.group", offers: 2, listedOffers: 2, directOffers: 2, directListedOffers: 2, proxyOffers: 0, proxyListedOffers: 0, runtime: null, nodeProxyConfigured: false, nodeProxyTransport: "not-used", build: null, workerVersion: null });
  const server = await startMarket(demoMarket(), { port: 0, host: "127.0.0.1" });
  t.after(() => server.close());
  const viaNode = await connect(`http://127.0.0.1:${server.port}/v1/status`);
  assert.deepEqual(await viaNode.json(), { status: "ok", service: "market.561.group", offers: 2, listedOffers: 2, directOffers: 2, directListedOffers: 2, proxyOffers: 0, proxyListedOffers: 0, runtime: null, nodeProxyConfigured: false, nodeProxyTransport: "not-used", build: null, workerVersion: null });
  const unpaid = await connect(`http://127.0.0.1:${server.port}/v1/lookup`);
  assert.equal(unpaid.status, 402);
});

test("settlementWitness is installed as afterSettle and attributes the settled route to its gateway", async () => {
  const witnessed = [];
  const market = demoMarket({ facilitatorClient: paidFacilitator(), env: { ...ENV, WITNESS_SINK_URL: "" }, now: () => "2026-09-11T06:00:00.000Z" });
  const originalLog = console.log;
  console.log = (line) => witnessed.push(line);
  try {
    await pay(market, "https://market.test/v1/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 1 }) });
  } finally {
    console.log = originalLog;
  }
  const record = witnessed.map((line) => JSON.parse(line)).find((entry) => entry.event === "demo-gateway.x402-settlement-witness");
  assert.ok(record, "the settlement was witnessed");
  assert.equal(record.gateway, "demo-gateway");
  assert.equal(record.route, "/v1/demo");
  assert.equal(record.operation, "read-demo");
  assert.equal(record.recordedAt, "2026-09-11T06:00:00.000Z");
});
