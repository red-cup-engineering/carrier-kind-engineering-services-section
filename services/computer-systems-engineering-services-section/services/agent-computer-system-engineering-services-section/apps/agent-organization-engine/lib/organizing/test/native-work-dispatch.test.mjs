import assert from "node:assert/strict";
import test from "node:test";
import { juralRelationClaimCell } from "@red-cup-engineering/socializing/office";
import { skillSuccess, skillError } from "@red-cup-engineering/animating/becoming/doing/working/governing/skill";
import { workResultFromSkillResult, workResultSkillContext, typedResultOf, workSourceClosureContract } from "../src/work/schema.mjs";
import { agencyWorkExecutionOfRow } from "../src/work/observations.mjs";
import { agentWorkReadoutCollector } from "../src/work/readout.mjs";
import { agentWorkDispatchReadoutOfWork, pageAgentWorkDispatchReadout } from "../src/work/dispatch.mjs";

const scope = "work-item:native-dispatch";
const allocation = "fixture:allocation";
const subject = "fixture:subject";
const agent = "fixture:producer";
const date = "2026-10-09";
const witness = (id, causes = []) => ({ id, cites: causes });
const row = (boundary, cell = "fixture:report", reading = "unknown") =>
  [subject, { cell, reading }, { boundary }, date];
const proposalRow = (result, extra = {}) => row({
  role: "work-result-proposal",
  proposal: { allocation, scope, subject, execution: "fixture:execution", result, ...extra },
});
const receiptRow = (decision, proposalReceipt = "fixture:proposal") => row({
  role: "receiver-authorization", evaluation: { allowed: true },
  proposalReceipt, decision, reason: "fixture receiver judgement",
});
const nativeCases = () => [
  ...[skillSuccess({ count: 1 }), skillSuccess({ count: 0 }, "active"),
    ...["MissingInput", "SkillNotFound", "Unresolvable", "ValidationFailure", "UnexpectedState"]
      .map(errorClass => skillError(errorClass, "reported outcome", "fixture(input)"))]
    .map(native => workResultFromSkillResult(native)),
  typedResultOf({ type: "object", required: ["count"],
    properties: { count: { type: "integer" } }, additionalProperties: false },
  workResultFromSkillResult(skillSuccess({ count: "wrong" }))),
];

function collectorFor(result) {
  const collector = agentWorkReadoutCollector();
  collector.push(row({ role: "obligation", text: "Read the native outcome",
    source: "structured-work-intent:fixture", subject, evidence: ["producer:fixture"] }, scope),
  subject, witness("fixture:opening"));
  const cell = juralRelationClaimCell({
    kind: "duty", active: agent, passive: "fixture:receiver", scope, standing: "potential",
  });
  collector.push(row({ role: "office-service-allocation", source: allocation, scope,
    character: agent, office: "fixture#producer", officeService: "fixture:service",
    duty: "fixture:duty", work: "read-native-outcome", skill: "read-native-outcome",
    closureKind: "procedure", requiresCapabilities: [], method: "Read the original",
    receiverCondition: "Independent receiving", governing: {}, model: "fixture-model",
  }, cell, "held"), subject, witness(allocation, ["fixture:opening"]));
  collector.push(row({ role: "office-service-execution",
    execution: { allocation, scope, state: "started" } }),
  subject, witness("fixture:started", [allocation]));
  collector.push(proposalRow(result), subject, witness("fixture:proposal", ["fixture:started"]));
  return collector;
}
const read = collector => collector.read({ subject, date, agents: [agent] });
const dispatch = collector => agentWorkDispatchReadoutOfWork(read(collector));
const item = collector => dispatch(collector).queue.find(entry => entry.scope === scope);

test("proposal observation and dispatch retain both native success readings, five errors and separate codomain failure", () => {
  for (const result of nativeCases()) {
    const context = workResultSkillContext(result);
    const observed = agencyWorkExecutionOfRow(proposalRow(result), witness("fixture:proposal"));
    assert.deepEqual(observed.skillOutcome, context);
    assert.equal(observed.resultKind, result.kind);
    assert.equal(observed.state, result.kind === "skill-error" ? "failed" : "proposed");
    const collector = collectorFor(result);
    const projected = item(collector);
    assert.deepEqual(projected.execution.skillOutcome, context);
    assert.equal(projected.execution.receipt, "fixture:proposal");
    assert.ok(projected.reasons.includes("native-skill-routing:" + context.routing));
    assert.ok(projected.reasons.includes("native-skill-reading:" + context.reading));
    if (context.errorClass !== undefined)
      assert.ok(projected.reasons.includes("native-skill-error-class:" + context.errorClass));
    assert.notEqual(projected.status, "discharged");
    if (result.codomainAssay !== undefined) {
      assert.equal(context.routing, "complete", "native success routing does not erase a later failed assay");
      assert.equal(projected.execution.state, "failed");
    }
  }
});

test("malformed and substituted native results are not projected while legacy sums remain readable", () => {
  const nativeError = workResultFromSkillResult(skillError("Unresolvable", "no answer", "fixture"));
  for (const result of [undefined, {}, { kind: "skill-result" }, { kind: "skill-error", error: "" },
    { kind: "skill-result", value: "promoted", skillOutcome: nativeError.skillOutcome },
    { ...nativeError, skillOutcome: { ...nativeError.skillOutcome, reading: "potential" } }]) {
    assert.equal(agencyWorkExecutionOfRow(proposalRow(result), witness("fixture:proposal")), undefined);
  }
  for (const result of [{ kind: "skill-result", value: 1 }, { kind: "skill-error", error: "legacy" }]) {
    const observed = agencyWorkExecutionOfRow(proposalRow(result), witness("fixture:proposal"));
    assert.equal(observed.resultKind, result.kind);
    assert.equal(observed.skillOutcome, undefined);
  }
});

test("native result projection preserves current source custody and refuses malformed source witnesses", () => {
  const sourceRepository = "https://github.com/fixture/source.git";
  const copy = { kind: "metroplat.git.source-working-copy", id: "fixture:copy", sourceRepository,
    ref: "refs/heads/main", commit: "a".repeat(40), repository: "/fixture/source",
    commonDirectory: "/fixture/source/.git",
    copyIdentity: { repository: { device: "1", inode: "2" }, commonDirectory: { device: "1", inode: "3" } },
    custody: { id: "fixture:custody", revision: "1", evidence: ["fixture:source"],
      sourceRepository, ref: "refs/heads/main", commit: "a".repeat(40), workspaceRoot: "/fixture" } };
  const sourceBinding = workSourceClosureContract.assert({
    kind: "metroplat.git.source-closure", id: "fixture:binding",
    exactIdentity: "fixture:bytes", copy, composed: [],
  });
  const result = workResultFromSkillResult(skillSuccess({ count: 1 }));
  const observed = agencyWorkExecutionOfRow(proposalRow(result, { sourceRepository, sourceBinding }), witness("fixture:proposal"));
  assert.equal(observed.sourceRepository, sourceRepository);
  assert.deepEqual(observed.sourceBinding, sourceBinding);
  assert.deepEqual(observed.skillOutcome, workResultSkillContext(result));
  for (const extra of [
    { sourceBinding: { kind: "foreign" } },
    { sourceBinding, sourceResult: { sourceBinding: sourceBinding.id } },
    { sourceResult: { kind: "foreign" } },
  ]) assert.equal(agencyWorkExecutionOfRow(proposalRow(result, extra), witness("fixture:proposal")), undefined);
});

test("exact receiving receipts preserve native error residue and do not themselves discharge success", () => {
  for (const result of nativeCases()) {
    const collector = collectorFor(result);
    collector.push(receiptRow("accepted"), subject, witness("fixture:received", ["fixture:proposal"]));
    const accepted = item(collector);
    assert.deepEqual(accepted.execution.skillOutcome, workResultSkillContext(result));
    assert.notEqual(accepted.status, "discharged", "a receipt projection alone is not a discharge observation");
    if (result.kind === "skill-error") {
      assert.equal(accepted.execution.state, "failed");
      assert.equal(accepted.execution.receiverReceipt, "fixture:received");
    } else {
      collector.push(row({ role: "discharge" }, scope, "held"), subject,
        witness("fixture:discharge", ["fixture:opening", "fixture:received"]));
      assert.equal(item(collector).status, "discharged");
    }
  }
});

test("receiver rejection and ordered later execution preserve existing collector precedence", () => {
  const result = workResultFromSkillResult(skillSuccess({ count: 1 }));
  const collector = collectorFor(result);
  collector.push(receiptRow("rejected", "fixture:unrelated"), subject, witness("fixture:unrelated-receipt"));
  assert.equal(item(collector).execution.state, "proposed", "a different proposal's receipt has no effect");
  collector.push(receiptRow("rejected"), subject, witness("fixture:rejected", ["fixture:proposal"]));
  const rejected = item(collector);
  assert.equal(rejected.execution.state, "failed");
  assert.equal(rejected.execution.receiverReceipt, "fixture:rejected");
  assert.match(rejected.execution.error, /independent-receiver-rejected-result/);
  assert.deepEqual(rejected.execution.skillOutcome, workResultSkillContext(result));
  collector.push(row({ role: "office-service-execution",
    execution: { allocation, scope, state: "started" } }),
  subject, witness("fixture:later-start", ["fixture:rejected"]));
  const later = item(collector);
  assert.equal(later.execution.receipt, "fixture:later-start");
  assert.equal(later.execution.state, "started");
  assert.equal(later.execution.skillOutcome, undefined, "old native context is not attached to a later execution");
});

test("paged dispatch retains native context and early native reasons within the existing cap", () => {
  for (const result of nativeCases()) {
    const complete = dispatch(collectorFor(result));
    const page = pageAgentWorkDispatchReadout(complete, { limit: 1 });
    const projected = page.queue[0];
    assert.deepEqual(projected.execution, complete.queue[0].execution);
    const context = workResultSkillContext(result);
    assert.ok(projected.reasons.includes("native-skill-routing:" + context.routing));
    assert.ok(projected.reasons.includes("native-skill-reading:" + context.reading));
    if (context.errorClass !== undefined)
      assert.ok(projected.reasons.includes("native-skill-error-class:" + context.errorClass));
    if (result.kind === "skill-result") {
      const receiving = pageAgentWorkDispatchReadout(complete, { view: "receiving", limit: 1 });
      assert.deepEqual(receiving.queue[0].execution, projected.execution);
      assert.ok(receiving.queue[0].reasons.includes("native-skill-reading:" + context.reading));
    }
  }
});

test("failed typed reports await independent receipt without becoming executable or completed work", () => {
  for (const result of nativeCases()) {
    const collector = collectorFor(result);
    const before = dispatch(collector);
    const pending = pageAgentWorkDispatchReadout(before, { view: "receiving", limit: 1 });
    assert.equal(pending.queue.length, 1);
    assert.equal(pending.queue[0].execution.receipt, "fixture:proposal");
    assert.equal(pending.queue[0].state, "blocked");
    if (result.kind === "skill-error") assert.equal(pending.queue[0].execution.state, "failed");
    collector.push(receiptRow("accepted", "fixture:other-proposal"), subject, witness("fixture:other-receipt"));
    assert.equal(pageAgentWorkDispatchReadout(dispatch(collector), { view: "receiving" }).queue.length, 1);
    collector.push(receiptRow("accepted"), subject, witness("fixture:received", ["fixture:proposal"]));
    if (result.kind === "skill-error") {
      const after = dispatch(collector);
      assert.equal(pageAgentWorkDispatchReadout(after, { view: "receiving" }).queue.length, 0);
      assert.equal(after.queue[0].execution.state, "failed");
      assert.notEqual(after.queue[0].status, "discharged");
    }
  }
  const collector = collectorFor(workResultFromSkillResult(skillSuccess(1)));
  collector.push(row({ role: "office-service-execution", execution: { allocation, scope, state: "failed", error: "transport-failure" } }), subject, witness("fixture:transport-failed"));
  assert.equal(pageAgentWorkDispatchReadout(dispatch(collector), { view: "receiving" }).queue.length, 0,
    "a failed start without an admitted result is no report to receive");
});
