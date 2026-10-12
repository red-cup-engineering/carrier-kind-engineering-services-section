import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPUTER_ENGINEERING_SPECIFICATION_ID,
  createTypeSystem,
  defineType,
} from "@red-cup-engineering/computer-data-engine";
import { admitOperation } from "@red-cup-engineering/typed-computer-code-engine";
import {
  decodeOperationOutcome,
  jsonWireCodec,
  wireCodecCatalog,
} from "@red-cup-engineering/typed-code-networking-engine";
import {
  admitTypedComputerSystem,
  createTypedComputerSystemRuntime,
} from "../dist/index.mjs";

const text = defineType({
  id: "test:text",
  name: "text",
  description: "test text",
  schema: { type: "string" },
  parents: [],
}).value;

const otherTextWithSameId = defineType({
  id: "test:text",
  name: "other text",
  description: "a conflicting declaration",
  schema: { type: "number" },
  parents: [],
}).value;

const typeSystem = createTypeSystem([text]).value;
const codecs = wireCodecCatalog([jsonWireCodec]);

function hostOperation(id = "test.uppercase") {
  return admitOperation({
    specification: COMPUTER_ENGINEERING_SPECIFICATION_ID,
    id,
    domain: text,
    codomain: text,
    effects: [],
    body: { kind: "capability-effect", capability: id },
  }).value;
}

test("admits a system only when each operation uses its declared type catalog", () => {
  const accepted = admitTypedComputerSystem({ version: 1, id: "test.system", typeSystem, operations: [hostOperation()] });
  assert.equal(accepted.ok, true);

  const conflictingOperation = admitOperation({
    specification: COMPUTER_ENGINEERING_SPECIFICATION_ID,
    id: "test.conflicting",
    domain: otherTextWithSameId,
    codomain: otherTextWithSameId,
    effects: [],
    body: { kind: "capability-effect", capability: "test.conflicting" },
  }).value;
  const refused = admitTypedComputerSystem({ version: 1, id: "test.system", typeSystem, operations: [conflictingOperation] });
  assert.deepEqual(refused, {
    ok: false,
    refusal: {
      code: "domain-type-not-in-system",
      message: "operation test.conflicting domain test:text is not this system's declaration",
    },
  });
});

test("refuses duplicate operation ids and sends accepted host operations through networking", async () => {
  const operation = hostOperation();
  const duplicate = admitTypedComputerSystem({ version: 1, id: "test.system", typeSystem, operations: [operation, operation] });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.refusal.code, "duplicate-operation-id");

  const runtime = createTypedComputerSystemRuntime({ version: 1, id: "test.system", typeSystem, operations: [operation] });
  assert.equal(runtime.ok, true);
  const document = JSON.stringify({
    version: 1,
    kind: "typed-operation-request",
    requestId: "test-request",
    operationId: operation.id,
    inputCodec: "json",
    input: jsonWireCodec.encode("hello"),
    outputCodec: "json",
  });
  const outcome = decodeOperationOutcome(await runtime.value.dispatch(document, {
    codecs,
    allowedEffects: [],
    resolveHost: async (capability) => capability === operation.id ? (value) => value.toUpperCase() : undefined,
  }), codecs);
  assert.deepEqual(outcome, {
    requestId: "test-request",
    outputCodec: "json",
    result: { ok: true, value: "HELLO" },
  });
});

test("local and wire execution share admission, effect authority, and operation lookup", async () => {
  const operation = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "test.effect", domain: text, codomain: text,
    effects: ["test:effect"], body: { kind: "capability-effect", capability: "test.effect" } }).value;
  const runtime = createTypedComputerSystemRuntime({ version: 1, id: "test.shared", typeSystem, operations: [operation] }).value;
  let calls = 0;
  const options = { codecs, allowedEffects: ["test:effect"], resolveHost: () => (value) => { calls++; return value.toUpperCase(); } };
  const wire = async (id, input, authority = options) => decodeOperationOutcome(await runtime.dispatch(JSON.stringify({
    version: 1, kind: "typed-operation-request", requestId: "test.exchange", operationId: id,
    inputCodec: "json", input: jsonWireCodec.encode(input), outputCodec: "json",
  }), authority), codecs).result;
  for (const [id, input, authority] of [[operation.id, 12, options], [operation.id, "hello", { ...options, allowedEffects: [] }], ["missing", "hello", options]]) {
    assert.deepEqual(await runtime.execute(id, input, authority), await wire(id, input, authority));
  }
  assert.equal(calls, 0);
  assert.deepEqual(await runtime.execute(operation.id, "hello", options), await wire(operation.id, "hello"));
  assert.equal(calls, 2);
});
