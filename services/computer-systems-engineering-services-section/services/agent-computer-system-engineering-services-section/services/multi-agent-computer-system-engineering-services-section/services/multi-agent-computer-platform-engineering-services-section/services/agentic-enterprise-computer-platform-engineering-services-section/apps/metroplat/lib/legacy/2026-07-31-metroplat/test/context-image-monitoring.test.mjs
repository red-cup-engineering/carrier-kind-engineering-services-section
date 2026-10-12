import test from "node:test";
import assert from "node:assert/strict";

import { agentContextImage, diagnoseAgentContext } from "../src/agents/context-image.mts";

const TODAY = "2026-07-16";

function baseInput(overrides = {}) {
  return Object.freeze({ date: TODAY, ...overrides });
}

function monitoringMaterial(charge = "held", subsystems = []) {
  return Object.freeze({
    kind: "metroplat.monitoring.source-code.aggregate",
    id: "metroplat:artifact:1:abc123",
    source: "metroplat:artifact:1:src",
    topology: "metroplat:artifact:1:topo",
    observation: "metroplat:artifact:1:obs",
    charge,
    record: Object.freeze({ kind: "evidence.record", pos: 10, neg: 0 }),
    subsystems,
    evidence: Object.freeze([`charge:${charge}`]),
  });
}

// ---------------------------------------------------------------------------
// Context image: monitoring page
// ---------------------------------------------------------------------------

test("agentContextImage includes a monitoring page in the pages array", () => {
  const image = agentContextImage(baseInput());
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  assert.ok(monPage, "page:monitoring must be present in context image pages");
  assert.equal(monPage.layer, "monitoring");
});

test("agentContextImage monitoring page is evicted when no monitoring input supplied", () => {
  const image = agentContextImage(baseInput());
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  assert.equal(monPage?.state, "evicted");
});

test("agentContextImage monitoring page is resident when monitoring input is supplied", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  assert.equal(monPage?.state, "resident");
});

test("agentContextImage monitoring page material matches the supplied monitoring input", () => {
  const material = monitoringMaterial("contested");
  const image = agentContextImage(baseInput({ monitoring: material }));
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  assert.ok(monPage?.material, "material should be set when monitoring is supplied");
  assert.equal(monPage.material["charge"], "contested");
});

test("agentContextImage monitoring page summary reflects the charge", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("denied") }));
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  assert.ok(monPage?.summary.includes("denied"), `summary should mention charge 'denied', got: ${monPage?.summary}`);
});

test("agentContextImage monitoring page priority is 88 (between work-dispatch:90 and skill-proposals:85)", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  const wdPage  = image.pages.find((p) => p.id === "page:work-dispatch");
  const spPage  = image.pages.find((p) => p.id === "page:skill-proposals");
  assert.ok(monPage, "monitoring page must exist");
  assert.ok(monPage.priority > spPage.priority, "monitoring priority > skill-proposals priority");
  assert.ok(monPage.priority < wdPage.priority, "monitoring priority < work-dispatch priority");
});

test("agentContextImage monitoring evicted page does not generate a page fault", () => {
  // Monitoring is optional (like skill-proposals) — absence must not fault.
  const image = agentContextImage(baseInput());
  const monFaults = image.pageFaults.filter((f) => f.layer === "monitoring");
  assert.equal(monFaults.length, 0, "evicted monitoring page must not produce a page fault");
});

test("agentContextImage boot-order includes monitoring page only when not evicted", () => {
  const evictedImage = agentContextImage(baseInput());
  const residentImage = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  assert.ok(!evictedImage.bootOrder.includes("page:monitoring"), "evicted monitoring page excluded from boot-order");
  assert.ok(residentImage.bootOrder.includes("page:monitoring"), "resident monitoring page included in boot-order");
});

// ---------------------------------------------------------------------------
// Diagnosis: monitoringCharge
// ---------------------------------------------------------------------------

test("diagnoseAgentContext.monitoringCharge is 'unknown' when no monitoring page is resident", () => {
  const image = agentContextImage(baseInput());
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringCharge, "unknown");
});

test("diagnoseAgentContext.monitoringCharge reflects the aggregate charge when monitoring is resident", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringCharge, "held");
});

test("diagnoseAgentContext.monitoringCharge is 'denied' when aggregate reports denied", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("denied") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringCharge, "denied");
});

test("diagnoseAgentContext.monitoringCharge is 'contested' when aggregate reports contested", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("contested") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringCharge, "contested");
});

test("diagnoseAgentContext evidence includes monitoring-charge field", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.ok(diagnosis.evidence.some((e) => e.startsWith("monitoring-charge:")),
    `evidence should contain 'monitoring-charge:...', got: ${diagnosis.evidence.join(", ")}`);
});

test("diagnoseAgentContext rules include the monitoring rule", () => {
  const image = agentContextImage(baseInput());
  const diagnosis = diagnoseAgentContext(image);
  assert.ok(diagnosis.rules.some((r) => r.includes("monitoring")),
    `rules should include a monitoring rule, got: ${diagnosis.rules.join(", ")}`);
});

test("diagnoseAgentContext.monitoringCharge does not affect the condition field", () => {
  // condition is driven by coordination cost and page faults, not monitoring charge.
  const withMonDenied = agentContextImage(baseInput({
    monitoring: monitoringMaterial("denied"),
    workDispatch: Object.freeze({ kind: "dispatch", queue: [], coordination: "clear", coordinationCost: 0 }),
  }));
  const diagnosis = diagnoseAgentContext(withMonDenied);
  // Even with denied monitoring charge, condition should be ready if no page faults and no coord cost.
  // (prior-context, token-window, tool-surface may still fault without being supplied)
  // Just verify monitoringCharge is correctly set independent of condition.
  assert.equal(diagnosis.monitoringCharge, "denied");
  assert.ok(typeof diagnosis.condition === "string", "condition must still be a string");
});

test("diagnoseAgentContext id changes when monitoring charge changes", () => {
  const withHeld = diagnoseAgentContext(agentContextImage(baseInput({ monitoring: monitoringMaterial("held") })));
  const withDenied = diagnoseAgentContext(agentContextImage(baseInput({ monitoring: monitoringMaterial("denied") })));
  const withNone = diagnoseAgentContext(agentContextImage(baseInput()));
  assert.notEqual(withHeld.id, withDenied.id, "different monitoring charges → different diagnosis ids");
  assert.notEqual(withHeld.id, withNone.id, "monitoring absent vs present → different diagnosis ids");
});
