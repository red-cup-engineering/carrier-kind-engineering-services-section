import assert from "node:assert/strict";
import test from "node:test";

import { agentCarrierReading } from "../../src/cells/carrier.mjs";

function control(overrides = {}) {
  return {
    kind: "organizing.cell.visibility-observation",
    sourceRef: "connector:semioverse-control",
    sourceMode: "degraded-projection",
    scope: "semioverse:control",
    operation: "metroplat_metroplex_connect",
    applicable: true,
    supported: true,
    accessible: true,
    enumerable: true,
    complete: false,
    resultCount: 0,
    error: "dispatch error",
    evidence: ["connector:dispatch-error"],
    ...overrides,
  };
}

function syncBack() {
  return {
    kind: "organizing.cell.sync-back-obligation",
    intendedReceiver: "semioverse:work:1",
    work: "github:owner/repo#1",
    blocker: "connector dispatch",
    wake: "dispatch restored",
    acceptance: "admit and read back work:1",
    evidence: ["github:owner/repo#1"],
  };
}

test("Semioverse organizational state derives canonical role", () => {
  const reading = agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "semioverse:carrier:1",
    sourceMode: "canonical",
    actual: "semioverse",
    evidence: ["semioverse:readback"],
  }, "organizational-state");

  assert.equal(reading.valid, true);
  assert.equal(reading.role, "canonical");
});

test("GitHub organizational state is degraded only with control obstruction and sync-back", () => {
  const reading = agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "github:work:1",
    sourceMode: "degraded-projection",
    actual: "github",
    semioverseControl: control(),
    syncBack: syncBack(),
    evidence: ["github:work:1"],
  }, "organizational-state");

  assert.equal(reading.valid, true);
  assert.equal(reading.role, "degraded-projection");
  assert.equal(reading.semioverseControl?.classification, "error-degraded");
});

test("healthy Semioverse control refuses synthetic degraded mode", () => {
  const reading = agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "github:work:1",
    sourceMode: "degraded-projection",
    actual: "github",
    semioverseControl: control({ error: undefined, complete: true, resultCount: 1 }),
    syncBack: syncBack(),
    evidence: [],
  }, "organizational-state");

  assert.equal(reading.valid, false);
  assert.equal(reading.reasons.includes("degraded-cause-not-obstructed"), true);
});

test("degraded projection requires a complete sync-back obligation", () => {
  const reading = agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "github:work:1",
    sourceMode: "degraded-projection",
    actual: "github",
    semioverseControl: control(),
    evidence: [],
  }, "organizational-state");

  assert.equal(reading.valid, false);
  assert.equal(reading.reasons.includes("degraded-projection-missing-sync-back"), true);
});

test("surface and domain determine intrinsic lower-tier roles", () => {
  assert.equal(agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "github:repo:1",
    sourceMode: "provider-native",
    actual: "github",
    evidence: [],
  }, "source").role, "intrinsic-source");

  assert.equal(agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "drive:file:1",
    sourceMode: "provider-native",
    actual: "drive",
    evidence: [],
  }, "artifact").role, "artifact");

  assert.equal(agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "provider:effect:1",
    sourceMode: "provider-native",
    actual: "provider",
    evidence: [],
  }, "provider-effect").role, "provider-native");

  assert.equal(agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "chatgpt:local:1",
    sourceMode: "provider-native",
    actual: "chatgpt-local",
    evidence: [],
  }, "local-transient").role, "transient");
});

test("availability never promotes Drive into organizational canonicality", () => {
  const reading = agentCarrierReading({
    kind: "organizing.cell.carrier-observation",
    sourceRef: "drive:file:1",
    sourceMode: "provider-native",
    actual: "drive",
    evidence: [],
  }, "organizational-state");

  assert.equal(reading.valid, false);
  assert.equal(reading.role, undefined);
  assert.equal(reading.reasons.includes("carrier-domain-surface-mismatch"), true);
});
