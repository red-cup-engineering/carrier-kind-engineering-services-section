import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  actuationRequestKey,
  agentActuationLawReceipt,
  agentActuationPlan,
  MONITORING_MOVE_OPERATIONS,
  monitoringOperationForMove,
} from "../src/agents/actuation.mts";
import { agentContextImage, diagnoseAgentContext } from "../src/agents/context-image.mts";
import { readAgentActuationReadout } from "../src/agents/service.mts";

const TODAY = "2026-07-16";

function strategyMove(id, state) {
  return Object.freeze({
    kind: "metroplat.agent.strategy-move",
    id,
    source: "source-code-monitor-aggregate",
    action: "address-monitor-findings",
    state,
    reasons: [],
    evidence: [],
  });
}

function monitoringMaterial(charge) {
  return Object.freeze({
    kind: "metroplat.monitoring.source-code.aggregate",
    id: "metroplat:artifact:1:agg",
    source: "metroplat:artifact:1:src",
    topology: "metroplat:artifact:1:topo",
    observation: "metroplat:artifact:1:obs",
    charge,
    record: Object.freeze({ kind: "evidence.record", pos: 1, neg: 1 }),
    subsystems: [],
    evidence: [],
  });
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

test("dispatch table maps verify:codebase-monitor to source-code-monitor-aggregate", () => {
  assert.equal(MONITORING_MOVE_OPERATIONS["verify:codebase-monitor"], "source-code-monitor-aggregate");
  assert.equal(monitoringOperationForMove("verify:codebase-monitor"), "source-code-monitor-aggregate");
  assert.equal(monitoringOperationForMove("verify:focused-contract"), undefined);
});

// ---------------------------------------------------------------------------
// Pure actuation plan
// ---------------------------------------------------------------------------

test("plan fires only on ready mapped moves", () => {
  const plan = agentActuationPlan({
    date: TODAY,
    diagnosis: "diag-1",
    moves: [
      strategyMove("verify:codebase-monitor", "ready"),
      strategyMove("verify:codebase-monitor", "waiting"),
      strategyMove("verify:focused-contract", "ready"),
    ],
  });
  assert.equal(plan.planned, 1);
  const planned = plan.entries.find((e) => e.state === "planned");
  assert.equal(planned.operation, "source-code-monitor-aggregate");
  assert.equal(planned.request, actuationRequestKey("diag-1", "verify:codebase-monitor"));
});

test("plan is idempotent per diagnosis", () => {
  const request = actuationRequestKey("diag-1", "verify:codebase-monitor");
  const replay = agentActuationPlan({
    date: TODAY,
    diagnosis: "diag-1",
    moves: [strategyMove("verify:codebase-monitor", "ready")],
    executedRequests: [request],
  });
  assert.equal(replay.planned, 0);
  assert.equal(replay.entries[0].state, "skipped");
  const fresh = agentActuationPlan({
    date: TODAY,
    diagnosis: "diag-2",
    moves: [strategyMove("verify:codebase-monitor", "ready")],
    executedRequests: [request],
  });
  assert.equal(fresh.planned, 1);
});

test("plan does not fire without a diagnosis identity", () => {
  const plan = agentActuationPlan({ date: TODAY, moves: [strategyMove("verify:codebase-monitor", "ready")] });
  assert.equal(plan.planned, 0);
  assert.equal(plan.entries[0].state, "skipped");
});

// ---------------------------------------------------------------------------
// Law receipt
// ---------------------------------------------------------------------------

test("agent actuation law receipt holds", () => {
  const receipt = agentActuationLawReceipt();
  assert.deepEqual(receipt.failures, []);
  assert.equal(receipt.passed, true);
  assert.equal(receipt.charge, "held");
});

// ---------------------------------------------------------------------------
// Service integration: Execute + Knowledge writeback
// ---------------------------------------------------------------------------

test("held monitoring charge produces no executions", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-actuation-held-"));
  try {
    const binding = { dataRoot: root, packageRoot: root, now: () => `${TODAY}T12:00:00.000Z` };
    const observation = agentContextImage({ date: TODAY, monitoring: monitoringMaterial("held") });
    const dossier = await readAgentActuationReadout(binding, { date: TODAY, observation });
    assert.equal(dossier.kind, "metroplat.agent.actuation-dossier");
    assert.equal(dossier.monitoringBefore, "held");
    assert.equal(dossier.plan.planned, 0);
    assert.equal(dossier.executions.length, 0);
    assert.equal(dossier.monitoringAfter, "held");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("contested monitoring charge executes the monitor operation and writes back", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-actuation-run-"));
  try {
    // Use the real package root so source-code-monitor-aggregate observes real modules.
    const packageRoot = path.resolve(import.meta.dirname, "..");
    const binding = { dataRoot: root, packageRoot, now: () => `${TODAY}T12:00:00.000Z` };
    const observation = agentContextImage({ date: TODAY, monitoring: monitoringMaterial("contested") });
    const diagnosis = diagnoseAgentContext(observation);
    assert.equal(diagnosis.monitoringCharge, "contested");

    const dossier = await readAgentActuationReadout(binding, { date: TODAY, observation });
    assert.equal(dossier.monitoringBefore, "contested");
    assert.equal(dossier.plan.planned, 1);
    assert.equal(dossier.executions.length, 1);
    const execution = dossier.executions[0];
    assert.equal(execution.operation, "source-code-monitor-aggregate");
    assert.equal(execution.ok, true, `execution must succeed: ${JSON.stringify(execution.evidence)}`);
    assert.ok(execution.receipt, "outcome must carry a journal receipt id");
    assert.ok(execution.invocation, "outcome must carry the invocation id");
    assert.equal(execution.outcome.kind, "metroplat.monitoring.source-code.aggregate");

    // Knowledge writeback: the refreshed context image reflects the fresh aggregate.
    assert.ok(dossier.contextImage, "post-execution context image must be recorded");
    assert.ok(["held", "denied", "contested", "unknown"].includes(dossier.monitoringAfter));
    assert.equal(dossier.monitoringAfter, execution.outcome.charge);

    // Idempotence: the same diagnosis does not fire twice — the journaled
    // outcome is picked up as an executed request on the next turn.
    const second = await readAgentActuationReadout(binding, { date: TODAY, observation });
    assert.equal(second.plan.planned, 0, "second actuation for the same diagnosis must not fire");
    assert.equal(second.executions.length, 0);
    const skipped = second.plan.entries.find((e) => e.move === "verify:codebase-monitor");
    assert.equal(skipped.state, "skipped");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("waiting monitoring moves are never executed", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-actuation-wait-"));
  try {
    const binding = { dataRoot: root, packageRoot: root, now: () => `${TODAY}T12:00:00.000Z` };
    // unknown charge → monitoring strategy produces no ready monitor moves
    const observation = agentContextImage({ date: TODAY });
    const dossier = await readAgentActuationReadout(binding, { date: TODAY, observation });
    assert.equal(dossier.monitoringBefore, "unknown");
    assert.equal(dossier.plan.planned, 0);
    assert.equal(dossier.executions.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
