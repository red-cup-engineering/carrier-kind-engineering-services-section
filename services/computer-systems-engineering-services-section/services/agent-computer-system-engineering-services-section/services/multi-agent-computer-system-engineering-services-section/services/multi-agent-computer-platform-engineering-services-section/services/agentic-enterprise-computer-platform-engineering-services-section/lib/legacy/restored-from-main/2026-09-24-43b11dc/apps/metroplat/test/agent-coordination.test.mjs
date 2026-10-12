import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  agentCoordinationOperations,
  readAgentContextImageReadout,
  readAgentDiagnosisReadout,
  readAgentOperationsReadout,
  readAgentStrategyReadout,
} from "../src/agents/service.mjs";

test("public agent coordination preserves observation then diagnosis then strategy evidence", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agent-cycle-"));
  const binding = {
    dataRoot: root,
    packageRoot: root,
    rootName: "@test/agent-cycle",
    now: () => "2026-07-13T12:00:00.000Z",
  };
  const input = { date: "2026-07-13", id: "agent:test", query: "normalize metroplat" };
  try {
    const observation = await readAgentContextImageReadout(binding, input);
    const diagnosis = await readAgentDiagnosisReadout(binding, input);
    const strategy = await readAgentStrategyReadout(binding, input);
    const operations = await readAgentOperationsReadout(binding, input);

    assert.ok(observation);
    assert.ok(diagnosis);
    assert.ok(strategy);
    assert.ok(operations);
    assert.equal(observation.pages.some((page) => page.source === "agent-turn"), false);
    assert.equal(diagnosis.observation, observation.id);
    assert.equal(strategy.diagnosis, diagnosis.id);
    assert.equal(strategy.gates.find((gate) => gate.name === "analyze-context")?.state, "satisfied");
    assert.equal(strategy.gates.some((gate) => gate.name === "commit-push-slice"), false);
    assert.equal(strategy.strategies.some((candidate) => candidate.id === "verified-slice-publication"), false);
    assert.equal(strategy.nextMoves.some((move) => move.action === "verify-governed-work"), true);
    assert.equal(operations.controlGates.some((gate) => gate.name === "publication"), false);
    assert.equal(agentCoordinationOperations(binding).some((operation) => operation.verb === "agent-diagnosis"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
