import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordColdRedGateUnitResourceUsage } from "../scripts/record-cold-red-gate-unit-resource-usage.mjs";

const LIST_UNITS = JSON.stringify([
  { unit: "feed-arrivals.service", load: "loaded", active: "active", sub: "running" },
  { unit: "metroplat.service", load: "loaded", active: "active", sub: "running" },
]);

function showOutput(unit, { cpuNsec, activeEnterTimestamp }) {
  return [
    `Id=${unit}`,
    `Names=${unit}`,
    "CPUAccounting=yes",
    "MemoryAccounting=yes",
    "IPAccounting=no",
    `CPUUsageNSec=${cpuNsec}`,
    "MemoryPeak=200000000",
    "MemoryCurrent=[not set]",
    "IPIngressBytes=[no data]",
    "IPEgressBytes=[no data]",
    `ActiveEnterTimestamp=${activeEnterTimestamp}`,
    "ExecMainStartTimestamp=Thu 2026-09-03 04:33:47 UTC",
  ].join("\n");
}

function fakeRunAt(cpuNsec) {
  return (command, args) => {
    if (args.includes("list-units")) return LIST_UNITS;
    if (args.includes("list-unit-files")) return "[]";
    if (args.includes("list-timers")) return "[]";
    return args.filter((value) => value.endsWith(".service"))
      .map((unit) => showOutput(unit, { cpuNsec, activeEnterTimestamp: "Thu 2026-09-03 04:33:47 UTC" }))
      .join("\n\n");
  };
}

test("recordColdRedGateUnitResourceUsage records an observation, then derives a receipt on the second call", () => {
  const root = mkdtempSync(join(tmpdir(), "cold-red-gate-resource-usage-test-"));
  try {
    const first = recordColdRedGateUnitResourceUsage({ dataRoot: root, run: fakeRunAt("1000000000"), recordedAt: "2026-09-03T00:00:00.000Z" });
    assert.equal(first.observations.length, 2);
    assert.equal(first.receipts.length, 0, "no prior observation yet, so no receipt on the first call");

    const second = recordColdRedGateUnitResourceUsage({ dataRoot: root, run: fakeRunAt("2000000000"), recordedAt: "2026-09-03T00:01:00.000Z" });
    assert.equal(second.observations.length, 2);
    assert.ok(second.receipts.length > 0, "a second observation with a prior on file derives receipts");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recordColdRedGateUnitResourceUsage honors an explicit --unit list", () => {
  const root = mkdtempSync(join(tmpdir(), "cold-red-gate-resource-usage-test-"));
  try {
    const result = recordColdRedGateUnitResourceUsage({ dataRoot: root, units: ["metroplat.service"], run: fakeRunAt("1000000000") });
    assert.equal(result.observations.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
