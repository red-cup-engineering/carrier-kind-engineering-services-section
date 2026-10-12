import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Script } from "node:vm";

// Exercise the exact health receipt projection without importing the host's
// provider graph or opening a server. File access is supplied by each fixture.
// Lifecycle/readiness qualification remains in serve-instance-lifecycle.test.mjs.
const source = readFileSync(new URL("../src/serve-instance.mjs", import.meta.url), "utf8");
const projections = [...source.matchAll(/^\s*deployment:\s*(\(\(\) => \{[\s\S]*?^\s*\}\)\(\)),\s*$/gmu)];
assert.equal(projections.length, 1, "health must have one deployment receipt projection");
const projection = new Script(projections[0][1], { filename: "health-deployment-projection.mjs" });
const statusPath = "/fixture/deployment/latest.json";

function readDeployment(read, environment = { GUIX_MACHINE_DEPLOYMENT_STATUS: statusPath }) {
  const result = projection.runInNewContext({ environment, readFileSync: read }, { timeout: 1_000 });
  return JSON.parse(JSON.stringify(result));
}

function receipt(value) {
  return readDeployment((file, encoding) => {
    assert.equal(file, statusPath);
    assert.equal(encoding, "utf8");
    return JSON.stringify(value);
  });
}

test("health preserves the exact receipt run and rerun attempt alongside existing fields", () => {
  const value = {
    outcome: "failure", machine: "fixture-machine", revision: "candidate-revision",
    repository: "fixture/machine", run: "https://github.com/fixture/machine/actions/runs/33521924678", runAttempt: "2",
    stage: "pre-switch-check", at: "2026-10-10T06:00:00.000Z", reason: "fixture failure",
    storePath: "/gnu/store/fixture-candidate", previous: "/gnu/store/fixture-previous",
    retained: "/gnu/store/fixture-retained",
  };
  assert.deepEqual(receipt(value), value);
  assert.equal(receipt({ ...value, runAttempt: "3" }).runAttempt, "3");
});

test("health does not invent attempt one for a receipt without attempt evidence", () => {
  const value = { outcome: "success", repository: "fixture/machine", run: "https://github.com/fixture/machine/actions/runs/33521924678" };
  assert.deepEqual(receipt(value), value);
  assert.equal(Object.hasOwn(receipt(value), "runAttempt"), false);
});

test("health transports supplied attempt evidence without coercing it to attempt one", () => {
  for (const runAttempt of [false, null, 0, 2, "", "02", "2"]) {
    assert.deepEqual(receipt({ run: "https://github.com/fixture/machine/actions/runs/33521924678", runAttempt }), { run: "https://github.com/fixture/machine/actions/runs/33521924678", runAttempt });
  }
});

test("health keeps the deployment receipt allowlist", () => {
  assert.deepEqual(receipt({ run: "https://github.com/fixture/machine/actions/runs/33521924678", runAttempt: "2", unrelated: "not transported" }), {
    run: "https://github.com/fixture/machine/actions/runs/33521924678", runAttempt: "2",
  });
});

test("health leaves deployment unavailable when no status path is configured", () => {
  let reads = 0;
  assert.equal(readDeployment(() => { reads += 1; return "{}"; }, {}), null);
  assert.equal(reads, 0);
});

test("health leaves deployment unavailable for an unreadable or malformed receipt", () => {
  assert.equal(readDeployment(() => { throw new Error("fixture unreadable"); }), null);
  assert.equal(readDeployment(() => "{malformed"), null);
  assert.equal(readDeployment(() => "null"), null);
});
