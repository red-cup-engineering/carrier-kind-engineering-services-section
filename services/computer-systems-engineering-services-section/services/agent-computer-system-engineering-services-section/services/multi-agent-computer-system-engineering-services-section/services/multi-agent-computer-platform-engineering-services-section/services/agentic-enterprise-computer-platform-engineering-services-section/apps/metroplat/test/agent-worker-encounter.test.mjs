import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { AGENT_WORKER_STAGE_VERBS, agentWorkerFrontierAssignments, runAgentWorker, runAgentWorkerEngine, undischargedWorkLedgerObligations } from "@red-cup-engineering/feltos/agents/worker";
import { replaceWorkspaceFile, workspaceReadoutOperations } from "@red-cup-engineering/computer-code-development-engine/workspace/readout";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { sourceCodePolicyOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/operations";
import { agentCoordinationOperations } from "@red-cup-engineering/computer-code-development-engine/agent/service";
import { inferenceCall, inferenceMessage, inferenceResult, inferenceToolMove } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { inferenceSourceTerminal } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-source-kind";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "@red-cup-engineering/relating/running/session";
import { journalEncounterStore } from "@red-cup-engineering/feltos/encounter/store";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";
import { each } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { rpcEvidenceType } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { admitRows, CLAIM_SESSION } from "./support/claim-session-thread.mjs";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { createSignRoadmap } from "@red-cup-engineering/organizing/work/sign-roadmap";
import { admitSignRoadmap } from "@red-cup-engineering/feltos/work/sign-roadmap-journal";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { capabilityWitnessesForOperations } from "@red-cup-engineering/feltos/agents/capability-witnesses";
import { readCapabilityWitnesses } from "@red-cup-engineering/computer-system-engine/rpc/capability-claims";
import { grantAssertion, revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";

const at = "2026-07-11T12:00:00.000Z";

test("agent worker selects recorded frontier claims, never lexical queue head", () => {
  const obligations = [
    { item: "task:a", text: "A", evidence: [] },
    { item: "task:z", text: "Z", evidence: [] },
  ];
  const item = (scope) => ({ agent: "worker", scope, state: "ready", status: "open", structural: { state: "ready", blockers: [] }, coordination: { state: "clear" }, conflicts: [], via: "agent", passive: "worker", standing: "held", reasons: [] });
  const lexicalHead = item("task:a");
  const frontierClaim = item("task:z");
  const dispatch = {
    kind: "metroplat.agent-work.dispatch-settlement",
    subject: "worker",
    date: at.slice(0, 10),
    feed: "claim-session",
    policy: "declared-duty-with-structural-and-coordination-readiness",
    coordination: "clear",
    coordinationCost: 0,
    agents: [{ agent: "worker", ready: 1, blocked: 0, done: 0, frontier: [frontierClaim], offers: [[frontierClaim]], queue: [lexicalHead, frontierClaim], evidence: [] }],
    frontier: [frontierClaim],
    queue: [lexicalHead, frontierClaim],
    evidence: [],
  };
  assert.deepEqual(agentWorkerFrontierAssignments(obligations, dispatch, "worker").map((entry) => entry.item), ["task:z"]);
});

function workerCapabilities(packageName, workerId, verbs) {
  return verbs.map((verb) => grantAssertion("test", workerId, `${packageName}#${verb}`, at));
}

function admitWorkerCapabilities(dataRoot, packageName, workerId, verbs) {
  return admitCapabilityAssertions({
    dataRoot,
    rootName: packageName,
    date: at.slice(0, 10),
    assertions: workerCapabilities(packageName, workerId, verbs),
  });
}

function evidenceOf(event) {
  return event.evidence;
}

function admitDuty(dataRoot, packageName, workerId, scope, item = 2, reading = "held") {
  const assignment = claimSessionObservation({
    sessionId: "work-ledger",
    transport: "claim-session",
    claim: { cell: `jural:duty:${workerId}:test:${scope}`, reading },
    session: { claims: [], closed: false },
    judgement: {},
    at: { source: "test-assignment", item },
    boundary: {
      protocol: "metroplat",
      surface: "work-ledger",
      operation: "assign",
      role: "assignment",
      source: "test",
      text: `Assign ${scope} to ${workerId}.`,
      evidence: ["test:assignment"],
    },
    caller: { transport: "test" },
  });
  return admitRows(dataRoot, "work-ledger", claimSessionStatementRows(assignment));
}

/** The executable Action an allocation prepares at admission (feltos agency-work-allocation):
 * only a scope bound to an admitted SignRoadmap Action reaches the frontier. */
function admitAllocatedAction(dataRoot, packageName, scope) {
  const separator = scope.indexOf(":");
  const base = { title: scope, description: "Allocated test obligation" };
  const graph = createSignRoadmap({
    nodes: [
      { key: "demand", kind: scope.slice(0, separator), content: { ...base, title: scope.slice(separator + 1), intendedOutcome: "An independent receiver checks the outcome.", acceptance: "An independent receiver checks the outcome." } },
      { key: "change", kind: "change", content: { ...base, target: scope, before: "Declared work awaits execution", after: "An independent receiver checks the outcome.", acceptance: "An independent receiver checks the outcome." } },
      { key: "action", kind: "action", content: { ...base, operation: "agency-work-propose", effect: "Use the available tools to make real progress on this obligation.", acceptance: "An independent receiver checks the outcome." } },
      { key: "resource", kind: "resource", content: { ...base, locator: `test:${scope}`, mediaType: "application/json" } },
      { key: "evidence", kind: "evidence", content: { ...base, locator: `test:${scope}`, excerpt: "Declared test-work via test-skill; office service duty:test" } },
    ],
    edges: [
      { from: "change", predicate: "targets", to: "demand", witness: "evidence" },
      { from: "change", predicate: "derives-action", to: "action", witness: "evidence" },
      { from: "action", predicate: "uses-resource", to: "resource", witness: "evidence" },
    ],
  });
  if (!graph.ok) throw new TypeError(graph.refusal.message);
  admitSignRoadmap({ ...defaultFilesystemBinding(dataRoot), rootName: packageName }, graph.value, { at: at.slice(0, 10) });
}

/** Admit a `held` duty that also carries a canonical office-service-allocation
 * marker (the exact boundary shape `agencyWorkAllocationMarkerOfRow`,
 * `src/work/observations.mts`, parses) so the duty reaches the "ready"
 * dispatch state under `stateOfDuty`'s allocation gate (`src/work/dispatch.mts`).
 * This is the same row shape `admitAgencyWorkAllocation`
 * (`src/work/agency-work-allocation.mts`) appends in production; it is
 * written directly here so this fixture stays independent of that function's
 * own office/character/provider-admission resolution, which is already
 * exercised end-to-end by `test/agency-work-allocation.test.mjs`. */
function admitAllocatedDuty(dataRoot, packageName, workerId, scope, item = 2) {
  const allocationId = `test-allocation-${workerId}`;
  const assignment = claimSessionObservation({
    sessionId: "work-ledger",
    transport: "claim-session",
    claim: { cell: `jural:duty:${workerId}:test:${scope}`, reading: "held" },
    session: { claims: [], closed: false },
    judgement: {},
    at: { source: "test-allocation", item },
    boundary: {
      protocol: "metroplat",
      surface: "work-coordination",
      operation: "agency-work-allocation-admit",
      role: "office-service-allocation",
      source: allocationId,
      text: "office-service-allocation",
      scope,
      character: workerId,
      model: "model:test",
      office: "office:test",
      officeService: "office-service:test",
      duty: "duty:test",
      work: "test-work",
      skill: "test-skill",
      closureKind: "inquiry",
      requiresCapabilities: [],
      method: "Use the available tools to make real progress on this obligation.",
      receiverCondition: "An independent receiver checks the outcome.",
      governing: { office: { id: "office:test" }, duty: { id: "duty:test" }, work: { id: "test-work" } },
      evidence: [`office:office:test`, `office-service:office-service:test`, `scope:${scope}`],
    },
    caller: { transport: "test" },
  });
  const appended = admitRows(dataRoot, "work-ledger", claimSessionStatementRows(assignment));
  admitAllocatedAction(dataRoot, packageName, scope);
  return appended;
}

test("the agent worker engine is host-cancelled and never invents work", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agent-engine-"));
  try {
    const abort = new AbortController();
    const results = [];
    await runAgentWorkerEngine(projectSurface([], { packageName: "@test/agent-engine" }), {
      dataRoot: root,
      rootName: "@test/agent-engine",
      workerId: "agent-engine-test",
      model: "model:test",
      inference: () => { throw new Error("inference must not run without assigned work"); },
      intervalMs: 0,
      signal: abort.signal,
      onResult: (result) => {
        results.push(result);
        abort.abort();
      },
    });
    assert.deepEqual(results.map((result) => result.kind), ["metroplat.agent-worker.no-obligation"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the agent loop carries inference evidence through tool RPC and its next witnessed turn", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agent-encounter-"));
  try {
    const packageName = "@test/agent-tools";
    const cell = "work-item:work-ledger/item/0001";
    const observation = claimSessionObservation({
      sessionId: "work-ledger",
      transport: "claim-session",
      claim: { cell, reading: "unknown" },
      session: { claims: [{ cell, reading: "unknown" }], closed: false },
      judgement: {},
      at: { source: "test", item: 1 },
      boundary: { protocol: "metroplat", surface: "work-ledger", operation: "work-ledger-item", role: "obligation", source: "test", text: "Double two with the governed tool.", evidence: ["test:obligation"] },
      caller: { transport: "test" },
    });
    admitRows(root, "work-ledger", claimSessionStatementRows(observation));

    const double = operation({ verb: "double", run: (input) => ({ value: input.value * 2 }) });
    const stageOperations = agentCoordinationOperations({ ...defaultFilesystemBinding(root, { packageRoot: root, now: () => at }), rootName: packageName });
    const operations = Object.freeze([double, ...stageOperations]);
    const ungovernedSurface = projectSurface(operations, { packageName });
    const surface = projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)), {
      packageName,
      capabilityAssertions: () => readCapabilityAssertions(root),
    });
    let providerTurns = 0;
    const inferenceCalls = [];
    const source = (call) => {
      inferenceCalls.push(call);
      return ({
      async *[Symbol.asyncIterator]() {
        providerTurns += 1;
        if (providerTurns === 1) {
          const move = inferenceToolMove({ request: "tool:double:1", name: "double", input: { value: 2 } });
          yield inferenceSourceTerminal(inferenceResult({
            call: call.id,
            model: call.model,
            stop: "tool-moves",
            message: inferenceMessage({ role: "assistant", content: null, toolMoves: [move] }),
            toolMoves: [move],
            observedAt: at,
            causes: [call.id],
          }));
          return;
        }
        yield inferenceSourceTerminal(inferenceResult({
          call: call.id,
          model: call.model,
          stop: "completed",
          message: inferenceMessage({ role: "assistant", content: "The obligation is complete." }),
          observedAt: at,
          causes: [call.id],
        }));
      },
    });
    };
    const encounters = journalEncounterStore(root, { namespace: packageName, pollIntervalMs: 10 });
    const provider = inferenceProviderOperation("agent-test", source, encounters, encounterExecutionControl());
    const inferenceWitness = journalRpcWitness(root, { namespace: packageName });
    const inference = witnessedInferenceEncounterPort({
      operation: provider,
      encounters,
      witness: inferenceWitness,
      authorize: authorizationFromStanding(new Map([[provider.ref, "held"]])),
      now: () => at,
    });

    const unassigned = await runAgentWorker(surface, {
      dataRoot: root,
      rootName: packageName,
      workerId: "agent-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 2,
    });
    assert.equal(unassigned.kind, "metroplat.agent-worker.assignment-obstruction");
    assert.equal(unassigned.reason, "no-held-duty");
    assert.equal(providerTurns, 0, "an open obligation must not assign itself to a worker");

    admitAllocatedDuty(root, packageName, "agent-test", cell);

    const refused = await runAgentWorker(ungovernedSurface, {
      dataRoot: root,
      rootName: packageName,
      workerId: "agent-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 2,
    });
    assert.equal(refused.kind, "metroplat.agent-worker.authorization-obstruction");
    assert.equal(refused.reason, "settled-capability-reading-required");
    assert.equal(providerTurns, 0, "an ungoverned surface must be refused before inference");

    const ungranted = await runAgentWorker(surface, {
      dataRoot: root,
      rootName: packageName,
      workerId: "agent-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 2,
    });
    assert.equal(ungranted.kind, "metroplat.agent-worker.authorization-obstruction");
    assert.equal(ungranted.reason, "no-held-agent-stage-capability");
    assert.equal(providerTurns, 0, "operation availability must not grant the worker subject authority");

    admitWorkerCapabilities(root, packageName, "agent-test", [...AGENT_WORKER_STAGE_VERBS, "double"]);
    const result = await runAgentWorker(surface, {
      dataRoot: root,
      rootName: packageName,
      workerId: "agent-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 2,
    });
    assert.equal(result.kind, "metroplat.agent-worker.run", JSON.stringify(result));
    assert.equal(result.turns.length, 2);
    assert.equal(result.turns[0].executions[0].value.value, 4);
    const dispatchPage = result.contextImage.pages.find((page) => page.layer === "work-dispatch");
    assert.ok(dispatchPage);
    assert.equal(dispatchPage.state, "resident");
    assert.equal(dispatchPage.source, "agent-work-dispatch");
    assert.equal(dispatchPage.material.kind, "metroplat.agent-work.dispatch-settlement");
    assert.equal(result.contextImage.pages.some((page) => page.layer === "workflow"), false);
    assert.equal(result.diagnosis.observation, result.contextImage.id);
    assert.equal(result.strategy.diagnosis, result.diagnosis.id);
    assert.equal(result.planningObstruction.kind, "metroplat.agent-worker.planning-obstruction");
    assert.equal(result.planningObstruction.reason, "no-admitted-adjustment-plan");
    assert.equal(result.planningObstruction.diagnosis, result.diagnosis.id);
    assert.equal(result.planningObstruction.strategy, result.strategy.id);
    assert.equal(result.stageExecutions.observation.ok, true);
    assert.equal(result.stageExecutions.diagnosis.ok, true);
    assert.equal(result.stageExecutions.strategy.ok, true);
    assert.equal(result.stageCausalHeads.observation.length > 0, true);
    assert.equal(result.stageCausalHeads.diagnosis.length > 0, true);
    assert.equal(result.stageCausalHeads.strategy.length > 0, true);
    assert.deepEqual(inferenceCalls[0].causes, result.stageCausalHeads.strategy, "the first agent encounter must causally follow the governed strategy evidence");
    const executionPrompt = inferenceCalls[0].messages.find((message) => message.role === "user")?.content;
    assert.equal(typeof executionPrompt, "string");
    assert.match(executionPrompt, new RegExp(result.diagnosis.id), "the encounter must consume the exact governed diagnosis artifact");
    assert.match(executionPrompt, new RegExp(result.strategy.id), "the encounter must consume the exact governed strategy artifact");
    assert.match(executionPrompt, /\"nextMoves\"/, "the encounter must receive the strategy's selected moves, not only its causal address");
    assert.match(executionPrompt, /\"no-admitted-adjustment-plan\"/, "the missing typed AdjustmentPlan must remain explicit at the execution boundary");
    assert.equal(result.dischargedRole, "obligation", "model completion language and a successful tool are not settlement evidence");
    assert.equal(undischargedWorkLedgerObligations(root, "2026-07-11").length, 1);

    admitCapabilityAssertions({
      dataRoot: root,
      rootName: packageName,
      date: at.slice(0, 10),
      assertions: [revokeAssertion("test", "agent-test", `${packageName}#double`, at)],
    });
    const revoked = await runAgentWorker(surface, {
      dataRoot: root,
      rootName: packageName,
      workerId: "agent-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 2,
    });
    assert.equal(revoked.kind, "metroplat.agent-worker.authorization-obstruction");
    assert.equal(revoked.reason, "no-held-operation-capability");
    assert.equal(providerTurns, 2, "contested journal standing must stop before inference");

    admitDuty(root, packageName, "agent-test", cell, 3, "denied");
    const contested = await runAgentWorker(surface, {
      dataRoot: root,
      rootName: packageName,
      workerId: "agent-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 2,
    });
    assert.equal(contested.kind, "metroplat.agent-worker.assignment-obstruction");
    assert.equal(contested.reason, "coordination-required");
    assert.equal(providerTurns, 2, "contradicted assignment must stop before another inference encounter");

    // The RPC evidence: a record per act, following the acts it saw; an event is its address, its evidence and its causes.
    const causeId = (cause) => (typeof cause === "string" ? cause : cause.id);
    const rpcEvents = [...each(root, rpcEvidenceType)].map(({ address, record }) => ({ id: address, evidence: record.evidence, core: { causes: (record.causes ?? []).map(causeId) } }));
    const attempts = rpcEvents.filter((event) => evidenceOf(event).kind === "metroplat.rpc.attempt");
    const outcomes = rpcEvents.filter((event) => evidenceOf(event).kind === "metroplat.rpc.outcome");
    const firstInferenceAttempt = attempts.find((event) => evidenceOf(event).invocation.request.startsWith("agent-worker:") && evidenceOf(event).invocation.request.endsWith(":1"));
    const observationAttempt = attempts.find((event) => evidenceOf(event).invocation.verb === "agent-context-image");
    const diagnosisAttempt = attempts.find((event) => evidenceOf(event).invocation.verb === "agent-diagnosis");
    const planAttempt = attempts.find((event) => evidenceOf(event).invocation.verb === "agent-strategy");
    const toolAttempt = attempts.find((event) => evidenceOf(event).invocation.verb === "double");
    const secondInferenceAttempt = attempts.find((event) => evidenceOf(event).invocation.request.startsWith("agent-worker:") && evidenceOf(event).invocation.request.endsWith(":2"));
    assert.ok(observationAttempt && diagnosisAttempt && planAttempt && firstInferenceAttempt && toolAttempt && secondInferenceAttempt);
    // Each invocation is its own thread of evidence: an attempt follows nothing, and the acts that follow it follow its frontier.
    const firstInferenceOutcomes = outcomes.filter((event) => evidenceOf(event).invocation === evidenceOf(firstInferenceAttempt).invocation.id);
    const toolOutcome = outcomes.find((event) => evidenceOf(event).invocation === evidenceOf(toolAttempt).invocation.id);
    const secondInferenceOutcome = outcomes.find((event) => evidenceOf(event).invocation === evidenceOf(secondInferenceAttempt).invocation.id);
    assert.ok(firstInferenceOutcomes.length > 0 && toolOutcome && secondInferenceOutcome);

    const writeback = [...each(root, CLAIM_SESSION)].find(({ record }) => record.thread === "work-ledger" && (record.causes ?? []).map(causeId).includes(secondInferenceOutcome.id));
    assert.ok(writeback, "the worker writeback must descend from the final witnessed inference outcome");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a governed agent worker can discharge admitted work through content-addressed package mutation", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agent-workspace-mutation-"));
  const dataRoot = path.join(root, "data");
  const packageRoot = path.join(root, "package");
  const sourcePath = path.join(packageRoot, "src", "value.mjs");
  try {
    mkdirSync(path.dirname(sourcePath), { recursive: true });
    const beforeText = 'import "./missing.mjs";\nexport const value = 1;\n';
    const afterText = "export const value = 2;\n";
    writeFileSync(sourcePath, beforeText);
    const packageName = "@test/agent-workspace-tools";
    const binding = defaultFilesystemBinding(dataRoot, { packageRoot, now: () => at });
    const policyOperations = sourceCodePolicyOperations(binding);
    const policyAdmission = policyOperations.find((candidate) => candidate.verb === "source-code-policy-obligations-admit");
    const policyRead = policyOperations.find((candidate) => candidate.verb === "source-code-policy");
    assert.ok(policyAdmission && policyRead);
    const opened = await policyAdmission.execute({}, {});
    assert.equal(opened.value.opened, 4);
    assert.equal(opened.value.appended > 0, true);
    const policyObligation = undischargedWorkLedgerObligations(dataRoot, "2026-07-11")
      .find((obligation) => obligation.evidence.includes("work-kind:repair"));
    assert.ok(policyObligation);
    admitAllocatedDuty(dataRoot, packageName, "agent-workspace-test", policyObligation.item);

    const operations = Object.freeze([
      ...agentCoordinationOperations({ ...binding, rootName: packageName }),
      ...workspaceReadoutOperations(binding),
      ...policyOperations,
    ]);
    const replace = operations.find((candidate) => candidate.verb === "workspace-file-replace");
    assert.ok(replace);
    assert.equal(replace.effects.class, "external");
    assert.equal(replace.relation, "boundary");
    const surface = projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)), {
      packageName,
      capabilityAssertions: () => readCapabilityAssertions(dataRoot),
    });
    let providerTurns = 0;
    const source = (call) => ({
      async *[Symbol.asyncIterator]() {
        providerTurns += 1;
        if (providerTurns === 1) {
          const move = inferenceToolMove({
            request: "tool:workspace-file-replace:1",
            name: "workspace-file-replace",
            input: { path: "src/value.mjs", expected: artifactId(beforeText), content: afterText },
          });
          yield inferenceSourceTerminal(inferenceResult({
            call: call.id,
            model: call.model,
            stop: "tool-moves",
            message: inferenceMessage({ role: "assistant", content: null, toolMoves: [move] }),
            toolMoves: [move],
            observedAt: at,
            causes: [call.id],
          }));
          return;
        }
        if (providerTurns === 2) {
          const move = inferenceToolMove({
            request: "tool:source-code-policy-obligations-admit:2",
            name: "source-code-policy-obligations-admit",
            input: {},
          });
          yield inferenceSourceTerminal(inferenceResult({
            call: call.id,
            model: call.model,
            stop: "tool-moves",
            message: inferenceMessage({ role: "assistant", content: null, toolMoves: [move] }),
            toolMoves: [move],
            observedAt: at,
            causes: [call.id],
          }));
          return;
        }
        yield inferenceSourceTerminal(inferenceResult({
          call: call.id,
          model: call.model,
          stop: "completed",
          message: inferenceMessage({ role: "assistant", content: "The package mutation is complete." }),
          observedAt: at,
          causes: [call.id],
        }));
      },
    });
    const encounters = journalEncounterStore(dataRoot, { namespace: packageName, pollIntervalMs: 10 });
    const provider = inferenceProviderOperation("agent-workspace-test", source, encounters, encounterExecutionControl());
    const inference = witnessedInferenceEncounterPort({
      operation: provider,
      encounters,
      witness: journalRpcWitness(dataRoot, { namespace: packageName }),
      authorize: authorizationFromStanding(new Map([[provider.ref, "held"]])),
      now: () => at,
    });

    admitWorkerCapabilities(dataRoot, packageName, "agent-workspace-test", [...AGENT_WORKER_STAGE_VERBS, "workspace-file-replace", "source-code-policy-obligations-admit"]);
    const result = await runAgentWorker(surface, {
      dataRoot,
      rootName: packageName,
      workerId: "agent-workspace-test",
      model: "model:test",
      inference,
      now: () => at,
      maxTurns: 3,
    });
    assert.equal(result.kind, "metroplat.agent-worker.run", JSON.stringify(result));
    assert.equal(result.turns[0].executions[0].value.kind, "metroplat.filesystem.workspace-file-replace:witness");
    assert.equal(result.turns[0].executions[0].value.changed, true);
    assert.equal(result.turns[1].executions[0].value.discharged, 4);
    assert.equal(result.dischargedRole, "discharge");
    assert.equal(readFileSync(sourcePath, "utf8"), afterText);
    const repairedPolicy = await policyRead.execute({}, {});
    // Policy summaries count readings by knowledge-family name; `active` is told against only.
    assert.equal(repairedPolicy.value.summary.active, 0);

    const stale = replaceWorkspaceFile(packageRoot, {
      path: "src/value.mjs",
      expected: artifactId(beforeText),
      content: "stale overwrite\n",
    }, binding);
    assert.equal(stale.kind, "metroplat.filesystem.workspace-file-replace:obstruction");
    assert.equal(stale.reason, "stale-source");
    const escaping = replaceWorkspaceFile(packageRoot, {
      path: "../outside.mjs",
      expected: artifactId("outside"),
      content: "escape\n",
    }, binding);
    assert.equal(escaping.kind, "metroplat.filesystem.workspace-file-replace:obstruction");
    assert.ok(["not-file", "outside-package"].includes(escaping.reason));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
