import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { assembleDefaultServiceMcp } from "@red-cup-engineering/metroplat/catalog";
import { firmPoolAuthorityCandidates, firmPoolAuthorityResolver } from "@red-cup-engineering/metroplat/firm-pool-authority";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "@red-cup-engineering/relating/running/session";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { admitRows, threadRows } from "./support/claim-session-thread.mjs";
import {
  admitAgencyWorkAllocation,
  readingOfEnterpriseRecordReading,
} from "@red-cup-engineering/feltos/work/agency-work-allocation";
import { modelCharacterFromProviderAdmission, modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";
import { juralRelationClaimCell, juralRelationOfClaimCell, officeIncumbencyClaimCell, officeIncumbencyClaimOfCell } from "@red-cup-engineering/socializing";
import { agencyWorkAllocationMarkerOfRow } from "@red-cup-engineering/organizing/work/observations";
import { readAgentWorkDispatchReadout, readDutiesView } from "@red-cup-engineering/feltos/work/service";
import { admitStructuredWorkIntent } from "@red-cup-engineering/feltos/work/structured-intent";
import { admitCharacterMasks, admitHarnessCarriers, currentHarnessCarrier } from "@red-cup-engineering/metroplat/offices";

const DATE = "2026-09-01";
const ACTOR = "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4";
const SUBJECT = "structured-work-intent-founder-tunesday-2026-09-01";
const SCOPE = "work-item:pressure-plans-with-founder-rulings";
// The firm pool is the 561 Group section of the repository this test runs in.
let repositoryRoot = import.meta.dirname;
while (!existsSync(path.join(repositoryRoot, ".git")) && repositoryRoot !== path.dirname(repositoryRoot)) repositoryRoot = path.dirname(repositoryRoot);
const FIRM_POOL_ROOT = path.join(repositoryRoot, "lib/emsenn/services/561-group/services/561-group-services-section");

function intent() {
  const levels = [
    ["endeavor:shared-control-plane", undefined],
    ["campaign:agent-residency", "endeavor:shared-control-plane"],
    ["project:metroplat", "campaign:agent-residency"],
    ["plan:founder-intent", "project:metroplat"],
    ["task:operationalize-intent", "plan:founder-intent"],
    [SCOPE, "task:operationalize-intent"],
  ];
  return {
    kind: "metroplat.work.structured-intent",
    id: "founder-tunesday-2026-09-01",
    producer: { id: "test", revision: "1" },
    sources: [{ id: "prompt", kind: "natural-language-prompt" }],
    items: levels.map(([cell, parent], index) => ({
      cell,
      ...(parent === undefined ? {} : { parent }),
      ...(cell === SCOPE ? { work: "leading-company-strategy-and-priorities", skill: "lead-the-company" } : {}),
      text: cell,
      evidence: [],
      provenance: [{ source: "prompt", start: index, end: index + 1, unit: "unicode-code-point" }],
    })),
  };
}

function allocation(scope = SCOPE) {
  return {
    kind: "metroplat.work.agency-work-allocation",
    id: "founder-xo-pressure-plans",
    subject: SUBJECT,
    office: { id: "office:executive-officer-to-the-leader" },
    duty: "emsenn/duty/leading-company-strategy-and-priorities",
    character: { model: "test-model", id: ACTOR, capabilities: [] },
    officeService: { id: "emsenn/duty/leading-company-strategy-and-priorities", requiredCapabilities: [] },
    allocation: { scope },
  };
}

function authority(input) {
  return {
    office: { id: input.office.id, bearsDuty: [input.duty], deonticProfile: { "leading-company-strategy-and-priorities": "duty" } },
    duty: { id: input.duty, work: "leading-company-strategy-and-priorities", claim: "founder:561-group", skills: ["lead-the-company"], delegation: true },
    work: { id: "leading-company-strategy-and-priorities", needs: ["lead-the-company"], receiverCondition: "founder-accepted-strategy" },
    skill: { id: "lead-the-company", closureKind: "inquiry", requiresCapabilities: [], method: "cybernetic-medicine" },
    officeService: { id: input.officeService.id, requiredCapabilities: input.officeService.requiredCapabilities },
  };
}

const resolveModelCharacter = modelCharacterResolverFromProviderAdmissions([
  { model: "test-model", capabilities: [] },
]);
const allocationOptions = { at: DATE, resolveAuthority: authority, resolveModelCharacter };

test("a provider-admission offer projects its measured model facts into a Character", () => {
  assert.deepEqual(modelCharacterFromProviderAdmission(ACTOR, {
    type: "Offer",
    object: { model: "measured-model", capabilities: ["work-allocation", "work-allocation"] },
  }), {
    model: "measured-model",
    id: ACTOR,
    capabilities: ["work-allocation"],
  });
});

test("direct work resolves session identity from the latest still-held harness carrier", () => {
  const root = mkdtempSync(path.join(tmpdir(), "current-harness-carrier-"));
  try {
    const binding = defaultFilesystemBinding(root);
    const carrier = (session, model, at) => ({ kind: "metroplat.harness-carrier", character: ACTOR, model, session, capabilities: ["agency-work-propose"], reading: "held", issuer: "test", at });
    const mask = (session, reading, at) => ({ kind: "metroplat.character-mask", account: `session:${session}`, character: ACTOR, reading, issuer: "test", at });
    admitHarnessCarriers({ dataRoot: root, date: DATE, carriers: [carrier("luna-session", "gpt-6-luna", `${DATE}T10:00:00.000Z`)] });
    admitCharacterMasks({ dataRoot: root, date: DATE, masks: [mask("luna-session", "held", `${DATE}T10:00:00.000Z`)] });
    admitHarnessCarriers({ dataRoot: root, date: DATE, carriers: [carrier("sol-session", "gpt-6-sol", `${DATE}T11:00:00.000Z`)] });
    admitCharacterMasks({ dataRoot: root, date: DATE, masks: [mask("sol-session", "held", `${DATE}T11:00:00.000Z`)] });
    assert.deepEqual(currentHarnessCarrier(binding, ACTOR), carrier("sol-session", "gpt-6-sol", `${DATE}T11:00:00.000Z`));
    admitCharacterMasks({ dataRoot: root, date: DATE, masks: [mask("sol-session", "denied", `${DATE}T12:00:00.000Z`)] });
    assert.deepEqual(currentHarnessCarrier(binding, ACTOR), carrier("luna-session", "gpt-6-luna", `${DATE}T10:00:00.000Z`));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the configured firm pool resolves an office service without an institutional seat", () => {
  const resolveAuthority = firmPoolAuthorityResolver({ firmPoolRoot: FIRM_POOL_ROOT });
  const resolved = resolveAuthority({
    kind: "metroplat.work.agency-work-allocation",
    id: "firm-pool-actor-character-resolution",
    subject: SUBJECT,
    office: { id: "chief-executive-officer" },
    duty: "emsenn/duty/leading-company-strategy-and-priorities",
    character: { model: "test-model", id: ACTOR, capabilities: [] },
    officeService: { id: "emsenn/duty/leading-company-strategy-and-priorities", requiredCapabilities: [] },
    allocation: { scope: SCOPE },
  });
  assert.deepEqual(resolved.officeService, { id: "emsenn/duty/leading-company-strategy-and-priorities", requiredCapabilities: ["agent-work-dispatch", "structured-work-intent-admit", "milestone", "work-item", "ledger-readings", "ledger-report", "offices", "office", "office-incumbency-admit", "harness-hook-event-admit", "agency-work-propose", "agency-work-allocation-admit", "agency-work-allocation-candidates", "agency-work-assignment-admit", "work-discharge-admit"] });
  assert.equal(resolved.office.id, "chief-executive-officer");
  assert.equal(resolved.duty.work, "leading-company-strategy-and-priorities");
  assert.equal(resolved.skill.id, "lead-the-company");
});

test("reverse firm-pool authority discovery finds the bearer-independent COO staffing service", () => {
  const reading = firmPoolAuthorityCandidates(
    { firmPoolRoot: FIRM_POOL_ROOT },
    {
      work: "operating-work-lifecycle-and-staffing-allocation",
      skill: "operate-work-lifecycle-and-staffing-allocation",
    },
  );
  assert.equal(reading.kind, "metroplat.firm-pool-authority-candidates");
  const coo = reading.candidates.filter((candidate) => candidate.office.id === "chief-operations-officer");
  assert.equal(coo.length, 1);
  assert.equal(coo[0].duty.id, "emsenn/duty/operating-work-lifecycle-and-staffing-allocation");
  assert.equal(coo[0].work.id, "operating-work-lifecycle-and-staffing-allocation");
  assert.equal(coo[0].skill.id, "operate-work-lifecycle-and-staffing-allocation");
  assert.equal(coo[0].allocationAddressable, true);
  assert.ok(coo[0].skill.requiresCapabilities.includes("agency-work-allocation-admit"));
  assert.ok(coo[0].skill.requiresCapabilities.includes("agent-work-dispatch"));
  assert.match(coo[0].sources.office, /#chief-operations-officer$/u);
  assert.equal("character" in coo[0], false, "authored authority discovery must not invent a provider Character");
});

test("reverse firm-pool authority discovery preserves absence instead of guessing", () => {
  const reading = firmPoolAuthorityCandidates(
    { firmPoolRoot: FIRM_POOL_ROOT },
    { work: "operating-work-lifecycle-and-staffing-allocation", skill: "lead-the-company" },
  );
  assert.deepEqual(reading.candidates, []);
});

test("the one active claim grammar round-trips URI identities and leaves simple identities readable", () => {
  const relation = { kind: "duty", active: ACTOR, passive: "founder:561-group", scope: SCOPE };
  const cell = juralRelationClaimCell(relation);
  assert.match(cell, /^jural:duty:actor%3A/u);
  assert.deepEqual(juralRelationOfClaimCell(cell, "held"), { ...relation, standing: "potential" });
  assert.equal(juralRelationClaimCell({ ...relation, active: "worker", passive: "assigner" }), `jural:duty:worker:assigner:${SCOPE}`);

  const incumbentCell = officeIncumbencyClaimCell("office:xo", "recognition", ACTOR);
  assert.deepEqual(officeIncumbencyClaimOfCell(incumbentCell, "held"), {
    office: "office:xo",
    incumbent: ACTOR,
    predicate: "recognition",
    standing: "potential",
  });
  assert.equal(officeIncumbencyClaimCell("xo", "induction", "worker"), "office:xo:induction:worker");
});

test("enterprise record readings map explicitly into FOUR standing", () => {
  assert.deepEqual(
    ["bottom", "t", "f", "top"].map(readingOfEnterpriseRecordReading),
    ["unknown", "held", "denied", "contested"],
  );
});

test("agency allocation refuses malformed and undeclared scopes before append", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-refusal-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    const before = threadRows(root, SUBJECT).length;
    assert.throws(() => admitAgencyWorkAllocation(binding, allocation("work-item:not-declared"), allocationOptions), /not declared/u);
    assert.throws(() => admitAgencyWorkAllocation(binding, { ...allocation(), office: {} }, allocationOptions), /agency work allocation/u);
    assert.equal(threadRows(root, SUBJECT).length, before);
    const dispatch = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    assert.deepEqual(dispatch.queue, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an eligible Character allocates one exact declared office service idempotently and reaches dispatch", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-admission-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    const first = admitAgencyWorkAllocation(binding, allocation(), allocationOptions);
    assert.equal(first.appended, 1);
    assert.equal(first.character, ACTOR);
    assert.deepEqual(admitAgencyWorkAllocation(binding, allocation(), allocationOptions), {
      ...first,
      appended: 0,
      status: "already-admitted",
    });
    assert.ok(
      assembleDefaultServiceMcp(binding).operations.some((operation) => operation.verb === "agency-work-allocation-admit"),
      "the allocation boundary is exposed through the MCP catalog",
    );

    const dispatch = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    assert.equal(dispatch.queue.length, 1);
    assert.deepEqual(dispatch.queue[0], {
      ...dispatch.queue[0],
      agent: ACTOR,
      scope: SCOPE,
      via: "agent",
      passive: "founder:561-group",
      standing: "potential",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("provider-admitted nonempty model capabilities, rather than caller claims, admit and refuse an office service", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-provider-character-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    const requiredCapability = "work-allocation";
    const capabilityAuthority = (input) => ({
      ...authority(input),
      skill: { ...authority(input).skill, requiresCapabilities: [requiredCapability] },
      officeService: { id: input.officeService.id, requiredCapabilities: [requiredCapability] },
    });
    const capable = {
      ...allocation(),
      id: "provider-admitted-capability",
      character: { model: "capable-model", id: ACTOR, capabilities: [requiredCapability] },
      officeService: { id: allocation().duty, requiredCapabilities: [requiredCapability] },
    };
    const providerCharacter = modelCharacterResolverFromProviderAdmissions([
      { model: "capable-model", capabilities: [requiredCapability] },
    ]);
    assert.equal(admitAgencyWorkAllocation(binding, capable, {
      at: DATE, resolveAuthority: capabilityAuthority, resolveModelCharacter: providerCharacter,
    }).status, "admitted");

    assert.throws(() => admitAgencyWorkAllocation(binding, {
      ...capable,
      id: "caller-inflated-capabilities",
      character: { ...capable.character, capabilities: [requiredCapability, "invented-capability"] },
    }, {
      at: DATE, resolveAuthority: capabilityAuthority, resolveModelCharacter: providerCharacter,
    }), /do not match its provider-admitted model/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an allocation marker cannot redirect the scope of its duty claim", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-allocation-marker-scope-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    admitAgencyWorkAllocation(binding, allocation(), allocationOptions);
    let marker;
    for (const row of threadRows(root, SUBJECT)) {
      if (row[2]?.boundary?.role === "office-service-allocation") marker = row;
    }
    assert.ok(marker, "the admitted allocation records one marker");
    const parsed = agencyWorkAllocationMarkerOfRow(marker);
    assert.equal(parsed?.relation.kind, "duty");
    assert.equal(parsed?.relation.active, ACTOR);
    assert.equal(parsed?.passive, "founder:561-group");
    const malformedScope = structuredClone(marker);
    malformedScope[2].boundary.scope = "work-item:unrelated-scope";
    assert.equal(agencyWorkAllocationMarkerOfRow(malformedScope), undefined);
    const malformedCharacter = structuredClone(marker);
    malformedCharacter[2].boundary.character = "actor:unrelated-provider";
    assert.equal(agencyWorkAllocationMarkerOfRow(malformedCharacter), undefined);
    const malformedKind = structuredClone(marker);
    malformedKind[1].cell = juralRelationClaimCell({ kind: "power", active: ACTOR, passive: "founder:561-group", scope: SCOPE });
    assert.equal(agencyWorkAllocationMarkerOfRow(malformedKind), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("agency allocation refuses a declared work item whose skill is not required by its canonical duty", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-skill-refusal-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const invalidIntent = intent();
    invalidIntent.items[invalidIntent.items.length - 1].skill = "unrelated-skill";
    admitStructuredWorkIntent(binding, invalidIntent, { at: DATE, subject: SUBJECT });
    const before = threadRows(root, SUBJECT).length;
    assert.throws(() => admitAgencyWorkAllocation(binding, allocation(), allocationOptions), /declared work and skill/u);
    assert.equal(threadRows(root, SUBJECT).length, before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unmarked character duty is blocked without a canonical allocation marker", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-legacy-office-allocation-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    const observations = [
      [juralRelationClaimCell({ kind: "duty", active: ACTOR, passive: "founder:561-group", scope: SCOPE }), "held", "character-duty-allocation"],
    ].map(([cell, reading, role], item) => claimSessionObservation({
      sessionId: "unmarked-character-allocation",
      transport: "claim-session",
      claim: { cell, reading },
      session: { claims: [], closed: false },
      judgement: {},
      at: { source: "unmarked-character-allocation", item: item + 1 },
      boundary: { protocol: "metroplat", surface: "work-coordination", operation: "agency-work-allocation-admit", role, source: "unmarked-character-allocation", text: role, evidence: [] },
      caller: { transport: "unmarked-character-allocation" },
    }));
    admitRows(root, SUBJECT, observations.flatMap(claimSessionStatementRows));

    const dispatch = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    assert.equal(dispatch.queue.length, 1);
    assert.equal(dispatch.queue[0].scope, SCOPE);
    assert.equal(dispatch.queue[0].state, "blocked");
    assert.ok(dispatch.queue[0].reasons.includes("canonical-allocation-missing"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an allocation marker cannot make a different Character's duty dispatchable", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-character-scoped-allocation-"));
  const unrelatedCharacter = "actor:unrelated-provider";
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    admitAgencyWorkAllocation(binding, allocation(), allocationOptions);
    const observation = claimSessionObservation({
      sessionId: "unrelated-character-duty",
      transport: "claim-session",
      claim: {
        cell: juralRelationClaimCell({ kind: "duty", active: unrelatedCharacter, passive: "founder:561-group", scope: SCOPE }),
        reading: "held",
      },
      session: { claims: [], closed: false },
      judgement: {},
      at: { source: "unrelated-character-duty", item: 1 },
      boundary: { protocol: "metroplat", surface: "work-coordination", operation: "test", role: "character-duty-allocation", source: "unrelated-character-duty", text: "unrelated character", evidence: [] },
      caller: { transport: "test" },
    });
    admitRows(root, SUBJECT, claimSessionStatementRows(observation));

    const authorized = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    assert.equal(authorized.queue.find((duty) => duty.scope === SCOPE)?.state, "ready");
    const unrelated = readAgentWorkDispatchReadout(binding, DATE, unrelatedCharacter);
    assert.equal(unrelated.queue.length, 1);
    assert.equal(unrelated.queue[0].state, "blocked");
    assert.ok(unrelated.queue[0].reasons.includes("canonical-allocation-missing"));

    const authorizedDuties = readDutiesView(binding, DATE, ACTOR);
    assert.equal(authorizedDuties.duties[0].work, "leading-company-strategy-and-priorities");
    const unrelatedDuties = readDutiesView(binding, DATE, unrelatedCharacter);
    assert.equal(unrelatedDuties.duties[0].work, undefined);
    assert.equal(unrelatedDuties.duties[0].skill, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// A scope has one allocation succession (feltos b3035e6): re-allocating it to another
// Character succeeds the first allocation, so a worker's proposal is never ambiguous.
test("a second lawful allocation of one scope succeeds the first, whichever Character held it", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-allocation-succession-"));
  const secondCharacter = "actor:second-lawful-provider";
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    admitAgencyWorkAllocation(binding, allocation(), allocationOptions);
    assert.equal(readAgentWorkDispatchReadout(binding, DATE, ACTOR).queue.length, 1);
    admitAgencyWorkAllocation(binding, {
      ...allocation(),
      id: "founder-second-provider-pressure-plans",
      character: { ...allocation().character, id: secondCharacter },
    }, allocationOptions);

    const first = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    const second = readAgentWorkDispatchReadout(binding, DATE, secondCharacter);
    assert.equal(first.queue.length, 0, "the first Character no longer owes the succeeded allocation");
    assert.equal(second.queue.length, 1);
    assert.equal(second.queue[0].scope, SCOPE);
    assert.equal(second.queue[0].state, "ready");
    assert.equal(readDutiesView(binding, DATE, secondCharacter).duties[0].work, "leading-company-strategy-and-priorities");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an allocation marker cannot authorize the same Character's duty under a different passive claim", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-passive-scoped-allocation-"));
  const unrelatedPassive = "founder:unrelated-enterprise";
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(), { at: DATE, subject: SUBJECT });
    admitAgencyWorkAllocation(binding, allocation(), allocationOptions);
    const observation = claimSessionObservation({
      sessionId: "unrelated-passive-duty",
      transport: "claim-session",
      claim: {
        cell: juralRelationClaimCell({ kind: "duty", active: ACTOR, passive: unrelatedPassive, scope: SCOPE }),
        reading: "held",
      },
      session: { claims: [], closed: false },
      judgement: {},
      at: { source: "unrelated-passive-duty", item: 1 },
      boundary: { protocol: "metroplat", surface: "work-coordination", operation: "test", role: "character-duty-allocation", source: "unrelated-passive-duty", text: "unrelated passive claim", evidence: [] },
      caller: { transport: "test" },
    });
    admitRows(root, SUBJECT, claimSessionStatementRows(observation));

    const dispatch = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    const authorized = dispatch.queue.find((duty) => duty.passive === "founder:561-group");
    const unrelated = dispatch.queue.find((duty) => duty.passive === unrelatedPassive);
    assert.equal(authorized?.state, "ready");
    assert.equal(unrelated?.state, "blocked");
    assert.ok(unrelated?.reasons.includes("canonical-allocation-missing"));

    const duties = readDutiesView(binding, DATE, ACTOR);
    const authorizedDuty = duties.duties.find((duty) => duty.passive === "founder:561-group");
    const unrelatedDuty = duties.duties.find((duty) => duty.passive === unrelatedPassive);
    assert.equal(authorizedDuty.work, "leading-company-strategy-and-priorities");
    assert.equal(unrelatedDuty.work, undefined);
    assert.equal(unrelatedDuty.skill, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a ready duty carries the declaring structured-intent id, its item text, and parent through dispatch and duties", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-duty-intent-face-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const INTENT_SUBJECT = "structured-work-intent-cold-red-gate-2026-09-03";
    const TASK_SCOPE = "task:exact-deps-metroplat";
    const chain = [
      ["endeavor:cold-red-gate", undefined, "Cold red gate hardening"],
      ["campaign:exact-deps", "endeavor:cold-red-gate", "Exact-dependency campaign"],
      ["project:metroplat", "campaign:exact-deps", "MetroPlat project"],
      ["plan:publish-train", "project:metroplat", "Publish train plan"],
      [TASK_SCOPE, "plan:publish-train", "Pin metroplat's exact dependencies"],
    ];
    const structuredIntent = {
      kind: "metroplat.work.structured-intent",
      id: "cold-red-gate-2026-09-03",
      producer: { id: "test", revision: "1" },
      sources: [{ id: "prompt", kind: "natural-language-prompt" }],
      items: chain.map(([cell, parent, text], index) => ({
        cell,
        ...(parent === undefined ? {} : { parent }),
        ...(cell === TASK_SCOPE ? { work: "leading-company-strategy-and-priorities", skill: "lead-the-company" } : {}),
        text,
        evidence: [],
        provenance: [{ source: "prompt", start: index, end: index + 1, unit: "unicode-code-point" }],
      })),
    };
    const admittedIntent = admitStructuredWorkIntent(binding, structuredIntent, { at: DATE, subject: INTENT_SUBJECT });
    assert.equal(admittedIntent.status, "admitted");

    const secondAllocation = {
      kind: "metroplat.work.agency-work-allocation",
      id: "cold-red-gate-executor",
      subject: INTENT_SUBJECT,
      office: { id: "office:executive-officer-to-the-leader" },
      duty: "emsenn/duty/leading-company-strategy-and-priorities",
      character: { model: "test-model", id: ACTOR, capabilities: [] },
      officeService: { id: "emsenn/duty/leading-company-strategy-and-priorities", requiredCapabilities: [] },
      allocation: { scope: TASK_SCOPE },
    };
    admitAgencyWorkAllocation(binding, secondAllocation, { at: DATE, resolveAuthority: authority, resolveModelCharacter });

    const dispatch = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    const dispatchItem = dispatch.queue.find((entry) => entry.scope === TASK_SCOPE);
    assert.ok(dispatchItem, "the allocated scope reaches dispatch");
    assert.equal(dispatchItem.state, "ready");
    assert.equal(dispatchItem.intent, "cold-red-gate-2026-09-03");
    assert.equal(dispatchItem.subject, INTENT_SUBJECT);
    assert.equal(dispatchItem.text, "Pin metroplat's exact dependencies");
    assert.equal(dispatchItem.parent, "plan:publish-train");

    const duties = readDutiesView(binding, DATE, ACTOR);
    const duty = duties.duties.find((entry) => entry.scope === TASK_SCOPE);
    assert.ok(duty, "the allocated scope reaches the duties view");
    assert.equal(duty.intent, "cold-red-gate-2026-09-03");
    assert.equal(duty.subject, INTENT_SUBJECT);
    assert.equal(duty.text, "Pin metroplat's exact dependencies");
    assert.equal(duty.parent, "plan:publish-train");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
