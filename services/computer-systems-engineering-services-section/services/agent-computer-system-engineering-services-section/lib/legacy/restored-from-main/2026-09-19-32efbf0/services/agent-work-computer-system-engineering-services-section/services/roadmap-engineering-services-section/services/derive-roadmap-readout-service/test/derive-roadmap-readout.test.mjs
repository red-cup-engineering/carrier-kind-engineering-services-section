import assert from "node:assert/strict";
import test from "node:test";
import { deriveRoadmapReadout } from "../scripts/derive-roadmap-readout.mjs";

function frontierItem(overrides) {
  return {
    agent: "a1", office: "eo", status: "open", state: "ready", standing: "held",
    structural: { blockers: [], state: "ready" }, coordination: { state: "clear" },
    reasons: [], conflicts: [], intent: "i", level: "task", passive: "a1", via: "office",
    ...overrides,
  };
}

test("frontier items group by parent, each with a derived horizon and modality", () => {
  const dispatch = {
    kind: "metroplat.agent-work.dispatch-settlement", subject: "agent-work-dispatch", date: "2026-09-06",
    policy: "declared-duty-with-structural-and-coordination-readiness", agents: [], coordination: "clear",
    coordinationCost: 0, evidence: [], feed: "daily-claim-sessions", malformed: 0, queue: [],
    ready: 2, blocked: 1, done: 0, sourceRows: 10,
    frontier: [
      frontierItem({ scope: "task:exact-deps-lib-x", parent: "plan:2026-09-03-core-stability", text: "pin exact" }),
      frontierItem({ scope: "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93", parent: "project:the-roadmap-engine-test-thread", text: "the first counterparty test edge" }),
      frontierItem({ scope: "task:2026-09-06-0335-shipped-x", parent: "project:the-roadmap-engine-test-thread", text: "the unit shipped", state: "blocked", structural: { blockers: ["dep:x"], state: "blocked" } }),
    ],
  };
  const readout = deriveRoadmapReadout({ dispatch });
  assert.equal(readout.kind, "RoadmapReadout");
  assert.equal(readout.cells.length, 2);
  const plan = readout.cells.find((c) => c.cell === "plan:2026-09-03-core-stability");
  assert.equal(plan.items[0].workType, "process");
  assert.equal(plan.items[0].modality, "determined");
  assert.equal(plan.items[0].horizon, "now");
  const project = readout.cells.find((c) => c.cell === "project:the-roadmap-engine-test-thread");
  assert.equal(project.items.length, 2);
  assert.equal(project.items[0].horizon, "eventually");
  assert.equal(project.ready, 1);
  assert.equal(project.blocked, 1);
  assert.deepEqual(readout.totals, { ready: 2, blocked: 1, done: 0 });
});

test("a repeated scope in frontier is read once", () => {
  const dispatch = { frontier: [frontierItem({ scope: "task:x", parent: "plan:p", text: "t" }), frontierItem({ scope: "task:x", parent: "plan:p", text: "t" })], ready: 1, blocked: 0, done: 0, date: "2026-09-06" };
  const readout = deriveRoadmapReadout({ dispatch });
  assert.equal(readout.cells[0].items.length, 1);
});

test("money comes only from ledger, never from dispatch or registry", () => {
  const dispatch = { frontier: [], ready: 0, blocked: 0, done: 3, date: "2026-09-06" };
  const readout = deriveRoadmapReadout({ dispatch, ledger: { rows: [{ account: "cash", amount: 100 }] }, registry: [{ name: "x" }] });
  assert.deepEqual(readout.money, { source: "ledger", rows: [{ account: "cash", amount: 100 }] });
  assert.deepEqual(readout.registry, [{ name: "x" }]);
  assert.equal(readout.totals.done, 3);
});

test("no ledger means no money rows", () => {
  const dispatch = { frontier: [], ready: 0, blocked: 0, done: 0, date: "2026-09-06" };
  const readout = deriveRoadmapReadout({ dispatch });
  assert.deepEqual(readout.money, { source: "none", rows: [] });
});

test("refuses a dispatch without a frontier array", () => {
  assert.throws(() => deriveRoadmapReadout({ dispatch: {} }), /dispatch\.frontier is required/u);
});
