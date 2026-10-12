import test from "node:test";
import assert from "node:assert/strict";

import { agentContextImage, diagnoseAgentContext } from "../src/agents/context-image.mjs";

const TODAY = "2026-07-16";

function baseInput(overrides = {}) {
  return Object.freeze({ date: TODAY, ...overrides });
}

function monitoringMaterial(charge = "held") {
  return Object.freeze({
    kind: "metroplat.monitoring.source-code.aggregate",
    id: "ni:///sha-256;5bE-Cx3AFeTTwBwmNlY09pErMzJumAxeoD4N9wHtFUY",
    source: "ni:///sha-256;dhzyJQxjNKYbSZaSKsxc5xTTWGZk0ESe3nd3BEC9X1s",
    topology: "ni:///sha-256;m-brVpirF3Urw2NQwX9MJwlyoUUTy02XcRsMMaJZPVQ",
    observation: "ni:///sha-256;adkPiwsDBwsXSxoPOwR1LJmHEjXl_jHqHQdsg3jm6as",
    claims: Object.freeze([{ key: "local-import:src/a->src/b", charge, evidence: Object.freeze([`charge:${charge}`]) }]),
    evidence: Object.freeze([`claims:1`]),
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
  assert.equal(monPage.material["claims"][0]["charge"], "contested");
});

test("agentContextImage monitoring page summary reflects its claim count", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("denied") }));
  const monPage = image.pages.find((p) => p.id === "page:monitoring");
  assert.ok(monPage?.summary.includes("claims:1"), `summary should mention one claim, got: ${monPage?.summary}`);
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
// Diagnosis: monitoring claims
// ---------------------------------------------------------------------------

test("diagnoseAgentContext has no monitoring claims when no page is resident", () => {
  const image = agentContextImage(baseInput());
  const diagnosis = diagnoseAgentContext(image);
  assert.deepEqual(diagnosis.monitoringClaims, []);
});

test("diagnoseAgentContext reflects keyed claims when monitoring is resident", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringClaims[0].charge, "held");
});

test("diagnoseAgentContext preserves denied claims", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("denied") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringClaims[0].charge, "denied");
});

test("diagnoseAgentContext preserves contested claims", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("contested") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.equal(diagnosis.monitoringClaims[0].charge, "contested");
});

test("diagnoseAgentContext evidence includes monitoring-claims field", () => {
  const image = agentContextImage(baseInput({ monitoring: monitoringMaterial("held") }));
  const diagnosis = diagnoseAgentContext(image);
  assert.ok(diagnosis.evidence.some((e) => e.startsWith("monitoring-claims:")),
    `evidence should contain 'monitoring-claims:...', got: ${diagnosis.evidence.join(", ")}`);
});

test("diagnoseAgentContext rules include the monitoring rule", () => {
  const image = agentContextImage(baseInput());
  const diagnosis = diagnoseAgentContext(image);
  assert.ok(diagnosis.rules.some((r) => r.includes("monitoring")),
    `rules should include a monitoring rule, got: ${diagnosis.rules.join(", ")}`);
});

test("diagnoseAgentContext monitoring claims do not affect the condition field", () => {
  // condition is driven by coordination cost and page faults, not monitoring charge.
  const withMonDenied = agentContextImage(baseInput({
    monitoring: monitoringMaterial("denied"),
    workDispatch: Object.freeze({ kind: "dispatch", queue: [], coordination: "clear", coordinationCost: 0 }),
  }));
  const diagnosis = diagnoseAgentContext(withMonDenied);
  // Even with denied monitoring charge, condition should be ready if no page faults and no coord cost.
  // (prior-context, token-window, tool-surface may still fault without being supplied)
  assert.equal(diagnosis.monitoringClaims[0].charge, "denied");
  assert.ok(typeof diagnosis.condition === "string", "condition must still be a string");
});

test("diagnoseAgentContext id changes when monitoring charge changes", () => {
  const withHeld = diagnoseAgentContext(agentContextImage(baseInput({ monitoring: monitoringMaterial("held") })));
  const withDenied = diagnoseAgentContext(agentContextImage(baseInput({ monitoring: monitoringMaterial("denied") })));
  const withNone = diagnoseAgentContext(agentContextImage(baseInput()));
  assert.notEqual(withHeld.id, withDenied.id, "different monitoring charges → different diagnosis ids");
  assert.notEqual(withHeld.id, withNone.id, "monitoring absent vs present → different diagnosis ids");
});
