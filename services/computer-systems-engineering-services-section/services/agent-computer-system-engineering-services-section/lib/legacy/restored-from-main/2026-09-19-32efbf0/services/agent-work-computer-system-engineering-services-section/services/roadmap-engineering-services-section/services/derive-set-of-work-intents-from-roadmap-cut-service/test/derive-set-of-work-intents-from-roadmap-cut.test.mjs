import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfWorkIntentsFromRoadmapCut } from "../scripts/derive-set-of-work-intents-from-roadmap-cut.mjs";

const sourceText = [
  "{",
  "  \"thread\": \"the roadmap engine test thread\",",
  "  \"nextEdges\": [",
  "    \"the first counterparty test edge\"",
  "  ],",
  "  \"state\": {\"shipped\": [\"the unit shipped as record and settlement\"]}",
  "}",
].join("\n");

test("thread, nextEdges, shipped, brokenEdge, and findings become a project item and task items with line provenance", () => {
  const result = deriveSetOfWorkIntentsFromRoadmapCut({
    recordedAt: "2026-09-06T03:35:00Z",
    thread: "the roadmap engine test thread",
    brokenEdge: "nothing has shipped yet",
    nextEdges: ["the first counterparty test edge"],
    findings: ["a finding about the test thread"],
    state: { shipped: ["the unit shipped as record and settlement"] },
    source: "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0335-goal-stack-roadmap.json",
    sourceText,
  });
  assert.equal(result.kind, "agent-work.structured-intent");
  assert.equal(result.id, "roadmap-cut-2026-09-06-0335");
  assert.equal(result.items.length, 4);
  assert.equal(result.items[0].cell, "project:the-roadmap-engine-test-thread");
  assert.deepEqual(result.items[0].evidence, ["brokenEdge: nothing has shipped yet", "finding: a finding about the test thread"]);
  assert.deepEqual(result.items[0].provenance, [{ source: "roadmap-cut", start: 2, end: 2, unit: "line" }]);
  assert.equal(result.sources[0].locator, "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0335-goal-stack-roadmap.json");
  assert.equal(result.items[1].cell, "plan:2026-09-06-0335-the-roadmap-engine-test-thread");
  assert.equal(result.items[2].cell, "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93");
  assert.equal(result.items[2].parent, result.items[1].cell);
  assert.equal(result.items[3].cell, "task:2026-09-06-0335-shipped-the-unit-shipped-as-record-and-settlement-90f9f768");
  assert.deepEqual(result.items[3].evidence, ["shipped:2026-09-06T03:35:00Z"]);
  assert.equal(result.refusals.length, 2);
  assert.equal(result.refusals[0].reason, "no-bcp-14-force");
});

test("a task text with a BCP 14 word carries force/modality/horizon evidence and no refusal", () => {
  const result = deriveSetOfWorkIntentsFromRoadmapCut({
    recordedAt: "2026-09-06T05:00:00Z",
    thread: "a forceful thread",
    nextEdges: ["Clients MUST retry with backoff."],
    source: "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json",
  });
  assert.equal(result.refusals.length, 0);
  assert.ok(result.items[2].evidence.includes("force:MUST modality:necessary horizon:soon (read-bcp-14-requirements)"));
});

test("a task text repeated verbatim across cuts folds onto its prior cell and carries repeated:<n>", () => {
  const priorItems = [
    { cell: "project:earlier-thread", parent: "endeavor:ops-561-group", text: "an earlier thread", evidence: ["cut: earlier-source.json"], provenance: [{ source: "roadmap-cut", start: 2, end: 2, unit: "line" }] },
    { cell: "task:2026-09-05-0000-clients-must-retry-with-backoff-11111111", parent: "project:earlier-thread", text: "Clients MUST retry with backoff.", evidence: ["nextEdge: earlier-source.json", "force:MUST modality:necessary horizon:soon (read-bcp-14-requirements)"], provenance: [{ source: "roadmap-cut", start: 4, end: 4, unit: "line" }] },
  ];
  const result = deriveSetOfWorkIntentsFromRoadmapCut({
    recordedAt: "2026-09-06T05:00:00Z",
    thread: "an earlier thread",
    nextEdges: ["Clients MUST retry with backoff."],
    source: "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json",
    priorItems,
  });
  assert.equal(result.items[2].cell, "task:2026-09-05-0000-clients-must-retry-with-backoff-11111111");
  assert.ok(result.items[2].evidence.includes("repeated:2"));
  assert.equal(result.items[2].provenance.length, 2);
});

test("a pre-GoalStackRoadmapCut cut without thread falls back to goal.what", () => {
  const result = deriveSetOfWorkIntentsFromRoadmapCut({
    recordedAt: "2026-08-30",
    goal: { name: "ops.561.group", what: "The ERP/ICS control plane for agents and humans" },
    source: "561-group-enterprise-project-management-services-section/data/records/2026-08-30-goal-stack-roadmap.json",
  });
  assert.equal(result.id, "roadmap-cut-2026-08-30");
  assert.equal(result.items[0].cell, "project:the-erp-ics-control-plane-for-agents-and-humans");
  assert.equal(result.items.length, 2);
});

test("refuses a missing source", () => {
  assert.throws(() => deriveSetOfWorkIntentsFromRoadmapCut({ recordedAt: "2026-08-30" }), /source is required/u);
});

test("refuses a missing recordedAt", () => {
  assert.throws(() => deriveSetOfWorkIntentsFromRoadmapCut({ source: "x.json" }), /recordedAt is required/u);
});
