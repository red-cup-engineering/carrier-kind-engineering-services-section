import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { threadRecords, threadRows } from "./support/claim-session-thread.mjs";
import { assembleDefaultServiceMcp } from "@red-cup-engineering/metroplat/catalog";
import { admitCodexSessionWorkClaims } from "@red-cup-engineering/feltos/agents/sessions/codex/service";
import {
  admitStructuredWorkIntent,
  assertStructuredWorkIntent,
  structuredWorkIntentObservations,
} from "@red-cup-engineering/feltos/work/structured-intent";
import { acceptedWorkReceipts } from "@red-cup-engineering/feltos/work/work-acceptance-readout";
import { admitWorkDischarge } from "@red-cup-engineering/feltos/work/work-discharge";
import { admitWorkResultProposal } from "@red-cup-engineering/feltos/work/work-result-proposal";
import { admitAgencyWorkAllocation } from "@red-cup-engineering/feltos/work/agency-work-allocation";
import { modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";
import { readWorkItemView, workCoordinationOperations } from "@red-cup-engineering/feltos/work/service";

const receiverAuthority = Object.freeze({ evaluation: Object.freeze({ kind: "governance.authority-evaluation-decision", allowed: true, reason: "fixture trusted receiver", snapshotRevision: "fixture-revision", evidenceRefs: Object.freeze(["fixture:receiver-authority"]) }) });

const DATE = "2026-09-01";

function intent(producer = "producer:a", id = "intent-a") {
  const cite = (start) => [{ source: "prompt", start, end: start + 4, unit: "unicode-code-point" }];
  return {
    kind: "metroplat.work.structured-intent",
    id,
    producer: { id: producer, revision: "1" },
    sources: [{ id: "prompt", kind: "natural-language-prompt", locator: `turn:${id}`, commitment: "sha256:example" }],
    items: [
      { cell: "endeavor:shared-control-plane", text: "Shared control plane", evidence: ["owner-movement"], provenance: cite(0) },
      { cell: "campaign:agent-residency", parent: "endeavor:shared-control-plane", text: "Agent residency", evidence: [], provenance: cite(5) },
      { cell: "project:metroplat", parent: "campaign:agent-residency", text: "MetroPlat", evidence: [], provenance: cite(10) },
      { cell: "plan:structured-admission", parent: "project:metroplat", text: "Structured admission", evidence: [], provenance: cite(15) },
      { cell: "task:admit-session", parent: "plan:structured-admission", text: "Admit the session", evidence: [], provenance: cite(20) },
      { cell: "work-item:prepare", parent: "task:admit-session", work: "prepare-work", skill: "prepare-skill", text: "Prepare", evidence: [], provenance: cite(25) },
      { cell: "work-item:execute", parent: "task:admit-session", dependencies: ["work-item:prepare"], text: "Execute", evidence: [], provenance: cite(30) },
      { cell: "work-item:review", parent: "task:admit-session", conflicts: ["work-item:execute"], text: "Review", evidence: [], provenance: cite(35) },
    ],
  };
}

const providerAuthority = Object.freeze({ authority: "fixture-provider-grant", revision: "fixture-revision", evidence: Object.freeze(["fixture:provider-authority"]) });

function admitFixtureAllocation(binding, subject) {
  return admitAgencyWorkAllocation(binding, {
    kind: "metroplat.work.agency-work-allocation",
    id: "fixture-prepare-allocation",
    subject,
    office: { id: "office:fixture-holder" },
    duty: "emsenn/duty/fixture-prepare",
    character: { model: "fixture-model", id: "fixture:holder", capabilities: ["fixture-operation"] },
    officeService: { id: "emsenn/duty/fixture-prepare", requiredCapabilities: ["fixture-operation"] },
    allocation: { scope: "work-item:prepare", delegation: { provider: "provider:a", operations: ["fixture-operation"], effects: ["host-read"], authority: providerAuthority.authority } },
  }, {
    at: DATE,
    resolveModelCharacter: modelCharacterResolverFromProviderAdmissions([{ model: "fixture-model", capabilities: ["fixture-operation"] }]),
    resolveAuthority: () => ({
      office: { id: "office:fixture-holder", bearsDuty: ["emsenn/duty/fixture-prepare"], deonticProfile: { "prepare-work": "duty" } },
      duty: { id: "emsenn/duty/fixture-prepare", work: "prepare-work", claim: "fixture:claim", skills: ["prepare-skill"], delegation: true },
      work: { id: "prepare-work", needs: ["prepare-skill"], receiverCondition: "fixture independent receiver" },
      skill: { id: "prepare-skill", closureKind: "procedure", requiresCapabilities: ["fixture-operation"], method: "fixture method" },
      officeService: { id: "emsenn/duty/fixture-prepare", requiredCapabilities: ["fixture-operation"] },
    }),
    authorizeProviderDelegation: () => providerAuthority,
  });
}

function proposal(binding, subject, result = { kind: "skill-result", value: { prepared: true } }, scope = "work-item:prepare", producer = { id: "provider:a", revision: "result-1" }) {
  return admitWorkResultProposal(binding, {
    execution: `execution-${scope}-${producer.id}-${result.kind}`, allocation: "fixture-prepare-allocation",
    intent: "intent-a", subject, scope, producer, authorization: providerAuthority, work: "prepare-work", skill: "prepare-skill",
    closureKind: "procedure", requiresCapabilities: ["fixture-operation"],
    method: "fixture method", receiverCondition: "fixture independent receiver",
    result, providerEvidence: ["provider:tool-receipt:prepare"],
  }, { at: DATE });
}

function semanticRoadmap(view) {
  return {
    nodes: view.roadmap.nodes.map(({ scope, parents, dependencies, conflicts }) => ({ scope, parents, dependencies, conflicts })),
    milestones: view.roadmap.milestones,
  };
}

test("structured intent refuses invalid hierarchy before admission", () => {
  const invalid = intent();
  invalid.items[2].parent = "endeavor:shared-control-plane";
  assert.throws(() => assertStructuredWorkIntent(invalid), /requires an admitted campaign parent/u);
});

test("governed admission writes the full hierarchy, dependencies, milestones, and is idempotent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-structured-intent-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const operation = workCoordinationOperations(binding).find((candidate) => candidate.verb === "structured-work-intent-admit");
    assert.ok(operation, "the governed work operation exists");
    assert.ok(
      assembleDefaultServiceMcp(binding).operations.some((candidate) => candidate.verb === "structured-work-intent-admit"),
      "the same operation is exposed by the MCP service catalog",
    );
    const first = admitStructuredWorkIntent(binding, intent(), { at: DATE });
    assert.equal(first.status, "admitted");
    assert.equal(first.items, 8);
    assert.equal(first.appended, 8);
    const repeat = admitStructuredWorkIntent(binding, intent(), { at: DATE });
    assert.deepEqual(repeat, { ...first, appended: 0, status: "already-admitted" });

    const view = readWorkItemView(binding, DATE, first.subject);
    const byScope = new Map(view.roadmap.nodes.map((node) => [node.scope, node]));
    assert.deepEqual(byScope.get("campaign:agent-residency").parents, ["endeavor:shared-control-plane"]);
    assert.deepEqual(byScope.get("project:metroplat").parents, ["campaign:agent-residency"]);
    assert.deepEqual(byScope.get("plan:structured-admission").parents, ["project:metroplat"]);
    assert.deepEqual(byScope.get("task:admit-session").parents, ["plan:structured-admission"]);
    assert.deepEqual(byScope.get("work-item:execute").parents, ["task:admit-session"]);
    assert.deepEqual(byScope.get("work-item:execute").dependencies, ["work-item:prepare"]);
    assert.deepEqual(byScope.get("work-item:review").conflicts, ["work-item:execute"]);
    assert.equal(byScope.get("work-item:execute").structural.state, "blocked");
    assert.ok(view.roadmap.milestones.some((milestone) => milestone.parent === "task:admit-session"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("producer assays preserve provenance without changing work semantics", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-intent-producers-"));
  try {
    const binding = defaultFilesystemBinding(root);
    const left = admitStructuredWorkIntent(binding, intent("producer:left", "left"), { at: DATE });
    const right = admitStructuredWorkIntent(binding, intent("producer:right", "right"), { at: DATE });
    assert.deepEqual(
      semanticRoadmap(readWorkItemView(binding, DATE, left.subject)),
      semanticRoadmap(readWorkItemView(binding, DATE, right.subject)),
    );
    const leftEvidence = structuredWorkIntentObservations(intent("producer:left", "left"))[0].boundary.evidence;
    const rightEvidence = structuredWorkIntentObservations(intent("producer:right", "right"))[0].boundary.evidence;
    assert.ok(leftEvidence.includes("producer:producer:left"));
    assert.ok(rightEvidence.includes("producer:producer:right"));
    assert.ok(leftEvidence.includes("source-span:prompt:unicode-code-point:0-4"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("structured intent admits one exact command binding without deriving it from task text", () => {
  const candidate = intent();
  const task = candidate.items.find((item) => item.cell === "task:admit-session");
  task.deterministicExecution = {
    operation: "node-version",
    request: { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: "/tmp", environment: null, input: null },
    acceptance: { kind: "exact-stdout", stdout: "v24\\n" },
  };
  const admitted = assertStructuredWorkIntent(candidate);
  const observation = structuredWorkIntentObservations(admitted).find((entry) => entry.claim.cell === "task:admit-session");
  assert.deepEqual(observation.boundary.deterministicExecution, task.deterministicExecution);
  task.deterministicExecution.request.command = "";
  assert.throws(() => assertStructuredWorkIntent(candidate), /JavascriptNodeCommandExecutionRequest/u);
});

test("daily claim sessions unite subjects while exact-subject reads stay isolated", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-intent-union-"));
  try {
    const binding = defaultFilesystemBinding(root);
    const leftIntent = intent("producer:left", "left-union");
    leftIntent.items[5].cell = "work-item:left-prepare";
    leftIntent.items[6].cell = "work-item:left-execute";
    leftIntent.items[6].dependencies = ["work-item:left-prepare"];
    leftIntent.items[7].cell = "work-item:left-review";
    leftIntent.items[7].conflicts = ["work-item:left-execute"];
    const rightIntent = intent("producer:right", "right-union");
    rightIntent.items[5].cell = "work-item:right-prepare";
    rightIntent.items[6].cell = "work-item:right-execute";
    rightIntent.items[6].dependencies = ["work-item:right-prepare"];
    rightIntent.items[7].cell = "work-item:right-review";
    rightIntent.items[7].conflicts = ["work-item:right-execute"];

    const left = admitStructuredWorkIntent(binding, leftIntent, { at: DATE });
    const right = admitStructuredWorkIntent(binding, rightIntent, { at: DATE });
    const scopesOf = (view) => new Set(view.roadmap.nodes.map((node) => node.scope));
    const globalScopes = scopesOf(readWorkItemView(binding, DATE, "daily-claim-sessions"));
    const leftScopes = scopesOf(readWorkItemView(binding, DATE, left.subject));
    const rightScopes = scopesOf(readWorkItemView(binding, DATE, right.subject));

    assert.ok(globalScopes.has("work-item:left-execute"));
    assert.ok(globalScopes.has("work-item:right-execute"));
    assert.ok(leftScopes.has("work-item:left-execute"));
    assert.ok(!leftScopes.has("work-item:right-execute"));
    assert.ok(rightScopes.has("work-item:right-execute"));
    assert.ok(!rightScopes.has("work-item:left-execute"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("evidenced work discharge settles one dependency and is idempotent across exact and global reads", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-work-discharge-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const admitted = admitStructuredWorkIntent(binding, intent(), { at: DATE });
    admitFixtureAllocation(binding, admitted.subject);
    const resultReceipt = proposal(binding, admitted.subject).receipt;
    const operation = workCoordinationOperations(binding).find((candidate) => candidate.verb === "work-discharge-admit");
    assert.ok(operation, "the governed discharge operation exists");
    assert.ok(
      assembleDefaultServiceMcp(binding).operations.some((candidate) => candidate.verb === "work-discharge-admit"),
      "the discharge operation is exposed by the default MCP catalog",
    );
    const before = readWorkItemView(binding, DATE, admitted.subject);
    assert.equal(before.roadmap.nodes.find((node) => node.scope === "work-item:prepare").structural.state, "ready");
    assert.equal(before.roadmap.nodes.find((node) => node.scope === "work-item:execute").structural.state, "blocked");

    const discharge = {
      kind: "metroplat.work.discharge",
      id: "discharge-prepare",
      intent: "intent-a",
      allocation: "fixture-prepare-allocation",
      producer: { id: "provider:a", revision: "result-1" },
      scope: "work-item:prepare",
      text: "Preparation completed and verified.",
      result: { kind: "skill-result", value: { prepared: true } },
      resultReceipt,
      receiver: { id: "receiver:independent", evidence: ["receiver:prepare-accepted"] },
      evidence: ["test:prepare-passed"],
    };
    const dischargeOperation = workCoordinationOperations(binding, {
      authorizeWorkDischargeReceiver: ({ receiver, scope, operation }) => {
        assert.equal(receiver, "receiver:independent");
        assert.equal(scope, "work-item:prepare");
        assert.equal(operation, dischargeOperation.ref);
        return receiverAuthority;
      },
    }).find((candidate) => candidate.verb === "work-discharge-admit");
    assert.ok(dischargeOperation);
    const context = {
      kind: "metroplat.rpc.execution-context",
      invocation: { subject: "receiver:independent" },
      operation: dischargeOperation,
      startedAt: `${DATE}T12:00:00.000Z`,
      evidence: [],
    };
    assert.throws(() => dischargeOperation.execute(discharge, {}, { ...context, invocation: { subject: "receiver:spoofed" } }), /authenticated receiver authority/u);
    const first = dischargeOperation.execute(discharge, {}, context);
    assert.equal(first.status, "admitted");
    assert.equal(first.appended, 2, "the receiver-authorization row and the discharge observation both append");
    const repeat = dischargeOperation.execute(discharge, {}, context);
    assert.deepEqual(repeat, { ...first, appended: 0, status: "already-admitted" });

    const exact = readWorkItemView(binding, DATE, admitted.subject);
    const global = readWorkItemView(binding, DATE, "daily-claim-sessions");
    for (const view of [exact, global]) {
      const nodes = new Map(view.roadmap.nodes.map((node) => [node.scope, node]));
      assert.equal(nodes.get("work-item:prepare").status, "discharged");
      assert.equal(nodes.get("work-item:prepare").structural.state, "done");
      assert.equal(nodes.get("work-item:execute").structural.state, "ready");
    }
    assert.deepEqual(semanticRoadmap(exact), semanticRoadmap(global));
    let receiverAuthorizationRow;
    for (const row of threadRows(root, admitted.subject)) {
      if (row[2]?.boundary?.role === "receiver-authorization") receiverAuthorizationRow = row;
    }
    assert.deepEqual(receiverAuthorizationRow?.[2]?.boundary?.evaluation, receiverAuthority.evaluation);
    assert.equal(receiverAuthorizationRow?.[2]?.boundary?.proposalReceipt, resultReceipt);

    // The receiver's acceptance reads back with what the provider cited, and only for its scope.
    const accepted = acceptedWorkReceipts(binding, DATE, new Set(["work-item:prepare"]));
    assert.equal(accepted.length, 1);
    assert.equal(accepted[0].proposalReceipt, resultReceipt);
    assert.equal(accepted[0].receiver, "receiver:independent");
    assert.equal(accepted[0].provider, "provider:a");
    assert.deepEqual(accepted[0].providerEvidence, ["provider:tool-receipt:prepare"]);
    assert.equal(typeof accepted[0].obligationWitness, "string");
    assert.deepEqual(acceptedWorkReceipts(binding, DATE, new Set(["work-item:execute"])), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a persisted skill error records receiver evidence but leaves its duty unfinished", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-work-skill-error-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const admitted = admitStructuredWorkIntent(binding, intent(), { at: DATE });
    admitFixtureAllocation(binding, admitted.subject);
    const resultReceipt = proposal(binding, admitted.subject, { kind: "skill-error", error: "source record was unavailable" }, "work-item:prepare", { id: "provider:a", revision: "result-error-1" }).receipt;
    const error = admitWorkDischarge(binding, {
      kind: "metroplat.work.discharge",
      id: "discharge-prepare-error",
      intent: "intent-a",
      allocation: "fixture-prepare-allocation",
      producer: { id: "provider:a", revision: "result-error-1" },
      scope: "work-item:prepare",
      text: "Preparation could not be completed.",
      result: { kind: "skill-error", error: "source record was unavailable" },
      resultReceipt,
      receiver: { id: "receiver:independent", evidence: ["receiver:prepare-error-reviewed"] },
      evidence: ["test:prepare-error"],
    }, { at: DATE, receiverAuthorization: receiverAuthority });
    assert.equal(error.status, "admitted");
    assert.equal(error.appended, 2, "the receiver-authorization row and the skill-error observation both append");

    const view = readWorkItemView(binding, DATE, admitted.subject);
    const nodes = new Map(view.roadmap.nodes.map((node) => [node.scope, node]));
    assert.equal(nodes.get("work-item:prepare").status, "open");
    assert.equal(nodes.get("work-item:prepare").structural.state, "ready");
    assert.equal(nodes.get("work-item:execute").structural.state, "blocked");
    assert.deepEqual(acceptedWorkReceipts(binding, DATE), [], "a reviewed skill error is never accepted work");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Codex intent hierarchy precedes and encloses transcript work leaves in one admission", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-codex-intent-"));
  const sessions = path.join(root, "sessions");
  const relative = "2026/09/01/rollout-session.jsonl";
  try {
    mkdirSync(path.join(sessions, "2026", "09", "01"), { recursive: true });
    writeFileSync(path.join(sessions, relative), [
      JSON.stringify({ timestamp: `${DATE}T12:00:00.000Z`, type: "session_meta", payload: { id: "session" } }),
      JSON.stringify({ timestamp: `${DATE}T12:00:01.000Z`, type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Please implement the structured admission." }] } }),
    ].join("\n"));
    const admission = admitCodexSessionWorkClaims(sessions, relative, {
      ...defaultFilesystemBinding(root),
      at: DATE,
      structuredIntent: intent(),
      parentScope: "task:admit-session",
    });
    const hierarchyLength = intent().items.length;
    assert.deepEqual(admission.bundle.observations.slice(0, hierarchyLength).map((row) => row.claim.cell), intent().items.map((item) => item.cell));
    const leaves = admission.bundle.observations.slice(hierarchyLength).filter((row) => row.claim.cell.startsWith("work-item:"));
    assert.ok(leaves.length > 0);
    assert.ok(leaves.every((row) => row.boundary.parent === "task:admit-session"));
    const view = readWorkItemView(defaultFilesystemBinding(root), DATE, "codex-session-session");
    assert.ok(view.roadmap.nodes.some((node) => node.scope === "task:admit-session"));
    assert.ok(view.roadmap.nodes.filter((node) => node.scope.includes("/session/session/work/")).every((node) => node.parents.includes("task:admit-session")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test("discharge requires the exact persisted provider proposal after output", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-result-receipt-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const admitted = admitStructuredWorkIntent(binding, intent(), { at: DATE });
    const obligationReceipt = threadRecords(root, admitted.subject)[0].address;
    admitFixtureAllocation(binding, admitted.subject);
    const accepted = proposal(binding, admitted.subject);
    const discharge = { kind: "metroplat.work.discharge", id: "exact-proposal", intent: "intent-a", allocation: "fixture-prepare-allocation", producer: { id: "provider:a", revision: "result-1" }, scope: "work-item:prepare", text: "Preparation completed.", result: { kind: "skill-result", value: { prepared: true } }, resultReceipt: accepted.receipt, receiver: { id: "receiver:independent", evidence: ["receiver:checked"] }, evidence: ["test:receipt"] };
    assert.throws(() => admitWorkDischarge(binding, { ...discharge, resultReceipt: obligationReceipt }, { at: DATE, receiverAuthorization: receiverAuthority }), /persisted result proposal/u);
    assert.throws(() => admitWorkDischarge(binding, { ...discharge, result: { kind: "skill-result", value: { prepared: false } } }, { at: DATE, receiverAuthorization: receiverAuthority }), /exact scope, producer, and result/u);
    assert.throws(() => admitWorkDischarge(binding, { ...discharge, scope: "work-item:execute" }, { at: DATE, receiverAuthorization: receiverAuthority }), /exact scope, producer, and result/u);
    assert.throws(() => admitWorkDischarge(binding, { ...discharge, producer: { id: "provider:other", revision: "result-1" } }, { at: DATE, receiverAuthorization: receiverAuthority }), /exact scope, producer, and result/u);
    assert.equal(admitWorkDischarge(binding, discharge, { at: DATE, receiverAuthorization: receiverAuthority }).status, "admitted");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
