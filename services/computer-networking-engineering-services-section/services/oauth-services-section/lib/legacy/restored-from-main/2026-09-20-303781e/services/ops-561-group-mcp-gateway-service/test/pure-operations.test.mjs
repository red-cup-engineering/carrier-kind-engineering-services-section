import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { createPureOperationRegistry, pureOperationsApp } from "../src/pure-operations.mjs";

const registry = createPureOperationRegistry([{ id: "holofoam.admit", description: "Admit a bounded experiment", inputSchema: { type: "object" }, execute: ({ seed = 1 }) => ({ seed }) }]);
const resource = pureOperationsApp(registry).resources;

test("the fixed registry is discoverable and executes only its allowlisted descriptor", async () => {
  const listed = resource[0].handler({});
  assert.deepEqual(JSON.parse(listed.body).operations.map(({ id }) => id), ["holofoam.admit"]);
  const reply = await resource[1].handler({ params: { encodedId: "holofoam.admit" }, req: Readable.from([JSON.stringify({ seed: 4 })]) });
  assert.deepEqual(JSON.parse(reply.body), { result: { seed: 4 } });
  const missing = await resource[1].handler({ params: { encodedId: "node%3Afs" }, req: Readable.from(["{}"]) });
  assert.equal(missing.status, 400);
});

test("registry admission snapshots schemas and handles malformed transport input", async () => {
  assert.throws(() => createPureOperationRegistry([{ id: "a", description: "a", execute() {} }, { id: "a", description: "b", execute() {} }]), /duplicate/u);
  const schema = { type: "object", properties: { emoji: { type: "string" } } };
  const snapshotRegistry = createPureOperationRegistry([{ id: "holofoam.snapshot", description: "snapshot", inputSchema: schema, execute: (input) => input }]);
  schema.properties.emoji.type = "number";
  assert.equal(snapshotRegistry.list()[0].inputSchema.properties.emoji.type, "string");
  assert.equal(Object.isFrozen(snapshotRegistry.list()[0].inputSchema.properties), true);
  const malformed = await resource[1].handler({ params: { encodedId: "holofoam.admit" }, req: Readable.from(["not json"]) });
  assert.equal(malformed.status, 400);
  const splitUnicode = await resource[1].handler({ params: { encodedId: "holofoam.admit" }, req: Readable.from([Buffer.from('{"seed":"\u00e9"}').subarray(0, 10), Buffer.from('{"seed":"\u00e9"}').subarray(10)]) });
  assert.deepEqual(JSON.parse(splitUnicode.body), { result: { seed: "é" } });
  const malformedPath = await resource[1].handler({ params: { encodedId: "%E0%A4%A" }, req: Readable.from(["{}"]) });
  assert.equal(malformedPath.status, 400);
  const tooLarge = await resource[1].handler({ params: { encodedId: "holofoam.admit" }, req: Readable.from([Buffer.alloc(4 * 1024 * 1024 + 1)]) });
  assert.equal(tooLarge.status, 400);
});
