import assert from "node:assert/strict";
import test from "node:test";
import { createTypeSystem, defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { declareCapabilityOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { createComputerPlatform, bindingsProviders } from "../src/index.mjs";
import { decodeOperationOutcome, encodeOperationRequest, jsonWireCodec, wireCodecCatalog } from "../src/wire.mjs";
const text = defineType({ id: "test:text", name: "Text", description: "Text", parents: [], schema: { type: "string" } }).value;
const operation = declareCapabilityOperation({ id: "uppercase", domain: text, codomain: text, effects: ["uppercase"] }).value;
const codecs = wireCodecCatalog([jsonWireCodec]);

test("one immutable registry rejects duplicate operations and conflicting type declarations", () => {
  assert.throws(() => createComputerPlatform({ operations: [operation, operation] }), /duplicate-operation-id/);
  const conflicting = defineType({ id: text.id, name: "Number", description: "Conflicting declaration", parents: [], schema: { type: "number" } }).value;
  assert.throws(() => createComputerPlatform({ typeSystem: createTypeSystem([conflicting]).value, operations: [operation] }), /domain-type-not-in-platform/);
  assert.throws(() => createComputerPlatform({ id: " " }), /id must be nonempty/);
  const definitions = [operation];
  const platform = createComputerPlatform({ operations: definitions });
  definitions.pop();
  assert.equal(platform.operation(operation.id), operation);
  assert.deepEqual(platform.operations(), [operation]);
  assert.equal(Object.isFrozen(platform.operations()), true);
});

test("local and wire entrypoints share one admitted registry and effect authority", async () => {
  let calls = 0;
  const platform = createComputerPlatform({ operations: [operation], providers: bindingsProviders({ uppercase: value => { calls++; return value.toUpperCase(); } }) });
  const options = { codecs, allowedEffects: ["uppercase"] };
  const wire = async (id, input, authority = options) => decodeOperationOutcome(await platform.dispatch(encodeOperationRequest({ actorResourceCatalog: {},
    requestId: "exchange", operationId: id, inputCodec: "json", input: jsonWireCodec.encode(input), outputCodec: "json",
  }), authority), codecs).result;
  for (const [id, input, authority] of [[operation.id, 12, options], [operation.id, "hello", { ...options, allowedEffects: [] }], ["missing", "hello", options]]) {
    assert.deepEqual(await platform.execute(id, input, authority), await wire(id, input, authority));
  }
  assert.equal(calls, 0);
  assert.deepEqual(await platform.execute(operation.id, "hello", options), await wire(operation.id, "hello"));
  assert.equal(calls, 2);
  await platform.close();
});
