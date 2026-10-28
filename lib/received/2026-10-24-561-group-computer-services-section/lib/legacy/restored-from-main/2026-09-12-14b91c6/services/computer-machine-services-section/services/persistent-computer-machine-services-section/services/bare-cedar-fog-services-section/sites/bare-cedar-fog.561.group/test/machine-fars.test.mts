import assert from "node:assert/strict";
import test from "node:test";
import { defineProvider } from "@red-cup-engineering/fare/provider";
import { composeProviders } from "@red-cup-engineering/fare/compositor";
import { activityPulseResourceGraph } from "@red-cup-engineering/fare/adapters/activity-pulse";
import { projectMachineComposition } from "../src/machine-fars.mts";
import { civicReportPage } from "../src/civic-report-page.mjs";

const observedAt = "2026-08-20T00:00:00.000Z";

test("machine rendering is derived from composed graph cells and retains failed providers", async () => {
  const observed = defineProvider({ id: "urn:fars:provider:test", async observe() { return { resources: [{
    resource: "urn:test:health", focus: "urn:test:machine", observedAt, diagnostics: [], cells: [
      { subject: "urn:test:machine", predicate: "urn:fars:type", object: "urn:fars:type:machine" },
      { subject: "urn:test:machine", predicate: "urn:fars:node-name", object: "test-machine" },
      { subject: "urn:test:machine", predicate: "compute-load-1m", object: "0.5" },
      { subject: "urn:test:process", predicate: "urn:fars:type", object: "urn:fars:type:os-process" },
      { subject: "urn:test:process", predicate: "os-pid", object: "42" },
      { subject: "urn:test:process", predicate: "process-role-hint", object: "agent" },
    ],
  }] }; } });
  const failed = defineProvider({ id: "urn:fars:provider:failed", async observe() { throw new Error("not present"); } });
  const projection = projectMachineComposition(await composeProviders([observed, failed], { onProviderError: "diagnose" }));
  assert.equal(projection.health?.nodeName, "test-machine");
  assert.equal(projection.processes[0].pid, 42);
  assert.deepEqual(projection.providers.map(({ status }) => status), ["observed", "failed"]);
  assert.equal(projection.diagnostics[0].code, "provider-observation-failed");
});

test("machine projection retains canonical Codex and Claude activity pulses", async () => {
  const window = { fromExclusive: "2026-08-19T23:00:00.000Z", toInclusive: observedAt };
  const pulse = (providerActor: string, kind: string) => ({
    type: "ColonyActivityPulseEnvelope",
    providerActor,
    settlementActor: providerActor.replace(":pulse-provider", ""),
    colonyActor: "urn:ame:bare-cedar-fog-colony",
    window,
    recordedAt: observedAt,
    events: [{
      id: `${providerActor}:event`,
      domain: "work",
      kind,
      outcome: "observed",
      summary: `${kind} observed without transcript disclosure.`,
      occurredAt: observedAt,
      quantities: [{ label: "Turns", amount: "1", unit: "turns", displayOrder: 1 }],
    }],
    stocks: [],
    unsupportedDomains: ["deployments"],
    refusals: [],
  });
  const codex = pulse("urn:ame:codex-session-activity-provider:pulse-provider", "interactive-codex-work-observed");
  const claude = pulse("urn:ame:claude-session-activity-provider:pulse-provider", "interactive-claude-work-observed");
  const provider = defineProvider({
    id: "urn:fars:provider:session-fixtures",
    async observe() { return { resources: [activityPulseResourceGraph(codex), activityPulseResourceGraph(claude)] }; },
  });
  const projection = projectMachineComposition(await composeProviders([provider]));
  assert.deepEqual(projection.activity.map(({ kind, quantities }) => [kind, quantities[0]?.amount]), [
    ["interactive-codex-work-observed", "1"],
    ["interactive-claude-work-observed", "1"],
  ]);
});

test("the machine-local shell bootstraps without remote OAuth while the relay shell does not", () => {
  assert.match(civicReportPage({ localFace: true }), /const localFace=true/u);
  assert.match(civicReportPage({ localFace: false }), /const localFace=false/u);
});
