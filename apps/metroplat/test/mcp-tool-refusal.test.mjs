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
  assert.equal(badInput.result.structuredContent.phase, "execution");
  assert.match(badInput.result.structuredContent.reasons[0], /add-one input/u);
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
