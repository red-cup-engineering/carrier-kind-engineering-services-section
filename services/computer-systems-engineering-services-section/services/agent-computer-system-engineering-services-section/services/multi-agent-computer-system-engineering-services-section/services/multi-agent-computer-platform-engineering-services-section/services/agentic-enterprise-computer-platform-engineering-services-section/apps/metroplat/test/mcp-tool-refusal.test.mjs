import assert from "node:assert/strict";
import test from "node:test";

import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { programMcpHandle } from "@red-cup-engineering/metroplat/presentation/serving";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import {
  mcpToolRefusal,
  mcpToolRefusalContract,
  mcpToolRefusalResult,
  mcpExecutionRefusal,
} from "@red-cup-engineering/mcp-engineering-services-section/catalog";

const at = () => "2026-09-04T12:00:00.000Z";

function memoryWitness(events) {
  const heads = new Map();
  return Object.freeze({
    causalHead(invocation) { return heads.get(invocation) ?? Object.freeze([]); },
    admit(evidence) {
      events.push(evidence);
      const receipt = Object.freeze({
        kind: "metroplat.rpc.evidence-receipt",
        id: `evidence:${events.length}`,
        evidence: evidence.kind,
        eventIds: Object.freeze([`event:${events.length}`]),
      });
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      heads.set(invocation, receipt.eventIds);
      return receipt;
    },
  });
}

const domain = schemaFrom({
  $id: "metroplat/test/mcp-tool-refusal/domain",
  type: "object",
  required: ["value"],
  properties: { value: { type: "number" } },
  additionalProperties: false,
});

const codomain = schemaFrom({
  $id: "metroplat/test/mcp-tool-refusal/codomain",
  type: "object",
  required: ["result"],
  properties: { result: { type: "number" } },
  additionalProperties: false,
});

const addOne = operation({
  verb: "add-one",
  domain,
  codomain,
  run: (input) => ({ result: input.value + 1 }),
});

function surfaceWithGrants(assertions) {
  return projectSurface([addOne], { capabilityAssertions: () => assertions });
}

let arrivalCount = 0;
function serveOptions(witness) {
  return {
    subject: "subject:test",
    caller: { transport: "test" },
    now: at,
    witness,
    onArrival(event) {
      arrivalCount += 1;
      return { ok: true, cloudEventIdentity: event.id, admission: { statements: [{ id: `arrival:${arrivalCount}` }] } };
    },
  };
}

test("tools/list declares an outputSchema that admits both the codomain and the refusal datum", async () => {
  const surface = surfaceWithGrants([]);
  const options = serveOptions(memoryWitness([]));
  const listed = await programMcpHandle(surface, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, options);
  const tool = listed.result.tools.find((candidate) => candidate.name === "add-one");
  assert.equal(tool.outputSchema.type, "object", "MCP requires outputSchema.type === 'object' at the root, even when the shape is a oneOf");
  assert.equal(tool.outputSchema.oneOf.length, 2);
  assert.equal(tool.outputSchema.oneOf[0].$id, codomain.id);
  assert.equal(tool.outputSchema.oneOf[1].properties.kind.const, "metroplat.rpc.execution:obstruction");
});

test("tools/call success carries structuredContent conforming to the tool's own codomain", async () => {
  const assertions = [grantAssertion("issuer:test", "subject:test", "infograph#add-one", at())];
  const surface = surfaceWithGrants(assertions);
  const options = serveOptions(memoryWitness([]));
  const called = await programMcpHandle(surface, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "add-one", arguments: { input: { value: 1 } } },
  }, options);
  assert.equal(called.result.isError, undefined);
  assert.deepEqual(called.result.structuredContent, { result: 2 });
  assert.equal(codomain.validate(called.result.structuredContent), true);
});

test("tools/call refusal (unauthorized subject) carries a structured obstruction datum, never a bare SDK error", async () => {
  const surface = surfaceWithGrants([]);
  const options = serveOptions(memoryWitness([]));
  const refused = await programMcpHandle(surface, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "add-one", arguments: { input: { value: 1 } } },
  }, options);
  assert.equal(refused.result.isError, true);
  mcpToolRefusalContract.assert(refused.result.structuredContent, "unauthorized add-one");
  assert.equal(refused.result.structuredContent.phase, "authorization");
  assert.ok(refused.result.structuredContent.reasons.length > 0);
});

test("tools/call refusal from a thrown domain assertion carries the same structured obstruction datum", async () => {
  const assertions = [grantAssertion("issuer:test", "subject:test", "infograph#add-one", at())];
  const surface = surfaceWithGrants(assertions);
  const options = serveOptions(memoryWitness([]));
  const badInput = await programMcpHandle(surface, {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "add-one", arguments: { input: { value: "not-a-number" } } },
  }, options);
  assert.equal(badInput.result.isError, true);
  mcpToolRefusalContract.assert(badInput.result.structuredContent, "thrown add-one domain assertion");
  assert.equal(badInput.result.structuredContent.phase, "input");
  assert.match(badInput.result.structuredContent.reasons[0], /does not satisfy its declared domain/u);
});

test("mcpExecutionRefusal encodes a thrown value as a structured refusal datum", () => {
  const result = mcpExecutionRefusal(new Error("boom"));
  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, "boom");
  mcpToolRefusalContract.assert(result.structuredContent, "thrown error refusal");
  assert.deepEqual(result.structuredContent.reasons, ["boom"]);
});

test("mcpToolRefusal builds a datum conforming to its own schema, and mcpToolRefusalResult carries it as structured content", () => {
  const refusal = mcpToolRefusal({ phase: "authorization", reasons: ["no capability"], evidence: ["subject-standing:x:y:denied"] });
  mcpToolRefusalContract.assert(refusal, "built refusal");
  const result = mcpToolRefusalResult("no capability", refusal);
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent, refusal);
});

test("invalid MCP arguments are absent from public refusal and RPC witnesses; earliest arrival retains a distinct rejection reference", async () => {
  const sentinel = "synthetic-unaccepted-credential-value";
  const assertions = [grantAssertion("issuer:test", "subject:test", "infograph#add-one", at())];
  const surface = surfaceWithGrants(assertions);
  const events = [], arrivals = [];
  const options = serveOptions(memoryWitness(events));
  const originalArrival = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return originalArrival(event); };
  const refused = await programMcpHandle(surface, {
    jsonrpc: "2.0", id: 5, method: "tools/call",
    params: { name: "add-one", arguments: { input: { value: 1, forbidden: sentinel } } },
  }, options);
  assert.equal(refused.result.isError, true);
  assert.equal(refused.result.structuredContent.phase, "input");
  assert.equal(JSON.stringify(refused).includes(sentinel), false);
  assert.equal(JSON.stringify(events).includes(sentinel), false);
  assert.equal(JSON.stringify(arrivals).includes(sentinel), false);
  assert.equal(arrivals.length, 1);
  assert.equal(arrivals[0].data.material.kind, "metroplat.mcp.projected-arrival-material");
  assert.equal(arrivals[0].data.material.message.kind, "metroplat.mcp.rejected-message-reference");
});

test('accepted valid tool arrival preserves exact material and existing content identity', async () => {
  const { transportCloudEvent } = await import('@red-cup-engineering/computer-system-engine/rpc/arrival');
  const arrivals = [], events = [];
  const options = serveOptions(memoryWitness(events)), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const message = { jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'add-one', arguments: { input: { value: 2 } } } };
  const surface = surfaceWithGrants([grantAssertion('issuer:test', 'subject:test', 'infograph#add-one', at())]);
  const response = await programMcpHandle(surface, message, options);
  assert.deepEqual(response.result.structuredContent, { result: 3 });
  const original = transportCloudEvent('mcp-http', { kind: 'metroplat.mcp.arrival-material', message }, at(), { kind: 'metroplat.generated-endpoint-readout-reference', transport: 'mcp-http', path: '/mcp', verb: 'tools/call' });
  assert.deepEqual(arrivals, [original]);
});

for (const wrapped of [true, false]) test(`invalid ${wrapped ? 'wrapped' : 'object-input'} tool arguments are absent from the earliest retained carrier`, async () => {
  const sentinel = 'synthetic-unaccepted-credential-value', arrivals = [], events = [];
  const options = serveOptions(memoryWitness(events)), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const body = { value: 1, forbidden: sentinel };
  const surface = surfaceWithGrants([grantAssertion('issuer:test', 'subject:test', 'infograph#add-one', at())]);
  const response = await programMcpHandle(surface, { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'add-one', arguments: wrapped ? { input: body } : body } }, options);
  assert.equal(response.result.isError, true);
  for (const carrier of [arrivals, events, response]) assert.equal(JSON.stringify(carrier).includes(sentinel), false);
  assert.equal(arrivals[0].data.material.message.kind, 'metroplat.mcp.rejected-message-reference');
});

test('unknown tool is retained as a rejection reference without its argument payload', async () => {
  const sentinel = 'synthetic-unaccepted-credential-value', arrivals = [], events = [];
  const options = serveOptions(memoryWitness(events)), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const response = await programMcpHandle(surfaceWithGrants([]), { jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'absent-tool', arguments: { forbidden: sentinel } } }, options);
  assert.ok(response.error); assert.equal(events.length, 0);
  for (const carrier of [arrivals, response]) assert.equal(JSON.stringify(carrier).includes(sentinel), false);
  assert.equal(arrivals[0].data.material.message.reason, 'unknown-tool');
});

test('mixed batch projects only rejected members while valid siblings still execute', async () => {
  const sentinel = 'synthetic-unaccepted-credential-value', arrivals = [], events = [];
  const options = serveOptions(memoryWitness(events)), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const valid = { jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'add-one', arguments: { input: { value: 4 } } } };
  const invalid = { jsonrpc: '2.0', id: 15, method: 'tools/call', params: { name: 'add-one', arguments: { input: { value: 1, forbidden: sentinel } } } };
  const surface = surfaceWithGrants([grantAssertion('issuer:test', 'subject:test', 'infograph#add-one', at())]);
  const response = await programMcpHandle(surface, [valid, invalid], options);
  assert.deepEqual(response.find(item => item.id === 14).result.structuredContent, { result: 5 });
  assert.equal(response.find(item => item.id === 15).result.isError, true);
  for (const carrier of [arrivals, events, response]) assert.equal(JSON.stringify(carrier).includes(sentinel), false);
  assert.deepEqual(arrivals[0].data.material.message[0], valid);
  assert.equal(arrivals[0].data.material.message[1].kind, 'metroplat.mcp.rejected-message-reference');
  assert.equal(arrivals[0].data.material.kind, 'metroplat.mcp.projected-arrival-material');
});

test('valid unauthorized tool arrival remains unchanged and still cannot execute', async () => {
  const arrivals = [], events = [];
  const options = serveOptions(memoryWitness(events)), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const message = { jsonrpc: '2.0', id: 16, method: 'tools/call', params: { name: 'add-one', arguments: { input: { value: 4 } } } };
  const response = await programMcpHandle(surfaceWithGrants([]), message, options);
  assert.equal(response.result.structuredContent.phase, 'authorization');
  assert.equal(arrivals[0].data.material.kind, 'metroplat.mcp.arrival-material');
  assert.deepEqual(arrivals[0].data.material.message, message);
});

test('real filesystem arrival and RPC journals receive no rejected tool body', async context => {
  const { mkdtempSync, readFileSync, readdirSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path'); const { tmpdir } = await import('node:os');
  const { filesystemArrivalOptions, readArrivalProjection } = await import('@red-cup-engineering/computer-system-engine/rpc/arrival-store');
  const { journalRpcWitness } = await import('@red-cup-engineering/computer-system-engine/rpc/journal-witness');
  const root = mkdtempSync(join(tmpdir(), 'mcp-rejected-arrival-')); context.after(() => rmSync(root, { recursive: true, force: true }));
  const sentinel = 'synthetic-unaccepted-credential-value';
  const options = { subject: 'subject:test', caller: { transport: 'synthetic-test' }, now: at, witness: journalRpcWitness(root), ...filesystemArrivalOptions(root) };
  const surface = surfaceWithGrants([grantAssertion('issuer:test', 'subject:test', 'infograph#add-one', at())]);
  const { routeRequest } = await import('@red-cup-engineering/metroplat/presentation/serving');
  const message = { jsonrpc: '2.0', id: 17, method: 'tools/call', params: { name: 'add-one', arguments: { input: { value: 1, forbidden: sentinel } } } };
  const response = await routeRequest(surface, { method: 'POST', path: '/mcp', query: {}, body: JSON.stringify(message), accept: 'application/json' }, options);
  assert.equal(response.status, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.result.isError, true); assert.equal(result.result.structuredContent.phase, 'input');
  assert.equal(JSON.stringify(result).includes(sentinel), false);
  const files = []; function visit(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) visit(path); else files.push(path); } }
  visit(root); assert.ok(files.length > 0);
  for (const path of files) assert.equal(readFileSync(path).includes(Buffer.from(sentinel)), false, path);
  const projection = readArrivalProjection(root, '2026-09-04');
  assert.equal(projection.obstructedPackets, 0, JSON.stringify(projection.entries.map(entry => entry.obstructions))); assert.equal(projection.validPackets, 1);
  assert.equal(projection.entries[0].materialKind, 'metroplat.mcp.projected-arrival-material');
  assert.equal(projection.entries[0].boundaryEvent.operation, 'mcp');
  assert.equal(projection.entries[0].dispatchEvent, undefined);
  assert.equal(JSON.stringify(projection).includes(sentinel), false);
});

test('malformed tools/call framing retains a rejection reference before protocol refusal', async () => {
  const sentinel = 'synthetic-unaccepted-credential-value', arrivals = [], events = [];
  const options = serveOptions(memoryWitness(events)), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const result = await programMcpHandle(surfaceWithGrants([]), { jsonrpc: '1.0', id: 18, method: 'tools/call', params: { name: 'add-one', arguments: { input: { forbidden: sentinel } } } }, options);
  assert.ok(result.error); assert.equal(events.length, 0);
  assert.equal(JSON.stringify([arrivals, result]).includes(sentinel), false);
  assert.equal(arrivals[0].data.material.message.reason, 'malformed-tool-request');
});

test('tools without a declared domain retain their existing permissive arrival contract', async () => {
  const untyped = operation({ verb: 'untyped-read', run: () => ({ result: 'permitted' }) });
  const surface = projectSurface([untyped], { capabilityAssertions: () => [grantAssertion('issuer:test', 'subject:test', 'infograph#untyped-read', at())] });
  const arrivals = [], options = serveOptions(memoryWitness([])), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const message = { jsonrpc: '2.0', id: 19, method: 'tools/call', params: { name: 'untyped-read', arguments: { input: { arbitrary: 'permitted by existing untyped contract' } } } };
  const result = await programMcpHandle(surface, message, options);
  assert.equal(result.result.isError, undefined);
  assert.equal(arrivals[0].data.material.kind, 'metroplat.mcp.arrival-material');
  assert.deepEqual(arrivals[0].data.material.message, message);
});

test('entirely valid batches preserve original arrival material and identity', async () => {
  const { transportCloudEvent } = await import('@red-cup-engineering/computer-system-engine/rpc/arrival');
  const surface = surfaceWithGrants([grantAssertion('issuer:test', 'subject:test', 'infograph#add-one', at())]);
  const arrivals = [], options = serveOptions(memoryWitness([])), prior = options.onArrival;
  options.onArrival = event => { arrivals.push(event); return prior(event); };
  const message = [20, 21].map(id => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'add-one', arguments: { input: { value: id } } } }));
  const result = await programMcpHandle(surface, message, options);
  assert.equal(result.length, 2); assert.ok(result.every(item => item.result.isError === undefined));
  const expected = transportCloudEvent('mcp-http', { kind: 'metroplat.mcp.arrival-material', message }, at(), { kind: 'metroplat.generated-endpoint-readout-reference', transport: 'mcp-http', path: '/mcp', verb: 'invalid' });
  assert.deepEqual(arrivals, [expected]);
});
