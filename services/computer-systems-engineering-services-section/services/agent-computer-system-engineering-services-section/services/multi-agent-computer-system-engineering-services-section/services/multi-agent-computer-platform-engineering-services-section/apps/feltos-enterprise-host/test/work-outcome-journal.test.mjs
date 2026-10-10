import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { enterpriseAgencyWorkOptions } from "../src/agency-work.mjs";
import { outcomeJournal } from "@red-cup-engineering/organizing/enterprise";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { admitAgencyWorkAllocation } from "@red-cup-engineering/feltos/work/agency-work-allocation";
import { workCoordinationOperations } from "@red-cup-engineering/feltos/work/service";
import { admitStructuredWorkIntent } from "@red-cup-engineering/feltos/work/structured-intent";
import { workResultProposalByReceipt } from "@red-cup-engineering/feltos/work/work-result-proposal";
import { workResultReceivingBySession } from "@red-cup-engineering/feltos/work/work-discharge";
import { dispatchReadoutOf, signedActionsOfRoadmap } from "@red-cup-engineering/feltos/work/dispatch-readout";
import { admitSignRoadmap, readSignRoadmap } from "@red-cup-engineering/feltos/work/sign-roadmap-journal";
import { createSignRoadmap } from "@red-cup-engineering/organizing/work/sign-roadmap";
import { modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";
const DATE="2026-09-27";
const fixtureOperation=operation({ verb:"fixture-operation",locus:"duty",run:()=>null });
function intent(requiredCarrier) {
  const provenance = (start) => [{ source: "assignment", start, end: start + 1, unit: "unicode-code-point" }];
  return {
    kind: "metroplat.work.structured-intent", id: "pump-intent", producer: { id: "fixture", revision: "1" },
    sources: [{ id: "assignment", kind: "natural-language-prompt", locator: "test:pump" }],
    items: [
      { cell: "endeavor:pump", text: "Pump", evidence: [], provenance: provenance(0) },
      { cell: "campaign:pump", parent: "endeavor:pump", text: "Pump", evidence: [], provenance: provenance(1) },
      { cell: "project:pump", parent: "campaign:pump", text: "Pump", evidence: [], provenance: provenance(2) },
      { cell: "plan:pump", parent: "project:pump", text: "Pump", evidence: [], provenance: provenance(3) },
      { cell: "task:pump", parent: "plan:pump", text: "Pump", evidence: [], provenance: provenance(4) },
      { cell: "work-item:pump-one", parent: "task:pump", work: "pump-work-one", skill: "pump-skill-one", text: "One", evidence: [], provenance: provenance(5), ...(requiredCarrier === undefined ? {} : { requiredCarrier }) },
      { cell: "work-item:pump-two", parent: "task:pump", work: "pump-work-two", skill: "pump-skill-two", text: "Two", evidence: [], provenance: provenance(6) },
    ],
  };
}

test("the actual host books direct office receiving through the same native outcome callback", async () => {
  for (const decision of ["accepted", "rejected"]) {
  const root = mkdtempSync(path.join(tmpdir(), "agency-work-direct-office-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const admitted = admitStructuredWorkIntent(binding, intent(), { at: DATE });
    const obligationWitness = admitted.obligations.find(entry => entry.scope === "work-item:pump-one").witness;
    const legacy = createSignRoadmap({
      nodes: [
        { key: "demand", kind: "work-item", content: { title: "pump-one", description: "legacy direct allocation", acceptance: "CTO office accepts the result", intendedOutcome: "CTO office accepts the result" } },
        { key: "change", kind: "change", content: { title: "work-item:pump-one", description: "legacy direct allocation", target: "work-item:pump-one", before: "Declared work awaits execution", after: "CTO office accepts the result", acceptance: "CTO office accepts the result" } },
        { key: "action", kind: "action", content: { title: "work-item:pump-one", description: "legacy direct allocation", operation: "agency-work-execute", effect: "execute the original scoped engineering request", acceptance: "the original 4Eir receiver condition remains open until operating evidence" } },
        { key: "resource", kind: "resource", content: { title: "work-item:pump-one", description: "legacy direct allocation", locator: obligationWitness, mediaType: "application/json" } },
        { key: "evidence", kind: "evidence", content: { title: "work-item:pump-one", description: "legacy direct allocation", locator: obligationWitness, excerpt: "Declared pump-work-one via pump-skill-one" } },
      ],
      edges: [
        { from: "change", predicate: "targets", to: "demand", witness: "evidence" },
        { from: "change", predicate: "derives-action", to: "action", witness: "evidence" },
        { from: "action", predicate: "uses-resource", to: "resource", witness: "evidence" },
      ],
    });
    assert.equal(legacy.ok, true);
    admitSignRoadmap(binding, legacy.value, { at: DATE });
    const holder = "fixture:holder-one";
    admitAgencyWorkAllocation(binding, {
      kind: "metroplat.work.agency-work-allocation", id: "direct-allocation-one", subject: admitted.subject,
      office: { id: "fixture#engineering" }, duty: "emsenn/duty/pump-one",
      character: { model: "gpt-6-luna", id: holder, capabilities: ["fixture-operation"] },
      officeService: { id: "emsenn/duty/pump-one", requiredCapabilities: ["fixture-operation"] },
      allocation: { scope: "work-item:pump-one" },
    }, {
      at: DATE,
      resolveModelCharacter: modelCharacterResolverFromProviderAdmissions([{ model: "gpt-6-luna", capabilities: ["fixture-operation"] }]),
      resolveAuthority: () => ({
        office: { id: "fixture#engineering", bearsDuty: ["emsenn/duty/pump-one"], deonticProfile: { "pump-work-one": "duty" } },
        duty: { id: "emsenn/duty/pump-one", work: "pump-work-one", claim: "claim:pump-one", skills: ["pump-skill-one"], delegation: true },
        work: { id: "pump-work-one", needs: ["pump-skill-one"], receiverCondition: "CTO office accepts the result" },
        skill: { id: "pump-skill-one", closureKind: "procedure", requiresCapabilities: ["fixture-operation"], method: "perform one" },
        officeService: { id: "emsenn/duty/pump-one", requiredCapabilities: ["fixture-operation"] },
      }),
    });
    const historicalAction = signedActionsOfRoadmap(readSignRoadmap(binding, DATE)).get("work-item:pump-one");
    assert.equal(historicalAction.operation, "agency-work-execute", "the original signed Action remains immutable history");
    const dispatched = dispatchReadoutOf(binding, DATE).dispatch.queue.find(item => item.scope === "work-item:pump-one");
    assert.equal(dispatched.state, "ready", "a qualified direct allocation can use the same scoped, resourced historical Action");
    const effectiveAction = dispatched.signedAction;
    assert.equal(effectiveAction.operation, "agency-work-propose");
    assert.equal(effectiveAction.effect, historicalAction.effect, "the Action's original effect is not rewritten to the office method");
    assert.equal(effectiveAction.acceptance, historicalAction.acceptance, "the Action's original acceptance condition remains intact");
    assert.notEqual(effectiveAction.id, historicalAction.id, "a route correction has its own content address");
    assert.equal(effectiveAction.routeBinding.sourceAction, historicalAction.id);
    assert.deepEqual(effectiveAction.routeBinding.sourceSignedAction, historicalAction);
    assert.equal(effectiveAction.routeBinding.purpose, "dispatch-readiness");
    assert.equal(effectiveAction.routeBinding.method, "perform one", "the route carries the actual allocated office method independently");
    assert.equal(effectiveAction.routeBinding.receiverCondition, "CTO office accepts the result");
    assert.equal(effectiveAction.routeBinding.allocation.id, "direct-allocation-one");
    assert.equal(effectiveAction.routeBinding.allocation.holder, holder);
    assert.equal(effectiveAction.routeBinding.allocation.office, "fixture#engineering");
    assert.equal(Object.hasOwn(effectiveAction.routeBinding.allocation, "session"), false, "the route never substitutes allocation identity for session qualification");
    let carrier = { session: "luna-session-one", model: "gpt-6-luna" };
    const host = enterpriseAgencyWorkOptions({ identity: { id: "fixture:host" }, dataRoot: root, environment: {}, processConfig: {}, operationOf: () => undefined, operationSurface: () => ({ operations: [] }) });
    assert.equal(typeof host.onWorkDischarged, "function");
    assert.equal(host.onAcceptedWork, undefined);
    assert.equal(host.agencyWorkPumpMaxPerTick, 32);
    const discharged = [];
    const ops = workCoordinationOperations(binding, {
      onWorkDischarged: async (outcome) => { discharged.push(outcome); await host.onWorkDischarged(outcome); },
      resolveHarnessSession: () => carrier,
      resolveOfficeSession: (_actor, _office, session) => session === carrier.session ? carrier : undefined,
      authorizeWorkDischargeReceiver: (request) => ({
        evaluation: { allowed: true, kind: "fixture-office-authority", snapshotRevision: "fixture", evidenceRefs: ["office:fixture#cto"] },
        office: request.office,
        session: request.session,
        model: request.model,
        invocation: request.invocation,
      }),
    });
    const verb = (name) => ops.find((candidate) => candidate.verb === name);
    const result = { kind: "skill-result", value: { changed: true } };
    const proposal = await verb("agency-work-propose").execute({ scope: "work-item:pump-one", session: "luna-session-one", result, revision: "GPT-6 Luna High", evidence: ["verification:direct-office"] }, {}, {
      invocation: { id: "luna-invocation-one", subject: holder }, startedAt: `${DATE}T12:00:00.000Z`,
    });
    const recorded = workResultProposalByReceipt(binding, proposal.receipt, admitted.subject);
    assert.deepEqual(recorded.origin, { kind: "office-service", office: "fixture#engineering", session: "luna-session-one", model: "gpt-6-luna", invocation: "luna-invocation-one" });
    assert.equal(recorded.producer.id, holder);
    assert.ok(recorded.allocationAuthorization.evidence.includes("office:fixture#engineering"));
    assert.ok(recorded.providerEvidence.includes("harness-session:luna-session-one"));
    assert.ok(recorded.providerEvidence.includes("harness-model:gpt-6-luna"));

    const discharge = {
      kind: "metroplat.work.discharge", id: "direct-receipt-one", subject: admitted.subject, decision,
      text: "The CTO office reviewed the witnessed result.", resultReceipt: proposal.receipt,
      receiver: { id: holder, office: "fixture#cto", session: "sol-session-two", evidence: ["review:direct-office"] }, evidence: ["verification:direct-office"],
    };
    const dischargeOperation = verb("work-discharge-admit");
    await assert.rejects(dischargeOperation.execute(discharge, {}, {
      invocation: { id: "sol-invocation-two", subject: holder }, operation: dischargeOperation, startedAt: `${DATE}T13:00:00.000Z`,
    }), /distinct authorized office and session/u);
    assert.equal(discharged.length, 0, "refused authority never reaches the outcome journal");
    assert.equal(outcomeJournal(root).read().length, 0);
    carrier = { session: "sol-session-two", model: "gpt-6-sol" };
    await dischargeOperation.execute(discharge, {}, {
      invocation: { id: "sol-invocation-two", subject: holder }, operation: dischargeOperation, startedAt: `${DATE}T13:00:00.000Z`,
    });
    const received = workResultReceivingBySession(binding, recorded, {
      id: holder, office: "fixture#cto", session: "sol-session-two",
    });
    assert.equal(received.proposalReceipt, proposal.receipt);
    assert.equal(received.decision, decision);
    assert.equal(received.office, "fixture#cto");
    assert.equal(received.session, "sol-session-two");
    assert.equal(received.model, "gpt-6-sol");
    assert.equal(discharged.length, 1);
    assert.equal(discharged[0].proposal.receipt, proposal.receipt);
    assert.equal(discharged[0].office, "fixture#cto");
    assert.equal(discharged[0].at, `${DATE}T13:00:00.000Z`);
    assert.equal(discharged[0].discharge.decision, decision);
    const booked = outcomeJournal(root).read();
    assert.equal(booked.length, 1);
    assert.equal(booked[0].delivery, proposal.receipt);
    assert.equal(booked[0].provider, "fixture#engineering");
    assert.equal(booked[0].judge, "fixture#cto");
    assert.equal(booked[0].verdict, decision);
    assert.equal(booked[0].carrier, "gpt-6-luna");
    assert.equal(booked[0].player.hand, "luna-session-one");
    assert.ok(booked[0].evidence.includes("verification:direct-office"));
    if (decision === "rejected") assert.notEqual(dispatchReadoutOf(binding, DATE).dispatch.queue.find(item => item.scope === "work-item:pump-one").status, "discharged");
  } finally { rmSync(root, { recursive: true, force: true }); }
  }
});
