import { createComputerPlatform, bindingsProviders } from "../src/index.mjs";
import assert from "node:assert/strict";
import test from "node:test";

import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { defineType } from "@red-cup-engineering/computer-data-services-section/type-system";
import { admitOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";

import {
  decodeOperationOutcome,
  decodeOperationRequest,
  encodeOperationRequest,
  jsonWireCodec,
  wireCodecCatalog,
} from "../src/wire.mjs";

const number = defineType({ id: "network.test.number", name: "Network test number", description: "A numeric transport test value.", parents: [], schema: { type: "number" } }).value;
const catalog = wireCodecCatalog([jsonWireCodec]);
const operation = admitOperation({
  specification: COMPUTER_ENGINEERING_SPECIFICATION_ID,
  id: "network.test.increment",
  domain: number,
  codomain: number,
  effects: ["network.test.increment"],
  body: { kind: "capability-effect", capability: "network.test.increment" },
}).value;

const platform = (handler = (value) => value + 1) => createComputerPlatform({ operations: [operation], providers: bindingsProviders({ [operation.id]: handler }) });

const request = (operationId = operation.id) => encodeOperationRequest({ actorResourceCatalog: {},
  requestId: "request-1",
  operationId,
  inputCodec: "json",
  input: jsonWireCodec.encode(4),
  outputCodec: "json",
});

test("request-response dispatch resolves the receiving catalog and round-trips typed data", async () => {
  const response = await platform().dispatch(request(), {
    codecs: catalog,
    allowedEffects: operation.effects,
  });
  assert.deepEqual(decodeOperationOutcome(response, catalog), {
    requestId: "request-1",
    outputCodec: "json",
    result: { ok: true, value: 5 },
  });
});

test("transport returns a shared Result refusal for unknown operations and denied effects", async () => {
  const unknown = decodeOperationOutcome(await platform().dispatch(request("network.test.absent"), {
    codecs: catalog,
    allowedEffects: [],
  }), catalog);
  assert.deepEqual(unknown.result, { ok: false, refusal: { code: "OperationUnavailable", message: "operation identity cannot be resolved" } });

  const denied = decodeOperationOutcome(await platform().dispatch(request(), {
    codecs: catalog,
    allowedEffects: [],
  }), catalog);
  assert.deepEqual(denied.result, { ok: false, refusal: { code: "EffectRefused", message: "operation effects exceed allowed effects" } });
});

test("invalid output codecs refuse before an effect runs, and codecs may carry empty text", async () => {
  let calls = 0;
  const invalidOutput = encodeOperationRequest({ actorResourceCatalog: {}, requestId: "request-2", operationId: operation.id, inputCodec: "json", input: jsonWireCodec.encode(4), outputCodec: "absent" });
  const outcome = decodeOperationOutcome(await platform(() => { calls += 1; return 5; }).dispatch(invalidOutput, {
    codecs: catalog,
    allowedEffects: operation.effects,
  }), catalog);
  assert.equal(calls, 0);
  assert.equal(outcome.result.ok, false);

  const text = { name: "text", decode: (value) => value, encode: (value) => value };
  const textCatalog = wireCodecCatalog([text]);
  const empty = encodeOperationRequest({ actorResourceCatalog: {}, requestId: "request-3", operationId: operation.id, inputCodec: "text", input: "", outputCodec: "text" });
  assert.equal(decodeOperationRequest(empty).input, "");
  assert.equal(textCatalog.resolve("text")?.decode(""), "");
});

test("a malformed output codec is refused before invoking a provider", async () => {
  let calls = 0;
  const receiver = platform(() => { calls++; return 5; });
  const codecs = { resolve: name => name === "json" ? jsonWireCodec : { name } };
  const document = encodeOperationRequest({ actorResourceCatalog: {}, requestId: "malformed-codec", operationId: operation.id,
    inputCodec: "json", input: "4", outputCodec: "malformed" });
  const result = decodeOperationOutcome(await receiver.dispatch(document, { codecs, allowedEffects: operation.effects }), codecs);
  assert.equal(result.result.refusal.code, "InvalidInputWire");
  assert.equal(calls, 0);
  await receiver.close();
});
