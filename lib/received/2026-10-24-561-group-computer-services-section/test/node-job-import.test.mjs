import "./support/deny-external-ports.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";

test("packed public import and operation construction are inert", async () => {
  const attempted = [], restore = [];
  for (const [label, module] of [["fs", fs], ["fs.promises", fs.promises]]) {
    for (const name of Object.keys(module)) if (/^(write|append|truncate|unlink|rm|rename|copy|cp|mkdir|mkdtemp|symlink|link|chmod|chown|utimes)/u.test(name)) {
      const original = module[name];
      if (typeof original !== "function") continue;
      restore.push(() => { module[name] = original; });
      module[name] = () => { attempted.push(`${label}.${name}`); throw new Error(`Import attempted ${label}.${name}`); };
    }
  }
  syncBuiltinESMExports();
  try {
    const jobs = await import("@561-group/561-group-computer-services-section/node-job-operation");
    assert.deepEqual(Object.keys(jobs).sort(), ["NODE_JOB_LAW", "nodeJobDeploymentRootsOf", "nodeJobFindingsOf", "nodeJobOperations", "nodeJobSchedules"].sort());
    const operations = jobs.nodeJobOperations();
    assert.deepEqual(operations.map(({ verb }) => verb), ["node-job-run", "node-job-findings"]);
    assert.equal(Object.isFrozen(operations), true);
    assert.throws(() => operations[0].execute({ deployment: "own", job: "manual" }), /installed instance/);
    assert.deepEqual(attempted, []);
  } finally {
    for (const undo of restore.reverse()) undo();
    syncBuiltinESMExports();
  }
});
