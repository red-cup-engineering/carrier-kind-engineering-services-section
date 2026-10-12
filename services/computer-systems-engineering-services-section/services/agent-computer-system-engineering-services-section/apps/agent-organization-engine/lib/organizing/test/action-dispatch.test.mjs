import assert from "node:assert/strict";
import test from "node:test";
import { workItemObservationCollector, agencyWorkExecutionOfRow } from "../src/work/observations.mjs";
import { agentWorkDispatchReadoutOfWork } from "../src/work/dispatch.mjs";
import { workItemViewCollector, workRoadmapOfObservations, workItemDiamondsByScope } from "../src/work/read-models.mjs";

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

test("a trailing declaration remains open without fabricating a bounded diamond", () => {
  const collector = workItemObservationCollector();
  const view = workItemViewCollector();
  const entries = [
    [row("Original", ["snapshot:old"]), { id: "old", cites: [] }],
    [["proposal", { cell: "office-proposal:result", reading: "unknown" }, {}, "fixture"], { id: "proposal", cites: ["old"] }],
    [["result", { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }, "fixture"], { id: "receipt", cites: ["proposal"] }],
    [row("Revised", ["snapshot:new"]), { id: "revised", cites: ["old"] }],
  ];
  for (const [entry, witness] of entries) { collector.push(entry, witness); view.push(entry, witness); }
  const observations = collector.read();
  assert.deepEqual(observations.map(entry => entry.event), ["opened", "settled", "opened"]);
  const historical = workItemDiamondsByScope(observations).get(scope);
  assert.equal(historical.length, 1, "the unbounded new opening is not a counterfeit diamond");
  assert.equal(historical[0].upper.witness, "receipt");
  assert.equal(historical[0].deshrouded, false, "the historical receiving is still settled");
  const read = view.read("fixture", "2026-10-11");
  assert.equal(read.scopes[scope].status, "open");
  assert.equal(read.scopes[scope].causalDischarge, false, "the prior receipt does not settle the revised declaration");
  assert.equal(read.scopes[scope].accounting, undefined);
  assert.equal(read.roadmap.nodes.find(entry => entry.scope === scope).status, "open");
});

test("incomparable revision and original discharge have the same open status in every legal order", () => {
  const old = [row("Original", ["snapshot:old"]), { id: "old", cites: [] }];
  const revision = [row("Revised", ["snapshot:new"]), { id: "revised", cites: ["old"] }];
  const proposal = [["proposal", { cell: "office-proposal:result", reading: "unknown" }, {}, "fixture"], { id: "proposal", cites: ["old"] }];
  const receipt = [["result", { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }, "fixture"], { id: "receipt", cites: ["proposal"] }];
  for (const entries of [[old, revision, proposal, receipt], [old, proposal, revision, receipt], [old, proposal, receipt, revision]]) {
    const unchanged = structuredClone(entries);
    const collector = workItemViewCollector();
    for (const [entry, witness] of entries) collector.push(entry, witness);
    const read = collector.read("fixture", "2026-10-11");
    assert.equal(read.scopes[scope].status, "open");
    assert.equal(read.roadmap.nodes.find(entry => entry.scope === scope).obligationWitness.witness, "revised");
    assert.deepEqual(entries, unchanged, "reading neither rewrites nor rejects the original receipt");
  }
});

test("receiving metadata does not reopen a satisfied declaration, and a fresh causal receipt settles its own revision", () => {
  const collector = workItemViewCollector();
  const push = (entry, id, causes = []) => collector.push(entry, { id, cites: causes });
  const status = () => collector.read("fixture", "2026-10-11").scopes[scope].status;
  const receiptRow = () => ["result", { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }, "fixture"];
  push(row("Original", ["snapshot:old"]), "old");
  push(receiptRow(), "old-receipt", ["old"]);
  push(["receiver", { cell: scope, reading: "unknown" }, { boundary: { role: "receiver-authorization" } }, "fixture"], "authorization", ["old"]);
  assert.equal(status(), "discharged", "the receiver's own metadata is not a new declaration");
  push(row("Revised", ["snapshot:new"]), "revised", ["old"]);
  assert.equal(status(), "open");
  push(receiptRow(), "new-receipt", ["revised"]);
  assert.equal(status(), "discharged", "only evidence caused by the revision settles that revision");
});

test("same-scope execution and receiving metadata preserve the current declaration in every legal causal order", () => {
  const entry = (id, causes, body) => ({ row: body, witness: { id, cites: causes } });
  const metadata = boundary => ["fixture", { cell: scope, reading: "unknown" }, { boundary }, "fixture"];
  const opening = entry("old", [], row("Original", ["snapshot:old"]));
  const revision = entry("revision", ["old"], row("Revised", ["snapshot:new"]));
  const execution = (id, opening) => entry(id, [opening], metadata({ role: "office-service-execution",
    execution: { allocation: id, scope, state: "started" } }));
  const proposal = (id, opening, executionId) => entry(id, [opening, executionId], metadata({ role: "work-result-proposal",
    proposal: { allocation: executionId, scope, subject: "structured-work-intent-test-intent", execution: executionId,
      result: { kind: "skill-result", value: { report: id } } } }));
  const authorization = (id, proposalReceipt) => entry(id, [proposalReceipt], metadata({ role: "receiver-authorization",
    proposalReceipt, decision: "accepted", evaluation: { allowed: true } }));
  const discharge = (id, proposalReceipt, reading) => entry(id, [proposalReceipt],
    ["fixture", { cell: scope, reading }, { boundary: { role: "discharge" } }, "fixture"]);
  const oldExecution = execution("old-execution", "old");
  const oldProposal = proposal("old-proposal", "old", "old-execution");
  const oldAuthorization = authorization("old-authorization", "old-proposal");
  const newExecution = execution("new-execution", "revision");
  const newProposal = proposal("new-proposal", "revision", "new-execution");
  const newAuthorization = authorization("new-authorization", "new-proposal");
  for (const entry of [oldExecution, oldProposal, newExecution, newProposal])
    assert.equal(agencyWorkExecutionOfRow(entry.row, entry.witness).scope, scope,
      "the same-scope rows match the source execution/proposal carrier reader");
  function* legalOrders(remaining, ordered = [], known = new Set()) {
    if (remaining.length === 0) { yield ordered; return; }
    for (const [index, next] of remaining.entries()) if (next.witness.cites.every(cause => known.has(cause)))
      yield* legalOrders(remaining.filter((_, candidate) => candidate !== index), [...ordered, next], new Set([...known, next.witness.id]));
  }
  // Current receiving emits unknown; keep the existing held-reading form too.
  for (const reading of ["unknown", "held"]) {
    const oldDischarge = discharge("old-discharge", "old-proposal", reading);
    const newDischarge = discharge("new-discharge", "new-proposal", reading);
    for (const [fresh, expectedCount] of [[false, 10], [true, 504]]) {
      const events = [opening, revision, oldExecution, oldProposal, oldAuthorization, oldDischarge,
        ...(fresh ? [newExecution, newProposal, newAuthorization, newDischarge] : [])];
      let count = 0;
      for (const order of legalOrders(events)) {
        count += 1;
        const before = structuredClone(order);
        const collector = workItemViewCollector();
        for (const { row, witness } of order) collector.push(row, witness);
        const view = collector.read("fixture", "2026-10-11");
        const state = fresh ? "discharged" : "open";
        const diagnostic = order.map(entry => entry.witness.id).join(",");
        assert.equal(view.scopes[scope].status, state, diagnostic);
        const node = view.roadmap.nodes.find(node => node.scope === scope);
        assert.equal(node.status, state, diagnostic);
        assert.equal(node.obligationWitness.witness, "revision", diagnostic);
        assert.equal(view.scopes[scope].causalDischarge, fresh, diagnostic);
        assert.deepEqual(order, before, "projection preserves every old and new report/receiving record");
      }
      assert.equal(count, expectedCount, "every legal causal enumeration was actually exercised");
    }
  }
});

test("witness-free legacy declarations and generic unknown observations retain their existing reopening behavior", () => {
  const collector = workItemObservationCollector();
  collector.push(row("Original", []));
  collector.push(["fixture", { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }, "fixture"]);
  collector.push(["fixture", { cell: scope, reading: "unknown" }, {}, "fixture"]);
  assert.deepEqual(collector.read().map(entry => entry.event), ["opened", "settled", "opened"]);
});

test("an open revised obligation replaces declaration evidence and witness in roadmap projection", () => {
  const collector = workItemObservationCollector();
  collector.push(row("Original declaration", ["producer:author", "snapshot:old"]), { id: "witness-old", cites: [] });
  collector.push(row("Current declaration", ["producer:author", "snapshot:latest", "correction:current"]), { id: "witness-latest", cites: ["witness-old"] });

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
  assert.equal(dispatch.frontier[0].signedAction.id, "ni:///sha-256;action");
  assert.deepEqual(dispatch.frontier[0].evidence, baseDuty.evidence);
  assert.deepEqual(dispatch.frontier[0].obligationWitness, baseDuty.obligationWitness);
});


test("proposal and receiver authorization preserve the revised opening's causal witness through receipt", () => {
  const collector = workItemViewCollector();
  collector.push(row("Original", ["snapshot:old"]), { id: "old", cites: [] });
  collector.push(row("Revised", ["snapshot:latest"]), { id: "latest", cites: ["old"] });
  collector.push(["proposal", { cell: "office-proposal:result", reading: "unknown" }, {}, { source: "proposal", item: 1 }], { id: "proposal", cites: ["latest"] });
  const receipt = { id: "receipt", cites: ["proposal"] };
  collector.push(["receiver", { cell: scope, reading: "unknown" }, { boundary: { role: "receiver-authorization" } }, { source: "receipt", item: 1 }], receipt);
  collector.push(["result", { cell: scope, reading: "held" }, { boundary: { role: "discharge" } }, { source: "receipt", item: 2 }], receipt);
  const view = collector.read("structured-work-intent-test-intent", "2026-10-01");
  assert.equal(view.scopes[scope].causalDischarge, true);
  assert.equal(view.scopes[scope].status, "discharged");
  const node = view.roadmap.nodes.find(node => node.scope === scope);
  assert.deepEqual(node.obligationWitness, { subject: "structured-work-intent-test-intent", witness: "latest" });
  assert.deepEqual(node.evidence, ["snapshot:latest"]);
});
