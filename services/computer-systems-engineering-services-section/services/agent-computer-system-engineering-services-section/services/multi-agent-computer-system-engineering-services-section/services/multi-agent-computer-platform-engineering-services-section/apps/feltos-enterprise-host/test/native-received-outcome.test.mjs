import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { admitRows, CLAIM_SESSION } from "./support/claim-session-thread.mjs";

/** A subject's revision: the frontier of its thread (equal frontiers are equal readings). */
const revisionOfSubject = (root, subject) => JSON.stringify(readHead(root, CLAIM_SESSION, subject)?.frontier ?? []);
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "@red-cup-engineering/relating/running/session";
import { obsticulationDischargeObservations } from "@red-cup-engineering/organizing/work/obligations";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { proposalResources } from "@red-cup-engineering/organizing/enterprise/resources";
import { recordReceivedOutcome, receivedOutcomeFields } from "../src/receiver-independence.mjs";
import { skillSuccess, skillError } from "@red-cup-engineering/animating/becoming/doing/working/governing/skill";
import { workResultFromSkillResult, typedResultOf, workResultSkillContext } from "@red-cup-engineering/organizing/work/schema";
import { outcomeJournal, outcomeOf, standingOf, acceptanceReadoutOf } from "@red-cup-engineering/organizing/enterprise/outcomes";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { admitAgencyWorkAllocation } from "@red-cup-engineering/feltos/work/agency-work-allocation";
import { workCoordinationOperations } from "@red-cup-engineering/feltos/work/service";
import { admitStructuredWorkIntent } from "@red-cup-engineering/feltos/work/structured-intent";
import { workResultProposalByReceipt } from "@red-cup-engineering/feltos/work/work-result-proposal";
import { workResultReceivingBySession, workResultReceivingByDischarge, resolveWorkDischarge } from "@red-cup-engineering/feltos/work/work-discharge";
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

const reports = () => [
  { kind: "skill-result", value: { legacy: true } }, { kind: "skill-error", error: "legacy failure" },
  workResultFromSkillResult(skillSuccess({ changed: true })),
  workResultFromSkillResult(skillError("Unresolvable", "Missing evidence", "inspect source", "obtain witness")),
  typedResultOf({ type: "integer" }, workResultFromSkillResult(skillSuccess("wrong"))),
];

function coldReplay(root, discharge, at) {
  const script = `
    import { defaultFilesystemBinding } from ${JSON.stringify(import.meta.resolve("@red-cup-engineering/computer-system-engine/rpc/binding"))};
    import { workCoordinationOperations } from ${JSON.stringify(import.meta.resolve("@red-cup-engineering/feltos/work/service"))};
    import { outcomeJournal } from ${JSON.stringify(import.meta.resolve("@red-cup-engineering/organizing/enterprise/outcomes"))};
    import { recordReceivedOutcome } from ${JSON.stringify(new URL("../src/receiver-independence.mjs", import.meta.url).href)};
    const root = ${JSON.stringify(root)}, input = ${JSON.stringify(discharge)}, at = ${JSON.stringify(at)};
    let callbackAt;
    const binding = defaultFilesystemBinding(root, { now: () => at });
    const operation = workCoordinationOperations(binding, {
      resolveHarnessSession: () => ({ session: input.receiver.session, model: "gpt-6-sol" }),
      authorizeWorkDischargeReceiver: request => ({ ...request,
        evaluation: { allowed: true, kind: "fixture-office-authority", snapshotRevision: "fixture", evidenceRefs: ["office:fixture#cto"] } }),
      onWorkDischarged: value => { callbackAt = value.at; recordReceivedOutcome({ dataRoot: root, ...value }); },
    }).find(operation => operation.verb === "work-discharge-admit");
    const admission = await operation.execute(input, {}, { invocation: { id: "cold-retry-" + at, subject: input.receiver.id }, operation, startedAt: at });
    console.log(JSON.stringify({ admission, callbackAt, outcomes: outcomeJournal(root).read() }));
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8", env: { PATH: process.env.PATH, HOME: tmpdir() }, timeout: 15_000,
  });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}

// Historical fixture uses the genuine journal/feed APIs and the prior immutable row shape.
function admitLegacyReceiving(binding, proposal, discharge, options = {}) {
  const at = options.at ?? DATE;
  const invocation = Object.hasOwn(options, "invocation") ? options.invocation : "original-legacy-invocation";
  const resolved = resolveWorkDischarge(binding, discharge);
  const native = workResultSkillContext(proposal.result);
  const boundary = { protocol: "metroplat", surface: "work-ledger", operation: "work-discharge-admit", role: "receiver-authorization",
    decision: discharge.decision, ...(discharge.decision === "rejected" ? { reason: discharge.text } : {}),
    proposalReceipt: proposal.receipt, receiver: discharge.receiver.id, receiverOffice: discharge.receiver.office,
    receiverSession: discharge.receiver.session, receiverModel: "gpt-6-sol",
    ...(invocation === undefined ? {} : { receiverInvocation: invocation }),
    ...(options.receivesFrom === undefined ? {} : { receivesFrom: options.receivesFrom }),
    evaluation: { allowed: true, kind: "fixture-office-authority", snapshotRevision: "fixture", evidenceRefs: ["office:fixture#cto"] },
  };
  const observation = claimSessionObservation({ sessionId: `work-discharge-${discharge.id}`, transport: "claim-session",
    claim: { cell: proposal.scope, reading: "unknown" }, session: { claims: [], closed: false }, judgement: {},
    at: { source: `work-discharge:${discharge.id}`, item: 99 }, boundary,
    caller: { protocol: "metroplat", session: `work-discharge-${discharge.id}`, surface: "work-ledger" },
  });
  // This is the complete historical production evidence order, including the
  // authorization-specific fields. A minimal settlement fixture cannot test pairing.
  const evidence = [
    `discharge:${discharge.id}`, `intent:${resolved.intent}`, `producer:${proposal.producer.id}`, `producer-revision:${proposal.producer.revision}`,
    `result-receipt:${proposal.receipt}`, `receiver:${discharge.receiver.id}`, `receiver-office:${discharge.receiver.office}`,
    `receiver-session:${discharge.receiver.session}`, "receiver-model:gpt-6-sol", ...(invocation === undefined ? [] : [`receiver-invocation:${invocation}`]),
    "receiver-authority:fixture-office-authority", "receiver-authority-revision:fixture", `skill-outcome:${proposal.result.kind}`,
    ...(native === undefined ? [] : [`native-skill-routing:${native.routing}`, `native-skill-reading:${native.reading}`,
      ...(native.errorClass === undefined ? [] : [`native-skill-error-class:${native.errorClass}`])]),
    ...discharge.receiver.evidence, "office:fixture#cto",
  ];
  const fulfilled = discharge.decision === "accepted" && proposal.result.kind === "skill-result"
    ? obsticulationDischargeObservations([{ cell: proposal.scope, text: discharge.text, evidence: [...discharge.evidence, ...discharge.receiver.evidence] }], {
      source: `work-discharge:${discharge.id}`, settlementToken: semanticId(resolved), sessionId: `work-discharge-${discharge.id}`, evidence,
    }) : [claimSessionObservation({ sessionId: `work-discharge-${discharge.id}`, transport: "claim-session",
      claim: { cell: proposal.scope, reading: "unknown" }, session: { claims: [], closed: false }, judgement: {},
      at: { source: `work-discharge:${discharge.id}`, item: 1 },
      boundary: { protocol: "metroplat", surface: "work-ledger", operation: "work-discharge-admit",
        role: discharge.decision === "accepted" ? "skill-error" : "result-rejected", source: `work-discharge:${discharge.id}`, text: discharge.text,
        evidence: [...discharge.evidence, ...evidence,
          discharge.decision === "accepted" ? `skill-error:${proposal.result.error}` : `result-rejected:${discharge.text}`],
      }, caller: { protocol: "metroplat", session: `work-discharge-${discharge.id}`, surface: "work-ledger" },
    })];
  admitRows(binding.dataRoot, proposal.subject, [observation, ...fulfilled].flatMap(claimSessionStatementRows), { causes: [proposal.receipt] });
}

async function receivingFixture({ result, decision, failFirst = false, legacyReceiving = false, historicalOutcome, reviewCase }) {
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
    const discharged = [];
    const ops = workCoordinationOperations(binding, {
      onWorkDischarged: async (outcome) => { discharged.push(outcome); if (failFirst && discharged.length === 1) throw new Error("fixture first derived recording failed"); recordReceivedOutcome({ dataRoot: root, ...outcome }); },
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
    const proposal = await verb("agency-work-propose").execute({ scope: "work-item:pump-one", session: "luna-session-one", result, revision: "GPT-6 Luna High", evidence: ["verification:direct-office", 'codex-usage:{"input_tokens":4}'] }, {}, {
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
    if (reviewCase) {
      const call = async (value, clock) => dischargeOperation.execute(value, {}, {
        invocation: { id: "independent-review-" + clock, subject: holder }, operation: dischargeOperation, startedAt: clock.length === 2 ? `${DATE}T${clock}:00:00.000Z` : clock,
      });
      if (reviewCase.startsWith("legacy-unkeyed-same-day-")) {
        const exact = value => workResultReceivingByDischarge(binding, recorded, resolveWorkDischarge(binding, value));
        admitLegacyReceiving(binding, recorded, discharge);
        const first = exact(discharge);
        const original = outcomeOf({ ...receivedOutcomeFields({ proposal: recorded, discharge, office: "fixture#cto", at: `${DATE}T13:00:00Z` }), resources: proposalResources(recorded) });
        outcomeJournal(root).record(original);
        await call(discharge, "2026-09-30T15:00:00Z");
        assert.deepEqual(outcomeJournal(root).read(), [original], "unique historical replay preserves the exact original row");
        const unique = reviewCase.endsWith("distinct-evidence");
        const revised = { ...discharge, id: "same-day-distinct-act",
          ...(unique ? { evidence: ["verification:distinct-act"] } : {}),
          ...(reviewCase.endsWith("receiver-evidence") ? { receiver: { ...discharge.receiver, evidence: ["receiver:new-evidence"] } } : {}),
        };
        admitLegacyReceiving(binding, recorded, revised, { invocation: "same-day-second-invocation" });
        const second = exact(revised);
        assert.notEqual(first.receipt, second.receipt);
        const revision = revisionOfSubject(root, recorded.subject);
        const record = value => recordReceivedOutcome({ dataRoot: root, proposal: recorded,
          discharge: resolveWorkDischarge(binding, value), office: "fixture#cto" });
        if (unique) {
          record(revised);
          assert.equal(record(discharge), 0, "distinct evidence keeps the original outcome uniquely attributable");
          assert.deepEqual(outcomeJournal(root).read().find(row => row.id === original.id), original);
          assert.equal(outcomeJournal(root).read().length, 2);
          assert.ok(outcomeJournal(root).read().some(row => row.receivingReceipt === second.receipt));
        } else {
          assert.throws(() => record(revised), /ambiguous historical outcome-to-receiving pairing/u);
          assert.throws(() => record(discharge), /ambiguous historical outcome-to-receiving pairing/u);
          assert.deepEqual(outcomeJournal(root).read(), [original], "ambiguity neither rewrites history nor fabricates a new outcome");
        }
        assert.equal(revisionOfSubject(root, recorded.subject), revision);
      } else if (reviewCase.startsWith("legacy-shared-context-")) {
        const exact = value => workResultReceivingByDischarge(binding, recorded, resolveWorkDischarge(binding, value));
        const invocation = reviewCase.endsWith("absent") ? undefined : "historical-reused-invocation";
        admitLegacyReceiving(binding, recorded, discharge, { at: DATE, invocation });
        const first = exact(discharge);
        await call(discharge, "2026-09-27T13:00:00Z");
        const second = { ...discharge, id: "intervening-B", decision: "rejected", text: "New inspection rejects the result." };
        await call(second, "2026-09-28T13:00:00Z");
        const revised = { ...discharge, receiver: { ...discharge.receiver, evidence: ["review:later-new-witness"] } };
        admitLegacyReceiving(binding, recorded, revised, { at: "2026-09-29", invocation });
        const third = exact(revised);
        assert.notEqual(third.receipt, first.receipt, "full companion identity distinguishes judgments sharing an authorization");
        assert.equal(third.authorizationReceipt, first.authorizationReceipt, "shared authorization remains separately attributable");
        assert.equal(third.at, "2026-09-29T00:00:00.000Z");
        const revision = revisionOfSubject(root, recorded.subject);
        const cold = coldReplay(root, revised, "2026-10-01T15:00:00Z");
        assert.equal(cold.admission.status, "already-admitted");
        assert.equal(cold.callbackAt, third.at);
        assert.equal(cold.outcomes.length, 3);
        assert.equal(cold.outcomes.at(-1).receivingReceipt, third.receipt);
        assert.equal(cold.outcomes.at(-1).receivingAuthorizationReceipt, first.authorizationReceipt);
        assert.equal(standingOf(cold.outcomes).get("gpt-6-luna").accepted, result.kind === "skill-result" ? 1 : 0);
        assert.equal(revisionOfSubject(root, recorded.subject), revision);
        assert.equal(workResultReceivingBySession(binding, recorded, discharge.receiver).receipt, third.receipt);
        assert.equal(exact(discharge).receipt, first.receipt);
        admitLegacyReceiving(binding, recorded, revised, { at: "2026-10-02", invocation });
        assert.equal(exact(revised).receipt, third.receipt, "an exact duplicate companion keeps its original identity");
        assert.equal(exact(revised).at, third.at, "duplicating an exact companion on a later day cannot move its accounting period");
        assert.equal(workResultReceivingBySession(binding, recorded, discharge.receiver).receipt, third.receipt);
        await call(revised, "2026-10-03T15:00:00Z");
        assert.deepEqual(outcomeJournal(root).read(), cold.outcomes);
      } else if (reviewCase === "legacy-ambiguous-pair") {
        // receivesFrom was optional and was not copied into the old companion.
        // Distinct valid authorizations can consequently have indistinguishable
        // companion context. Do not select one by traversal order or retry time.
        admitLegacyReceiving(binding, recorded, discharge, { at: DATE, invocation: undefined });
        admitLegacyReceiving(binding, recorded, discharge, { at: "2026-09-28", invocation: undefined, receivesFrom: ["fixture#engineering"] });
        const revision = revisionOfSubject(root, recorded.subject);
        const lookup = () => workResultReceivingByDischarge(binding, recorded, resolveWorkDischarge(binding, discharge));
        assert.throws(lookup, /ambiguous historical receiving authorization pairing/u);
        assert.throws(() => workResultReceivingBySession(binding, recorded, discharge.receiver), /ambiguous historical receiving authorization pairing/u);
        await assert.rejects(call(discharge, "2026-09-30T15:00:00Z"), /ambiguous historical receiving authorization pairing/u);
        assert.equal(revisionOfSubject(root, recorded.subject), revision);
        assert.deepEqual(outcomeJournal(root).read(), []);
        assert.equal(discharged.length, 0, "ambiguous provenance must not publish a derived outcome");
      } else if (reviewCase === "legacy-authorization-pair") {
        const exact = value => workResultReceivingByDischarge(binding, recorded, resolveWorkDischarge(binding, value));
        admitLegacyReceiving(binding, recorded, discharge, { at: DATE, invocation: "historical-first-invocation" });
        const first = exact(discharge);
        const revised = { ...discharge, text: "A newly evidenced historical judgment", evidence: ["historical:revision-two"] };
        admitLegacyReceiving(binding, recorded, revised, { at: "2026-09-28", invocation: "historical-second-invocation" });
        const second = exact(revised);
        assert.notEqual(second.receipt, first.receipt, "the revised companion belongs to its own original authorization");
        assert.equal(second.at, "2026-09-28T00:00:00.000Z");
        assert.equal(exact(discharge).receipt, first.receipt, "later admission does not replace the original exact witness");
        assert.equal(exact(discharge).at, `${DATE}T00:00:00.000Z`);
        await call(revised, "2026-09-30T15:00:00Z");
        assert.equal(outcomeJournal(root).read()[0].at, second.at);
        assert.equal(outcomeJournal(root).read()[0].receivingReceipt, second.receipt);
      } else if (reviewCase === "legacy-evidence-subset") {
        admitLegacyReceiving(binding, recorded, discharge);
        const resolved = resolveWorkDischarge(binding, discharge);
        const changed = { ...resolved, evidence: [], receiver: { ...resolved.receiver, evidence: [] } };
        const matched = workResultReceivingByDischarge(binding, recorded, changed);
        assert.equal(matched, undefined, "removing original evidence is a changed receiving judgment, not an exact replay");
      } else if (reviewCase === "historical-ABA" || reviewCase === "historical-AA") {
        admitLegacyReceiving(binding, recorded, discharge);
        const first = outcomeOf({ ...receivedOutcomeFields({ proposal: recorded, discharge, office: "fixture#cto", at: `${DATE}T13:00:00.000Z` }), resources: proposalResources(recorded) });
        outcomeJournal(root).record(first);
        await call(discharge, reviewCase === "session-fractional" ? `${DATE}T13:00:00Z` : "13");
        const second = { ...discharge, id: "independent-review-B", decision: "rejected", text: "New inspection rejects the result." };
        if (reviewCase === "historical-ABA") await call(second, "14");
        const third = { ...discharge, id: "independent-review-A2" };
        await call(third, "15");
        const thirdWitness = workResultReceivingByDischarge(binding, recorded, resolveWorkDischarge(binding, third));
        const outcomes = outcomeJournal(root).read();
        assert.equal(outcomes.length, reviewCase === "historical-ABA" ? 3 : 2, "a new A receiving after B must be recorded even when an old A lacks receivingReceipt");
        assert.equal(standingOf(outcomes).get("gpt-6-luna").accepted, result.kind === "skill-result" ? 1 : 0);
        assert.equal(outcomes.at(-1).receivingReceipt, thirdWitness.receipt);
        await call(discharge, "2026-09-30T16:00:00Z");
        assert.deepEqual(outcomeJournal(root).read(), outcomes, "a delayed retry of original A does not resurrect it or duplicate its historical row");
        const latest = workResultReceivingBySession(binding, recorded, discharge.receiver);
        assert.equal(latest.receipt, thirdWitness.receipt, "replaying original A does not replace the session's current A2");
      } else if (reviewCase === "session-current-judgment" || reviewCase === "session-fractional") {
        await call(discharge, reviewCase === "session-fractional" ? `${DATE}T13:00:00Z` : "13");
        const second = { ...discharge, id: "independent-review-B", decision: "rejected", text: "New inspection rejects the result." };
        await call(second, reviewCase === "session-fractional" ? `${DATE}T13:00:00.001Z` : "14");
        const exact = workResultReceivingByDischarge(binding, recorded, resolveWorkDischarge(binding, second));
        const session = workResultReceivingBySession(binding, recorded, { id: holder, office: "fixture#cto", session: "sol-session-two" });
        assert.equal(session.receipt, exact.receipt);
        assert.equal(session.decision, "rejected", "the hosted session result must not return an earlier accepted act after admitting a rejection");
      }
      return;
    }
    if (legacyReceiving) {
      admitLegacyReceiving(binding, recorded, discharge);
      const resolved = resolveWorkDischarge(binding, discharge);
      assert.ok(workResultReceivingByDischarge(binding, recorded, resolved));
      assert.equal(workResultReceivingByDischarge(binding, recorded, { ...resolved, text: "A different judgment under the same caller id" }), undefined);
      assert.equal(workResultReceivingByDischarge(binding, recorded, { ...resolved, evidence: [...resolved.evidence, "new-evidence"] }), undefined);
      assert.equal(workResultReceivingByDischarge(binding, recorded, { ...resolved, evidence: [] }), undefined);
      assert.equal(workResultReceivingByDischarge(binding, recorded, { ...resolved, receiver: { ...resolved.receiver, evidence: [] } }), undefined);
    }
    let historical;
    if (historicalOutcome) {
      const fields = receivedOutcomeFields({ proposal: recorded, discharge, office: "fixture#cto", at: `${DATE}T13:00:00.000Z` });
      if (historicalOutcome === "untyped") delete fields.reportedResult;
      historical = outcomeOf({ ...fields, resources: proposalResources(recorded) });
      outcomeJournal(root).record(historical);
    }
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
    const originalAt = legacyReceiving ? `${DATE}T00:00:00.000Z` : `${DATE}T13:00:00.000Z`;
    assert.equal(discharged[0].at, originalAt);
    assert.equal(discharged[0].discharge.decision, decision);
    assert.equal(outcomeJournal(root).read().length, historicalOutcome || !failFirst ? 1 : 0);
    const revision = revisionOfSubject(root, recorded.subject);
    for (const retryAt of [`${DATE}T14:00:00.000Z`, "2026-09-29T16:00:00.000Z"]) {
      const cold = coldReplay(root, discharge, retryAt);
      assert.equal(cold.admission.status, "already-admitted");
      assert.equal(cold.callbackAt, originalAt);
      assert.equal(cold.outcomes.length, 1);
      assert.equal(cold.outcomes[0].at, historical?.at ?? originalAt);
      assert.equal(revisionOfSubject(root, recorded.subject), revision, "cold receiving replay appends no later authorization or discharge");
    }
    const booked = outcomeJournal(root).read();
    if (historical) assert.deepEqual(booked, [historical], "historical outcome bytes and original time stay unchanged");
    else {
      assert.equal(booked[0].receivingReceipt, received.receipt);
      assert.equal(booked[0].atPrecision, legacyReceiving ? "day" : undefined);
    }
    assert.equal(outcomeJournal(root).read({ from: "2026-09-29T00:00:00Z", to: "2026-09-30T00:00:00Z" }).length, 0);
    assert.equal(booked.length, 1);
    assert.equal(booked[0].delivery, proposal.receipt);
    assert.equal(booked[0].provider, "fixture#engineering");
    assert.equal(booked[0].judge, "fixture#cto");
    assert.equal(booked[0].verdict, decision);
    if (historicalOutcome === "untyped") assert.equal(booked[0].reportedResult, undefined);
    else assert.deepEqual(booked[0].reportedResult, result);
    const succeeded = result.kind === "skill-result" && decision === "accepted";
    assert.deepEqual(standingOf(booked).get("gpt-6-luna"), { accepted: succeeded ? 1 : 0, attempts: 1 });
    const measured = acceptanceReadoutOf(booked, { from: "2026-09-27T00:00:00Z", to: "2026-09-28T00:00:00Z", priceOf: () => ({ amount: "1", currency: "USD" }) });
    assert.equal(measured.byCarrier[0].accepted, succeeded ? 1 : 0);
    assert.equal(measured.byCarrier[0].judged, 1);
    assert.deepEqual(booked[0].resources, [{ resource: "input-tokens", unit: "token", amount: "4", carrier: "gpt-6-luna" }]);
    assert.deepEqual(measured.byCarrier[0].cost, { USD: "4" });
    assert.deepEqual(measured.byCarrier[0].costPerAccepted, succeeded ? { USD: "4.000000" } : null);
    await dischargeOperation.execute(discharge, {}, {
      invocation: { id: "sol-invocation-two", subject: holder }, operation: dischargeOperation, startedAt: `${DATE}T15:00:00.000Z`,
    });
    assert.equal(outcomeJournal(root).read().length, 1, "replaying actual receiving does not duplicate its outcome");
    assert.equal(recordReceivedOutcome({ dataRoot: root, ...discharged[0] }), 0);
    assert.equal(outcomeJournal(root).read().length, 1, "the same report and verdict are recorded once");
    const after = dispatchReadoutOf(binding, DATE).dispatch.queue.find(item => item.scope === "work-item:pump-one");
    assert.equal(after.reasons.includes("result-awaiting-receipt"), false);
    if (!succeeded) assert.notEqual(after.status, "discharged");
    if (result.kind === "skill-error") assert.equal(after.execution.state, "failed");
    assert.equal(booked[0].carrier, "gpt-6-luna");
    assert.equal(booked[0].player.hand, "luna-session-one");
    assert.ok(booked[0].evidence.includes("verification:direct-office"));
    if (decision === "rejected") assert.notEqual(dispatchReadoutOf(binding, DATE).dispatch.queue.find(item => item.scope === "work-item:pump-one").status, "discharged");
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("the production host recorder retains reports through same-day and later-day cold receiving replay", async () => {
  for (const result of reports()) for (const decision of ["accepted", "rejected"]) await receivingFixture({ result, decision });
});

test("a failed first derived callback recovers at the original receiving time after a cold retry", async () => {
  for (const result of reports().slice(0, 4)) for (const decision of ["accepted", "rejected"]) await receivingFixture({ result, decision, failFirst: true });
});

test("historical receiving and outcomes retain original dates without rewriting legacy records", async () => {
  for (const result of reports().slice(0, 4)) {
    await receivingFixture({ result, decision: "accepted", legacyReceiving: true, failFirst: true });
    await receivingFixture({ result, decision: "accepted", legacyReceiving: true, historicalOutcome: result.kind === "skill-result" ? "untyped" : "rich" });
  }
});


test("historical receiving evidence additions and removals are never exact replay", async () => {
  for (const result of reports().slice(0, 4)) for (const decision of ["accepted", "rejected"]) {
    await receivingFixture({ result, decision, reviewCase: "legacy-evidence-subset" });
  }
});
test("new A receiving keeps its own identity after historical A with or without intervening B", async () => {
  for (const result of reports().slice(0, 4)) for (const reviewCase of ["historical-ABA", "historical-AA"]) {
    await receivingFixture({ result, decision: "accepted", reviewCase });
  }
});
test("session receiving reads the latest actual judgment across timestamp precisions", async () => {
  for (const result of reports().slice(0, 4)) for (const reviewCase of ["session-current-judgment", "session-fractional"]) {
    await receivingFixture({ result, decision: "accepted", reviewCase });
  }
});


test("historical same-id revisions bind every report alternative to its own authorization", async () => {
  for (const result of reports().slice(0, 4)) for (const decision of ["accepted", "rejected"]) {
    await receivingFixture({ result, decision, reviewCase: "legacy-authorization-pair" });
  }
});


test("shared or absent historical invocation preserves complete judgments, cold recovery, duplicate dates and session projection", async () => {
  for (const result of reports().slice(0, 4)) for (const suffix of ["absent", "reused"]) {
    await receivingFixture({ result, decision: "accepted", reviewCase: `legacy-shared-context-${suffix}` });
  }
});

test("unpairable historical authorization is explicit and writes no retry-dated judgment", async () => {
  for (const result of reports().slice(0, 4)) for (const decision of ["accepted", "rejected"]) {
    await receivingFixture({ result, decision, reviewCase: "legacy-ambiguous-pair" });
  }
});


test("distinct same-day historical acts cannot both consume one unkeyed outcome", async () => {
  for (const result of reports().slice(0, 4)) for (const decision of ["accepted", "rejected"]) for (const suffix of ["same-body", "receiver-evidence", "distinct-evidence"]) {
    await receivingFixture({ result, decision, reviewCase: `legacy-unkeyed-same-day-${suffix}` });
  }
});
