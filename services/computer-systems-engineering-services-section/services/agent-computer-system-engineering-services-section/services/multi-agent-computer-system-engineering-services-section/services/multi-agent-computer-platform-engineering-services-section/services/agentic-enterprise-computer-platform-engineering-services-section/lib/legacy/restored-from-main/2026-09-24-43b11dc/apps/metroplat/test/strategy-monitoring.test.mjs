/**
 * Tests for monitoring-aware strategy: agentStrategyDossier responds to
 * keyed monitoring claims from AgentContextDiagnosis.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { agentStrategyDossier } from "../src/agents/strategy.mjs";

const TODAY = "2026-07-16";

function diagnosis(monitoringCharge = "unknown", diagnosisId = "diag-123") {
  const monitoringClaims = monitoringCharge === "unknown"
    ? []
    : [{ key: "local-import:src/a.mts->src/b.mts", charge: monitoringCharge, evidence: [] }];
  return Object.freeze({
    kind: "metroplat.agent.context-diagnosis",
    id: diagnosisId,
    observation: "obs-1",
    condition: "ready",
    context: "held",
    coordination: "held",
    coordinationCost: 0,
    monitoringClaims,
    missing: [],
    rules: [],
    evidence: [`monitoring-claims:${monitoringClaims.length}`],
  });
}

function input(overrides = {}) {
  return Object.freeze({ date: TODAY, ...overrides });
}

// ---------------------------------------------------------------------------
// monitor-codebase-health gate
// ---------------------------------------------------------------------------

test("agentStrategyDossier includes a monitor-codebase-health gate", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("unknown") }));
  const gate = dossier.gates.find((g) => g.name === "monitor-codebase-health");
  assert.ok(gate, "monitor-codebase-health gate must be present");
});

test("monitor-codebase-health gate is satisfied when monitoring charge is unknown", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("unknown") }));
  const gate = dossier.gates.find((g) => g.name === "monitor-codebase-health");
  assert.equal(gate?.state, "satisfied");
});

test("monitor-codebase-health gate is satisfied when monitoring charge is held", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("held") }));
  const gate = dossier.gates.find((g) => g.name === "monitor-codebase-health");
  assert.equal(gate?.state, "satisfied");
});

test("monitor-codebase-health gate is required when monitoring charge is denied", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  const gate = dossier.gates.find((g) => g.name === "monitor-codebase-health");
  assert.equal(gate?.state, "required");
});

test("monitor-codebase-health gate is required when monitoring charge is contested", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("contested") }));
  const gate = dossier.gates.find((g) => g.name === "monitor-codebase-health");
  assert.equal(gate?.state, "required");
});

// ---------------------------------------------------------------------------
// codebase-monitor-response strategy
// ---------------------------------------------------------------------------

test("agentStrategyDossier includes a codebase-monitor-response strategy", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("unknown") }));
  const strategy = dossier.strategies.find((s) => s.id === "codebase-monitor-response");
  assert.ok(strategy, "codebase-monitor-response strategy must be present");
});

test("codebase-monitor-response strategy is waiting when charge is unknown", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("unknown") }));
  const strategy = dossier.strategies.find((s) => s.id === "codebase-monitor-response");
  assert.equal(strategy?.state, "waiting");
  assert.equal(strategy?.moves.length, 0);
});

test("codebase-monitor-response strategy is waiting when charge is held", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("held") }));
  const strategy = dossier.strategies.find((s) => s.id === "codebase-monitor-response");
  assert.equal(strategy?.state, "waiting");
  assert.equal(strategy?.moves.length, 0);
});

test("codebase-monitor-response strategy is ready when charge is denied", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  const strategy = dossier.strategies.find((s) => s.id === "codebase-monitor-response");
  assert.equal(strategy?.state, "ready");
  assert.equal(strategy?.moves.length, 1);
});

test("codebase-monitor-response strategy is ready when charge is contested", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("contested") }));
  const strategy = dossier.strategies.find((s) => s.id === "codebase-monitor-response");
  assert.equal(strategy?.state, "ready");
  assert.equal(strategy?.moves.length, 1);
});

// ---------------------------------------------------------------------------
// verify:codebase-monitor move
// ---------------------------------------------------------------------------

test("verify:codebase-monitor move appears in nextMoves when charge is denied", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.ok(monMove, "verify:codebase-monitor move must appear in nextMoves when denied");
  assert.equal(monMove.state, "ready");
  assert.equal(monMove.source, "source-code-monitor-aggregate");
  assert.equal(monMove.action, "address-monitor-findings");
});

test("verify:codebase-monitor move priority is 2 (high-priority remediation)", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.equal(monMove?.priority, 2, "monitoring remediation move should have priority 2");
});

test("verify:codebase-monitor move is absent when charge is held", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("held") }));
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.equal(monMove, undefined, "verify:codebase-monitor must not appear when codebase is held");
});

test("verify:codebase-monitor move is absent when charge is unknown", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("unknown") }));
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.equal(monMove, undefined, "verify:codebase-monitor must not appear when monitoring is unknown");
});

test("verify:codebase-monitor move reason describes the denial", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.ok(monMove?.reasons.some((r) => r.includes("denied")),
    `move reasons should mention 'denied', got: ${monMove?.reasons.join(", ")}`);
});

test("verify:codebase-monitor move reason describes contested evidence", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("contested") }));
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.ok(monMove?.reasons.some((r) => r.includes("contested")),
    `move reasons should mention 'contested', got: ${monMove?.reasons.join(", ")}`);
});

test("verify:codebase-monitor move appears before verify:focused-contract (priority 2 < 8)", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  const monIdx = dossier.nextMoves.findIndex((m) => m.id === "verify:codebase-monitor");
  const verIdx = dossier.nextMoves.findIndex((m) => m.id === "verify:focused-contract");
  assert.ok(monIdx < verIdx, "codebase-monitor move (priority 2) must sort before focused-contract (priority 8)");
});

// ---------------------------------------------------------------------------
// Evidence and view
// ---------------------------------------------------------------------------

test("agentStrategyDossier evidence includes monitoring-claims field", () => {
  const dossier = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  assert.ok(dossier.evidence.some((e) => e.startsWith("monitoring-claims:")),
    `evidence should contain 'monitoring-claims:...', got: ${dossier.evidence.join(", ")}`);
});

test("agentStrategyDossier evidence records the number of diagnosis claims", () => {
  for (const charge of ["held", "denied", "contested", "unknown"]) {
    const dossier = agentStrategyDossier(input({ diagnosis: diagnosis(charge) }));
    const expected = charge === "unknown" ? "monitoring-claims:0" : "monitoring-claims:1";
    assert.ok(dossier.evidence.some((e) => e === expected),
      `evidence should contain '${expected}'`);
  }
});

test("agentStrategyDossier without a diagnosis has no monitoring claims", () => {
  const dossier = agentStrategyDossier(input());
  // No monitor move without any diagnosis.
  const monMove = dossier.nextMoves.find((m) => m.id === "verify:codebase-monitor");
  assert.equal(monMove, undefined, "no monitoring move when no diagnosis provided");
  assert.ok(dossier.evidence.some((e) => e === "monitoring-claims:0"));
});

test("agentStrategyDossier id changes when monitoring charge changes", () => {
  const held = agentStrategyDossier(input({ diagnosis: diagnosis("held") }));
  const denied = agentStrategyDossier(input({ diagnosis: diagnosis("denied") }));
  assert.notEqual(held.id, denied.id);
});
