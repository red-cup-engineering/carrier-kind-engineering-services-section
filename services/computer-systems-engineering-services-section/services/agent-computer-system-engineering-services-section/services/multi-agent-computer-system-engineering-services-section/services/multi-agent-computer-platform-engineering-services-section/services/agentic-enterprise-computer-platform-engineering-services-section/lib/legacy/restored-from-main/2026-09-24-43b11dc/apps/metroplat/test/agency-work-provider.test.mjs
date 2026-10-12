import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { executeAgencyWorkProvider } from "../src/apps/infograph/agency-work-provider.mjs";
import { agentCoordinationOperations } from "../src/agents/service.mjs";
import { inferenceMessage, inferenceResult, inferenceToolMove } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "../src/agents/inference/rpc.mjs";
import { inferenceSourceTerminal } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-source-kind";
import { capabilityWitnessesForOperations } from "../src/agents/capability-witnesses.mjs";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "../src/claims/session.mjs";
import { encounterExecutionControl } from "../src/encounter/control.mjs";
import { journalEncounterStore } from "../src/integrations/filesystem/services/encounter-store.mjs";
import { journalRpcWitness } from "../src/integrations/filesystem/services/rpc-witness.mjs";
import { admitCapabilityAssertions, readCapabilityAssertions } from "../src/integrations/filesystem/services/capability-assertions.mjs";
import { grantAssertion } from "@red-cup-engineering/feltos/capability";
import { readCapabilityWitnesses } from "@red-cup-engineering/feltos/capability/claims";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { projectSurface } from "../src/presentation/surface.mjs";
import { authorizationFromStanding } from "../src/rpc/dispatch.mjs";
import { operation } from "../src/rpc/operation.mjs";
import { AGENT_WORKER_STAGE_VERBS } from "../src/integrations/agent-worker/service.mjs";

const at = "2026-09-08T12:00:00.000Z";

function admitObligation(root, packageName, cell, text) {
  const observation = claimSessionObservation({
    sessionId: "provider-fixture",
    transport: "claim-session",
    claim: { cell, charge: "unknown" },
    session: { claims: [{ cell, charge: "unknown" }], closed: false },
    judgement: {},
    at: { source: "provider-fixture", item: 1 },
    boundary: { protocol: "metroplat", surface: "work-ledger", operation: "work-ledger-item", role: "obligation", source: "fixture", text, evidence: ["fixture:obligation"] },
    caller: { transport: "fixture" },
  });
  openJournal(root).appendRows(claimSessionFeed.name, claimSessionStatementRows(observation), {
    at, rootName: packageName, subject: "work-ledger", caller: { transport: "fixture" },
  });
  // A `held` duty claim alone is not dispatchable: `stateOfDuty`
  // (`src/work/dispatch.mts`) additionally requires a parsed
  // office-service-allocation marker (`agencyWorkAllocationMarkerOfRow`,
  // `src/work/observations.mts`) on the same relation before it reaches
  // "ready". This writes that exact boundary shape directly (the same one
  // `admitAgencyWorkAllocation` appends in production), independent of that
  // function's own office/character/provider-admission resolution, which is
  // already exercised end-to-end by `test/agency-work-allocation.test.mjs`.
  const assignment = claimSessionObservation({
    sessionId: "provider-fixture",
    transport: "claim-session",
    claim: { cell: `jural:duty:provider-fixture:work:${cell}`, charge: "held" },
    session: { claims: [], closed: false },
    judgement: {},
    at: { source: "provider-fixture", item: 2 },
    boundary: {
      protocol: "metroplat", surface: "work-coordination", operation: "agency-work-allocation-admit",
      role: "office-service-allocation", source: "fixture-allocation", text: "office-service-allocation",
      scope: cell, character: "provider-fixture", office: "office:test", officeService: "office-service:test",
      duty: "duty:test", work: "work:fixture", skill: "fixture-skill", closureKind: "inquiry",
      requiresCapabilities: [], method: "Use the declared fixture method.",
      receiverCondition: "An independent receiver checks the proposal.",
      evidence: ["office:office:test", "office-service:office-service:test", `scope:${cell}`],
    },
    caller: { transport: "fixture" },
  });
  openJournal(root).appendRows(claimSessionFeed.name, claimSessionStatementRows(assignment), {
    at, rootName: packageName, subject: "work-ledger", caller: { transport: "fixture" },
  });
}

function dispatchItem(cell, text, requirements, operations) {
  return Object.freeze({
    agent: "holder-fixture", scope: cell, state: "ready", status: "open",
    structural: { state: "ready", blockers: [] }, coordination: { state: "clear" }, conflicts: [], via: "office",
    passive: "provider-fixture", standing: "held", reasons: [], intent: "intent:fixture", work: "work:fixture",
    skill: "fixture-skill", closureKind: "inquiry", requiresCapabilities: requirements, method: "Use the declared fixture method.",
    receiverCondition: "An independent receiver checks the proposal.", text,
    delegation: { provider: "provider-fixture", authority: "holder-fixture", operations, effects: ["host-read"] },
  });
}

function fixture(root, requirements, turns) {
  const packageName = "@test/agency-work-provider";
  const cell = "work-item:provider-fixture";
  const text = "Produce the bounded fixture proposal.";
  admitObligation(root, packageName, cell, text);
  const double = operation({ verb: "double", run: (input) => ({ value: input.value * 2 }) });
  const operations = Object.freeze([double, ...agentCoordinationOperations({ dataRoot: root, packageRoot: root, rootName: packageName, now: () => at })]);
  const surface = projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)), {
    packageName, capabilityAssertions: () => readCapabilityAssertions(root),
  });
  admitCapabilityAssertions({
    dataRoot: root, rootName: packageName, date: at.slice(0, 10),
    assertions: [...AGENT_WORKER_STAGE_VERBS, ...requirements].map((verb) => grantAssertion("fixture", "provider-fixture", `${packageName}#${verb}`, at)),
  });
  const calls = [];
  let index = 0;
  const source = (call) => ({ async *[Symbol.asyncIterator]() {
    calls.push(call);
    const next = turns[index++];
    yield inferenceSourceTerminal(inferenceResult({
      call: call.id, model: call.model, stop: next.tools.length === 0 ? "completed" : "tool-moves",
      message: inferenceMessage({ role: "assistant", content: next.content, toolMoves: next.tools }), toolMoves: next.tools,
      observedAt: at, causes: [call.id],
    }));
  }});
  const encounters = journalEncounterStore(root, { namespace: packageName, pollIntervalMs: 10 });
  const provider = inferenceProviderOperation("fixture-inference", source, encounters, encounterExecutionControl());
  const inference = witnessedInferenceEncounterPort({
    operation: provider, encounters, witness: journalRpcWitness(root, { namespace: packageName }),
    authorize: authorizationFromStanding(new Map([[provider.ref, "held"]])), now: () => at,
  });
  return { item: dispatchItem(cell, text, requirements, [double.ref]), options: { surface, dataRoot: root, rootName: packageName, workerId: "provider-fixture", provider: "fixture-inference", model: "fixture/model", inference, now: () => at, maxTurns: 2 }, calls };
}

test("provider runs declared catalog tools and returns only a witnessed proposal", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-provider-"));
  try {
    const move = inferenceToolMove({ request: "fixture:double", name: "double", input: { value: 2 } });
    const setup = fixture(root, ["double"], [{ content: null, tools: [move] }, { content: "The tool returned four.", tools: [] }]);
    const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
    assert.equal(outcome.result.kind, "skill-result", JSON.stringify(outcome));
    assert.deepEqual(outcome.result.value.invocationReceipts.length, 1);
    assert.equal(outcome.providerEvidence.length >= 2, true, "inference and tool receipts are retained");
    const prompt = setup.calls[0].messages.find((message) => message.role === "user").content;
    assert.match(prompt, /Use the declared fixture method/u);
    assert.match(prompt, /An independent receiver checks the proposal/u);
    assert.match(prompt, /Produce the bounded fixture proposal/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("capability-free inquiry returns witnessed prose without a meaningless tool call", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-inquiry-"));
  try {
    const setup = fixture(root, [], [{ content: "Inquiry finding for independent review.", tools: [] }]);
    const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
    assert.equal(outcome.result.kind, "skill-result", JSON.stringify(outcome));
    assert.equal(outcome.result.value.output, "Inquiry finding for independent review.");
    assert.deepEqual(outcome.result.value.invocationReceipts, []);
    assert.equal(setup.calls.length, 1);
    assert.deepEqual(setup.calls[0].tools, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("declared and held capabilities may remain unused by a prose inquiry", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-available-capability-"));
  try {
    const setup = fixture(root, ["double"], [{ content: "The method found no need to invoke double.", tools: [] }]);
    const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
    assert.equal(outcome.result.kind, "skill-result", JSON.stringify(outcome));
    assert.deepEqual(outcome.result.value.invocationReceipts, []);
    assert.equal(setup.calls[0].tools.some((tool) => tool.name === "double"), true, "the real held implementation is offered without being mandatory");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a worker other than the allocation's delegated provider cannot execute the holder's duty", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-wrong-provider-"));
  try {
    const setup = fixture(root, [], [{ content: "must not run", tools: [] }]);
    const outcome = await executeAgencyWorkProvider(setup.item, { ...setup.options, workerId: "different-provider" });
    assert.deepEqual(outcome.result, { kind: "skill-error", error: "provider is not the current allocated delegate" });
    assert.equal(setup.calls.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
