import test from "node:test";
import assert from "node:assert/strict";
import { pageAgentWorkDispatchReadout } from "../src/work/dispatch.mjs";

const apparatus = Object.freeze({ id: "ni:action", graph: "ni:roadmap", resources: [
  { id: "ni:resource", witness: "ni:resource-evidence", resource: { instructions: "x".repeat(600_000) }, evidence: { source: "canonical-source" } },
] });
const item = (scope, pending) => Object.freeze({ agent: "engineering", subject: `original-${scope}`, scope,
  state: pending ? "blocked" : "ready", reasons: pending ? ["result-awaiting-receipt"] : ["ready"],
  signedAction: apparatus, receiverCondition: "Independent operating receipt on the original subject",
  execution: pending ? { state: "proposed", receipt: `ni:proposal-${scope}`, resultIdentity: `ni:result-${scope}` } : undefined,
  allocation: `allocation-${scope}`, obligationWitness: { subject: `original-${scope}`, witness: `ni:opening-${scope}` },
});
const queue = Object.freeze([item("ready-first", false), item("pending-a", true), item("pending-b", true)]);
const readout = Object.freeze({ kind: "metroplat.agent-work.dispatch-settlement", subject: "dispatch", date: "2026-10-03",
  policy: "declared-duty-with-structural-and-coordination-readiness", coordination: "clear", coordinationCost: 0,
  queue, frontier: [queue[0]], unallocated: [{ scope: "unallocated" }], evidence: ["canonical-work"],
  agents: [{ agent: "engineering", ready: 1, inFlight: 0, blocked: 2, done: 0, queue, frontier: [queue[0]], offers: [[queue[0]]], evidence: [] }],
});

test("receiving discovery selects current proposals before paging and retains original immutable boundaries", () => {
  const first = pageAgentWorkDispatchReadout(readout, { view: "receiving", limit: 1 });
  const second = pageAgentWorkDispatchReadout(readout, { view: "receiving", limit: 1, cursor: first.nextCursor });
  assert.equal(first.queueCount, 2);
  assert.deepEqual([...first.queue, ...second.queue].map(row => row.subject), ["original-pending-a", "original-pending-b"]);
  assert.equal(second.nextCursor, undefined);
  for (const [received, canonical] of [[first.queue[0], queue[1]], [second.queue[0], queue[2]]]) {
    assert.deepEqual(received.execution, canonical.execution);
    assert.deepEqual(received.obligationWitness, canonical.obligationWitness);
    assert.equal(received.receiverCondition, canonical.receiverCondition);
    assert.equal(received.allocation, canonical.allocation);
    assert.equal(received.signedAction.id, apparatus.id);
    assert.equal(received.signedAction.graph, apparatus.graph);
    assert.deepEqual(received.signedAction.resources, [{ id: "ni:resource", witness: "ni:resource-evidence" }]);
  }
  assert.ok(Buffer.byteLength(JSON.stringify(first)) < 5_000);
  assert.deepEqual(first.agents[0].queue, [0]);
  assert.deepEqual(first.frontier, []);
  assert.equal(first.ready, 1);
  assert.equal(first.unallocatedCount, 1);
});

test("execution and scoped detail retain the full apparatus without changing source or readiness", () => {
  const ordinary = pageAgentWorkDispatchReadout(readout, { limit: 1 });
  const detail = pageAgentWorkDispatchReadout(readout, { scope: "pending-b" });
  assert.equal(ordinary.queue[0].signedAction, apparatus);
  assert.deepEqual(ordinary.frontier, [0]);
  assert.equal(detail.queueCount, 1);
  assert.equal(detail.queue[0], queue[2]);
  assert.equal(detail.queue[0].signedAction.resources[0].resource.instructions.length, 600_000);
  assert.equal(queue[1].signedAction.resources[0].evidence.source, "canonical-source");
  assert.equal(pageAgentWorkDispatchReadout(readout, { view: "receiving", scope: "unknown" }).queueCount, 0);
});
