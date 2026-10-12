import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { executeReadyDuties, exitCodeOfReadyDutiesSummary } from "../apps/execute-ready-duties.mjs";

const PRODUCER = { id: "@red-cup-engineering/agent-work-computer-system-engineering-services-section", revision: "0.2.0" };
const READOUT = {
  ready: 3,
  frontier: [
    { scope: "task:exact-deps-pkg", text: "pin", intent: "i0", state: "blocked" },
    { scope: "task:friction-missing-capability-a-1111", text: "a/scripts/x.mjs needed \"a\"", intent: "i1", state: "ready" },
    { scope: "task:friction-missing-capability-a-1111", text: "the same duty under another office", intent: "i1", state: "ready" },
    { scope: "task:friction-missing-capability-b-2222", text: "b needed \"b\"", intent: "i2", state: "ready" },
    { scope: "task:friction-missing-capability-c-3333", text: "c", intent: "i3", state: "blocked" },
  ],
};

function harness({ dispatchResults, translation, receipt, checkNameTaken, checkDuplication, candidateSectionDirectories }) {
  const calls = { dispatch: [], translate: [], fabricate: [], write: [], rail: [], ensureDirectory: [], checkNameTaken: [], checkDuplication: [] };
  const rail = {
    call: async (tool, input) => {
      if (tool === "agent-work-dispatch") return READOUT;
      calls.rail.push({ tool, input });
      return { admitted: true, id: input.id };
    },
  };
  let dispatchIndex = 0;
  return {
    calls,
    options: {
      rail,
      destinationParent: "/sec",
      candidateSectionDirectories: candidateSectionDirectories ?? [],
      dialectExample: "# example\n## Requirements\n",
      producer: PRODUCER,
      publish: true,
      loadWorkContext: async ({ duty }) => ({ duty, records: [{ locator: "/law.md", text: "Group operations by topic." }] }),
      dispatch: async (demand) => { calls.dispatch.push(demand); return dispatchResults[Math.min(dispatchIndex++, dispatchResults.length - 1)]; },
      translate: (request) => { calls.translate.push(request); return typeof translation === "function" ? translation(request) : translation; },
      fabricate: async (request) => { calls.fabricate.push(request); return receipt; },
      write: async (request) => { calls.write.push(request); return { type: "TextFileWrite", path: request.path, bytes: 1 }; },
      // No-network defaults: no test lets a name-taken or duplication check reach the registry or
      // the workspace duplication analysis; a test that wants a hit overrides the function itself.
      ensureDirectory: async (dir) => { calls.ensureDirectory.push(dir); },
      checkNameTaken: checkNameTaken ?? (async (request) => { calls.checkNameTaken.push(request); return null; }),
      checkDuplication: checkDuplication ?? (async (request) => { calls.checkDuplication.push(request); return []; }),
      now: () => new Date("2026-09-06T00:00:00Z"),
    },
  };
}

const ADMITTED = { type: "MarkdownJsnodeOperationPackageSpecificationTranslation", artifactSpecificationCandidate: { artifact: { id: "close-a" } }, jsnodeOperationPackageSpecificationCandidate: { version: 1, packageName: "@red-cup-engineering/close-a-service", operation: { text: "export function closeA(value) { return value; }" } } };
const RECEIPT = { type: "MarkdownJsnodeOperationPackageFabricationReceipt", jsnodeOperationPackageCreationReceipt: { packageName: "@red-cup-engineering/close-a-service", packageVersion: "0.1.0" }, jsnodeOperationPackageRegistryPublication: { registry: "https://registry.561.group", classification: "first-publish" } };

const delivery = (id, candidate) => ({
  workLot: `urn:work-lot:${id}`, provider: "urn:actor:provider", receiver: "urn:actor:receiver",
  taskClass: "agent-work.duty-work-order.v1", selectedOffer: "urn:offer:work-order",
  configurationIdentity: "urn:configuration:exact", receipt: { id: `urn:receipt:${id}` },
  candidate, durationMs: 12,
});

test("receiver gates feed refused and accepted deliveries back with durable assay evidence", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "duty-inference-assay-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const journal = createSemanticRecordJournal({ root, objectKind: "agent-work.duty-execution" });
  const observations = [];
  const { calls, options } = harness({
    dispatchResults: [delivery("first", "# bad\n"), delivery("second", "# good\n")],
    translation: ({ source }) => source.text.includes("bad")
      ? { type: "MarkdownJsnodeOperationPackageSpecificationTranslationRefusal", code: "MISSING_REQUIREMENT", message: "required behavior missing" }
      : ADMITTED,
    receipt: RECEIPT,
  });
  const summary = await executeReadyDuties({
    ...options, journal,
    recordOutcome: async (input) => {
      observations.push({ ...input, outcome: input.outcome });
      return { outcome: "receiver-outcome-recorded", id: `urn:observation:${observations.length}` };
    },
  });
  assert.equal(summary.discharged, 1);
  assert.deepEqual(observations.map(({ outcome }) => outcome), ["refused", "accepted"]);
  assert.deepEqual(observations.map(({ receipt }) => receipt), ["urn:receipt:first", "urn:receipt:second"]);
  const evidence = journal.query({ category: "agent-work.inference-assay" });
  assert.equal(evidence.length, 2);
  for (const observation of observations) {
    const assay = evidence.find(({ id }) => id === observation.evidence);
    assert.ok(assay);
    assert.equal(assay.record.disposition.configurationIdentity, "urn:configuration:exact");
    assert.equal(assay.record.disposition.outcome, observation.outcome);
  }
  assert.equal(calls.fabricate.length, 1);
  assert.equal(calls.dispatch.every(({ zeroCashOnly }) => zeroCashOnly === true), true);
  assert.equal(summary.inferenceOutcomes.every(({ observation }) => observation.outcome === "receiver-outcome-recorded"), true);
});

test("observer failure retains the exact disposition without repeating an accepted fabrication", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "duty-inference-pending-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const journal = createSemanticRecordJournal({ root, objectKind: "agent-work.duty-execution" });
  const { calls, options } = harness({ dispatchResults: [delivery("accepted", "# good\n")], translation: ADMITTED, receipt: RECEIPT });
  const summary = await executeReadyDuties({ ...options, journal,
    recordOutcome: async () => { throw new Error("observer unavailable"); },
  });
  assert.equal(summary.discharged, 1);
  assert.equal(calls.fabricate.length, 1);
  assert.equal(calls.dispatch.length, 1);
  const pending = summary.inferenceOutcomes[0];
  assert.equal(pending.outcome, "receiver-outcome-pending");
  assert.equal(pending.disposition.outcome, "accepted");
  assert.equal(pending.disposition.receipt, "urn:receipt:accepted");
  assert.equal(journal.query({ category: "agent-work.inference-assay" })[0].id, pending.disposition.evidence);
  assert.equal(exitCodeOfReadyDutiesSummary(summary), 1);
});

test("development fabrication does not publish or discharge a production duty", async () => {
  const { calls, options } = harness({ dispatchResults: [{ candidate: "# close-a\n" }], translation: ADMITTED, receipt: RECEIPT });
  delete options.publish;
  const summary = await executeReadyDuties(options);
  assert.equal(calls.fabricate[0].publish, false);
  assert.equal(summary.discharged, 0);
  assert.equal(summary.outcomes.at(-1).outcome, "fabricated");
  assert.equal(summary.outcomes.at(-1).activated, false);
  assert.equal(calls.rail.length, 0);
});

test("topic package identity comes from the candidate and every operation reaches duplication checks", async () => {
  const translation = { ...ADMITTED, jsnodeOperationPackageSpecificationCandidate: { version: 2, packageName: "@red-cup-engineering/number-services-section", operations: [{ bodyText: "export function doubleValue(x) { return x * 2; }" }, { bodyText: "export function tripleValue(x) { return x * 3; }" }] } };
  const { calls, options } = harness({ dispatchResults: [{ candidate: "# close-a\n" }], translation, receipt: RECEIPT });
  await executeReadyDuties(options);
  assert.equal(calls.fabricate[0].destination, "/sec/services/number-services-section");
  assert.equal(calls.checkNameTaken[0].packageName, "@red-cup-engineering/number-services-section");
  assert.equal(calls.checkDuplication.length, 2);
});

test("work records reach inference and context failure prevents an ungrounded fabrication", async () => {
  const { calls, options } = harness({ dispatchResults: [{ candidate: "# close-a\n" }], translation: ADMITTED, receipt: RECEIPT });
  await executeReadyDuties(options);
  assert.match(calls.dispatch[0].context, /Group operations by topic/u);
  calls.dispatch.length = 0;
  calls.fabricate.length = 0;
  const summary = await executeReadyDuties({ ...options, loadWorkContext: async () => { throw new Error("intent record unavailable"); } });
  assert.equal(summary.outcomes.at(-1).code, "WORK_CONTEXT_UNAVAILABLE");
  assert.equal(calls.dispatch.length, 0);
  assert.equal(calls.fabricate.length, 0);
});

test("default context reads the intent and its cited carriers before asking a provider", async () => {
  const { calls, options } = harness({ dispatchResults: [{ candidate: "# close-a\n" }], translation: ADMITTED, receipt: RECEIPT });
  delete options.loadWorkContext;
  const read = [];
  options.repositoryRoot = "/repo";
  options.destinationParent = "/repo/lib/topic";
  options.rail = { call: async (tool, input) => {
    if (tool === "agent-work-dispatch") return {
      ...READOUT,
      frontier: READOUT.frontier.map((duty) => duty.intent === "i1" ? { ...duty, subject: "structured-work-intent-i1" } : duty),
    };
    if (tool === "work-item") {
      assert.equal(input.id, "structured-work-intent-i1");
      return { kind: "work-item", evidence: ["source:lib/prior.md"], text: "Reuse the admitted topic algebra." };
    }
    return { admitted: true };
  } };
  options.readCarrierText = async (path) => { read.push(path); return path.endsWith("prior.md") ? "The prior decision requires a shared topic package." : "Applicable source."; };
  await executeReadyDuties(options);
  assert.ok(read.includes("/repo/lib/prior.md"));
  assert.ok(read.includes("/repo/.claude/rules/org-layering.md"));
  assert.match(calls.dispatch[0].context, /The prior decision requires a shared topic package/u);
  assert.match(calls.dispatch[0].context, /Reuse the admitted topic algebra/u);
});

test("a frontier Inquiry yields correlated interpretation evidence without discharging its parent", async () => {
  const { calls, options } = harness({ dispatchResults: [], translation: ADMITTED, receipt: RECEIPT });
  const duty = { scope: "task:ordinary-requirement", text: "Interpret the admitted requirement.", intent: "intent-1", subject: "structured-work-intent-1", state: "ready" };
  options.rail = { call: async (tool) => tool === "agent-work-dispatch" ? { frontier: [duty] } : { kind: "work-item" } };
  options.classify = () => ({ workType: "inquiry", lane: "frontier" });
  options.loadWorkContext = async () => ({ duty, workItem: { kind: "work-item" }, records: [{ locator: "/repo/lib/requirement.md", text: "Requirement." }] });
  options.repositoryRoot = "/repo";
  options.executeInquiry = async (mission) => ({ executionReceipt: { input: "mission-request", output: "mission-result" }, outcome: { answered: true, inquiryResult: "Bind the public-services migration operation next.", trajectoryFingerprint: "answer-record" } });
  const summary = await executeReadyDuties(options);
  assert.equal(summary.executed, 1);
  assert.equal(summary.discharged, 0);
  assert.equal(summary.obstructed, 0);
  assert.deepEqual(summary.outcomes[0], {
    scope: duty.scope, lane: "frontier", outcome: "interpreted", subject: duty.subject, intent: duty.intent,
    receipt: { input: "mission-request", output: "mission-result" }, answer: "Bind the public-services migration operation next.", answerArtifact: "answer-record",
    nextState: "awaiting-operation-binding",
  });
  assert.equal(calls.dispatch.length, 0);
});

test("an inquiry forwards its admitted customer and bounded consideration policy to the mission service", async () => {
  const { options } = harness({ dispatchResults: [], translation: ADMITTED, receipt: RECEIPT });
  const duty = { scope: "task:inquiry-policy", text: "Interpret the admitted requirement.", intent: "intent-policy", subject: "structured-work-intent-policy", state: "ready" };
  const policy = { type: "ConsiderationPolicy", acceptableAlternatives: [{ id: "test-credit", obligations: [{ kind: "credit", asset: "urn:test:credit", unit: "test-unit", settlementCapabilities: ["urn:test:settlement"] }] }] };
  options.rail = { call: async (tool) => tool === "agent-work-dispatch" ? { frontier: [duty] } : { kind: "work-item" } };
  options.classify = () => ({ workType: "inquiry", lane: "frontier" });
  options.loadWorkContext = async () => ({ duty, records: [] });
  options.repositoryRoot = "/repo";
  let received;
  options.executeInquiry = async (mission, execution) => {
    received = { mission, execution };
    return { executionReceipt: {}, outcome: { answered: true, inquiryResult: "answer" } };
  };
  await executeReadyDuties({ ...options, inquiryCustomerActor: "actor:test-customer", inquiryConsiderationPolicy: policy });
  assert.deepEqual(received.execution, { customerActor: "actor:test-customer" });
  assert.deepEqual(received.mission.considerationPolicy, policy);
});

test("runner exit status distinguishes intentional previews from refusals, failures, and obstructions", () => {
  assert.equal(exitCodeOfReadyDutiesSummary({ outcomes: [{ outcome: "fabricated" }, { outcome: "interpreted" }, { outcome: "observed" }, { outcome: "skipped" }] }), 0);
  for (const outcome of ["refused", "duplicate-refused", "failed", "obstructed"]) {
    assert.equal(exitCodeOfReadyDutiesSummary({ outcomes: [{ outcome }] }), 1, outcome);
  }
});

test("an explicitly requested scope that is absent from the ready frontier is an actionable obstruction", async () => {
  const { options } = harness({ dispatchResults: [], translation: ADMITTED, receipt: RECEIPT });
  const summary = await executeReadyDuties({ ...options, deterministicScope: "task:missing" });
  assert.equal(summary.obstructed, 1);
  assert.deepEqual(summary.outcomes[0].obstruction, {
    type: "agent-work.requested-scope-not-ready", scope: "task:missing", requiredCapabilities: ["agent-work-dispatch"],
  });
});

test("executes only eligible missing-capability duties, deduped by scope, up to the limit, and discharges with the receipt", async () => {
  const { calls, options } = harness({ dispatchResults: [{ outcome: "candidate-pending-customer-acceptance", candidate: { workOrder: "# close-a\n## Requirements\n" } }], translation: ADMITTED, receipt: RECEIPT });
  const summary = await executeReadyDuties({ ...options, limit: 1 });
  assert.equal(summary.considered, 2);
  assert.equal(summary.executed, 1);
  assert.equal(summary.discharged, 1);
  assert.deepEqual(summary.outcomes.map((outcome) => [outcome.scope, outcome.outcome]), [
    ["task:friction-missing-capability-a-1111", "discharged"],
  ]);
  assert.equal(calls.dispatch.length, 1);
  assert.equal(calls.translate[0].source.path, "/sec/content/text/documents/specifications/close-a.md");
  assert.equal(calls.fabricate[0].destination, "/sec/services/close-a-service");
  assert.equal(calls.fabricate[0].registry, "https://registry.561.group");
  assert.equal(calls.write[0].path, "/sec/content/text/documents/specifications/close-a.md");
  assert.equal(calls.rail[0].tool, "work-discharge-admit");
  assert.equal(calls.rail[0].input.scope, "task:friction-missing-capability-a-1111");
  assert.equal(calls.rail[0].input.intent, "i1");
  assert.deepEqual(calls.rail[0].input.producer, PRODUCER);
  assert.equal(summary.outcomes[0].package, "@red-cup-engineering/close-a-service@0.1.0");
  assert.deepEqual(calls.rail[0].input.evidence.slice(1), ["package:@red-cup-engineering/close-a-service@0.1.0", "destination:/sec/services/close-a-service", "registry:https://registry.561.group"]);
});

test("a translator refusal is fed back to the provider and the duty is refused after the last attempt, with nothing fabricated or discharged", async () => {
  const { calls, options } = harness({
    dispatchResults: [{ candidate: { workOrder: "# bad\nno headings" } }],
    translation: { type: "MarkdownJsnodeOperationPackageSpecificationTranslationRefusal", code: "UNKNOWN_STRUCTURE", message: "document must have exactly one title" },
    receipt: RECEIPT,
  });
  const summary = await executeReadyDuties({ ...options, limit: 2, attempts: 2 });
  assert.equal(summary.executed, 2);
  assert.equal(summary.discharged, 0);
  assert.equal(calls.dispatch.length, 4);
  assert.match(calls.dispatch[1].context, /Previous attempt was refused.*\n\{"phase":"translation","code":"UNKNOWN_STRUCTURE"/u);
  assert.equal(calls.fabricate.length, 0);
  assert.equal(calls.rail.length, 0);
  const refused = summary.outcomes.filter((outcome) => outcome.outcome === "refused");
  assert.equal(refused.length, 2);
  assert.equal(refused[0].tried.length, 2);
});

test("a provider result with no work order counts as a refused attempt, and a fabrication refusal stops the duty without a discharge", async () => {
  const { calls, options } = harness({
    dispatchResults: [{ outcome: "provider-refusal" }, { candidate: { workOrder: "# close-a\n## Requirements\n" } }],
    translation: ADMITTED,
    receipt: { type: "MarkdownJsnodeOperationPackageFabricationRefusal", phase: "jsnode-package-creation", code: "RULE_ASSAY_FAILED", message: "a script exports one operation" },
  });
  const summary = await executeReadyDuties({ ...options, limit: 1, attempts: 2 });
  assert.equal(summary.discharged, 0);
  assert.equal(summary.outcomes[0].outcome, "refused");
  assert.deepEqual(summary.outcomes[0].tried.map((entry) => [entry.refusal.phase ?? null, entry.refusal.code]), [[null, "NO_WORK_ORDER"], ["jsnode-package-creation", "RULE_ASSAY_FAILED"]]);
  assert.equal(calls.write.length, 0);
  assert.equal(calls.rail.length, 0);
});

test("writes one journal row charging support when something discharged and refutation when something executed did not", async () => {
  const rows = [];
  const { options } = harness({ dispatchResults: [{ candidate: { workOrder: "# close-a\n" } }], translation: ADMITTED, receipt: RECEIPT });
  await executeReadyDuties({ ...options, limit: 1, journal: { record: (row) => rows.push(row) } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, "agent-work.execute-ready-duties");
  assert.deepEqual(rows[0].charge, { support: true, refutation: false });
  assert.equal(rows[0].record.discharged, 1);
});

test("a duty naming a resolvable section directory is seated there, its services/ created, and its work order and package land under it", async () => {
  const { calls, options } = harness({
    dispatchResults: [{ candidate: { workOrder: "# close-a\n## Requirements\n" } }],
    translation: ADMITTED,
    receipt: RECEIPT,
    candidateSectionDirectories: ["/lib/a", "/lib/some-other-section"],
  });
  const summary = await executeReadyDuties({ ...options, limit: 1 });
  assert.equal(summary.discharged, 1);
  assert.equal(calls.ensureDirectory[0], "/lib/a/services");
  assert.equal(calls.translate[0].source.path, "/lib/a/content/text/documents/specifications/close-a.md");
  assert.equal(calls.fabricate[0].destination, "/lib/a/services/close-a-service");
});

test("a duty naming no resolvable section directory falls back to destinationParent without creating anything", async () => {
  const { calls, options } = harness({
    dispatchResults: [{ candidate: { workOrder: "# close-a\n## Requirements\n" } }],
    translation: ADMITTED,
    receipt: RECEIPT,
    candidateSectionDirectories: ["/lib/some-unrelated-section"],
  });
  const summary = await executeReadyDuties({ ...options, limit: 1 });
  assert.equal(summary.discharged, 1);
  assert.equal(calls.ensureDirectory.length, 0);
  assert.equal(calls.fabricate[0].destination, "/sec/services/close-a-service");
});

test("a name-taken registry check refuses fabrication, feeds the match back to the provider, and closes duplicate-refused after the last attempt", async () => {
  const { calls, options } = harness({
    dispatchResults: [{ candidate: { workOrder: "# close-a\n## Requirements\n" } }],
    translation: ADMITTED,
    receipt: RECEIPT,
    checkNameTaken: async (request) => { calls.checkNameTaken.push(request); return "0.4.0"; },
  });
  const summary = await executeReadyDuties({ ...options, limit: 1, attempts: 2 });
  assert.equal(summary.discharged, 0);
  assert.equal(summary.outcomes[0].outcome, "duplicate-refused");
  assert.deepEqual(summary.outcomes[0].matches, ["@red-cup-engineering/close-a-service"]);
  assert.equal(summary.outcomes[0].tried.length, 2);
  assert.deepEqual(summary.outcomes[0].tried.map((entry) => entry.refusal.code), ["PACKAGE_NAME_TAKEN", "PACKAGE_NAME_TAKEN"]);
  assert.match(calls.dispatch[1].context, /Previous attempt was refused[\s\S]*"code":"PACKAGE_NAME_TAKEN"/u);
  assert.equal(calls.checkNameTaken[0].packageName, "@red-cup-engineering/close-a-service");
  assert.equal(calls.fabricate.length, 0);
  assert.equal(calls.write.length, 0);
  assert.equal(calls.rail.length, 0);
});

test("a workspace-duplication hit refuses fabrication and closes duplicate-refused with the matching, consumer-backed package names", async () => {
  const { calls, options } = harness({
    dispatchResults: [{ candidate: { workOrder: "# close-a\n## Requirements\n" } }],
    translation: ADMITTED,
    receipt: RECEIPT,
    checkDuplication: async (request) => { calls.checkDuplication.push(request); return ["@red-cup-engineering/existing-capability-service"]; },
  });
  const summary = await executeReadyDuties({ ...options, limit: 1, attempts: 1 });
  assert.equal(summary.discharged, 0);
  assert.equal(summary.outcomes[0].outcome, "duplicate-refused");
  assert.deepEqual(summary.outcomes[0].matches, ["@red-cup-engineering/existing-capability-service"]);
  assert.equal(calls.checkDuplication[0].artifactId, "close-a");
  assert.equal(calls.fabricate.length, 0);
  assert.equal(calls.rail.length, 0);
});

test("routes a scoped script duty through the shared deterministic hand without inference", async () => {
  const calls = { rail: [], discharge: [], dispatch: [] };
  const rail = {
    call: async (tool, input) => {
      if (tool === "agent-work-dispatch") return { frontier: [{ scope: "task:exact-deps-spotcomp", text: "exact pins", intent: "i", state: "ready" }] };
      calls.rail.push({ tool, input });
      return { admitted: true };
    },
  };
  const summary = await executeReadyDuties({
    rail,
    destinationParent: "/sec",
    dialectExample: "# example\n",
    producer: PRODUCER,
    deterministicRoot: "/checkout",
    deterministicScope: "task:exact-deps-spotcomp",
    applyDeterministic: true,
    classify: () => ({ lane: "script", workType: "procedure" }),
    dispatch: async () => { calls.dispatch.push(true); throw new Error("script lane must not dispatch inference"); },
    discharge: async (request) => {
      calls.discharge.push(request);
      const duty = request.readout.frontier[0];
      const admitted = await request.planOrDischargeFn({ duty, root: request.root, apply: true, binding: null, admitDischargeFn: request.admitDischargeFn });
      return { duties: [{ ...admitted, status: "applied" }], ok: true };
    },
    planOrDischarge: async ({ admitDischargeFn }) => ({ admission: await admitDischargeFn(null, { scope: "task:exact-deps-spotcomp" }) }),
  });
  assert.equal(summary.considered, 1);
  assert.equal(summary.executed, 1);
  assert.equal(summary.discharged, 1);
  assert.equal(calls.dispatch.length, 0);
  assert.equal(calls.discharge.length, 1);
  assert.equal(calls.discharge[0].root, "/checkout");
  assert.equal(calls.discharge[0].scope, "task:exact-deps-spotcomp");
  assert.equal(calls.rail[0].tool, "work-discharge-admit");
});

test("a deterministic gate refusal never discharges or reaches inference", async () => {
  const calls = { rail: [], dispatch: [] };
  const rail = {
    call: async (tool, input) => {
      if (tool === "agent-work-dispatch") return { frontier: [{ scope: "task:exact-deps-spotcomp", text: "exact pins", intent: "i", state: "ready" }] };
      calls.rail.push({ tool, input });
      return { admitted: true };
    },
  };
  const summary = await executeReadyDuties({
    rail,
    destinationParent: "/sec",
    dialectExample: "# example\n",
    producer: PRODUCER,
    deterministicRoot: "/checkout",
    deterministicScope: "task:exact-deps-spotcomp",
    applyDeterministic: true,
    classify: () => ({ lane: "script", workType: "procedure" }),
    dispatch: async () => { calls.dispatch.push(true); },
    discharge: async () => ({ duties: [{ status: "refused", refusal: { reason: "gate-failed" } }], ok: false }),
  });
  assert.equal(summary.discharged, 0);
  assert.equal(summary.outcomes[0].outcome, "refused");
  assert.equal(calls.rail.length, 0);
  assert.equal(calls.dispatch.length, 0);
});

test("awaits deterministic rail admission before discharge and records a rejected admission without discharging", async () => {
  const rail = {
    call: async (tool) => tool === "agent-work-dispatch"
      ? { frontier: [{ scope: "task:exact-deps-spotcomp", text: "exact pins", intent: "i", state: "ready" }] }
      : Promise.reject(new Error("rail refusal")),
  };
  const summary = await executeReadyDuties({
    rail,
    destinationParent: "/sec",
    dialectExample: "# example\n",
    producer: PRODUCER,
    deterministicRoot: "/checkout",
    deterministicScope: "task:exact-deps-spotcomp",
    applyDeterministic: true,
    classify: () => ({ lane: "script", workType: "procedure" }),
    discharge: async (request) => ({ duties: [await request.planOrDischargeFn({ duty: request.readout.frontier[0], root: request.root, apply: true, binding: null, admitDischargeFn: request.admitDischargeFn })], ok: true }),
    planOrDischarge: async ({ admitDischargeFn }) => ({ status: "applied", admission: await admitDischargeFn(null, {}) }),
  });
  assert.equal(summary.discharged, 0);
  assert.equal(summary.outcomes[0].outcome, "failed");
  assert.match(summary.outcomes[0].error, /rail refusal/u);
});

test("does not report deterministic discharge until an asynchronous rail admission resolves", async () => {
  let resolveAdmission;
  const admission = new Promise((resolve) => { resolveAdmission = resolve; });
  let pending = false;
  const rail = {
    call: async (tool) => tool === "agent-work-dispatch"
      ? { frontier: [{ scope: "task:exact-deps-spotcomp", text: "exact pins", intent: "i", state: "ready" }] }
      : admission,
  };
  const execution = executeReadyDuties({
    rail,
    destinationParent: "/sec",
    dialectExample: "# example\n",
    producer: PRODUCER,
    deterministicRoot: "/checkout",
    deterministicScope: "task:exact-deps-spotcomp",
    applyDeterministic: true,
    classify: () => ({ lane: "script", workType: "procedure" }),
    discharge: async (request) => {
      const result = await request.planOrDischargeFn({ duty: request.readout.frontier[0], root: request.root, apply: true, binding: null, admitDischargeFn: request.admitDischargeFn });
      pending = result.admission.admitted === true;
      return { duties: [{ ...result, status: "applied" }], ok: true };
    },
    planOrDischarge: async ({ admitDischargeFn }) => ({ status: "applied", admission: await admitDischargeFn(null, {}) }),
  });
  await Promise.resolve();
  assert.equal(pending, false);
  resolveAdmission({ admitted: true });
  const summary = await execution;
  assert.equal(pending, true);
  assert.equal(summary.discharged, 1);
});
