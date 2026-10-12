import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { makeTempRoot } from "./support/temp-root.mjs";
import { observeHostHealthResourceGraph } from "../src/adapters/host-health.mjs";
import { observeLinuxProcessResourceGraphs } from "../src/adapters/linux-processes.mjs";
import { activityPulseResourceGraph } from "../src/adapters/activity-pulse.mjs";
import { systemdInventoryResourceGraphs } from "../src/adapters/systemd-inventory.mjs";

const observedAt = "2026-08-20T00:00:00.000Z";
const objectOf = (graph, predicate) => graph.cells.find((cell) => cell.predicate === predicate)?.object;

test("host health projects procfs and filesystem observations into resource-state cells", async () => {
  const root = makeTempRoot("fars-health-");
  writeFileSync(join(root, "loadavg"), "0.25 0.50 0.75 1/100 123\n");
  writeFileSync(join(root, "uptime"), "1234.50 20.00\n");
  writeFileSync(join(root, "meminfo"), "MemTotal:       1000 kB\nMemAvailable:    400 kB\nSwapTotal:        200 kB\nSwapFree:         100 kB\n");
  const graph = await observeHostHealthResourceGraph({ nodeName: "test-machine", procRoot: root, volumePath: root, observedAt });
  assert.equal(objectOf(graph, "compute-load-1m"), "0.25");
  assert.equal(objectOf(graph, "free-memory-bytes"), String(400 * 1024));
  assert.equal(objectOf(graph, "uptime-seconds"), "1234.5");
  assert.ok(Number(objectOf(graph, "free-storage-bytes:/")) > 0);
});

test("process projection uses boot-id + pid + start ticks and never exposes argv secrets", async () => {
  const root = makeTempRoot("fars-proc-");
  mkdirSync(join(root, "sys", "kernel", "random"), { recursive: true });
  mkdirSync(join(root, "123"), { recursive: true });
  writeFileSync(join(root, "sys", "kernel", "random", "boot_id"), "boot-abc\n");
  writeFileSync(join(root, "123", "stat"), "123 (node) S 1 1 1 0 0 0 0 0 0 0 10 5 0 0 20 0 3 0 12345 100000 200\n");
  writeFileSync(join(root, "123", "status"), "Name:\tnode\nUid:\t1000\t1000\t1000\t1000\nVmRSS:\t100 kB\nVmSize:\t1000 kB\n");
  writeFileSync(join(root, "123", "cmdline"), "node\0codex-runner.mjs\0--token\0do-not-leak\0");
  const outcome = await observeLinuxProcessResourceGraphs({ nodeName: "test-machine", procRoot: root, observedAt });
  assert.equal(outcome.resources.length, 1);
  const graph = outcome.resources[0];
  assert.match(graph.resource, /boot-abc:123:12345$/u);
  assert.equal(objectOf(graph, "process-role-hint"), "agent");
  assert.equal(objectOf(graph, "os-entrypoint-name"), "codex-runner.mjs");
  assert.doesNotMatch(JSON.stringify(graph), /do-not-leak|--token/u);
});

test("activity pulse and systemd inventory retain their native distinctions as graph cells", () => {
  const pulse = activityPulseResourceGraph({
    type: "ColonyActivityPulseEnvelope", providerActor: "urn:provider:codex", settlementActor: "urn:actor:codex", colonyActor: "urn:colony:test",
    window: { fromExclusive: "2026-08-19T23:00:00.000Z", toInclusive: observedAt }, recordedAt: observedAt,
    events: [{ id: "urn:event:1", occurredAt: observedAt, domain: "work", kind: "work-observed", summary: "One useful thing happened.", outcome: "observed", quantities: [{ label: "Turns", amount: "1", unit: "turns" }] }], refusals: [],
  });
  assert.equal(objectOf(pulse, "urn:fars:window-from-exclusive"), "2026-08-19T23:00:00.000Z");
  assert.ok(pulse.cells.some((cell) => cell.predicate === "urn:fars:has-quantity"));

  const systemd = systemdInventoryResourceGraphs({ host: "local", units: [{ unit: "demo.service", load: "loaded", active: "active", sub: "running", description: "Demo" }], timers: [{ unit: "demo.timer", activates: "demo.service", next: 42, last: 1 }] }, { observedAt });
  assert.equal(systemd.length, 2);
  assert.equal(objectOf(systemd[0], "urn:fars:unit-active"), "active");
  assert.equal(objectOf(systemd[1], "urn:fars:timer-activates"), "demo.service");
});
