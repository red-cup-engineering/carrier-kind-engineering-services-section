import assert from "node:assert/strict";
import test, { after } from "node:test";
import { tmpdir } from "node:os";
import { appendFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { askEavtCell } from "@red-cup-engineering/eavt-services-section/ask-eavt-cell";
import { encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { askEavtCellRequest, askEavtTraceCellRequest, countEavtTraceContestedCellsRequest, eavtCellOperations } from "@red-cup-engineering/knowledge-system-server/eavt-cell";
import { grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { programMcpHandle } from "@red-cup-engineering/metroplat/presentation/serving";

const traceDataRoot = mkdtempSync(path.join(tmpdir(), "561-metroplat-eavt-trace-"));
const tracesDir = path.join(traceDataRoot, "data", "state", "traces");
mkdirSync(tracesDir, { recursive: true });
appendFileSync(path.join(tracesDir, "t.eavt"), `${Buffer.from(encodeCanonical({ e: "x", a: "is", v: "y", t: 1 })).toString("base64")}\n`);
appendFileSync(path.join(tracesDir, "t.eavt"), `${Buffer.from(encodeCanonical({ e: "x", a: "is", v: "z", t: 2 })).toString("base64")}\n`);
appendFileSync(path.join(tracesDir, "contested.eavt"), `${Buffer.from(encodeCanonical({ e: "is", a: "has-converse", v: "is-not", t: 0 })).toString("base64")}\n`);
appendFileSync(path.join(tracesDir, "contested.eavt"), `${Buffer.from(encodeCanonical({ e: "x", a: "is", v: "y", t: 1 })).toString("base64")}\n`);
appendFileSync(path.join(tracesDir, "contested.eavt"), `${Buffer.from(encodeCanonical({ e: "x", a: "is-not", v: "y", t: 2 })).toString("base64")}\n`);
const traceBinding = Object.freeze({ dataRoot: traceDataRoot });
after(() => rmSync(traceDataRoot, { recursive: true, force: true }));

// Entity e1 carries three facts (two assertions of attribute "a", one denial
// via a converse declaration) plus the declaration row itself, which is
// about the predicate "a", never about e1.
const fixtureRows = [
  { e: "a", a: "has-converse", v: "not-a", t: 0 },
  { e: "e1", a: "a", v: "y1", t: 1 },
  { e: "e1", a: "a", v: "y2", t: 2 },
  { e: "e1", a: "not-a", v: "y3", t: 3 },
];

test("ask-eavt-cell verb is a pure pass-through to the house primitive", () => {
  const request = { rows: fixtureRows, entity: "e1", attribute: "a" };
  const direct = askEavtCell(request);
  const viaOperation = askEavtCellRequest(request);
  assert.deepEqual(viaOperation, direct);
  assert.equal(direct.asserted, 2);
  assert.deepEqual(direct.settled.affirmed, [
    { predicate: "a", object: "y1" },
    { predicate: "a", object: "y2" },
  ]);
  assert.deepEqual(direct.settled.denied, [{ predicate: "a", object: "y3" }]);
  assert.equal(direct.contested, false);
  assert.equal(direct.proofTree.root, "e1");
  assert.deepEqual(direct.proofTree, viaOperation.proofTree);
  assert.equal(direct.regime, "strict");
  assert.equal(direct.closure.kappa, 1);
  assert.equal(viaOperation.regime, "strict");
  assert.equal(viaOperation.closure.kappa, 1);
});

test("the eavt-cell operation family's codomain admits the primitive's proof tree", () => {
  const [operation] = eavtCellOperations(traceBinding);
  const answer = askEavtCellRequest({ rows: fixtureRows, entity: "e1", attribute: "a" });
  assert.ok(operation.codomain.validate(answer));
  assert.equal(operation.codomain.errors(answer).length, 0);
});

test("ask-eavt-cell refuses malformed input as an obstruction datum, never a thrown TypeError", () => {
  const obstruction = askEavtCellRequest({ rows: "x", entity: "e1" });
  assert.equal(obstruction.kind, "metroplat.eavt.ask-eavt-cell:obstruction");
  assert.equal(obstruction.code, "invalid-request");
  assert.doesNotThrow(() => askEavtCellRequest({ rows: "x", entity: "e1" }));
  assert.doesNotThrow(() => askEavtCellRequest({ rows: [], entity: "" }));
  assert.doesNotThrow(() => askEavtCellRequest(undefined));
});

test("the eavt-cell operation family declares exactly one ask-eavt-cell verb with a codomain", () => {
  const [operation] = eavtCellOperations(traceBinding);
  assert.equal(operation.verb, "ask-eavt-cell");
  assert.equal(operation.inputFormat, "json");
  assert.equal(operation.outputFormat, "json");
  assert.ok(operation.codomain);
});

function memoryWitness() {
  const heads = new Map();
  return Object.freeze({
    causalHead(invocation) { return heads.get(invocation) ?? Object.freeze([]); },
    admit(evidence) {
      const receipt = Object.freeze({
        kind: "metroplat.rpc.evidence-receipt",
        id: "evidence:1",
        evidence: evidence.kind,
        eventIds: Object.freeze(["event:1"]),
      });
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      heads.set(invocation, receipt.eventIds);
      return receipt;
    },
  });
}

const at = () => "2026-09-04T12:00:00.000Z";

function serveOptions() {
  return {
    subject: "subject:test",
    caller: { transport: "test" },
    now: at,
    witness: memoryWitness(),
    onArrival: (event) => ({ ok: true, cloudEventIdentity: event.id, admission: { statements: [{ id: "arrival:1" }] } }),
  };
}

test("the infograph catalog lists ask-eavt-cell with an object-typed outputSchema", async () => {
  const surface = projectSurface(eavtCellOperations(traceBinding), { capabilityAssertions: () => [] });
  const listed = await programMcpHandle(surface, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, serveOptions());
  const tool = listed.result.tools.find((candidate) => candidate.name === "ask-eavt-cell");
  assert.ok(tool, "ask-eavt-cell tool is listed");
  assert.equal(tool.outputSchema.type, "object");
});

test("tools/call ask-eavt-cell runs through the catalog and returns the primitive's own answer", async () => {
  const assertions = [grantAssertion("issuer:test", "subject:test", "infograph#ask-eavt-cell", at())];
  const surface = projectSurface(eavtCellOperations(traceBinding), { capabilityAssertions: () => assertions });
  const called = await programMcpHandle(surface, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "ask-eavt-cell", arguments: { input: { rows: fixtureRows, entity: "e1", attribute: "a" } } },
  }, serveOptions());
  assert.equal(called.result.isError, undefined);
  assert.deepEqual(called.result.structuredContent, askEavtCell({ rows: fixtureRows, entity: "e1", attribute: "a" }));
});

test("ask-eavt-trace-cell answers a cell over a named trace file confined to the data root", () => {
  const answer = askEavtTraceCellRequest(traceBinding, { trace: "t", entity: "x" });
  assert.equal(answer.type, "EavtTraceCellAnswer");
  assert.equal(answer.trace, "t");
  assert.equal(answer.rows, 2);
  assert.equal(answer.answer.asserted, 2);
});

test("ask-eavt-trace-cell reports a missing trace as an absent datum, never a thrown error", () => {
  const answer = askEavtTraceCellRequest(traceBinding, { trace: "missing", entity: "x" });
  assert.deepEqual(answer, { type: "EavtTraceAbsent", trace: "missing" });
});

test("ask-eavt-trace-cell refuses a path as trace with the obstruction datum, never a thrown error", () => {
  for (const trace of ["../x", "/etc/passwd"]) {
    const obstruction = askEavtTraceCellRequest(traceBinding, { trace, entity: "x" });
    assert.equal(obstruction.kind, "metroplat.eavt.ask-eavt-trace-cell:obstruction");
    assert.equal(obstruction.code, "invalid-request");
  }
});

test("the infograph catalog lists ask-eavt-trace-cell with an object-typed outputSchema", async () => {
  const surface = projectSurface(eavtCellOperations(traceBinding), { capabilityAssertions: () => [] });
  const listed = await programMcpHandle(surface, { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }, serveOptions());
  const tool = listed.result.tools.find((candidate) => candidate.name === "ask-eavt-trace-cell");
  assert.ok(tool, "ask-eavt-trace-cell tool is listed");
  assert.equal(tool.outputSchema.type, "object");
});

test("count-eavt-trace-contested-cells counts a named trace file confined to the data root", () => {
  const count = countEavtTraceContestedCellsRequest(traceBinding, { trace: "t" });
  assert.equal(count.type, "EavtTraceContestedCellsCount");
  assert.equal(count.trace, "t");
  assert.equal(count.count.type, "EavtContestedCellsCount");
});

test("count-eavt-trace-contested-cells counts one contested entity over a converse declaration", () => {
  const count = countEavtTraceContestedCellsRequest(traceBinding, { trace: "contested" });
  assert.equal(count.type, "EavtTraceContestedCellsCount");
  assert.equal(count.trace, "contested");
  assert.equal(count.count.contestedEntities, 1);
});

test("count-eavt-trace-contested-cells reports a missing trace as an absent datum, never a thrown error", () => {
  const count = countEavtTraceContestedCellsRequest(traceBinding, { trace: "missing" });
  assert.deepEqual(count, { type: "EavtTraceAbsent", trace: "missing" });
});

test("count-eavt-trace-contested-cells refuses a path as trace with the obstruction datum, never a thrown error", () => {
  for (const trace of ["../x", "/etc/passwd"]) {
    const obstruction = countEavtTraceContestedCellsRequest(traceBinding, { trace });
    assert.equal(obstruction.kind, "metroplat.eavt.count-eavt-trace-contested-cells:obstruction");
    assert.equal(obstruction.code, "invalid-request");
  }
});

test("the infograph catalog lists count-eavt-trace-contested-cells with an object-typed outputSchema", async () => {
  const surface = projectSurface(eavtCellOperations(traceBinding), { capabilityAssertions: () => [] });
  const listed = await programMcpHandle(surface, { jsonrpc: "2.0", id: 4, method: "tools/list", params: {} }, serveOptions());
  const tool = listed.result.tools.find((candidate) => candidate.name === "count-eavt-trace-contested-cells");
  assert.ok(tool, "count-eavt-trace-contested-cells tool is listed");
  assert.equal(tool.outputSchema.type, "object");
});
