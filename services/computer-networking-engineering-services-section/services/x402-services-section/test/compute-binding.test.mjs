import assert from "node:assert/strict";
import test from "node:test";

import { admitOfferExamples, bindingSpecifier, defaultArguments, projectArguments, resolveBinding } from "../src/compute-binding.mjs";
import { declareCatalog, declareOffer, sellerCatalogRows } from "../src/offer.mjs";

const RAILS = { network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a" };

function declaration(overrides = {}) {
  return {
    name: "Astronomy Positions",
    gateway: "astronomy",
    gatewayPackageName: "@lenticule-science/astronomy-position-computation-service",
    section: "lib/emsenn/services/561-group/services/science-services-section/services/astronomy-services-section",
    operation: "astronomy-positions",
    origin: "https://market.561.group",
    route: "/v1/astronomy/positions/{date}",
    method: "GET",
    price: "$0.04",
    probeUrl: "https://market.561.group/v1/astronomy/positions/2026-07-21T00:00:00Z",
    output: { schema: { type: "object" }, example: { bodies: [] } },
    framings: [{ key: "default", title: "Astronomy Positions", description: "Ten-body positions.", tags: ["astronomy"], serviceName: "astronomy-positions" }],
    ledgerAccount: "Income:Sales:X402:Astronomy",
    markets: ["x402-bazaar", "house-seller-catalog"],
    compute: { package: "@lenticule-science/astronomy-position-computation-service", export: "computeAstronomyPositions" },
    validate: { package: "@lenticule-science/astronomy-position-computation-service", export: "normalizeInstant" },
    ...overrides,
  };
}

test("bindingSpecifier names the package root or its subpath export", () => {
  assert.equal(bindingSpecifier({ package: "@a/b", export: "f" }), "@a/b");
  assert.equal(bindingSpecifier({ package: "@a/b", subpath: "./node", export: "f" }), "@a/b/node");
  assert.throws(() => bindingSpecifier({ package: "@a/b", subpath: "node", export: "f" }), /subpath/u);
  assert.throws(() => bindingSpecifier({ package: "@a/b" }), /export/u);
});

test("defaultArguments projects the body for POST and the sole path parameter for GET", () => {
  assert.deepEqual(defaultArguments({ method: "POST", route: "/v1/x" }), ["body"]);
  assert.deepEqual(defaultArguments({ method: "GET", route: "/v1/x/{date}" }), ["params.date"]);
  assert.deepEqual(defaultArguments({ method: "GET", route: "/v1/x" }), ["query"]);
  assert.deepEqual(defaultArguments({ method: "GET", route: "/v1/{a}/{b}" }), ["query"]);
});

test("projectArguments reads dotted paths from the request context", () => {
  const binding = { package: "@a/b", export: "f", args: ["params.date", "query", "env.RPC_URL"] };
  const context = { params: { date: "2026-07-21" }, query: { latitude: "1" }, env: { RPC_URL: "http://rpc" } };
  assert.deepEqual(projectArguments(binding, { method: "GET", route: "/v1/{date}" }, context), ["2026-07-21", { latitude: "1" }, "http://rpc"]);
  assert.throws(() => projectArguments({ package: "@a/b", export: "f", args: ["headers.x"] }, { method: "GET", route: "/" }, {}), /dotted paths/u);
});

test("resolveBinding imports the module once and calls the named export with the projected arguments", async () => {
  const loads = [];
  const load = async (specifier) => { loads.push(specifier); return { compute: (date, options) => ({ date, options }) }; };
  const invoke = resolveBinding({ package: "@a/b", subpath: "./node", export: "compute", args: ["params.date", "query"] }, { method: "GET", route: "/v1/{date}" }, { load });
  assert.deepEqual(await invoke({ params: { date: "d" }, query: { q: 1 } }), { date: "d", options: { q: 1 } });
  assert.deepEqual(await invoke({ params: { date: "e" }, query: {} }), { date: "e", options: {} });
  assert.deepEqual(loads, ["@a/b/node"]);
});

test("resolveBinding refuses a module without the named function", async () => {
  const invoke = resolveBinding({ package: "@a/b", export: "missing" }, { method: "POST", route: "/v1/x" }, { load: async () => ({}) });
  await assert.rejects(() => invoke({ body: {} }), /exports no function named missing/u);
});

test("declareOffer carries compute, validate, and evidence bindings and refuses a malformed one", () => {
  const offer = declareOffer(declaration({ evidence: { status: "deterministic derivation", citations: [{ title: "Moshier" }] } }));
  assert.deepEqual(offer.declaration.compute, { package: "@lenticule-science/astronomy-position-computation-service", export: "computeAstronomyPositions" });
  assert.equal(offer.declaration.validate.export, "normalizeInstant");
  assert.equal(offer.declaration.evidence.status, "deterministic derivation");
  assert.throws(() => declareOffer(declaration({ compute: { package: "@a/b" } })), /not admissible/u);
  assert.throws(() => declareOffer(declaration({ compute: { package: "@a/b", export: "f", args: ["headers"] } })), /not admissible/u);
});

test("declareOffer carries the runtime an offer's compute needs and refuses an unknown one", () => {
  assert.equal(declareOffer(declaration()).declaration.runtime, undefined, "edge is the default and is left unsaid");
  assert.equal(declareOffer(declaration({ runtime: "node" })).declaration.runtime, "node");
  assert.throws(() => declareOffer(declaration({ runtime: "wasm" })), /not admissible/u);
});

test("declareCatalog admits offers from many gateways and refuses a route or operation declared twice", () => {
  const second = declaration({
    name: "Pacing", gateway: "pacing", gatewayPackageName: "@red-cup-engineering/pacing-intelligence-services-section",
    operation: "analyze-pacing", route: "/v1/pacing/analysis", method: "POST", price: "$0.05", probeUrl: undefined,
    bodyExample: { observations: [] }, ledgerAccount: "Income:Sales:X402:Pacing",
    compute: { package: "@red-cup-engineering/pacing-intelligence-services-section", export: "analyzePacingRequest" }, validate: undefined,
  });
  delete second.probeUrl; delete second.validate;
  const catalog = declareCatalog([declaration(), second]);
  assert.equal(catalog.length, 2);
  assert.deepEqual(catalog.map((offer) => offer.declaration.gateway), ["astronomy", "pacing"]);
  assert.throws(() => declareCatalog([declaration(), declaration({ operation: "other" })]), /route GET \/v1\/astronomy\/positions\/\{date\} is declared by both/u);
  assert.throws(() => declareCatalog([declaration(), declaration({ route: "/v1/other/{date}", probeUrl: "https://market.561.group/v1/other/x" })]), /operation astronomy\/astronomy-positions is declared twice/u);
  assert.throws(() => declareCatalog([]), /nonempty/u);
  assert.equal(declareCatalog(catalog)[0], catalog[0]);
});

test("sellerCatalogRows derives the whole catalog's rows on one set of rails", () => {
  const rows = sellerCatalogRows([declaration()], RAILS);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].gateway, "astronomy");
  assert.equal(rows[0].seller, null, "a serving gateway does not establish the seller's admitted enterprise");
  assert.equal(rows[0].expectedAmount, "40000");
  assert.equal(rows[0].payTo, RAILS.payTo);
});

test("a binding reads facts of its own offer, so one function can sell several offers", async () => {
  const { projectArguments } = await import("../src/compute-binding.mjs");
  const args = projectArguments({ package: "@a/b", export: "f", args: ["offer.operation", "env"] }, { method: "GET", route: "/v1/publications/x", operation: "x" }, { env: { bucket: true } });
  assert.deepEqual(args, ["x", { bucket: true }]);
});


test("seller examples must exercise their real offer configuration before an offer is published", async () => {
  const seen = [];
  const declaration = {
    method: "POST", route: "/v1/attention/allocate",
    bodyExample: { budget: 3, obstructions: [{ id: "a", cost: 1, benefit: 1 }] },
    compute: { configuration: { maxSearchNodes: 24, maxObstructions: 4 } },
    validate: { package: "@a/metrologic", export: "validate",
      args: ["body", "offer.compute.configuration"] },
  };
  const load = async name => {
    assert.equal(name, "@a/metrologic");
    return { validate(body, policy) {
      seen.push({ body, policy });
      if (body.obstructions.length > policy.maxObstructions)
        throw new RangeError("too many obstructions for this host");
    } };
  };
  await admitOfferExamples([declaration], { load });
  assert.equal(seen.length, 1, "offer.* paths are original known data, not deferred host effects");
  assert.equal(seen[0].body, declaration.bodyExample);
  assert.deepEqual(seen[0].policy, declaration.compute.configuration);
  const malformed = { ...declaration, bodyExample: {
    budget: 3, obstructions: Array.from({ length: 5 }, (_, i) => ({ id: String(i), cost: 1, benefit: 1 })),
  } };
  await assert.rejects(() => admitOfferExamples([malformed], { load }),
    /offer examples refused by their own validation:[\s\S]*too many obstructions/);
  assert.equal(seen.length, 2);
});

test("external env/params admission waits for actual host; pure declarations do not", async () => {
  let imported = 0;
  const load = async () => {
    imported++;
    return { validate: () => { throw new TypeError("bad example"); } };
  };
  const base = { method: "POST", route: "/v1/x", bodyExample: { data: 1 } };
  const dynamic = [
    { ...base, validate: { package: "@a/b", export: "validate", args: ["env.TOKEN"] } },
    { ...base, validate: { package: "@a/b", export: "validate", args: ["params.id"] } },
  ];
  await admitOfferExamples(dynamic, { load });
  assert.equal(imported, 0, "only genuinely unavailable environment and route arguments defer");
  await assert.rejects(() => admitOfferExamples([
    { ...base, validate: { package: "@a/b", export: "validate", args: ["body"] } },
  ], { load }), /bad example/);
  assert.equal(imported, 1);
  await assert.rejects(() => admitOfferExamples(null, { load }), /declaration records/);
});


test("explicit supplier Result refusals are not admitted sample contracts", async () => {
  const initial = { method: "POST", route: "/v1/attention/allocate",
    validate: { package: "@a/metrologic", export: "validate", args: ["body"] },
    bodyExample: { budget: 1, obstructions: [] } };
  const load = async () => ({ validate: () => ({ ok: false, refusal: {
    code: "maximum-work-exceeded", message: "payload exceeds admitted host capacity",
  } }) });
  await assert.rejects(() => admitOfferExamples([initial], { load }),
    /offered sample was refused by its original validator/);
  const boolLoad = async () => ({ validate: () => false });
  await assert.rejects(() => admitOfferExamples([initial], { load: boolLoad }),
    /offered sample was refused/);
  const contractLoad = async () => ({ validate: () => ({ admitted: false, reason: "not sold" }) });
  await assert.rejects(() => admitOfferExamples([initial], { load: contractLoad }),
    /offered sample was refused/);
  const valid = async () => ({ validate: () => ({ ok: true, value: initial.bodyExample }) });
  await admitOfferExamples([initial], { load: valid });
  const voidValidator = async () => ({ validate: () => undefined });
  await admitOfferExamples([initial], { load: voidValidator });
});


test("unknown declared host-policy paths are rejected without importing an executable", async () => {
  let invoked = 0;
  const request = {
    method: "POST", route: "/v1/attention/allocate",
    bodyExample: { budget: 1, obstructions: [] },
    compute: { configuration: { maxSearchNodes: 100 } },
    validate: { package: "@a/b", export: "validate",
      args: ["body", "offer.compute.configuration.maxObstructions"] },
  };
  await assert.rejects(() => admitOfferExamples([request], {
    load: async () => { invoked++; return { validate: () => true }; },
  }), /declared offer argument is missing: offer.compute.configuration.maxObstructions/);
  assert.equal(invoked, 0);
  await assert.rejects(() => admitOfferExamples([{
    ...request, validate: { ...request.validate, args: ["body", "offer.nonexistent"] },
  }], { load: async () => { invoked++; return { validate: () => true }; } }),
    /declared offer argument is missing: offer.nonexistent/);
  assert.equal(invoked, 0);
  await admitOfferExamples([{
    ...request,
    compute: { configuration: { maxSearchNodes: 100, maxObstructions: 8 } },
  }], { load: async () => { invoked++; return { validate: () => true }; } });
  assert.equal(invoked, 1);
});
