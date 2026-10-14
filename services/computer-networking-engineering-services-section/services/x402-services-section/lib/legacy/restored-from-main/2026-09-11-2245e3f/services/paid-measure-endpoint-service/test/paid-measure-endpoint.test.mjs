import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { createExactEvmPaymentBoundary } from "@red-cup-engineering/x402-services-section/server";

import {
  DEFAULT_NETWORK,
  createMeasureHandlers,
  discoveryFor,
  expressRoutesFor,
  measureEndpointDefaults,
  routeTableFor,
  settlementWitnessFor,
  tierFor,
  validateMeasureCatalog,
} from "../src/paid-measure-endpoint.mjs";

const NETWORK = "eip155:84532";
const PAY_TO = `0x${"11".repeat(20)}`;

const DOUBLE_INPUT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:paid-measure-endpoint-service-test:double-value-input:1.0.0",
  type: "object",
  required: ["value"],
  additionalProperties: false,
  properties: { value: { type: "number", exclusiveMinimum: 0 } },
});

const DOUBLE_OUTPUT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:paid-measure-endpoint-service-test:double-value-output:1.0.0",
  type: "object",
  required: ["doubled"],
  properties: { doubled: { type: "number" } },
});

function doubleMeasure(overrides = {}) {
  return {
    id: "double-value",
    path: "/v1/double-value",
    title: "Double Value",
    description: "doubles a positive number",
    price: { usd: "0.01" },
    input: { schema: DOUBLE_INPUT_SCHEMA, example: { value: 21 } },
    output: { schema: DOUBLE_OUTPUT_SCHEMA, example: { doubled: 42 } },
    evidence: { status: "trivial arithmetic; no external evidence required", citations: [] },
    compute: { package: "@paid-measure-endpoint-service-test/double", export: "double" },
    ...overrides,
  };
}

function tripleMeasure() {
  return {
    id: "triple-value",
    path: "/v1/triple-value",
    title: "Triple Value",
    description: "triples a positive number",
    price: { usd: "0.05" },
    input: {
      schema: { ...DOUBLE_INPUT_SCHEMA, $id: "urn:paid-measure-endpoint-service-test:triple-value-input:1.0.0" },
      example: { value: 3 },
    },
    output: {
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        $id: "urn:paid-measure-endpoint-service-test:triple-value-output:1.0.0",
        type: "object",
        required: ["tripled"],
        properties: { tripled: { type: "number" } },
      },
      example: { tripled: 9 },
    },
    evidence: {
      status: "trivial arithmetic; no external evidence required",
      citations: [{ title: "the multiplication table" }],
    },
    compute: { package: "@paid-measure-endpoint-service-test/triple", export: "triple", marshal: "toJson" },
    ...({}),
  };
}

function sampleCatalog(measures = [doubleMeasure()]) {
  return {
    node: {
      id: "sample-measure-node",
      title: "Sample Measure Node",
      description: "a sample measure node for tests",
    },
    measures,
  };
}

function doubleResolvers() {
  return { "double-value": async ({ value }) => ({ doubled: value * 2 }) };
}

const unpaidFacilitator = () => ({
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
  async verify() { throw new Error("an unpaid assay must never verify"); },
  async settle() { throw new Error("an unpaid assay must never settle"); },
});

// -- validateMeasureCatalog -------------------------------------------------

test("validateMeasureCatalog accepts one well-formed catalog and freezes it", () => {
  const validated = validateMeasureCatalog(sampleCatalog());
  assert.equal(validated.node.id, "sample-measure-node");
  assert.equal(validated.measures.length, 1);
  assert.equal(validated.measures[0].id, "double-value");
  assert.throws(() => { validated.measures.push({}); });
});

test("validateMeasureCatalog refuses duplicate measure ids", () => {
  const dupeId = sampleCatalog([doubleMeasure(), doubleMeasure()]);
  assert.throws(() => validateMeasureCatalog(dupeId), /duplicate measure id/u);
});

test("validateMeasureCatalog refuses a path that does not match /v1/<id>", () => {
  const catalog = sampleCatalog([doubleMeasure({ path: "/v1/wrong-path" })]);
  assert.throws(() => validateMeasureCatalog(catalog), /path must be \/v1\/double-value/u);
});

test("validateMeasureCatalog refuses a non-positive or malformed price", () => {
  assert.throws(() => validateMeasureCatalog(sampleCatalog([doubleMeasure({ price: { usd: "0.00" } })])), /positive/u);
  assert.throws(() => validateMeasureCatalog(sampleCatalog([doubleMeasure({ price: { usd: "0.1" } })])), /positive/u);
});

test("validateMeasureCatalog refuses a schema outside the house draft-2020-12 vocabulary", () => {
  const catalog = sampleCatalog([doubleMeasure({ input: { schema: { type: "object" }, example: { value: 1 } } })]);
  assert.throws(() => validateMeasureCatalog(catalog), /not an admitted draft 2020-12 schema/u);
});

test("validateMeasureCatalog refuses an example that does not satisfy its own schema", () => {
  const catalog = sampleCatalog([doubleMeasure({ input: { schema: DOUBLE_INPUT_SCHEMA, example: { value: "not-a-number" } } })]);
  assert.throws(() => validateMeasureCatalog(catalog), /does not satisfy/u);
});

test("validateMeasureCatalog accepts an optional compute.marshal field: a marshalled measure", () => {
  const validated = validateMeasureCatalog(sampleCatalog([tripleMeasure()]));
  assert.equal(validated.measures[0].compute.marshal, "toJson");
});

// -- createMeasureHandlers ---------------------------------------------------

test("createMeasureHandlers refuses a catalog measure with no matching resolver", () => {
  assert.throws(() => createMeasureHandlers(sampleCatalog(), {}), /resolvers\.double-value must be an async/u);
});

test("createMeasureHandlers validates input before computing, and computes via the injected resolver", async () => {
  const handlers = createMeasureHandlers(sampleCatalog(), doubleResolvers());
  const handler = handlers.get("double-value");
  assert.throws(() => handler.validateInput({ value: -1 }), /invalid input for measure double-value/u);
  assert.throws(() => handler.validateInput({}), /invalid input for measure double-value/u);
  handler.validateInput({ value: 21 });
  assert.deepEqual(await handler.compute({ value: 21 }), { doubled: 42 });
});

test("createMeasureHandlers runs a marshalled measure through validate -> compute -> JSON unchanged", async () => {
  const catalog = sampleCatalog([tripleMeasure()]);
  const handlers = createMeasureHandlers(catalog, { "triple-value": async ({ value }) => ({ tripled: value * 3 }) });
  const handler = handlers.get("triple-value");
  handler.validateInput({ value: 3 });
  assert.deepEqual(await handler.compute({ value: 3 }), { tripled: 9 });
});

// -- discoveryFor -------------------------------------------------------------

test("discoveryFor's Bazaar extension carries the measure's own input example and output example verbatim", () => {
  const measure = validateMeasureCatalog(sampleCatalog()).measures[0];
  const discovery = discoveryFor(measure);
  assert.equal(discovery.bazaar.info.input.method, "POST");
  assert.equal(discovery.bazaar.info.input.bodyType, "json");
  assert.deepEqual(discovery.bazaar.info.input.body, measure.input.example);
  assert.deepEqual(discovery.bazaar.info.output.example, measure.output.example);
});

// -- measureEndpointDefaults ---------------------------------------------------

test("measureEndpointDefaults defaults to Base mainnet and refuses a missing payTo or facilitator", () => {
  const defaults = measureEndpointDefaults({ facilitatorUrl: "https://facilitator.invalid", payTo: PAY_TO });
  assert.equal(defaults.network, DEFAULT_NETWORK);
  assert.equal(defaults.payTo, PAY_TO.toLowerCase());
  assert.throws(() => measureEndpointDefaults({ facilitatorUrl: "https://facilitator.invalid" }), /payTo is required/u);
  assert.throws(() => measureEndpointDefaults({ payTo: PAY_TO }), /facilitatorUrl is required/u);
});

// -- tierFor --------------------------------------------------------------------

test("tierFor resolves both the dollar price string and the atomic-unit settlement amount back to the measure id", () => {
  const catalog = sampleCatalog([doubleMeasure(), tripleMeasure()]);
  assert.equal(tierFor(catalog, "$0.01"), "double-value");
  assert.equal(tierFor(catalog, "10000"), "double-value");
  assert.equal(tierFor(catalog, "$0.05"), "triple-value");
  assert.equal(tierFor(catalog, "50000"), "triple-value");
  assert.equal(tierFor(catalog, "999999"), "undeclared");
});

// -- settlementWitnessFor -------------------------------------------------------

test("settlementWitnessFor is generic over the catalog's node id and performs no I/O", () => {
  const witness = settlementWitnessFor(sampleCatalog());
  const record = witness({
    result: { network: "eip155:8453", transaction: `0x${"ab".repeat(32)}`, payer: `0x${"22".repeat(20)}`, amount: "10000" },
  });
  assert.equal(record.type, "X402MeasureSettlementWitness");
  assert.equal(record.nodeId, "sample-measure-node");
  assert.equal(record.tier, "double-value");
  assert.equal(record.payment.network, "eip155:8453");
});

test("settlementWitnessFor refuses a settlement missing network or transaction", () => {
  const witness = settlementWitnessFor(sampleCatalog());
  assert.throws(() => witness({ result: { transaction: `0x${"ab".repeat(32)}` } }), /omitted network/u);
  assert.throws(() => witness({ result: { network: "eip155:8453" } }), /omitted transaction/u);
});

// -- routeTableFor + the fetch/Workers boundary ----------------------------------

test("routeTableFor: a request with a body that fails validateInput never reaches the facilitator (422 before payment)", async () => {
  const catalog = sampleCatalog();
  const handlers = createMeasureHandlers(catalog, doubleResolvers());
  const defaults = { network: NETWORK, facilitatorClient: unpaidFacilitator(), payTo: PAY_TO };
  const routes = routeTableFor(catalog, handlers, defaults);
  const route = routes["POST /v1/double-value"];

  assert.throws(() => route.validateInput({ value: -1 }), /invalid input/u);
});

test("routeTableFor: the boundary issues the official x402 402 challenge for a validated body with no payment", async () => {
  const catalog = sampleCatalog();
  const handlers = createMeasureHandlers(catalog, doubleResolvers());
  const defaults = { network: NETWORK, facilitatorClient: unpaidFacilitator(), payTo: PAY_TO };
  const routes = routeTableFor(catalog, handlers, defaults);
  const route = routes["POST /v1/double-value"];

  const boundary = createExactEvmFetchPaymentBoundary({ network: NETWORK, facilitatorClient: unpaidFacilitator(), routes });

  const body = { value: 21 };
  route.validateInput(body);
  const response = await boundary.handle(
    new Request("https://gateway.example/v1/double-value", { method: "POST" }),
    async () => Response.json(await route.compute(body)),
  );
  assert.equal(response.status, 402);
  const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].network, NETWORK);
  assert.equal(challenge.accepts[0].payTo.toLowerCase(), PAY_TO);
});

test("routeTableFor: a settled payment reaches compute and returns the resolver's JSON", async () => {
  const catalog = sampleCatalog();
  const handlers = createMeasureHandlers(catalog, doubleResolvers());
  const defaults = { network: NETWORK, facilitatorClient: unpaidFacilitator(), payTo: PAY_TO };
  const routes = routeTableFor(catalog, handlers, defaults);
  const route = routes["POST /v1/double-value"];

  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"33".repeat(20)}` }; },
    async settle() { return { success: true, network: NETWORK, transaction: `0x${"cd".repeat(32)}`, payer: `0x${"33".repeat(20)}` }; },
  };
  const boundary = createExactEvmFetchPaymentBoundary({ network: NETWORK, facilitatorClient: paidFacilitator, routes });

  const body = { value: 21 };
  const unpaid = await boundary.handle(new Request("https://gateway.example/v1/double-value", { method: "POST" }), async () => Response.json({}));
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  const paymentSignature = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0xtest" } })).toString("base64");

  const response = await boundary.handle(
    new Request("https://gateway.example/v1/double-value", { method: "POST", headers: { "payment-signature": paymentSignature } }),
    async () => Response.json(await route.compute(body)),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { doubled: 42 });
});

// -- expressRoutesFor + the Express boundary -------------------------------------

async function withExpressApp(catalog, resolvers, defaults, run) {
  const handlers = createMeasureHandlers(catalog, resolvers);
  const routes = expressRoutesFor(catalog, handlers, defaults);
  const routeConfig = Object.fromEntries(routes.map((route) => [`POST ${route.path}`, route.route]));
  const payment = createExactEvmPaymentBoundary({ network: defaults.network, facilitatorClient: defaults.facilitatorClient, routes: routeConfig });

  const app = express();
  app.use(express.json());
  for (const route of routes) app.post(route.path, route.admit);
  app.use(payment.middleware);
  for (const route of routes) app.post(route.path, route.respond);
  // eslint-disable-next-line no-unused-vars
  app.use((error, _request, response, _next) => response.status(500).json({ error: error.message }));

  const server = app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((accept) => server.close(accept));
  }
}

test("expressRoutesFor: refuses a malformed body with 422 before any 402 is issued", async () => {
  const catalog = sampleCatalog();
  const defaults = { network: NETWORK, facilitatorClient: unpaidFacilitator(), payTo: PAY_TO };
  await withExpressApp(catalog, doubleResolvers(), defaults, async (origin) => {
    const response = await fetch(`${origin}/v1/double-value`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: -1 }),
    });
    assert.equal(response.status, 422);
  });
});

test("expressRoutesFor: issues the official x402 402 challenge for a valid, unpaid request", async () => {
  const catalog = sampleCatalog();
  const defaults = { network: NETWORK, facilitatorClient: unpaidFacilitator(), payTo: PAY_TO };
  await withExpressApp(catalog, doubleResolvers(), defaults, async (origin) => {
    const response = await fetch(`${origin}/v1/double-value`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 21 }),
    });
    assert.equal(response.status, 402);
    const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
    assert.equal(challenge.accepts[0].amount, "10000");
    assert.equal(challenge.accepts[0].payTo, PAY_TO);
  });
});
