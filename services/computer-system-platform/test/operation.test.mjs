import assert from "node:assert/strict";
import test from "node:test";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { defineType, specializeType } from "@red-cup-engineering/computer-data-services-section/type-system";
import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { stringDescriptor } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";
import { admitOperation, composeOperations, executeOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";

const text = defineType({ id: "test:text", name: "text", description: "test", schema: { type: "string" }, parents: [] }).value;
const identity = (id) => admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id, domain: text, codomain: text, effects: [], body: { kind: "sen", term: tm.lam(tm.var(0)), inputDescriptor: stringDescriptor, outputDescriptor: stringDescriptor } }).value;

test("executes and composes checked portable SEN operations", async () => {
  const first = identity("first"), second = identity("second");
  assert.deepEqual(await executeOperation(first, "hello"), { ok: true, value: "hello" });
  const composed = composeOperations(first, second, "both");
  assert.equal(composed.ok, true);
  assert.deepEqual(await executeOperation(composed.value, "hello"), { ok: true, value: "hello" });
});

test("runs named host capabilities only within declared effects and preserves refusals", async () => {
  const operation = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "host", domain: text, codomain: text, effects: ["write"], body: { kind: "capability-effect", capability: "uppercase" } });
  assert.equal(operation.ok, true);
  assert.deepEqual(await executeOperation(operation.value, "hello", { allowedEffects: [], resolveHost: async () => (value) => value.toUpperCase() }), { ok: false, refusal: { code: "EffectRefused", message: "operation effects exceed allowed effects" } });
  assert.deepEqual(await executeOperation(operation.value, "hello", { allowedEffects: ["write"], resolveHost: async (name) => name === "uppercase" ? (value) => value.toUpperCase() : undefined }), { ok: true, value: "HELLO" });
});

test("refuses an untyped term and descriptor-incompatible composition", () => {
  assert.equal(admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "bad", domain: text, codomain: text, effects: [], body: { kind: "sen", term: tm.var(0), inputDescriptor: stringDescriptor, outputDescriptor: stringDescriptor } }).ok, false);
  const producer = identity("producer");
  const consumer = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "consumer", domain: text, codomain: text, effects: [], body: { kind: "sen", term: tm.lam(tm.var(0)), inputDescriptor: { kind: "scalar" }, outputDescriptor: stringDescriptor } }).value;
  assert.equal(composeOperations(producer, consumer, "bad-compose").ok, false);
});

test("equal type labels cannot substitute a different declaration before a host effect", async () => {
  const replacement = defineType({ id: text.id, name: "Other", description: "A different declaration.", schema: { type: "number" }, parents: [] }).value;
  const op = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "host", domain: text, codomain: text, effects: [], body: { kind: "capability-effect", capability: "host" } }).value;
  let calls = 0;
  const result = await executeOperation(op, 3, { resolveType: () => replacement, resolveHost: () => () => { calls += 1; return 3; } });
  assert.equal(result.ok, false);
  assert.equal(result.refusal.code, "TypeIdentityConflict");
  assert.equal(calls, 0);
  const other = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "other", domain: replacement, codomain: replacement, effects: [], body: { kind: "sen", term: tm.lam(tm.var(0)), inputDescriptor: stringDescriptor, outputDescriptor: stringDescriptor } }).value;
  assert.equal(composeOperations(identity("producer"), other, "invalid").ok, false);
});

test("composition admits a declared subtype at the shared carrier boundary", async () => {
  const narrow = specializeType([text], { id: "nonempty", name: "Nonempty", description: "Nonempty text.", schema: { minLength: 1 } }).value;
  const producer = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "narrow", domain: narrow, codomain: narrow, effects: [], body: { kind: "sen", term: tm.lam(tm.var(0)), inputDescriptor: stringDescriptor, outputDescriptor: stringDescriptor } }).value;
  const result = composeOperations(producer, identity("wider"), "composed");
  assert.equal(result.ok, true);
  assert.deepEqual(await executeOperation(result.value, "value"), { ok: true, value: "value" });
});

test("admission snapshots executable terms and descriptors without freezing caller input", async () => {
  const descriptor = { ...stringDescriptor };
  const term = structuredClone(tm.lam(tm.var(0)));
  const operation = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "snapshot", domain: text, codomain: text, effects: [], body: { kind: "sen", term, inputDescriptor: descriptor, outputDescriptor: descriptor } }).value;
  descriptor.kind = "unit";
  assert.equal(Object.isFrozen(descriptor), false);
  assert.equal(Object.isFrozen(operation.body.inputDescriptor), true);
  assert.deepEqual(await executeOperation(operation, "original"), { ok: true, value: "original" });
  assert.equal(admitOperation(operation).value, operation);
});

test("a capability operation carries its description and a thrown host refusal keeps its own code", async () => {
  const described = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "described", description: "Uppercases text.", domain: text, codomain: text, effects: ["write"], body: { kind: "capability-effect", capability: "uppercase" } });
  assert.equal(described.value.description, "Uppercases text.");
  assert.equal(Object.isFrozen(described.value), true);
  const coded = await executeOperation(described.value, "hello", { allowedEffects: ["write"], resolveHost: () => () => { throw Object.assign(new Error("scope esi-wallet is missing"), { code: "missing_scope" }); } });
  assert.deepEqual(coded, { ok: false, refusal: { code: "missing_scope", message: "scope esi-wallet is missing" } });
  const named = await executeOperation(described.value, "hello", { allowedEffects: ["write"], resolveHost: () => () => { throw new RangeError("out of range"); } });
  assert.deepEqual(named, { ok: false, refusal: { code: "RangeError", message: "out of range" } });
  const bare = await executeOperation(described.value, "hello", { allowedEffects: ["write"], resolveHost: () => () => { throw "plain"; } });
  assert.deepEqual(bare, { ok: false, refusal: { code: "ExecutionFailed", message: "plain" } });
});
