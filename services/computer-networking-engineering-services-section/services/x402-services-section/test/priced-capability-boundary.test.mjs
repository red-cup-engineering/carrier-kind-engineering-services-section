import assert from "node:assert/strict";
import test from "node:test";

import { createPricedCapabilityBoundary } from "../src/priced-capability-boundary.mjs";

const INVOCATION = `sha256:${"ab".repeat(32)}`;
const SETTLEMENT = Object.freeze({
  type: "X402SettlementEvidence",
  invocation: INVOCATION,
  success: true,
  network: "eip155:5615610",
  transaction: `0x${"cd".repeat(32)}`,
  payer: `0x${"ef".repeat(20)}`,
  amount: "7",
});

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

function harness(overrides = {}) {
  const records = [];
  let settlementHook;
  const boundary = createPricedCapabilityBoundary({
    operation: "perform-one-capability",
    resourcePath: "/x402/capability/invoke",
    offerPath: "/x402/capability/offer",
    resultPath: "/x402/capability/result",
    offer: { kind: "org.emsenn.capability-offer.v3", operation: "perform-one-capability" },
    priceTerms: {
      network: "eip155:5615610",
      amount: "7",
      asset: `0x${"11".repeat(20)}`,
      payTo: `0x${"22".repeat(20)}`,
    },
    admit: async () => ({ admitted: true }),
    append: async (record) => { records.push(record); },
    execute: async ({ intent }) => ({ echoed: intent.request }),
    recoveredRecords: { intents: new Map(), terminals: new Map() },
    paymentIdentity: () => INVOCATION,
    settlementProjection: () => SETTLEMENT,
    createPublicReference: ({ invocation }) => `public_${invocation.slice("sha256:".length)}`,
    recoverPublicReference: ({ invocation, intent }) => intent.publicReference ?? `public_${invocation.slice("sha256:".length)}`,
    projectPublicResult: ({ status, publicReference }) => ({ ok: true, status, reference: publicReference }),
    paymentBoundaryFactory: ({ afterSettle }) => {
      settlementHook = afterSettle;
      return { middleware: (_request, _response, next) => next() };
    },
    ...overrides,
  });
  return { boundary, records, settle: (...args) => settlementHook(...args) };
}

test("durably retains the identified invocation intent before settlement can proceed", async () => {
  const order = [];
  const { boundary, records } = harness({
    append: async (record) => { order.push("append"); records?.push(record); },
  });
  const request = { body: { value: 1 }, get: () => "payment-header" };
  await boundary.retainIntentHandler(request, response(), () => order.push("next"));
  assert.deepEqual(order, ["append", "next"]);
});

test("executes one settled invocation at most once and durably retains its terminal result", async () => {
  let executions = 0;
  const intents = new Map([[INVOCATION, { invocation: INVOCATION, publicReference: `public_${INVOCATION.slice(7)}`, request: { value: 1 } }]]);
  const records = [];
  const { settle } = harness({
    recoveredRecords: { intents, terminals: new Map() },
    append: async (record) => { records.push(record); },
    execute: async () => { executions += 1; return { value: 2 }; },
  });
  const [first, second] = await Promise.all([settle({}), settle({})]);
  const third = await settle({});
  assert.equal(executions, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(second, third);
  assert.equal(records.length, 1);
  assert.equal(records[0].type, "PricedCapabilityInvocationReceipt");
});

test("retains typed execution refusal after successful settlement", async () => {
  const intents = new Map([[INVOCATION, { invocation: INVOCATION, publicReference: `public_${INVOCATION.slice(7)}`, request: {} }]]);
  const records = [];
  const { settle } = harness({
    recoveredRecords: { intents, terminals: new Map() },
    append: async (record) => { records.push(record); },
    execute: async () => { throw new Error("capability refused"); },
  });
  const terminal = await settle({});
  assert.equal(terminal.type, "PricedCapabilityInvocationRefusal");
  assert.equal(terminal.refusal.reason, "capability refused");
  assert.deepEqual(records, [terminal]);
});

test("projects recovered terminal and pending state only through the explicit public policy", () => {
  const pending = `sha256:${"33".repeat(32)}`;
  const terminal = { type: "CustomerTerminal", invocation: INVOCATION, privateAuthority: "never public" };
  const { boundary } = harness({
    recoveredRecords: {
      intents: new Map([
        [INVOCATION, { invocation: INVOCATION, publicReference: `public_${INVOCATION.slice(7)}` }],
        [pending, { invocation: pending, publicReference: `public_${pending.slice(7)}` }],
      ]),
      terminals: new Map([[INVOCATION, terminal]]),
    },
  });
  const terminalResponse = response();
  boundary.resultHandler({ params: { id: `public_${INVOCATION.slice(7)}` } }, terminalResponse);
  assert.equal(terminalResponse.statusCode, 200);
  assert.deepEqual(terminalResponse.body, { ok: true, status: "terminal", reference: `public_${INVOCATION.slice(7)}` });
  const pendingResponse = response();
  boundary.resultHandler({ params: { id: `public_${pending.slice(7)}` } }, pendingResponse);
  assert.equal(pendingResponse.statusCode, 202);
  assert.deepEqual(pendingResponse.body, { ok: true, status: "pending", reference: `public_${pending.slice(7)}` });
});

test("retains one reference across concurrent repeats and restores it after recovery", async () => {
  let number = 0;
  const { boundary, records } = harness({
    createPublicReference: () => `opaque_${++number}`,
  });
  const request = { body: { value: 1 }, get: () => "payment-header" };
  await Promise.all([
    boundary.retainIntentHandler(request, response(), () => {}),
    boundary.retainIntentHandler(request, response(), () => {}),
  ]);
  assert.equal(number, 1);
  assert.equal(records.length, 1);
  assert.equal(records[0].publicReference, "opaque_1");
  const recovered = harness({
    recoveredRecords: { intents: new Map([[INVOCATION, records[0]]]), terminals: new Map() },
    createPublicReference: () => "opaque_2",
  }).boundary;
  const result = response();
  recovered.resultHandler({ params: { id: "opaque_1" } }, result);
  assert.deepEqual(result.body, { ok: true, status: "pending", reference: "opaque_1" });
  const invoked = response();
  recovered.invokeHandler({ get: () => "payment-header" }, invoked);
  assert.deepEqual(invoked.body, { ok: true, status: "settlement-pending", reference: "opaque_1" });
});

test("reserves a reference while durable append is pending so distinct invocations cannot collide", async () => {
  let releaseAppend;
  const first = harness({
    paymentIdentity: (header) => header,
    createPublicReference: () => "same_reference",
    append: async () => new Promise((resolve) => { releaseAppend = resolve; }),
  });
  const firstResponse = response();
  const firstRetention = first.boundary.retainIntentHandler({ body: {}, get: () => "first" }, firstResponse, () => {});
  while (releaseAppend === undefined) await new Promise((resolve) => setImmediate(resolve));
  const beforeAppend = response();
  first.boundary.resultHandler({ params: { id: "same_reference" } }, beforeAppend);
  assert.equal(beforeAppend.statusCode, 404);
  const secondResponse = response();
  await first.boundary.retainIntentHandler({ body: {}, get: () => "second" }, secondResponse, () => {});
  assert.equal(secondResponse.statusCode, 400);
  assert.deepEqual(secondResponse.body, { ok: false, refusal: { type: "CapabilityInvocationIntentRefusal" } });
  releaseAppend();
  await firstRetention;
});

test("fails closed for missing, colliding, and unknown public references", () => {
  assert.throws(() => harness({ projectPublicResult: undefined }), /projectPublicResult must be an injected function/u);
  assert.throws(() => harness({
    recoveredRecords: { intents: new Map([[INVOCATION, { invocation: INVOCATION }]]), terminals: new Map() },
    recoverPublicReference: ({ intent }) => intent.publicReference,
  }), /recovered public reference/u);
  assert.throws(() => harness({
    recoveredRecords: {
      intents: new Map([
        [INVOCATION, { invocation: INVOCATION, publicReference: "same" }],
        [`sha256:${"34".repeat(32)}`, { invocation: `sha256:${"34".repeat(32)}`, publicReference: "same" }],
      ]),
      terminals: new Map(),
    },
  }), /multiple invocations/u);
  const { boundary } = harness();
  const missing = response();
  boundary.resultHandler({ params: { id: "missing" } }, missing);
  assert.equal(missing.statusCode, 404);
});

test("does not return injected admission or retention error messages publicly", async () => {
  const refusedAdmission = harness({ admit: async () => { throw new Error("private authority detail"); } }).boundary;
  const admission = response();
  await refusedAdmission.admissionHandler({}, admission, () => {});
  assert.deepEqual(admission.body, { ok: false, refusal: { type: "CapabilityAdmissionRefusal" } });
  const refusedRetention = harness({ createPublicReference: () => "not a valid reference!" }).boundary;
  const retention = response();
  await refusedRetention.retainIntentHandler({ body: {}, get: () => "payment-header" }, retention, () => {});
  assert.deepEqual(retention.body, { ok: false, refusal: { type: "CapabilityInvocationIntentRefusal" } });
});

test("refuses a created intent whose recovery policy does not round-trip its reference", async () => {
  const { boundary, records } = harness({
    recoverPublicReference: () => "different_reference",
  });
  const refused = response();
  await boundary.retainIntentHandler({ body: {}, get: () => "payment-header" }, refused, () => {});
  assert.deepEqual(refused.body, { ok: false, refusal: { type: "CapabilityInvocationIntentRefusal" } });
  assert.equal(records.length, 0);
});

test("keeps deployment, economic, and protocol bindings injected", () => {
  let observed;
  harness({
    paymentBoundaryFactory: (configuration) => {
      observed = configuration;
      return { middleware: () => {} };
    },
  });
  assert.deepEqual(Object.keys(observed.routes), ["POST /x402/capability/invoke"]);
  const accepted = observed.routes["POST /x402/capability/invoke"].accepts[0];
  assert.equal(accepted.network, "eip155:5615610");
  assert.equal(accepted.price.amount, "7");
});
