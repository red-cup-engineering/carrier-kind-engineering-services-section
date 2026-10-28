import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { reconcileCompiledNodeArtifacts, reconcileNodeUnitFiles } from "../scripts/reconcile-node-unit-files.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "node-unit-reconcile-"));
  const source = join(root, "metroplat.service");
  writeFileSync(source, "[Service]\nExecStart=/usr/bin/true\n");
  return { root, units: [{ name: "metroplat.service", source }] };
}

test("different BCF and CRG observations derive distinct lawful plans without activation", async () => {
  const { root, units } = fixture();
  try {
    const bcf = await reconcileNodeUnitFiles({ node: "bare-cedar-fog", units, destinationDirectory: join(root, "bcf"), requiredFacts: [{ name: "cloudflare-tunnel-token", present: false }, { name: "cloudflare-ingress-route", present: false }], availableBytes: 800, minimumAvailableBytes: 100 });
    const crg = await reconcileNodeUnitFiles({ node: "cold-red-gate", units, destinationDirectory: join(root, "crg"), availableBytes: 50, minimumAvailableBytes: 100 });
    assert.equal(bcf.outcome, "refused");
    assert.deepEqual(bcf.plan.effects, { stageAtomically: true, daemonReloadOnly: true, activation: false });
    assert.equal(bcf.refusals.some(({ step }) => step === "required-fact"), true);
    assert.equal(crg.outcome, "refused");
    assert.equal(crg.refusals[0].step, "capacity");
    assert.notEqual(bcf.plan.node, crg.plan.node);
    assert.notEqual(bcf.plan.units[0].destination, crg.plan.units[0].destination);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("apply atomically promotes admitted carriers and only reloads the user daemon", async () => {
  const { root, units } = fixture();
  try {
    const calls = [];
    const result = await reconcileNodeUnitFiles({ node: "cold-red-gate", units, destinationDirectory: join(root, "units"), availableBytes: 200, minimumAvailableBytes: 100, apply: true, run: (command, args) => calls.push([command, args]) });
    assert.equal(result.outcome, "applied");
    assert.deepEqual(calls, [["systemctl", ["--user", "daemon-reload"]]]);
    assert.equal(readFileSync(join(root, "units", "metroplat.service"), "utf8"), "[Service]\nExecStart=/usr/bin/true\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("compiler artifacts are refused when incomplete and otherwise stage compiler-owned service and environment bytes", async () => {
  const root = mkdtempSync(join(tmpdir(), "compiled-node-artifact-"));
  try {
    const spec = { kind: "metroplat.node-spec", version: 1, id: "cold-red-gate" };
    const absent = await reconcileCompiledNodeArtifacts({ spec, artifacts: null, destinationDirectory: join(root, "units"), environmentDirectory: join(root, "environment"), availableBytes: 20, minimumAvailableBytes: 1 });
    assert.equal(absent.outcome, "refused");
    const calls = [];
    const applied = await reconcileCompiledNodeArtifacts({ spec, artifacts: { node: { id: "cold-red-gate" }, service: "[Service]\n", environment: "METROPLAT_NODE_ID=cold-red-gate\n", ingress: { kind: "reverse-proxy" } }, destinationDirectory: join(root, "units"), environmentDirectory: join(root, "environment"), availableBytes: 20, minimumAvailableBytes: 1, apply: true, run: (command, args) => calls.push([command, args]) });
    assert.equal(applied.outcome, "applied");
    assert.equal(readFileSync(join(root, "units", "metroplat.service"), "utf8"), "[Service]\n");
    assert.equal(readFileSync(join(root, "environment", "metroplat.env"), "utf8"), "METROPLAT_NODE_ID=cold-red-gate\n");
    assert.deepEqual(calls, [["systemctl", ["--user", "daemon-reload"]]]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
