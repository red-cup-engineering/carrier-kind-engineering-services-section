import test from "node:test";
import assert from "node:assert/strict";

import {
  diamondsByItem,
  workItemCausalSet,
} from "../src/work/causal-set.mts";
import { workItemObservationCollector } from "../src/work/observations.mts";
import { workRoadmapOfObservations } from "../src/work/read-models.mts";
import { agentWorkDispatchReadoutOfWork } from "../src/work/dispatch.mts";
import { canonicalBytes } from "../src/lib/identity/index.mts";

const observation = (item, event, charge, extra = {}) => Object.freeze({
  item,
  event,
  charge,
  at: `${item}:${event}`,
  ...extra,
});

test("work sequencing comes from explicit dependencies, never sibling carrier order", () => {
  const parent = "plan:normalization";
  const unrelated = diamondsByItem([
    observation("task:first", "opened", "unknown", { parent }),
    observation("task:first", "settled", "held", { parent }),
    observation("task:second", "opened", "unknown", { parent }),
    observation("task:second", "settled", "held", { parent }),
  ]);
  assert.equal(workItemCausalSet(unrelated).links.length, 0);

  const related = diamondsByItem([
    observation("task:first", "opened", "unknown", { parent }),
    observation("task:first", "settled", "held", { parent }),
    observation("task:second", "opened", "unknown", { parent, dependencies: ["task:first"] }),
    observation("task:second", "settled", "held", { parent }),
  ]);
  assert.deepEqual(workItemCausalSet(related).links, [{ from: "task:first#0", to: "task:second#0" }]);

  const crossEnclosure = diamondsByItem([
    observation("task:first", "opened", "unknown", { parent: "plan:one" }),
    observation("task:first", "settled", "held", { parent: "plan:one" }),
    observation("task:second", "opened", "unknown", { parent: "plan:two", dependencies: ["task:first"] }),
    observation("task:second", "settled", "held", { parent: "plan:two" }),
  ]);
  assert.deepEqual(workItemCausalSet(crossEnclosure).links, []);
});

test("ordinary work claims retain declared enclosure, dependencies, and conflicts", () => {
  const collector = workItemObservationCollector();
  collector.push([
    "normalization",
    { cell: "task:roadmap", charge: "unknown" },
    { boundary: { parent: "plan:work", dependencies: ["task:foundation"], conflicts: ["task:other"] } },
    "2026-07-14T00:00:00.000Z",
  ]);
  assert.deepEqual(collector.read(), [{
    item: "task:roadmap",
    parent: "plan:work",
    dependencies: ["task:foundation"],
    conflicts: ["task:other"],
    event: "opened",
    charge: "unknown",
    at: "2026-07-14T00:00:00.000Z",
  }]);
});

test("roadmap derives structural readiness and non-concurrent lanes without collapsing them", () => {
  const roadmap = workRoadmapOfObservations([
    observation("task:foundation", "opened", "unknown", { parent: "plan:work" }),
    observation("task:foundation", "settled", "held", { parent: "plan:work" }),
    observation("task:parallel-a", "opened", "unknown", {
      parent: "plan:work",
      dependencies: ["task:foundation"],
      conflicts: ["task:parallel-b"],
    }),
    observation("task:parallel-b", "opened", "unknown", {
      parent: "plan:work",
      dependencies: ["task:foundation"],
      conflicts: ["task:parallel-a"],
    }),
    observation("task:downstream", "opened", "unknown", {
      parent: "plan:work",
      dependencies: ["task:parallel-a"],
    }),
  ]);
  const nodes = new Map(roadmap.nodes.map((node) => [node.scope, node]));
  assert.equal(roadmap.dependencySettlement.kind, "lorentzian.causalSettle:witness");
  assert.equal(roadmap.dependencySettlement.orderingFraction, "2/3");
  assert.equal(roadmap.fourColoring.kind, "meme-analysis.coloring.proper:witness");
  assert.equal(roadmap.conflictFactorMap.kind, "meme-analysis.coloring.factorMap:witness");
  assert.equal(nodes.get("task:foundation").structural.state, "done");
  assert.equal(nodes.get("task:parallel-a").structural.state, "ready");
  assert.equal(nodes.get("task:parallel-b").structural.state, "ready");
  assert.equal(nodes.get("task:parallel-a").coordination.state, "separated");
  assert.notEqual(nodes.get("task:parallel-a").coordination.lane, nodes.get("task:parallel-b").coordination.lane);
  assert.deepEqual(nodes.get("task:downstream").structural, {
    state: "blocked",
    blockers: ["unsettled:task:parallel-a"],
  });
  assert.deepEqual(roadmap.milestones, [
    {
      parent: "plan:work",
      height: 0,
      scopes: ["task:foundation"],
      state: "done",
      ready: [],
      blocked: [],
      done: ["task:foundation"],
    },
    {
      parent: "plan:work",
      height: 1,
      scopes: ["task:parallel-a", "task:parallel-b"],
      state: "ready",
      ready: ["task:parallel-a", "task:parallel-b"],
      blocked: [],
      done: [],
    },
    {
      parent: "plan:work",
      height: 2,
      scopes: ["task:downstream"],
      state: "blocked",
      ready: [],
      blocked: ["task:downstream"],
      done: [],
    },
  ]);
  assert.ok(roadmap.evidence.includes("milestone-derivation:causal-height-strata-per-enclosure"));
});

test("roadmap derives independent milestone landscapes per declared enclosure", () => {
  const roadmap = workRoadmapOfObservations([
    observation("task:a-foundation", "opened", "unknown", { parent: "plan:a" }),
    observation("task:a-foundation", "settled", "held", { parent: "plan:a" }),
    observation("task:a-next", "opened", "unknown", {
      parent: "plan:a",
      dependencies: ["task:a-foundation"],
    }),
    observation("task:b-independent", "opened", "unknown", { parent: "plan:b" }),
  ]);
  assert.deepEqual(roadmap.milestones, [
    {
      parent: "plan:a",
      height: 0,
      scopes: ["task:a-foundation"],
      state: "done",
      ready: [],
      blocked: [],
      done: ["task:a-foundation"],
    },
    {
      parent: "plan:a",
      height: 1,
      scopes: ["task:a-next"],
      state: "ready",
      ready: ["task:a-next"],
      blocked: [],
      done: [],
    },
    {
      parent: "plan:b",
      height: 0,
      scopes: ["task:b-independent"],
      state: "ready",
      ready: ["task:b-independent"],
      blocked: [],
      done: [],
    },
  ]);
});

test("roadmap obstructs dependencies and resource conflicts that cross enclosures", () => {
  const roadmap = workRoadmapOfObservations([
    observation("task:left", "opened", "unknown", { parent: "plan:left" }),
    observation("task:right", "opened", "unknown", {
      parent: "plan:right",
      dependencies: ["task:left"],
      conflicts: ["task:left"],
    }),
  ]);
  const right = roadmap.nodes.find((node) => node.scope === "task:right");
  assert.deepEqual(roadmap.dependencyCausalSet.links, []);
  assert.deepEqual(roadmap.milestones, []);
  assert.deepEqual(roadmap.relationObstructions, [
    "non-sibling-conflict:task:right:task:left",
    "non-sibling-dependency:task:right:task:left",
  ]);
  assert.deepEqual(right.structural, {
    state: "blocked",
    blockers: ["invalid-dependency:task:left"],
  });
  assert.deepEqual(right.coordination, { state: "obstructed" });
});

test("dependency cycles remain explicit obstructions", () => {
  const roadmap = workRoadmapOfObservations([
    observation("task:a", "opened", "unknown", { parent: "plan:cycle", dependencies: ["task:b"] }),
    observation("task:b", "opened", "unknown", { parent: "plan:cycle", dependencies: ["task:a"] }),
  ]);
  assert.equal(roadmap.dependencySettlement.kind, "lorentzian.causalSettle-obstruction");
  assert.equal(roadmap.dependencySettlement.reason, "closed-timelike-curve");
  assert.ok(roadmap.nodes.every((node) => node.structural.blockers.includes("dependency-cycle")));
  assert.deepEqual(roadmap.milestones, []);
});

test("roadmap refuses a milestone sequence when dependency evidence is missing", () => {
  const roadmap = workRoadmapOfObservations([
    observation("task:downstream", "opened", "unknown", { dependencies: ["task:absent"] }),
  ]);
  assert.deepEqual(roadmap.milestones, []);
  assert.deepEqual(roadmap.relationObstructions, [
    "missing-dependency:task:downstream:task:absent",
  ]);
});

test("coordination-free roadmaps do not materialize a dense zero conflict graph", () => {
  const observations = Object.freeze(Array.from({ length: 2_100 }, (_value, index) =>
    observation(`work-item:carrier-${index}`, "opened", "unknown")));
  const roadmap = workRoadmapOfObservations(observations);
  assert.equal(roadmap.nodes.length, observations.length);
  assert.equal(roadmap.fourColoring.kind, "meme-analysis.coloring.proper:witness");
  assert.ok(roadmap.fourColoring.colors.every((color) => color === 0));
  assert.equal(roadmap.conflictFactorMap.kind, "meme-analysis.coloring.factorMap:witness");
  assert.ok(roadmap.nodes.every((node) => node.coordination.state === "clear"));
});

test("endeavor-sized causal metry remains a compact content-addressable carrier", () => {
  const observations = Object.freeze(Array.from({ length: 55 }, (_value, index) =>
    observation(`task:step-${index}`, "opened", "unknown", {
      parent: "plan:whole-endeavor",
      ...(index === 0 ? {} : { dependencies: [`task:step-${index - 1}`] }),
    })));
  const roadmap = workRoadmapOfObservations(observations);
  const bytes = Buffer.byteLength(canonicalBytes(roadmap), "utf8");

  assert.equal(roadmap.dependencySettlement.kind, "lorentzian.causalSettle:witness");
  assert.equal(roadmap.dependencySettlement.orderingFraction, "1/1");
  assert.ok(bytes < 1_048_576);
});

test("dispatch applies recorded readiness without inventing level priority", () => {
  const workReadout = {
    kind: "metroplat.agent-work.readout",
    subject: "agent:codex",
    date: "2026-07-14",
    feed: "daily-claim-sessions",
    work: {
      observations: 0,
      diamonds: 0,
      open: 0,
      discharged: 0,
      obstructed: 0,
      scopes: [],
      parents: [],
      roadmap: {
        kind: "metroplat.work.roadmap-settlement",
        nodes: [],
        milestones: [],
        dependencyCausalSet: { kind: "lorentzian.causalSet", events: [], links: [] },
        dependencySettlement: { kind: "lorentzian.causalSettle:witness", events: [], directLinks: [], closure: [], apexCount: 0, orderedPairCount: 0, orderingFraction: "0/1", nscCount: 0, eulerCharacteristic: 0, regime: "ordinal.closure.regime.finite", h1Vanishes: true },
        fourColoring: { kind: "meme-analysis.coloring.proper:witness", colors: [], colorCount: 0 },
        relationObstructions: [],
        evidence: [],
      },
    },
    agents: [{
      agent: "agent:codex",
      duties: 2,
      open: 2,
      discharged: 0,
      obstructed: 0,
      offices: [],
      scopes: [
        { scope: "campaign:z", passive: "agent:codex", standing: "held", via: "agent", status: "open", structural: { state: "ready", blockers: [] }, coordination: { state: "clear" } },
        { scope: "work-item:a", passive: "agent:codex", standing: "held", via: "agent", status: "open", structural: { state: "blocked", blockers: ["unsettled:task:x"] }, coordination: { state: "clear" } },
      ],
    }],
    evidence: [],
  };
  const dispatch = agentWorkDispatchReadoutOfWork(workReadout);
  assert.equal(dispatch.policy, "declared-duty-with-structural-and-coordination-readiness");
  assert.equal(dispatch.queue[0].state, "ready");
  assert.equal(dispatch.queue[1].state, "blocked");
  assert.equal("priority" in dispatch.queue[0], false);
  assert.equal("preemptive" in dispatch.queue[0], false);
});
