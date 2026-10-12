import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { undischargedWorkLedgerObligations } from "@red-cup-engineering/feltos/agents/worker";
import { executeAgencyWorkProvider } from "@red-cup-engineering/feltos/work/agency-work-provider";
import { inferenceMessage, inferenceResult, inferenceToolMove } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { inferenceSourceTerminal } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-source-kind";
import { capabilityWitnessesForOperations } from "@red-cup-engineering/feltos/agents/capability-witnesses";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";
import { journalEncounterStore } from "@red-cup-engineering/feltos/encounter/store";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { grantAssertion, revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { readCapabilityWitnesses } from "@red-cup-engineering/computer-system-engine/rpc/capability-claims";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const at = "2026-09-08T12:00:00.000Z";

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

function fixture(root, requirements, turns, { capabilityRoot = root, grants = requirements, onCall } = {}) {
  const packageName = "@test/agency-work-provider";
  const cell = "work-item:provider-fixture";
  const text = "Produce the bounded fixture proposal.";
  const toolEffects = [];
  const double = operation({ verb: "double", run: (input) => { toolEffects.push(input); return { value: input.value * 2 }; } });
  const operations = Object.freeze([double]);
  const surface = projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)), {
    packageName, capabilityAssertions: () => readCapabilityAssertions(capabilityRoot),
  });
  admitCapabilityAssertions({
    dataRoot: capabilityRoot, rootName: packageName, date: at.slice(0, 10),
    assertions: grants.map((verb) => grantAssertion("fixture", "provider-fixture", `${packageName}#${verb}`, at)),
  });
  const calls = [];
  let index = 0;
  const source = (call) => ({ async *[Symbol.asyncIterator]() {
    calls.push(call);
    onCall?.(call);
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
  return { item: dispatchItem(cell, text, requirements, [double.ref]), options: { surface, dataRoot: root, ...(capabilityRoot === root ? {} : { capabilityDataRoot: capabilityRoot }), rootName: packageName, workerId: "provider-fixture", provider: "fixture-inference", model: "fixture/model", inference, now: () => at, maxTurns: 2 }, calls, toolEffects };
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
    assert.match(prompt, /holder-fixture/u);
    assert.equal(setup.options.surface.operations.some((operation) => operation.verb === "agent-context-image"), false);
    assert.equal(undischargedWorkLedgerObligations(root, at.slice(0, 10)).length, 0, "allocated execution does not create a duplicate work-ledger obligation");
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


test("an unoffered tool in a proposed turn refuses the whole turn before any effect", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-unoffered-tool-"));
  try {
    const setup = fixture(root, ["double"], [{ content: null, tools: [
      inferenceToolMove({ request: "fixture:allowed", name: "double", input: { value: 2 } }),
      inferenceToolMove({ request: "fixture:unoffered", name: "unoffered", input: {} }),
    ] }]);
    const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
    assert.equal(outcome.result.kind, "skill-error");
    assert.match(outcome.result.error, /unoffered tool/u);
    assert.equal(setup.calls.length, 1);
    assert.deepEqual(setup.toolEffects, [], "even the valid first move was not executed");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// The host owns authority; an enterprise owns its work/RPC evidence. Neither root
// grants capabilities to the other merely because an allocation refers to it.
test("enterprise work uses host-held tools and feeds their real receipts into the next inference turn", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-two-roots-"));
  const workRoot = path.join(root, "enterprise"), nodeRoot = path.join(root, "node");
  try {
    const move = inferenceToolMove({ request: "fixture:two-roots", name: "double", input: { value: 2 } });
    const setup = fixture(workRoot, ["double"], [{ content: null, tools: [move] }, { content: "The host tool returned four.", tools: [] }], { capabilityRoot: nodeRoot });
    assert.deepEqual(readCapabilityAssertions(workRoot), [], "the enterprise has no copied capability grant");
    const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
    assert.equal(outcome.result.kind, "skill-result", JSON.stringify(outcome));
    assert.deepEqual(setup.toolEffects, [{ value: 2 }]);
    assert.equal(setup.calls.length, 2);
    assert.equal(outcome.result.value.invocationReceipts.length, 1);
    const tool = setup.calls[1].messages.find(message => message.role === "tool");
    const returned = JSON.parse(tool.content);
    assert.equal(returned.ok, true);
    assert.deepEqual(returned.value, { value: 4 });
    assert.equal(returned.receipt, outcome.result.value.invocationReceipts[0]);
    assert.ok(outcome.providerEvidence.includes(returned.receipt));
    assert.deepEqual(readCapabilityAssertions(workRoot), [], "execution never creates a standing grant in work custody");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const authority of ["absent", "revoked", "foreign-work-root", "foreign-worker"]) {
  test(`two-root execution refuses a tool with ${authority} host authority`, async () => {
    const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-root-refusal-"));
    const workRoot = path.join(root, "enterprise"), nodeRoot = path.join(root, "node");
    try {
      const move = inferenceToolMove({ request: `fixture:${authority}`, name: "double", input: { value: 2 } });
      const setup = fixture(workRoot, ["double"], [{ content: null, tools: [move] }, { content: "A refused tool establishes no completed proof.", tools: [] }], {
        capabilityRoot: nodeRoot, grants: authority === "revoked" ? ["double"] : [],
      });
      const grant = "@test/agency-work-provider#double";
      if (authority !== "absent") {
        const dataRoot = authority === "foreign-work-root" ? workRoot : nodeRoot;
        const assertion = authority === "revoked"
          ? revokeAssertion("fixture", "provider-fixture", grant, at)
          : grantAssertion("fixture", authority === "foreign-worker" ? "different-provider" : "provider-fixture", grant, at);
        admitCapabilityAssertions({ dataRoot, rootName: "@test/agency-work-provider", date: at.slice(0, 10), assertions: [assertion] });
      }
      const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
      assert.equal(outcome.result.kind, "skill-error");
      assert.match(outcome.result.error, /unoffered tool/u);
      assert.deepEqual(setup.calls[0].tools, []);
      assert.deepEqual(setup.toolEffects, []);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

for (const delegation of ["absent", "foreign-provider", "undelegated-operation"]) {
  test(`host-held tools do not override ${delegation} delegation`, async () => {
    const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-delegation-refusal-"));
    try {
      const move = inferenceToolMove({ request: `fixture:${delegation}`, name: "double", input: { value: 2 } });
      const setup = fixture(path.join(root, "enterprise"), ["double"], [{ content: null, tools: [move] }], { capabilityRoot: path.join(root, "node") });
      const item = { ...setup.item, delegation: delegation === "absent" ? undefined : {
        ...setup.item.delegation,
        ...(delegation === "foreign-provider" ? { provider: "different-provider" } : { operations: [] }),
      } };
      const outcome = await executeAgencyWorkProvider(item, setup.options);
      assert.equal(outcome.result.kind, "skill-error");
      assert.deepEqual(setup.toolEffects, []);
      if (delegation === "undelegated-operation") {
        assert.equal(setup.calls.length, 1);
        assert.deepEqual(setup.calls[0].tools, []);
        assert.match(outcome.result.error, /unoffered tool/u);
      } else {
        assert.equal(setup.calls.length, 0);
        assert.equal(outcome.result.error, "provider is not the current allocated delegate");
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

test("the real host authorizer refuses a grant revoked after the two-root tool offer", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-revoked-after-offer-"));
  const workRoot = path.join(root, "enterprise"), nodeRoot = path.join(root, "node");
  try {
    const move = inferenceToolMove({ request: "fixture:revoked-after-offer", name: "double", input: { value: 2 } });
    let calls = 0, offered = false;
    const setup = fixture(workRoot, ["double"], [{ content: null, tools: [move] }, { content: "The tool was refused; the proof remains unperformed.", tools: [] }], {
      capabilityRoot: nodeRoot,
      onCall: call => {
        if (calls++ !== 0) return;
        offered = call.tools.some(tool => tool.name === "double");
        admitCapabilityAssertions({ dataRoot: nodeRoot, rootName: "@test/agency-work-provider", date: at.slice(0, 10),
          assertions: [revokeAssertion("fixture", "provider-fixture", "@test/agency-work-provider#double", at)] });
      },
    });
    const outcome = await executeAgencyWorkProvider(setup.item, setup.options);
    assert.equal(offered, true, "the held tool was offered before its grant was revoked");
    assert.deepEqual(setup.toolEffects, []);
    assert.equal(setup.calls.length, 2);
    const returned = JSON.parse(setup.calls[1].messages.find(message => message.role === "tool").content);
    assert.equal(returned.ok, false, "dispatch must re-read the host's revoked standing");
    assert.deepEqual(outcome.result.value.invocationReceipts, [], "a refused invocation is not successful tool evidence");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
