import assert from "node:assert/strict";
import { agentWorkReadoutOfRows } from "@red-cup-engineering/organizing/work/readout";
import { isJsonValue } from "@red-cup-engineering/json-services-section/is-json-value";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { admitStructuredWorkIntent, assessedBy } from "@red-cup-engineering/feltos/work/structured-intent";
import { intentOfThread, openingOf, workBoard } from "@red-cup-engineering/organizing/enterprise";
import { readAllocationCandidates, reconcileAllocations, retryableAllocationStartup } from "@red-cup-engineering/feltos/work/allocation-control";
import { readAgentWorkDispatchReadout } from "@red-cup-engineering/feltos/work/dispatch-readout";
import { admitCharacterMasks, admitHarnessCarriers, harnessModelCharacterResolver } from "../src/offices.mjs";
const { admitAgencyWorkExecution } = await import(new URL("./agency-work-execution.mjs", import.meta.resolve("@red-cup-engineering/feltos/work/service")));
import { workCoordinationOperations } from "@red-cup-engineering/feltos/work/service";
import { workResultProposalByReceipt } from "@red-cup-engineering/feltos/work/work-result-proposal";
import { admitWorkDischargeWithProposal } from "@red-cup-engineering/feltos/work/work-discharge";
import { allocationSources } from "../src/allocation-sources.mjs";
import { firmPoolAuthorityCandidates, firmPoolAuthorityResolver } from "../src/firm-pool-authority.mjs";

const DATE = "2026-09-30";
// Work as a micro-enterprise takes it up: a person's request opened on the board, as its taker's intent.
const workIntentOfRequest = (need, by) => intentOfThread(workBoard([openingOf({ move: "request", by, need, at: `${DATE}T09:00:00Z` })], `${DATE}T12:00:00Z`).threads[0]);
const assessment = { work: "operating-work-lifecycle-and-staffing-allocation", skill: "operate-work-lifecycle-and-staffing-allocation" };
let repositoryRoot = import.meta.dirname;
while (!existsSync(path.join(repositoryRoot, ".git")) && repositoryRoot !== path.dirname(repositoryRoot)) repositoryRoot = path.dirname(repositoryRoot);
const firmPoolRoot = path.join(repositoryRoot, "lib/emsenn/services/561-group/services/561-group-services-section");
function fixture(extraOptions = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "allocation-control-"));
  const binding = { ...defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00Z` }), agencyRoot: firmPoolRoot };
  const authority = firmPoolAuthorityCandidates({ firmPoolRoot }, assessment).candidates;
  assert.equal(authority.length, 1);
  const capabilities = authority[0].officeService.requiredCapabilities;
  const carrier = (character, reading = "held", at = `${DATE}T10:00:00Z`, model = "fixture-model", reasoningEffort, session = character) => {
    admitHarnessCarriers({ dataRoot: root, date: DATE, carriers: [{ kind: "metroplat.harness-carrier", character, model, harness: "test", session,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }), capabilities, reading, issuer: "test", at }] });
    admitCharacterMasks({ dataRoot: root, date: DATE, masks: [{ kind: "metroplat.character-mask", account: `session:${character}`, character, reading, issuer: "test", at }] });
  };
  const options = { demandAssessment: assessment, ...allocationSources(binding),
    resolveAgencyWorkAuthority: request => firmPoolAuthorityResolver({ firmPoolRoot })(request),
    resolveModelCharacter: character => harnessModelCharacterResolver(binding)(character),
    // The host's scoped-grant gate (feltos-enterprise-host agency-work.mjs): the delegation names the
    // office service as its authority; this fixture's charter grants it to the fixture carrier.
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: [...selected.officeService.requiredCapabilities],
      effects: ["fixture"], authority: `office-service:${selected.office}` }),
    authorizeProviderDelegation: request => ({ authority: request.authority, revision: "fixture", evidence: [`fixture-charter-grant:${request.holder}`] }),
    ...extraOptions };
  const read = input => readAllocationCandidates(binding, input, options);
  const reconcile = input => reconcileAllocations(binding, input, options);
  const admit = text => admitStructuredWorkIntent(binding, assessedBy(assessment, workIntentOfRequest(text, "fixture-person")), { at: DATE });
  return { binding, root, carrier, read, reconcile, admit, options, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test("provider projection preserves the same character's observed sessions at distinct reasoning efforts", async () => {
  const f = fixture();
  try {
    f.carrier("fixture-executor", "held", `${DATE}T10:00:00Z`, "gpt-6-luna", "high", "luna-high");
    f.carrier("fixture-executor", "held", `${DATE}T10:01:00Z`, "gpt-6-luna", "medium", "luna-medium");
    const projected = f.options.readAllocationCharacters()
      .filter(provider => provider.character.id === "fixture-executor" && provider.character.model === "gpt-6-luna");
    assert.deepEqual(projected.map(provider => provider.reasoningEffort).sort(), ["high", "medium"]);
    assert.deepEqual(new Set(projected.map(provider => provider.session)), new Set(["luna-high", "luna-medium"]));
  } finally { f.dispose(); }
});

test("transient pre-native startup failures get fresh bounded allocations", async () => {
  const authorization = { authority: "fixture-provider", revision: "fixture", evidence: ["fixture:authority"] };
  const f = fixture({
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: authorization.authority }),
    authorizeProviderDelegation: () => authorization,
  });
  try {
    f.carrier("fixture-executor");
    const scope = admitStructuredWorkIntent(f.binding,
      assessedBy(assessment, workIntentOfRequest("A transient required-node startup failure is recovered", "fixture-person")),
      { at: DATE }).obligations[0].scope;
    let allocated = (await f.reconcile({ scope })).items[0];
    assert.equal(allocated.state, "allocated", JSON.stringify(allocated.reasons));
    const seen = new Set([allocated.admission.allocation]);
    // Unstamped startup failures are retried at once, up to six attempts (feltos 3fe499f).
    for (let attempt = 1; attempt <= 6; attempt++) {
      const item = readAgentWorkDispatchReadout(f.binding, DATE).queue.find(item => item.scope === scope);
      admitAgencyWorkExecution(f.binding, item, "failed", attempt === 1
        ? "required MCP servers failed to initialize: client_credentials token request failed: 502"
        : "required MCP servers failed to initialize: 561-bare-cedar-fog: timed out handshaking with MCP server after 59.99999936s");
      if (attempt === 6) {
        assert.equal(f.read({ scope }).items[0].state, "already-allocated");
        assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue.find(item => item.scope === scope).execution.state, "failed");
      } else {
        assert.equal(f.read({ scope }).items[0].state, "allocatable");
        allocated = (await f.reconcile({ scope })).items[0];
        assert.equal(allocated.state, "allocated");
        assert.equal(allocated.dispatch.state, "ready");
        assert.ok(allocated.admission.allocation.startsWith(`allocation-startup-${attempt + 1}-`));
        assert.equal(seen.has(allocated.admission.allocation), false);
        seen.add(allocated.admission.allocation);
        assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue.find(item => item.scope === scope).execution, undefined);
      }
    }
    assert.equal(seen.size, 6);
  } finally { f.dispose(); }
});

test("startup recovery excludes native executions and permanent authorization refusals", async () => {
  const item = { allocation: "allocation-original", execution: { state: "failed", error: "required MCP servers failed to initialize: 561-bare-cedar-fog: timed out handshaking with MCP server after 59.99999936s" } };
  assert.equal(retryableAllocationStartup(item), true);
  assert.equal(retryableAllocationStartup({ ...item, execution: { ...item.execution, session: "actual-native-thread" } }), false);
  assert.equal(retryableAllocationStartup({ ...item, assignment: { state: "started" } }), false);
  assert.equal(retryableAllocationStartup({ ...item, allocation: "allocation-startup-5-original" }), true);
  assert.equal(retryableAllocationStartup({ ...item, allocation: "allocation-startup-6-original" }), false);
  // A stamped carrier-startup failure waits five minutes per prior attempt after it happened.
  const failedAt = Date.parse(`${DATE}T12:00:00Z`);
  const stamped = { allocation: "allocation-startup-2-original", execution: { state: "failed", failure: "carrier-startup", at: new Date(failedAt).toISOString() } };
  assert.equal(retryableAllocationStartup(stamped, failedAt + 9 * 60_000), false);
  assert.equal(retryableAllocationStartup(stamped, failedAt + 10 * 60_000), true);
  assert.equal(retryableAllocationStartup({ ...item, execution: { state: "failed", error: "required MCP servers failed to initialize: client_credentials token request failed: 403" } }), false);
  assert.equal(retryableAllocationStartup({ ...item, execution: { state: "failed", error: "a business operation timed out" } }), false);
});

test("authority is shared across identical model requests only within one candidate read", async () => {
  let calls = 0, withdrawn = false;
  const f = fixture({
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: "fixture-provider" }),
    authorizeProviderDelegation: () => {
      calls++;
      if (withdrawn) throw new TypeError("office withdrawn");
      return { authority: "fixture-provider", evidence: ["fixture:current-office"] };
    },
  });
  try {
    f.carrier("fixture-executor");
    const readCharacters = f.options.readAllocationCharacters;
    f.options.readAllocationCharacters = () => readCharacters().flatMap(provider => [
      provider, { ...provider, character: { ...provider.character, model: "fixture-alt" } },
    ]);
    const scope = admitStructuredWorkIntent(f.binding,
      assessedBy(assessment, workIntentOfRequest("The same incumbent holds standing on two models", "fixture-person")),
      { at: DATE }).obligations[0].scope;
    const initial = f.read({ scope }).items[0];
    assert.equal(initial.state, "allocatable", JSON.stringify(initial.reasons));
    assert.equal(calls, 1);
    withdrawn = true;
    const reading = f.read({ scope });
    assert.equal(reading.items[0].state, "obstructed");
    assert.equal(calls, 2);
    assert.equal((await f.reconcile({ scope })).items[0].state, "obstructed");
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue.length, 0);
  } finally { f.dispose(); }
});

test("one witnessed demand becomes a ready office service; replay adds no second allocation", async () => {
  const f = fixture();
  try {
    f.carrier("fixture-executor");
    const admission = f.admit("The allocation report is assessed and its engineering work routed");
    const scope = admission.obligations[0].scope;
    const reading = f.read({ scope });
    assert.equal(reading.items[0].state, "allocatable");
    assert.deepEqual(reading.items[0].obligationWitness, { subject: admission.subject, witness: admission.obligations[0].witness });
    const result = (await f.reconcile({ scope })).items[0];
    assert.equal(result.state, "allocated", JSON.stringify(result.reasons));
    assert.equal(result.dispatch.state, "ready");
    assert.equal((await f.reconcile({ scope })).items[0].state, "already-allocated");
    const dispatch = readAgentWorkDispatchReadout(f.binding, DATE);
    assert.equal(dispatch.frontier.length, 1);
    assert.equal(dispatch.frontier[0].office, "chief-operations-officer");
    assert.equal(dispatch.frontier[0].signedAction.resources[0].resource.locator, admission.obligations[0].witness);
    // A fresh read after losing every controller-local object reconstructs it.
    assert.equal(readAgentWorkDispatchReadout({ ...f.binding }, DATE).frontier[0].allocation, result.admission.allocation);
  } finally { f.dispose(); }
});

test("missing, withdrawn and incomparable providers stay explicit and write no allocation", async () => {
  const f = fixture();
  try {
    const admission = f.admit("Provider qualification stays explicit");
    const scope = admission.obligations[0].scope;
    assert.ok(f.read({ scope }).items[0].reasons.includes("no-current-provider-admission"));
    // Characters under one office duty are execution choices ranked by expected cost (feltos 0beca6e),
    // not competing authorities: the selection and its policy are explicit, and nothing is written by a read.
    f.carrier("one"); f.carrier("two");
    const both = f.read({ scope }).items[0];
    assert.equal(both.state, "allocatable");
    assert.equal(both.selection.policy, "least-expected-cost-carrier-of-sole-authority");
    assert.deepEqual(both.candidates.map(candidate => candidate.character.id).sort(), ["one", "two"]);
    f.carrier("two", "denied", `${DATE}T11:00:00Z`);
    assert.equal(f.read({ scope }).items[0].state, "allocatable");
    assert.equal(f.read({ scope }).items[0].selection.character, "one");
    f.carrier("one", "denied", `${DATE}T11:00:00Z`);
    assert.equal((await f.reconcile({ scope })).items[0].state, "obstructed");
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue.length, 0);
  } finally { f.dispose(); }
});

test("unknown work has a typed missing authority instead of acquiring staffing authority", async () => {
  const f = fixture();
  try {
    f.carrier("fixture-executor");
    const unassessed = admitStructuredWorkIntent(f.binding, workIntentOfRequest("Unsupported service", "fixture-person"), { at: DATE });
    assert.ok((await f.reconcile({ scope: unassessed.obligations[0].scope })).items[0].reasons.includes("work-not-declared"));
    const intent = assessedBy({ work: "work-no-office-offers", skill: "skill-no-office-offers" }, workIntentOfRequest("A service no office offers is delivered", "fixture-person"));
    const admission = admitStructuredWorkIntent(f.binding, intent, { at: DATE });
    const result = (await f.reconcile({ scope: admission.obligations[0].scope })).items[0];
    assert.equal(result.state, "obstructed");
    assert.ok(result.reasons.includes("office-duty-service-missing"));
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue.length, 0);
  } finally { f.dispose(); }
});

test("a bounded reconciliation scans past unresolved obligations to eligible work", async () => {
  const f = fixture();
  try {
    f.carrier("fixture-executor");
    for (let i = 0; i < 3; i += 1) admitStructuredWorkIntent(f.binding,
      workIntentOfRequest(`Unsupported service ${i}`, "fixture-person"), { at: DATE });
    const admission = f.admit("The eligible demand after unresolved work is assessed");
    // A limited reconciliation examines its cut per turn; the turn cursor rotates the cut
    // (feltos 8d77bbc, 84e58b2), so unresolved obligations cannot hold every turn.
    let allocated;
    for (let turn = 0; turn < 4 && allocated === undefined; turn += 1) {
      const result = await f.reconcile({ limit: 1, cursor: turn });
      assert.ok(result.examined <= 1);
      allocated = result.items.find(item => item.state === "allocated");
    }
    assert.equal(allocated?.scope, admission.obligations[0].scope);
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).frontier.length, 1);
  } finally { f.dispose(); }
});

test("unclassified historical obligations remain representable on the clock RPC boundary", async () => {
  const f = fixture();
  try {
    const admitted = admitStructuredWorkIntent(f.binding, workIntentOfRequest("Historical unclassified obligation", "fixture-person"), { at: DATE });
    const reading = f.read({ scope: admitted.obligations[0].scope });
    assert.equal(isJsonValue(reading), true);
    assert.ok(reading.items[0].reasons.includes("work-not-declared"));
    assert.ok(reading.items[0].reasons.includes("skill-not-declared"));
    const result = (await f.reconcile({}));
    assert.equal(isJsonValue(result), true);
    assert.equal(result.counts.obstructed, 1);
  } finally { f.dispose(); }
});

test("claim-only legacy obligations do not introduce undefined dispatch fields", async () => {
  const reading = agentWorkReadoutOfRows([["legacy-session", { cell: "task:legacy", reading: "unknown" },
    { boundary: { role: "obligation", text: "Legacy declared work" } }, DATE]], { subject: "fixture-person", date: DATE });
  assert.equal(reading.unallocated.length, 1);
  assert.equal(isJsonValue(reading), true);
});

test("unallocated required-carrier intent constrains selection and is admitted on that carrier", async () => {
  const authorization = { authority: "fixture-provider", revision: "fixture", evidence: ["fixture:authority"] };
  const requiredCarrier = { model: "gpt-6-luna", reasoningEffort: "high" };
  let admittedRequiredCarrier;
  const f = fixture({
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: authorization.authority }),
    authorizeProviderDelegation: () => authorization,
    resolveAllocationStaffing: ({ requiredCarrier: required }) => ({ effort: required?.reasoningEffort ?? "medium" }),
    resolveRequiredCarrier: ({ character, requiredCarrier: required }) => {
      admittedRequiredCarrier = required;
      return character.model === required.model && required.reasoningEffort === "high";
    },
  });
  try {
    f.carrier("exact-provider", "held", `${DATE}T10:00:00Z`, "gpt-6-luna", "high", "luna-high");
    f.carrier("wrong-effort-provider", "held", `${DATE}T10:01:00Z`, "gpt-6-luna", "medium", "luna-medium");
    f.carrier("wrong-model-provider", "held", `${DATE}T10:02:00Z`, "fixture-model", undefined, "fixture-default");
    const readCharacters = f.options.readAllocationCharacters;
    f.options.readAllocationCharacters = () => readCharacters().map(provider => ({ ...provider, available: true }));
    const intent = assessedBy(assessment, workIntentOfRequest("An engineering delivery completed on the required execution carrier", "fixture-person"));
    const constrained = { ...intent, items: intent.items.map(item => item.work === assessment.work ? { ...item, requiredCarrier } : item) };
    const scope = admitStructuredWorkIntent(f.binding, constrained, { at: DATE }).obligations[0].scope;

    const candidates = f.read({ scope }).items[0];
    assert.deepEqual(candidates.requiredCarrier, requiredCarrier);
    assert.equal(candidates.state, "allocatable", JSON.stringify({ reasons: candidates.reasons, candidates: candidates.candidates }));
    assert.deepEqual(candidates.selection, { character: "exact-provider", model: "gpt-6-luna", policy: "least-expected-cost-carrier-of-sole-authority" });
    assert.ok(candidates.candidates.some(candidate => candidate.character.id === "wrong-effort-provider" && candidate.reasons.includes("required-carrier-unavailable")));
    assert.ok(candidates.candidates.some(candidate => candidate.character.id === "wrong-model-provider" && candidate.reasons.includes("required-carrier-unavailable")));

    const result = (await f.reconcile({ scope })).items[0];
    assert.equal(result.state, "allocated", JSON.stringify(result.reasons));
    assert.deepEqual(admittedRequiredCarrier, requiredCarrier);
    assert.deepEqual(readAgentWorkDispatchReadout(f.binding, DATE).frontier[0].requiredCarrier, requiredCarrier);

    const ordinaryIntent = assessedBy(assessment, workIntentOfRequest("An engineering delivery completed using an eligible session", "fixture-person"));
    const ordinaryScope = admitStructuredWorkIntent(f.binding, ordinaryIntent, { at: DATE }).obligations[0].scope;
    const ordinary = f.read({ scope: ordinaryScope }).items[0];
    assert.equal(ordinary.requiredCarrier, undefined);
    assert.equal(ordinary.candidates.find(candidate => candidate.reasons.length === 0)?.staffing.effort, "medium");
  } finally { f.dispose(); }
});

test("an undeclared parent composes its executable child without a phantom staffing demand", async () => {
  const f = fixture();
  try {
    const intent = workIntentOfRequest("Parent delivery outcome", "fixture-person");
    const parent = intent.items[0].cell;
    const admitted = admitStructuredWorkIntent(f.binding, { ...intent, items: [...intent.items,
      { cell: "campaign:fixture-child", parent, text: "Assess the child", work: assessment.work, skill: assessment.skill,
        evidence: [], provenance: intent.items[0].provenance }] }, { at: DATE });
    assert.equal(admitted.obligations.length, 2);
    const dispatch = readAgentWorkDispatchReadout(f.binding, DATE);
    assert.deepEqual(dispatch.unallocated.map(item => item.scope), ["campaign:fixture-child"]);
    assert.ok(f.read({ scope: parent }).items[0].reasons.includes("execution-obligation-missing"));
  } finally { f.dispose(); }
});


test("routed assessments execute once, await independent receipt, then advance the next demand", async () => {
  let executions = 0, complete;
  const authorization = { authority: "fixture-provider", revision: "fixture", evidence: ["fixture:authority"] };
  const f = fixture({
    demandAssessment: assessment,
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: authorization.authority }),
    authorizeProviderDelegation: () => authorization,
    agencyWorkProviders: ["fixture-executor"],
    executeAgencyWork: async item => {
      executions += 1;
      await new Promise(resolve => { complete = resolve; });
      return { execution: `fixture-execution:${executions}`, producer: { id: item.agent, revision: "fixture-model" }, result: { kind: "skill-result", value: { assessed: item.scope } }, providerEvidence: ["fixture:assessment"] };
    },
  });
  try {
    f.carrier("fixture-executor");
    f.admit("First witnessed assessment"); f.admit("Second witnessed assessment");
    assert.equal(f.read({}).items.filter(item => item.state === "allocatable").length, 2);
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated, 1);
    const pump = workCoordinationOperations(f.binding, f.options).find(operation => operation.verb === "agency-work-pump");
    const pending = pump.execute({});
    await new Promise(resolve => setImmediate(resolve));
    const started = readAgentWorkDispatchReadout({ ...f.binding }, DATE);
    assert.equal(started.queue.filter(item => item.state === "in-flight").length, 1);
    assert.equal(started.queue.find(item => item.state === "in-flight").allocatedModel, "fixture-model");
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated ?? 0, 0);
    assert.equal((await pump.execute({})).ran.length, 0);
    complete();
    const first = (await pending).ran[0];
    assert.equal(executions, 1);
    const awaiting = readAgentWorkDispatchReadout({ ...f.binding }, DATE);
    assert.equal(awaiting.frontier.length, 0);
    assert.equal(awaiting.queue.find(item => item.scope === first.scope).execution.state, "proposed");
    // A pending result holds only its own scope against a second execution (feltos 1a7ea27);
    // independent demand stays staffable on the same carrier.
    assert.notEqual(f.read({ scope: first.scope }).items[0].state, "allocatable");
    const item = awaiting.queue.find(item => item.scope === first.scope);
    const proposal = workResultProposalByReceipt(f.binding, first.proposal.receipt, item.subject);
    const discharge = {
      kind: "metroplat.work.discharge", id: "fixture-independent-receipt", subject: proposal.subject, intent: proposal.intent,
      allocation: proposal.allocation, producer: proposal.producer, scope: proposal.scope,
      text: "The independent receiver inspected the actual assessment", result: proposal.result, resultReceipt: proposal.receipt,
      receiver: { id: "fixture-receiver", evidence: ["fixture:independent-inspection"] }, evidence: ["fixture:assessed-demand"],
    };
    assert.throws(() => admitWorkDischargeWithProposal(f.binding, { ...discharge, receiver: { ...discharge.receiver, id: proposal.producer.id } }, { at: DATE, receiverAuthorization: { evaluation: { allowed: true, kind: "fixture", snapshotRevision: "fixture", evidenceRefs: ["fixture:independent"] } } }), /same-character/);
    admitWorkDischargeWithProposal(f.binding, discharge, { at: DATE, receiverAuthorization: { evaluation: { allowed: true, kind: "fixture", snapshotRevision: "fixture", evidenceRefs: ["fixture:independent"] } } });
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue.filter(item => item.state === "done").length, 1);
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated, 1);
    const next = pump.execute({});
    await new Promise(resolve => setImmediate(resolve)); complete();
    assert.equal((await next).ran.length, 1);
    assert.equal(executions, 2);
  } finally { f.dispose(); }
});

// Execution choices are the current qualified carriers (feltos fd01e3d); no configured model is invented.
test("without an admitted carrier no model becomes an execution choice", async () => {
  const f = fixture({ demandAssessment: assessment });
  try {
    f.admit("A model carrier is never invented");
    assert.equal(f.read({}).items[0].state, "obstructed");
    assert.ok(f.read({}).items[0].reasons.includes("no-current-provider-admission"));
    assert.equal((await f.reconcile({})).counts.allocated ?? 0, 0);
  } finally { f.dispose(); }
});

test("candidate pages fit the RPC carrier and the cursor reaches the remaining demands", async () => {
  const f = fixture();
  try {
    f.carrier("fixture-executor");
    for (let i = 0; i < 8; i += 1) f.admit(`Witnessed paged demand ${i}`);
    const scopes = [];
    let cursor = 0;
    do {
      const page = f.read({ limit: 3, cursor });
      assert.ok(Buffer.byteLength(JSON.stringify(page)) < 1_000_000);
      scopes.push(...page.items.map(item => item.scope));
      cursor = page.nextCursor;
    } while (cursor !== undefined);
    assert.equal(scopes.length, 8);
    assert.equal(new Set(scopes).size, 8);
  } finally { f.dispose(); }
});


test("a restarted pump recovers the completed worker with verified session provenance", async () => {
  let recovered = 0, executed = 0;
  const authorization = { authority: "fixture-provider", revision: "fixture", evidence: ["fixture:authority"] };
  const f = fixture({
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: authorization.authority }),
    authorizeProviderDelegation: () => authorization, agencyWorkProviders: ["fixture-executor"],
    executeAgencyWork: () => { executed += 1; throw new Error("must recover the existing process"); },
    recoverAgencyWork: item => { recovered += 1; return { execution: "codex-thread:actual-fixture-process", producer: { id: item.agent, revision: "fixture-model" }, session: { id: "actual-fixture-process", model: "fixture-model" }, result: { kind: "skill-result", value: { assessed: item.scope } }, providerEvidence: ["fixture:durable-process-artifacts"] }; },
    resolveOfficeSession: (_character, office, session) => ({ office, session, model: "fixture-model" }),
  });
  try {
    f.carrier("fixture-executor"); f.admit("The worker is recovered after the resident node restarts");
    (await f.reconcile({}));
    const duty = readAgentWorkDispatchReadout(f.binding, DATE).frontier[0];
    admitAgencyWorkExecution(f.binding, duty, "started");
    const pump = workCoordinationOperations({ ...f.binding }, f.options).find(operation => operation.verb === "agency-work-pump");
    const first = (await pump.execute({})).ran[0];
    assert.ok(first, "the actual completed process becomes a proposal after restart");
    assert.equal(executed, 0); assert.equal(recovered, 1);
    const proposal = workResultProposalByReceipt(f.binding, first.proposal.receipt, duty.subject);
    assert.equal(proposal.origin.session, "actual-fixture-process");
    const discharge = { kind: "metroplat.work.discharge", id: "fixture-session-receipt", subject: proposal.subject, intent: proposal.intent, allocation: proposal.allocation, producer: proposal.producer, scope: proposal.scope, text: "Inspected recovered assessment", result: proposal.result, resultReceipt: proposal.receipt, receiver: { id: proposal.producer.id, office: "chief-technology-officer", session: "actual-fixture-receiver", evidence: ["fixture:independent-session"] }, evidence: ["fixture:inspected-recovery"] };
    const receiverAuthorization = { evaluation: { allowed: true, kind: "fixture", snapshotRevision: "fixture", evidenceRefs: ["fixture:independent"] }, office: "chief-technology-officer", session: "actual-fixture-receiver", receivesFrom: ["chief-operations-officer"] };
    assert.throws(() => admitWorkDischargeWithProposal(f.binding, discharge, { at: DATE, receiverAuthorization: { ...receiverAuthorization, session: proposal.origin.session } }), /same-character/);
    admitWorkDischargeWithProposal(f.binding, discharge, { at: DATE, receiverAuthorization });
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).queue[0].state, "done");
    assert.equal((await pump.execute({})).ran.length, 0);
  } finally { f.dispose(); }
});

test("a received provider error releases capacity and keeps its demand open", async () => {
  let executions = 0, complete;
  const authorization = { authority: "fixture-provider", revision: "fixture", evidence: ["fixture:authority"] };
  const f = fixture({
    demandAssessment: assessment,
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: authorization.authority }),
    authorizeProviderDelegation: () => authorization,
    agencyWorkProviders: ["fixture-executor"],
    executeAgencyWork: async item => {
      executions += 1;
      await new Promise(resolve => { complete = resolve; });
      return { execution: `fixture-execution:${executions}`, producer: { id: item.agent, revision: "fixture-model" }, result: { kind: "skill-error", error: "fixture executor unavailable" }, providerEvidence: ["fixture:assessment"] };
    },
  });
  try {
    f.carrier("fixture-executor");
    f.admit("First witnessed assessment"); f.admit("Second witnessed assessment");
    assert.equal(f.read({}).items.filter(item => item.state === "allocatable").length, 2);
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated, 1);
    const pump = workCoordinationOperations(f.binding, f.options).find(operation => operation.verb === "agency-work-pump");
    const pending = pump.execute({});
    await new Promise(resolve => setImmediate(resolve));
    const started = readAgentWorkDispatchReadout({ ...f.binding }, DATE);
    assert.equal(started.queue.filter(item => item.state === "in-flight").length, 1);
    assert.equal(started.queue.find(item => item.state === "in-flight").allocatedModel, "fixture-model");
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated ?? 0, 0);
    assert.equal((await pump.execute({})).ran.length, 0);
    complete();
    const first = (await pending).ran[0];
    assert.equal(executions, 1);
    // A witnessed producer error is already a failed observation: it ends the attempt without an
    // acceptance review (feltos 46892ff), releases the carrier, and leaves the demand open.
    const failed = readAgentWorkDispatchReadout({ ...f.binding }, DATE).queue.find(item => item.scope === first.scope);
    assert.equal(failed.execution.state, "failed");
    assert.equal(failed.status, "open");
    assert.ok((await f.reconcile({ limit: 2 })).counts.allocated >= 1);
    const next = pump.execute({});
    await new Promise(resolve => setImmediate(resolve)); complete();
    assert.equal((await next).ran.length, 1);
    assert.equal(executions, 2);
  } finally { f.dispose(); }
});


test("a rejected successful proposal releases capacity without closing the demand", async () => {
  let executions = 0, complete;
  const authorization = { authority: "fixture-provider", revision: "fixture", evidence: ["fixture:authority"] };
  const f = fixture({
    demandAssessment: assessment,
    resolveAllocationDelegation: selected => ({ provider: selected.character.id, operations: ["fixture#read"], effects: ["host-read"], authority: authorization.authority }),
    authorizeProviderDelegation: () => authorization,
    agencyWorkProviders: ["fixture-executor"],
    executeAgencyWork: async item => {
      executions += 1;
      await new Promise(resolve => { complete = resolve; });
      return { execution: `fixture-execution:${executions}`, producer: { id: item.agent, revision: "fixture-model" }, result: { kind: "skill-result", value: { claim: "unchecked completion" } }, providerEvidence: ["fixture:assessment"] };
    },
  });
  try {
    f.carrier("fixture-executor");
    f.admit("First witnessed assessment"); f.admit("Second witnessed assessment");
    assert.equal(f.read({}).items.filter(item => item.state === "allocatable").length, 2);
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated, 1);
    const pump = workCoordinationOperations(f.binding, f.options).find(operation => operation.verb === "agency-work-pump");
    const pending = pump.execute({});
    await new Promise(resolve => setImmediate(resolve));
    const started = readAgentWorkDispatchReadout({ ...f.binding }, DATE);
    assert.equal(started.queue.filter(item => item.state === "in-flight").length, 1);
    assert.equal(started.queue.find(item => item.state === "in-flight").allocatedModel, "fixture-model");
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated ?? 0, 0);
    assert.equal((await pump.execute({})).ran.length, 0);
    complete();
    const first = (await pending).ran[0];
    assert.equal(executions, 1);
    const awaiting = readAgentWorkDispatchReadout({ ...f.binding }, DATE);
    assert.equal(awaiting.frontier.length, 0);
    assert.equal(awaiting.queue.find(item => item.scope === first.scope).execution.state, "proposed");
    // A pending result holds only its own scope against a second execution (feltos 1a7ea27).
    assert.notEqual(f.read({ scope: first.scope }).items[0].state, "allocatable");
    const item = awaiting.queue.find(item => item.scope === first.scope);
    const proposal = workResultProposalByReceipt(f.binding, first.proposal.receipt, item.subject);
    const discharge = {
      kind: "metroplat.work.discharge", id: "fixture-independent-receipt", decision: "rejected", subject: proposal.subject, intent: proposal.intent,
      allocation: proposal.allocation, producer: proposal.producer, scope: proposal.scope,
      text: "The independent receiver inspected the actual assessment", result: proposal.result, resultReceipt: proposal.receipt,
      receiver: { id: "fixture-receiver", evidence: ["fixture:independent-inspection"] }, evidence: ["fixture:assessed-demand"],
    };
    assert.throws(() => admitWorkDischargeWithProposal(f.binding, { ...discharge, receiver: { ...discharge.receiver, id: proposal.producer.id } }, { at: DATE, receiverAuthorization: { evaluation: { allowed: true, kind: "fixture", snapshotRevision: "fixture", evidenceRefs: ["fixture:independent"] } } }), /same-character/);
    admitWorkDischargeWithProposal(f.binding, discharge, { at: DATE, receiverAuthorization: { evaluation: { allowed: true, kind: "fixture", snapshotRevision: "fixture", evidenceRefs: ["fixture:independent"] } } });
    const failed = readAgentWorkDispatchReadout(f.binding, DATE).queue.find(item => item.scope === first.scope);
    assert.equal(failed.state, "blocked");
    assert.equal(failed.status, "open");
    assert.equal(failed.execution.state, "failed");
    assert.ok(failed.execution.receiverReceipt);
    assert.equal((await f.reconcile({ limit: 2 })).counts.allocated, 1);
    const next = pump.execute({});
    await new Promise(resolve => setImmediate(resolve)); complete();
    assert.equal((await next).ran.length, 1);
    assert.equal(executions, 2);
  } finally { f.dispose(); }
});


const { delegatedVerbs, delegationGrants } = await import("../src/offices.mjs");
test("a started allocated assessment retains its scoped delegated resources and work packet", async () => {
  const provider = "fixture-active-executor";
  const resource = Object.values((await import("../src/generated/operation-family-descriptors.mjs")).operationFamilyDescriptors).flat().find(op => op.verb === "work-item");
  const f = fixture({ demandAssessment: { ...assessment, execution: { character: provider, model: "fixture-model", maxOutstanding: 1 } }, resolveAllocationDelegation: selected => ({ provider, operations: [resource.ref], effects: ["journal-read"], authority: "fixture-active-office" }), authorizeProviderDelegation: () => ({ authority: "fixture-active-office", revision: "fixture", evidence: ["fixture:current-authority"] }) });
  try {
    f.carrier(provider);
    const scope = f.admit("Work with resources that persist during execution is assessed").obligations[0].scope;
    const selected = (await f.reconcile({ scope })).items[0];
    assert.equal(selected.state, "allocated", JSON.stringify(selected));
    const item = readAgentWorkDispatchReadout(f.binding, DATE).frontier[0];
    admitAgencyWorkExecution(f.binding, item, "started");
    assert.equal(readAgentWorkDispatchReadout(f.binding, DATE).frontier.length, 0);
    const packetOp = workCoordinationOperations(f.binding, { providersOfSubject: () => [provider] }).find(op => op.verb === "agency-work-delegated");
    const packet = packetOp.execute({}, [], { invocation: { subject: `session:${provider}` } });
    assert.equal(packet.duties[0].scope, scope);
    assert.equal(packet.duties[0].provider, provider);
    assert.deepEqual(delegatedVerbs(f.binding, `session:${provider}`), ["work-item"]);
    assert.ok(delegationGrants(f.binding, `session:${provider}`)[0].grants.includes(encodeURIComponent(scope)));
    assert.deepEqual(delegatedVerbs(f.binding, "session:stranger"), []);
  } finally { f.dispose(); }
});


