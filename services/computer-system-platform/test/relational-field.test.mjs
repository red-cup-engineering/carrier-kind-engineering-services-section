import { createComputerPlatform, bindingsProviders } from "../src/index.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { createRelationalField, defineRelation } from "@red-cup-engineering/computer-data-services-section/type-system/relations";
import { defineType } from "@red-cup-engineering/computer-data-services-section/type-system";
import { admitOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { decodeOperationOutcome, encodeOperationRequest, relationalFieldWireCodec, wireCodecCatalog } from "../src/wire.mjs";

const text = defineType({ id: "text", name: "Text", description: "Nonempty text.", parents: [], schema: { type: "string", minLength: 1 } }).value;
const bool = defineType({ id: "bool", name: "Boolean", description: "A reported outcome.", parents: [], schema: { type: "boolean" } }).value;
const relation = defineRelation({ id: "accepted", domain: text, codomain: bool, witness: text }).value;
const fieldType = defineType({ id: "field", name: "Field", description: "A field validated by its receiving wire codec.", parents: [], schema: { type: "object", required: ["relations", "statements", "catalogIdentity"] } }).value;
const field = createRelationalField([relation], [
  { subject: "work:1", predicate: "accepted", object: true, witness: "receipt:1" },
  { subject: "work:1", predicate: "accepted", object: false, witness: "receipt:2" },
]).value;
const codec = relationalFieldWireCodec([relation]);
const codecs = wireCodecCatalog([codec]);
const operation = admitOperation({ specification: COMPUTER_ENGINEERING_SPECIFICATION_ID, id: "retain-evidence", domain: fieldType, codomain: fieldType, effects: ["invoke-provider"], body: { kind: "capability-effect", capability: "retain-evidence" } }).value;

test("a complete contradictory field survives a typed operation wire exchange", async () => {
  const document = encodeOperationRequest({ actorResourceCatalog: {}, requestId: "one", operationId: operation.id, inputCodec: codec.name, outputCodec: codec.name, input: codec.encode(field) });
  const result = await createComputerPlatform({ operations: [operation], providers: bindingsProviders({ "retain-evidence": value => value }) }).dispatch(document, { codecs, allowedEffects: ["invoke-provider"] });
  assert.deepEqual(decodeOperationOutcome(result, codecs).result, { ok: true, value: field });
});

test("tampered field identities are refused before a provider effect can run", async () => {
  const input = JSON.parse(codec.encode(field));
  input.statements[0].statement.object = !input.statements[0].statement.object;
  const document = encodeOperationRequest({ actorResourceCatalog: {}, requestId: "two", operationId: operation.id, inputCodec: codec.name, outputCodec: codec.name, input: JSON.stringify(input) });
  let calls = 0;
  const result = await createComputerPlatform({ operations: [operation], providers: bindingsProviders({ "retain-evidence": value => { calls += 1; return value; } }) }).dispatch(document, { codecs, allowedEffects: ["invoke-provider"] });
  const decoded = decodeOperationOutcome(result, codecs);
  assert.equal(decoded.result.ok, false);
  assert.match(decoded.result.refusal.message, /statement-identity-mismatch/);
  assert.equal(calls, 0);
});
