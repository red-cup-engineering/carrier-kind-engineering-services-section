import assert from "node:assert/strict";
import test from "node:test";

import { validateBazaarRouteExtensions, validateDiscoveryExtension, validateDiscoveryExtensionSpec, isValidRouteTemplate, isValidServiceName } from "@x402/extensions/bazaar";
import { createExactEvmFetchPaymentBoundary } from "../src/fetch-server.mjs";

import {
  CAPABILITY_OFFER_KIND,
  COORDINATE_RESIDUAL_KIND,
  OFFER_DECLARATION_KIND,
  declareCatalog,
  declareOffer,
  incomeAccountFor,
  priceAtomicUnits,
  settlementWitness,
  x402RoutesForOffers,
} from "../src/offer.mjs";

const NETWORK = "eip155:8453";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const RAILS = { network: NETWORK, asset: USDC, payTo: PAY_TO };

function postDeclaration(overrides = {}) {
  return {
    name: "Pacing Analysis",
    gateway: "paid-pacing-intelligence-gateway",
    gatewayPackageName: "@red-cup-engineering/paid-pacing-intelligence-gateway",
    section: "lib/emsenn/services/561-group/services/public-services-section/services/pacing-services-section",
    operation: "analyze-pacing",
    origin: "https://pacing.example.test",
    route: "/v1/pacing/analysis",
    method: "POST",
    price: "$0.05",
    bodyExample: { observations: [{ metric: "hrv-rmssd" }] },
    bodySchema: { properties: { observations: { type: "array" } }, required: ["observations"] },
    output: { schema: { type: "object", required: ["risk"], properties: { risk: { type: "object" } } }, example: { risk: {} } },
    category: "health",
    framings: [
      { key: "clinical", title: "Pacing Analysis", description: "Rolling baselines and labeled risk flags.", tags: ["pacing", "hrv"], serviceName: "561-group-pacing-analysis" },
      { key: "agent", title: "Pacing Analysis for agents", description: "One call, one report.", tags: ["agent"], serviceName: "pacing-analysis-agent" },
    ],
    ledgerAccount: "Income:Sales:X402:Paid-pacing-intelligence-gateway",
    markets: ["x402-bazaar", "402index", "house-capability-market", "house-seller-catalog"],
    resources: ["one stateless compute call"],
    ...overrides,
  };
}

function getDeclaration(overrides = {}) {
  return {
    name: "Gas Oracle",
    gateway: "base-chain-example-gateway",
    gatewayPackageName: "@red-cup-engineering/base-chain-example-gateway",
    section: "lib/emsenn/services/561-group/services/engineering-services-section/services/ethereum-services-section",
    operation: "read-gas-oracle",
    origin: "https://base-chain.example.test",
    route: "/base/gas-oracle",
    method: "GET",
    price: "$0.001".replace("0.001", "0.01"),
    output: { schema: { type: "object" }, example: { baseFee: "1" } },
    framings: [{ key: "default", title: "Gas Oracle", description: "Current Base gas readings.", tags: ["base", "gas"], serviceName: "base-gas-oracle" }],
    ledgerAccount: "Income:Sales:X402:Base-chain-example-gateway",
    markets: ["x402-bazaar", "house-seller-catalog"],
    ...overrides,
  };
}

test("priceAtomicUnits converts dollar strings to six-decimal atomic units", () => {
  assert.equal(priceAtomicUnits("$0.05"), "50000");
  assert.equal(priceAtomicUnits("$0.01"), "10000");
  assert.equal(priceAtomicUnits("$0.04"), "40000");
  assert.equal(priceAtomicUnits("$0.08"), "80000");
  assert.equal(priceAtomicUnits("$12.34"), "12340000");
  assert.equal(priceAtomicUnits("$0.001"), "1000", "sub-cent prices are exact, not rounded");
  assert.equal(priceAtomicUnits("$0.000001"), "1", "one atomic unit is the floor");
  assert.equal(priceAtomicUnits("$0.10", 2), "10");
  assert.throws(() => priceAtomicUnits("0.05"), TypeError);
  assert.throws(() => priceAtomicUnits("$0.5"), TypeError);
  assert.throws(() => priceAtomicUnits("$0.0000001"), TypeError);
  assert.throws(() => priceAtomicUnits("$0.001", 2), /more decimals/u);
});

test("incomeAccountFor follows the house books convention", () => {
  assert.equal(incomeAccountFor("paid-value-chain-gateway"), "Income:Sales:X402:Paid-value-chain-gateway");
  assert.throws(() => incomeAccountFor(""), TypeError);
});

test("declareOffer admits a well-formed declaration and freezes it", () => {
  const offer = declareOffer(postDeclaration());
  assert.equal(offer.kind, OFFER_DECLARATION_KIND);
  assert.equal(offer.amount, "50000");
  assert.equal(offer.url, "https://pacing.example.test/v1/pacing/analysis");
  assert.equal(offer.routeKey, "POST /v1/pacing/analysis");
  assert.deepEqual([...offer.framingKeys], ["clinical", "agent"]);
  assert.ok(Object.isFrozen(offer.declaration));
  assert.match(offer.sku, /^ni:\/\/\/sha-256;/u);
  assert.match(offer.cell, /^ni:\/\/\/sha-256;/u);
  assert.match(offer.law, /^ni:\/\/\/sha-256;/u);
});

test("declareOffer refuses a declaration missing a required field", () => {
  const { price, ...withoutPrice } = postDeclaration();
  assert.throws(() => declareOffer(withoutPrice), /offer declaration is not admissible/u);
});

test("declareOffer refuses a POST declaration with no body example", () => {
  const { bodyExample, ...withoutBody } = postDeclaration();
  assert.throws(() => declareOffer(withoutBody), /offer declaration is not admissible/u);
});

test("declareOffer refuses a framing with more than five tags or an overlong service name", () => {
  assert.throws(() => declareOffer(postDeclaration({
    framings: [{ key: "k", title: "T", description: "d", tags: ["a", "b", "c", "d", "e", "f"], serviceName: "s" }],
  })), /offer declaration is not admissible/u);
  assert.throws(() => declareOffer(postDeclaration({
    framings: [{ key: "k", title: "T", description: "d", tags: [], serviceName: "561-group-pacing-heart-rate-threshold" }],
  })), /offer declaration is not admissible/u);
});

test("declareOffer refuses a ledger account outside the seller's income account namespace", () => {
  assert.throws(
    () => declareOffer(postDeclaration({ ledgerAccount: "Assets:Cash" })),
    /ledgerAccount/u,
  );
  assert.equal(declareOffer(postDeclaration({ ledgerAccount: "Income:Sales:Seller" })).ledgerAccount, "Income:Sales:Seller");
});

test("declareOffer refuses a declaration carrying an unknown market", () => {
  assert.throws(() => declareOffer(postDeclaration({ markets: ["etsy"] })), /offer declaration is not admissible/u);
});

test("declareOffer refuses a settlement-affecting field in the declaration itself", () => {
  assert.throws(() => declareOffer(postDeclaration({ payTo: PAY_TO })), /offer declaration is not admissible/u);
});

test("declareOffer admits by schema by default, and still refuses a schema-invalid declaration", () => {
  const { price, ...withoutPrice } = postDeclaration();
  assert.throws(() => declareOffer(withoutPrice), /offer declaration is not admissible/u);
  assert.throws(() => declareOffer(withoutPrice, { admit: true }), /offer declaration is not admissible/u);
});

test("declareOffer({admit: false}) trusts prior schema admission of an already-valid declaration", () => {
  const admitted = declareOffer(postDeclaration(), { admit: false });
  const bySchema = declareOffer(postDeclaration());
  assert.deepEqual(admitted.declaration, bySchema.declaration);
  assert.equal(admitted.sku, bySchema.sku);
});

test("declareOffer({admit: false}) skips the schema check but still enforces the ledger-account rule", () => {
  // Trusting prior schema admission still preserves the seller-account guard.
  assert.throws(
    () => declareOffer(postDeclaration({ ledgerAccount: "Assets:Cash" }), { admit: false }),
    /offer ledgerAccount must name an income account/u,
  );
});

test("declareCatalog forwards {admit: false} to every raw declaration, and never re-admits an already-admitted offer", () => {
  const preAdmitted = declareOffer(postDeclaration());
  const catalog = declareCatalog([preAdmitted, getDeclaration()], { admit: false });
  assert.equal(catalog.length, 2);
  assert.equal(catalog[0], preAdmitted);
  assert.equal(catalog[1].declaration.route, "/base/gas-oracle");
});

test("x402Route derives a priced route with a schema-valid Bazaar extension", () => {
  const offer = declareOffer(postDeclaration());
  const routes = offer.x402Route(RAILS);
  const entry = routes["POST /v1/pacing/analysis"];
  assert.deepEqual(entry.accepts, [{
    scheme: "exact",
    network: NETWORK,
    price: { amount: "50000", asset: USDC, extra: { name: "USD Coin", version: "2" } },
    payTo: PAY_TO,
  }]);
  assert.equal(entry.serviceName, "561-group-pacing-analysis");
  assert.deepEqual(entry.tags, ["pacing", "hrv"]);
  assert.equal(entry.mimeType, "application/json");
  assert.equal(Object.hasOwn(entry.extensions.bazaar, "routeTemplate"), false);
  assert.equal(entry.extensions.bazaar.info.input.method, "POST");
  assert.equal(entry.extensions.bazaar.info.input.bodyType, "json");
  assert.deepEqual(entry.extensions.bazaar.info.input.body, { observations: [{ metric: "hrv-rmssd" }] });
  assert.ok(isValidServiceName(entry.serviceName));
  assert.deepEqual(validateDiscoveryExtensionSpec(entry.extensions.bazaar), { valid: true });
  assert.deepEqual(validateDiscoveryExtension(entry.extensions.bazaar), { valid: true });
});

test("x402Route derives a GET route whose discovery extension carries the GET method", () => {
  const offer = declareOffer(getDeclaration());
  const entry = offer.x402Route(RAILS)["GET /base/gas-oracle"];
  assert.equal(entry.extensions.bazaar.info.input.method, "GET");
  assert.equal(Object.hasOwn(entry.extensions.bazaar, "routeTemplate"), false);
  assert.deepEqual(validateDiscoveryExtension(entry.extensions.bazaar), { valid: true });
});

test("custom tokens require explicit signing metadata instead of inheriting USDC's domain", () => {
  const offer = declareOffer(getDeclaration());
  const rails = { ...RAILS, asset: `0x${"22".repeat(20)}` };
  assert.throws(() => offer.x402Route(rails), /requires assetExtra.name and assetExtra.version/u);
  const entry = offer.x402Route({ ...rails, assetExtra: { name: "Custom USD", version: "1" } })["GET /base/gas-oracle"];
  assert.deepEqual(entry.accepts[0].price.extra, { name: "Custom USD", version: "1" });
  assert.equal(entry.accepts[0].price.asset, rails.asset);
});

test("x402Route selects a named framing", () => {
  const offer = declareOffer(postDeclaration());
  const entry = offer.x402Route({ ...RAILS, framing: "agent" })["POST /v1/pacing/analysis"];
  assert.equal(entry.serviceName, "pacing-analysis-agent");
  assert.throws(() => offer.x402Route({ ...RAILS, framing: "nope" }), /carries no framing nope/u);
});

test("x402Route refuses to invent the rails the deployment must supply", () => {
  const offer = declareOffer(postDeclaration());
  assert.throws(() => offer.x402Route({ asset: USDC, payTo: PAY_TO }), /EVM CAIP-2 network/u);
  assert.throws(() => offer.x402Route({ network: NETWORK, payTo: PAY_TO }), /settlement asset/u);
  assert.throws(() => offer.x402Route({ network: NETWORK, asset: USDC }), /payout address/u);
});

test("the official route validator accepts every derived route", () => {
  const offers = [declareOffer(postDeclaration()), declareOffer(getDeclaration({ origin: "https://pacing.example.test" }))];
  const routes = x402RoutesForOffers(offers, RAILS);
  assert.deepEqual(Object.keys(routes), ["POST /v1/pacing/analysis", "GET /base/gas-oracle", "HEAD /base/gas-oracle"]);
  const warnings = [];
  const warn = console.warn;
  console.warn = (line) => warnings.push(line);
  try {
    validateBazaarRouteExtensions(routes);
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(warnings, []);
});

test("index402Registration derives the register body, with the probe body for a POST offer", () => {
  const offer = declareOffer(postDeclaration());
  assert.deepEqual(offer.index402Registration({ provider: "561 Group", paymentAsset: "USD Coin", paymentNetwork: "Base" }), {
    url: "https://pacing.example.test/v1/pacing/analysis",
    name: "Pacing Analysis",
    protocol: "x402",
    description: "Rolling baselines and labeled risk flags.",
    category: "health",
    http_method: "POST",
    probe_body: JSON.stringify({ observations: [{ metric: "hrv-rmssd" }] }),
    price_usd: 0.05,
    payment_asset: "USD Coin",
    payment_network: "Base",
    provider: "561 Group",
  });
  const get = declareOffer(getDeclaration());
  assert.deepEqual(get.index402Registration(), {
    url: "https://base-chain.example.test/base/gas-oracle",
    name: "Gas Oracle",
    protocol: "x402",
    description: "Current Base gas readings.",
    category: "data",
    http_method: "GET",
    price_usd: 0.01,
  });
});

test("index402Registration uses an explicit probe URL when the route is a template", () => {
  const offer = declareOffer(getDeclaration({
    route: "/v1/ephemeris/moment/{date}",
    probeUrl: "https://base-chain.example.test/v1/ephemeris/moment/2026-07-21",
  }));
  assert.equal(offer.index402Registration().url, "https://base-chain.example.test/v1/ephemeris/moment/2026-07-21");
  const extension = offer.x402Route(RAILS)["GET /v1/ephemeris/moment/:date"].extensions.bazaar;
  assert.equal(extension.routeTemplate, "/v1/ephemeris/moment/:date");
  assert.ok(isValidRouteTemplate(extension.routeTemplate));
});

test("the official Bazaar extension publishes one canonical route and concrete path parameters for every date", async () => {
  const offer = declareOffer(getDeclaration({
    route: "/v1/ephemeris/moment/{date}",
    pathParamsSchema: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
  }));
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: {
      async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
      async verify() { throw new Error("discovery must not verify an unpaid request"); },
      async settle() { throw new Error("discovery must not settle an unpaid request"); },
    },
    routes: offer.x402Route(RAILS),
  });
  for (const date of ["2026-07-21", "2026-10-13"]) {
    const response = await boundary.handle(
      new Request(`https://base-chain.example.test/v1/ephemeris/moment/${date}`),
      () => { throw new Error("discovery must not execute unpaid compute"); },
    );
    assert.equal(response.status, 402);
    const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
    assert.equal(challenge.extensions.bazaar.routeTemplate, "/v1/ephemeris/moment/:date");
    assert.deepEqual(challenge.extensions.bazaar.info.input.pathParams, { date });
    assert.deepEqual(validateDiscoveryExtension(challenge.extensions.bazaar), { valid: true });
  }
  assert.equal(offer.declaration.route, "/v1/ephemeris/moment/{date}");
});

test("capabilityOffer derives an org.emsenn.capability-offer.v3 object with typed residuals", () => {
  const offer = declareOffer(postDeclaration());
  const projection = offer.capabilityOffer({
    ...RAILS,
    agentCard: "https://pacing.example.test/.well-known/agent-card.json",
    expiresAt: "2027-07-25T00:00:00.000Z",
  });
  assert.equal(projection.kind, CAPABILITY_OFFER_KIND);
  assert.equal(projection.provider, "https://pacing.example.test/actors/market");
  assert.equal(projection.seller, null);
  assert.equal(projection.book, null);
  assert.equal(projection.operation, "analyze-pacing");
  assert.deepEqual(projection.price, { protocol: "x402", asset: USDC, amount: "50000", network: NETWORK });
  assert.equal(projection.coordinates.signedAgentCard.kind, "reference");
  assert.equal(projection.coordinates.packageOperation.href, "https://www.npmjs.com/package/@red-cup-engineering/paid-pacing-intelligence-gateway");
  for (const missing of ["deploymentHealth", "resourceMeter", "settlementReturn"]) {
    assert.equal(projection.coordinates[missing].kind, COORDINATE_RESIDUAL_KIND);
    assert.equal(projection.coordinates[missing].state, "missing");
  }
  assert.equal(projection.expiresAt, "2027-07-25T00:00:00.000Z");
  assert.ok(Object.isFrozen(projection));
});

test("capabilityOffer refuses without an agent card or an ISO expiry", () => {
  const offer = declareOffer(postDeclaration());
  assert.throws(() => offer.capabilityOffer({ ...RAILS, expiresAt: "2027-07-25T00:00:00.000Z" }), /agent card/u);
  assert.throws(() => offer.capabilityOffer({ ...RAILS, agentCard: "https://a/.well-known/agent-card.json", expiresAt: "2027-07-25" }), /ISO-8601/u);
});

test("sellerCatalogRow derives the row shape the paid-sellers assay validates", () => {
  const offer = declareOffer(postDeclaration());
  assert.deepEqual(offer.sellerCatalogRow(RAILS), {
    seller: null,
    servingProvider: "https://pacing.example.test/actors/market",
    gateway: "paid-pacing-intelligence-gateway",
    sellerRecord: null,
    book: null,
    gatewayPackageName: "@red-cup-engineering/paid-pacing-intelligence-gateway",
    url: "https://pacing.example.test/v1/pacing/analysis",
    method: "POST",
    body: { observations: [{ metric: "hrv-rmssd" }] },
    expectedAmount: "50000",
    network: NETWORK,
    asset: USDC,
    payTo: PAY_TO,
    listed: true,
  });
  const get = declareOffer(getDeclaration({ listed: false }));
  const row = get.sellerCatalogRow(RAILS);
  assert.equal(row.listed, false);
  assert.equal("body" in row, false);
});

test("seller projections carry the declared enterprise and book independently of the serving gateway", () => {
  const seller = {
    enterprise: "pacing-service",
    entity: "Causeway Services",
    record: { path: "lib/emsenn/services/561-group/lib/agency/enterprises/pacing-service.json", sha256: "ab".repeat(32) },
  };
  const offer = declareOffer(postDeclaration({ seller, ledgerAccount: "Income:Sales:Pacing" }));
  const row = offer.sellerCatalogRow(RAILS);
  assert.equal(row.seller, seller.enterprise);
  assert.deepEqual(row.sellerRecord, seller.record);
  assert.deepEqual(row.book, { enterprise: seller.enterprise, account: "Income:Sales:Pacing" });
  assert.equal(row.gateway, "paid-pacing-intelligence-gateway");
  const capability = offer.capabilityOffer({
    ...RAILS, agentCard: "https://pacing.example.test/.well-known/agent-card.json", expiresAt: "2027-07-25T00:00:00.000Z",
  });
  assert.deepEqual(capability.seller, seller);
  assert.deepEqual(capability.book, row.book);
  assert.equal(capability.provider, row.servingProvider);
});

test("the catalog row's expected amount equals the amount in the derived challenge", () => {
  const offer = declareOffer(postDeclaration());
  assert.equal(
    offer.sellerCatalogRow(RAILS).expectedAmount,
    offer.x402Route(RAILS)["POST /v1/pacing/analysis"].accepts[0].price.amount,
  );
});

test("beancountOpen derives the income account's open directive", () => {
  const offer = declareOffer(postDeclaration());
  assert.equal(offer.beancountOpen({ date: "2026-09-08" }), "2026-09-08 open Income:Sales:X402:Paid-pacing-intelligence-gateway");
  assert.throws(() => offer.beancountOpen({}), /YYYY-MM-DD/u);
});

test("settlementWitness logs the settlement and posts it to a bound sink", async () => {
  const offers = [declareOffer(postDeclaration()), declareOffer(postDeclaration({
    name: "Heart-Rate Threshold",
    route: "/v1/pacing/heart-rate-threshold",
    operation: "estimate-heart-rate-threshold",
    price: "$0.01",
    bodyExample: { restingHr: 58 },
    framings: [{ key: "clinical", title: "Heart-Rate Threshold", description: "One heuristic ceiling.", tags: ["pacing"], serviceName: "561-group-hr-threshold" }],
  }))];
  const lines = [];
  const posted = [];
  const witness = settlementWitness(offers, {
    env: { WITNESS_SINK_URL: "https://witness.example.test/settlements" },
    fetch: async (url, init) => { posted.push({ url, headers: init.headers, body: JSON.parse(init.body) }); return new Response("{}"); },
    now: () => "2026-09-08T05:00:00.000Z",
    log: (line) => lines.push(line),
  });
  const result = await witness({
    transportContext: { request: { method: "POST", path: "/v1/pacing/heart-rate-threshold" }, responseStatus: 200, responseBody: new Uint8Array(12) },
    requirements: { amount: "10000", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: "0x1111111111111111111111111111111111111111" },
    result: { success: true, network: NETWORK, transaction: `0x${"a".repeat(64)}`, payer: "0xdeadbeef" },
  });
  assert.deepEqual({ ...result, witnessId: undefined }, {
    version: 2,
    gateway: "paid-pacing-intelligence-gateway",
    route: "/v1/pacing/heart-rate-threshold",
    method: "POST",
    operation: "estimate-heart-rate-threshold",
    sku: offers[1].sku,
    ledgerAccount: offers[1].ledgerAccount,
    seller: null,
    book: null,
    paymentObservation: { basis: "facilitator-result", success: true, independentlyVerifiedTransfer: false },
    deliveryObservation: { basis: "server-response-prepared", status: 200, bodyBytes: 12, requesterAccepted: null },
    offerDeclaration: offers[1].declaration,
    network: NETWORK,
    transaction: `0x${"a".repeat(64)}`,
    payer: "0xdeadbeef",
    amount: "10000",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    payTo: "0x1111111111111111111111111111111111111111",
    recordedAt: "2026-09-08T05:00:00.000Z",
    witnessId: undefined,
  });
  assert.match(result.witnessId, /^ni:\/\/\/sha-256;/u);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].url, "https://witness.example.test/settlements");
  assert.deepEqual(posted[0].body, result);
  assert.equal(posted[0].headers["x-x402-settlement-witness-id"], result.witnessId);
  assert.equal(lines.length, 1);
  const { offerDeclaration: _offerDeclaration, ...logged } = result;
  assert.deepEqual(JSON.parse(lines[0]), { event: "paid-pacing-intelligence-gateway.x402-settlement-witness", ...logged });
});

test("settlementWitness still logs when no sink is bound", async () => {
  const lines = [];
  const witness = settlementWitness(declareOffer(postDeclaration()), { env: {}, log: (line) => lines.push(line), now: () => "2026-09-08T05:00:00.000Z" });
  const result = await witness({ result: { network: NETWORK, transaction: `0x${"b".repeat(64)}` } });
  assert.equal(result.route, "/v1/pacing/analysis");
  assert.equal(result.operation, "analyze-pacing");
  assert.equal(result.payer, null);
  assert.equal(lines.length, 1);
});

test("settlementWitness attributes a concrete same-price route by its declared method and template", async () => {
  const offers = [
    declareOffer(getDeclaration({ route: "/v1/astrology/precision/{date}", operation: "precision-moment", price: "$0.32" })),
    declareOffer(getDeclaration({ route: "/v1/astronomy/precision/{date}", operation: "astronomy-precision-positions", price: "$0.32" })),
  ];
  const witness = settlementWitness(offers, { env: {}, log: () => {}, now: () => "2026-09-08T05:00:00.000Z" });
  const result = await witness({
    transportContext: { request: { method: "GET", path: "/v1/astronomy/precision/2026-07-21T00:00:00Z" } },
    result: { network: NETWORK, transaction: `0x${"d".repeat(64)}`, amount: "320000" },
  });
  assert.equal(result.route, "/v1/astronomy/precision/{date}");
  assert.equal(result.operation, "astronomy-precision-positions");
  assert.equal(result.sku, offers[1].sku);
  const head = await witness({
    transportContext: { request: { method: "HEAD", path: "/v1/astronomy/precision/2026-07-21T00:00:00Z" } },
    result: { network: NETWORK, transaction: `0x${"f".repeat(64)}`, amount: "320000" },
  });
  assert.equal(head.operation, "astronomy-precision-positions");
});

test("settlementWitness leaves a multi-offer settlement unattributed when its transport request is absent", async () => {
  const offers = [declareOffer(getDeclaration()), declareOffer(getDeclaration({ route: "/base/other", operation: "read-other" }))];
  const witness = settlementWitness(offers, { env: {}, log: () => {} });
  const result = await witness({ result: { network: NETWORK, transaction: `0x${"e".repeat(64)}` } });
  assert.equal(result.route, null);
  assert.equal(result.operation, null);
  assert.equal(result.sku, null);
});

test("settlementWitness never lets a refused sink fail the settlement", async () => {
  const lines = [];
  const witness = settlementWitness(declareOffer(postDeclaration()), {
    env: { WITNESS_SINK_URL: "https://witness.example.test/settlements" },
    fetch: async () => { throw new Error("sink unreachable"); },
    log: (line) => lines.push(line),
    now: () => "2026-09-08T05:00:00.000Z",
  });
  const result = await witness({ result: { network: NETWORK, transaction: `0x${"c".repeat(64)}` } });
  assert.equal(result.transaction, `0x${"c".repeat(64)}`);
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1]).event, "paid-pacing-intelligence-gateway.x402-settlement-witness-sink-refused");
  assert.equal(JSON.parse(lines[1]).reason, "sink unreachable");
});

test("settlementWitness treats a non-success sink response as a refused delivery", async () => {
  const lines = [];
  const witness = settlementWitness(declareOffer(postDeclaration()), {
    env: { WITNESS_SINK_URL: "https://witness.example.test/settlements" },
    fetch: async () => new Response("unavailable", { status: 503 }),
    log: (line) => lines.push(line),
    now: () => "2026-09-08T05:00:00.000Z",
  });
  const result = await witness({ result: { network: NETWORK, transaction: `0x${"c".repeat(64)}` } });
  assert.ok(result.witnessId);
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1]).reason, "sink responded 503");
});

