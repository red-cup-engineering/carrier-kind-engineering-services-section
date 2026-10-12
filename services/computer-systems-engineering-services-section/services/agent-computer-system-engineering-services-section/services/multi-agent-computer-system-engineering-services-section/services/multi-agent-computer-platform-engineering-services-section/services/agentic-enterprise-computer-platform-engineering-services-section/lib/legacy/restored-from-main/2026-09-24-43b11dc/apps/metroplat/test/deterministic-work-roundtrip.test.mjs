import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { defaultFilesystemBinding } from "../src/integrations/filesystem/services/read-write.mjs";
import { readyDutiesDischargeOperations } from "../src/monitoring/checkout-health/service.mjs";
import { admitAgencyWorkAllocation } from "../src/work/agency-work-allocation.mjs";
import { modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";
import { readAgentWorkDispatchReadout } from "../src/work/service.mjs";
import { admitStructuredWorkIntent } from "../src/work/structured-intent.mjs";

const DATE = "2026-09-07";
const ACTOR = "actor:deterministic-work-roundtrip";
const SUBJECT = "deterministic-work-roundtrip";
const INTENT_SUBJECT = "structured-work-intent-deterministic-work-roundtrip";
const DUTY = "emsenn/duty/deterministic-work-roundtrip";
const WORK = "run-deterministic-command";
const SKILL = "execute-deterministic-command";

function authority(input) {
  return {
    office: { id: input.office.id, bearsDuty: [input.duty], deonticProfile: { [WORK]: "duty" } },
    duty: { id: input.duty, work: WORK, claim: "founder:561-group", skills: [SKILL], delegation: false },
    work: { id: WORK, needs: [SKILL], receiverCondition: "test-accepted" },
    skill: { id: SKILL, closureKind: "procedure", requiresCapabilities: [], method: "deterministic-command" },
    officeService: { id: input.officeService.id, requiredCapabilities: input.officeService.requiredCapabilities },
  };
}
const resolveModelCharacter = modelCharacterResolverFromProviderAdmissions([{ model: "test-model", capabilities: [] }]);
const allocationOptions = { at: DATE, resolveAuthority: authority, resolveModelCharacter };

function allocationFor(scope, id = `allocation-${scope}`) {
  return {
    kind: "metroplat.work.agency-work-allocation",
    id,
    subject: INTENT_SUBJECT,
    office: { id: "office:test" },
    duty: DUTY,
    character: { model: "test-model", id: ACTOR, capabilities: [] },
    officeService: { id: DUTY, requiredCapabilities: [] },
    allocation: { scope },
  };
}
const AGENT_WORK_DUTY_DISCHARGE = import.meta.resolve("../src/work/duty-discharge.mjs");
const agentWorkRequire = createRequire(AGENT_WORK_DUTY_DISCHARGE);
const AGENT_WORK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLASSIFIER = agentWorkRequire.resolve("@red-cup-engineering/classify-work-demand-service");
const SCRIPT = 'import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json"; process.stdout.write(canonicalJson({z:[{b:2,a:1}],a:{d:false,c:true}})+"\\n");';

function discharge(binding, input) {
  return readyDutiesDischargeOperations(binding)[0].execute(input, {});
}

function intent(directory, stdout) {
  const chain = ["endeavor:deterministic-work", "campaign:deterministic-work", "project:deterministic-work", "plan:deterministic-work"];
  return {
    kind: "metroplat.work.structured-intent", id: SUBJECT, producer: { id: "test", revision: "1" },
    sources: [{ id: "test", kind: "test" }],
    items: [...chain.map((cell, index) => ({ cell, ...(index === 0 ? {} : { parent: chain[index - 1] }), text: cell, evidence: [], provenance: [{ source: "test" }] })), {
      cell: "task:canonical-json", parent: chain.at(-1), text: "Canonicalize the admitted JSON value.", evidence: [], provenance: [{ source: "test" }],
      work: WORK, skill: SKILL,
      deterministicExecution: { operation: "canonical-json", request: { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--input-type=module", "--eval", SCRIPT], directory, environment: null, input: null }, acceptance: { kind: "exact-stdout", stdout } },
    }],
  };
}

// Skipped 2026-09-11 (Founder-confirmed, not a bug): admitWorkDischarge now
// enforces separation of duties -- a discharge's `receiver` must be
// independent of its `producer`, backed by an allowed AuthorityEvaluationDecision,
// and reference a prior, separately-admitted work-result proposal receipt
// (see src/work/work-discharge.mts, and test/structured-work-intent.test.mjs
// for the real pattern). checkout-health's deterministic repair discharge
// (this file, and @red-cup-engineering/agent-work-computer-system-engineering-services-section's
// duty-discharge.mjs `buildDischargeInput`/`executeDeterministicDuty`) still
// discharges as its own producer with no receiver at all -- automated
// self-repair deliberately cannot self-discharge under this control, and
// that is correct, not a defect to route around here. Wiring a real
// independent receiver (and the proposal step that must precede it) into
// the external duty-discharge package is real follow-up architecture, not a
// test/schema reconciliation -- recorded as a finding for that package's
// owner, not fixed en passant from this one.
test("persisted deterministic work executes only after apply and settles only its accepted rail duty", { skip: true }, async () => {
  const root = mkdtempSync(join(tmpdir(), "metroplat-deterministic-work-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    admitStructuredWorkIntent(binding, intent(AGENT_WORK_ROOT, '{"a":{"c":true,"d":false},"z":[{"a":1,"b":2}]}\n'), { at: DATE });
    admitAgencyWorkAllocation(binding, allocationFor("task:canonical-json", "allocation"), allocationOptions);
    const request = { kind: "metroplat.monitoring.checkout-health.ready-duties-discharge-request", root, scope: "task:canonical-json", limit: 1 };
    const planned = await discharge(binding, request);
    assert.equal(planned.value.duties[0].status, "planned");
    assert.equal(readAgentWorkDispatchReadout(binding, DATE, ACTOR).frontier.length, 1);
    const applied = await discharge(binding, { ...request, apply: true });
    assert.equal(applied.value.duties[0].status, "applied");
    assert.equal(readAgentWorkDispatchReadout(binding, DATE, ACTOR).frontier.length, 0);
    const repeated = await discharge(binding, { ...request, apply: true });
    assert.deepEqual(repeated.value.duties, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Skipped 2026-09-11: same separation-of-duties gap as the test above.
test("a persisted classifier operation stays open on wrong output and settles once on its exact public result", { skip: true }, async () => {
  const root = mkdtempSync(join(tmpdir(), "metroplat-deterministic-classifier-"));
  try {
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });
    const expected = '{"type":"WorkDemand","scope":"task:exact-deps-classifier","workType":"Process","lane":"script","nuclei":{"meaningClosed":true,"executionClosed":true},"repairScript":"exact-deps","evidence":["scope owned by repair script exact-deps: sigma and delta closed"]}\n';
    const input = '{"scope":"task:exact-deps-classifier","text":"pin exact dependencies"}\n';
    const work = intent(root, expected);
    work.items.at(-1).cell = "task:exact-deps-classifier-fail";
    work.items.at(-1).deterministicExecution = { operation: "classify-work-demand", request: { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: [CLASSIFIER], directory: root, environment: null, input }, acceptance: { kind: "exact-stdout", stdout: "wrong\n" } };
    work.items.push({ cell: "task:exact-deps-classifier", parent: "plan:deterministic-work", text: "Classify the admitted work demand.", evidence: [], provenance: [{ source: "test" }], work: WORK, skill: SKILL, deterministicExecution: { operation: "classify-work-demand", request: { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: [CLASSIFIER], directory: root, environment: null, input }, acceptance: { kind: "exact-stdout", stdout: expected } } });
    admitStructuredWorkIntent(binding, work, { at: DATE });
    for (const scope of ["task:exact-deps-classifier-fail", "task:exact-deps-classifier"]) admitAgencyWorkAllocation(binding, allocationFor(scope, `classifier-allocation-${scope}`), allocationOptions);
    const common = { kind: "metroplat.monitoring.checkout-health.ready-duties-discharge-request", root, apply: true, limit: 1 };
    const refused = await discharge(binding, { ...common, scope: "task:exact-deps-classifier-fail" });
    assert.equal(refused.value.duties[0].status, "refused");
    assert.ok(readAgentWorkDispatchReadout(binding, DATE, ACTOR).frontier.some((duty) => duty.scope === "task:exact-deps-classifier-fail"));
    const result = await discharge(binding, { ...common, scope: "task:exact-deps-classifier" });
    assert.equal(result.value.duties[0].status, "applied");
    assert.ok(!readAgentWorkDispatchReadout(binding, DATE, ACTOR).frontier.some((duty) => duty.scope === "task:exact-deps-classifier"));
    const repeated = await discharge(binding, { ...common, scope: "task:exact-deps-classifier" });
    assert.deepEqual(repeated.value.duties, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
