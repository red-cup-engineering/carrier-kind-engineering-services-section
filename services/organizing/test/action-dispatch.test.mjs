import assert from "node:assert/strict";
import test from "node:test";
import { workItemObservationCollector } from "../src/work/observations.mjs";
import { agentWorkDispatchReadoutOfWork } from "../src/work/dispatch.mjs";
import { workItemViewCollector, workRoadmapOfObservations } from "../src/work/read-models.mjs";

const scope = "work-item:bounded-action";
const row = (text, evidence) => ["work-item:bounded-action", { cell: scope, reading: "unknown" }, {
  boundary: {
    role: "obligation",
    text,
    source: "structured-work-intent:test-intent",
    subject: "structured-work-intent-test-intent",
    evidence,
  },
}, { source: "test-feed", item: 1 }];

test("an open revised obligation replaces declaration evidence and witness in roadmap projection", () => {
  const collector = workItemObservationCollector();
  collector.push(row("Original declaration", ["producer:author", "snapshot:old"]), { id: "witness-old", core: { causes: [] } });
  collector.push(row("Current declaration", ["producer:author", "snapshot:latest", "correction:current"]), { id: "witness-latest", core: { causes: ["witness-old"] } });

  const [observation] = collector.read();
  assert.equal(observation.text, "Current declaration");
  assert.deepEqual(observation.evidence, ["producer:author", "snapshot:latest", "correction:current"]);
  assert.deepEqual(observation.obligationWitness, { subject: "structured-work-intent-test-intent", witness: "witness-latest" });
  assert.equal(observation.witness, "witness-latest");
  assert.deepEqual(observation.causes, ["witness-old"]);

  const scopeNode = workRoadmapOfObservations([observation]).nodes.find((node) => node.scope === scope);
  assert.deepEqual(scopeNode.evidence, observation.evidence);
  assert.deepEqual(scopeNode.obligationWitness, observation.obligationWitness);
});

test("dispatch exposes only a resource-backed signed Action as executable work", () => {
  const baseDuty = {
    scope,
    status: "open",
    standing: "potential",
    via: "agent",
    office: "chief-engineering-officer",
    structural: { state: "ready", blockers: [] },
    coordination: { state: "clear" },
    conflicts: [],
    text: "Current declaration",
    evidence: ["snapshot:latest", "correction:current"],
    obligationWitness: { subject: "structured-work-intent-test-intent", witness: "witness-latest" },
    allocation: "bounded-action-allocation",
    allocatedModel: "fixture-model", governing: ["fixture-governing"], sourceRepository: "git@github.com:example/source.git",
    work: "directing-engineering-execution",
    skill: "direct-engineering-execution",
    closureKind: "inquiry",
    requiresCapabilities: ["agency-work-propose"],
    method: "execute this bounded Action",
    receiverCondition: "CTO records an independent outcome",
  };
  const signedActions = new Map([[scope, {
    id: "ni:///sha-256;action",
    graph: "ni:///sha-256;roadmap",
    title: "Bounded Action",
    operation: "Apply the bounded change",
    effect: "Actionable work enters the frontier",
    acceptance: "The independent receiver records the result",
    resources: [{ id: "ni:///sha-256;resource", resource: { title: "Source" }, witness: "ni:///sha-256;evidence", evidence: { title: "Source evidence" } }],
  }], ["work-item:ambiguous-action", { ambiguous: true, candidates: ["ni:///sha-256;a", "ni:///sha-256;b"] }]]);

  const dispatch = agentWorkDispatchReadoutOfWork({ agents: [{ agent: "actor:worker", duties: 4, offices: [{}], scopes: [
    baseDuty,
    { ...baseDuty, scope: "work-item:standing-capacity" },
    { ...baseDuty, scope: "work-item:started-assignment", assignment: { state: "started", workerThread: "thread-1" } },
    { ...baseDuty, scope: "work-item:ambiguous-action" },
  ] }] }, { signedActions });
  assert.deepEqual(dispatch.frontier.map((item) => item.scope), [scope]);
  assert.equal(dispatch.queue.find((item) => item.scope === "work-item:standing-capacity").state, "blocked");
  assert.equal(dispatch.queue.find((item) => item.scope === "work-item:started-assignment").state, "in-flight");
  assert.equal(dispatch.queue.find((item) => item.scope === "work-item:ambiguous-action").reasons.includes("signed-action-ambiguous"), true);
  assert.equal(dispatch.frontier[0].sourceRepository, baseDuty.sourceRepository);
  assert.equal(dispatch.frontier[0].signedAction.id, "ni:///sha-256;action");
  assert.deepEqual(dispatch.frontier[0].evidence, baseDuty.evidence);
  assert.deepEqual(dispatch.frontier[0].obligationWitness, baseDuty.obligationWitness);
});


test("proposal and receiver authorization preserve the revised opening's causal witness through receipt", () => {
  const collector = workItemViewCollector();
  collector.push(row("Original", ["snapshot:old"]), { id: "old", core: { causes: [] } });
  collector.push(row("Revised", ["snapshot:latest"]), { id: "latest", core: { causes: ["old"] } });
  collector.push(["proposal", { cell: "office-proposal:result", reading: "unknown" }, {}, { source: "proposal", item: 1 }], { id: "proposal", core: { causes: ["latest"] } });
  const receipt = { id: "receipt", core: { causes: ["proposal"] } };
  collector.push(["receiver", { cell: scope, reading: "unknown" }, { boundary: { role: "receiver-authorization" } }, { source: "receipt", item: 1 }], receipt);
  collector.push(["result", { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }, { source: "receipt", item: 2 }], receipt);
  const view = collector.read("structured-work-intent-test-intent", "2026-10-01");
  assert.equal(view.scopes[scope].causalDischarge, true);
  assert.equal(view.scopes[scope].status, "discharged");
  const node = view.roadmap.nodes.find(node => node.scope === scope);
  assert.deepEqual(node.obligationWitness, { subject: "structured-work-intent-test-intent", witness: "latest" });
  assert.deepEqual(node.evidence, ["snapshot:latest"]);
});
