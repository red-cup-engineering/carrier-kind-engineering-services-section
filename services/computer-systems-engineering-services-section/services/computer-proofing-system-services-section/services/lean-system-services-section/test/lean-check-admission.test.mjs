import { test } from "node:test";
import assert from "node:assert/strict";
import { leanCheckSucceeded } from "../src/check/admission.mjs";
import { planLeanCheck, sourcePathForModule } from "../src/check/plan.mjs";

const good = {
  timedOut: false, exitCode: 0, signal: null, spawnError: null,
  compilerErrors: [], outputTruncated: false, scopeClean: true,
  sourceChanged: false,
};

test("Lean admission requires complete source-stable, clean-scope compiler execution", () => {
  assert.equal(leanCheckSucceeded(good), true);
  const refusals = [
    { timedOut: true }, { exitCode: 1 }, { exitCode: null },
    { signal: "SIGKILL" }, { spawnError: new Error("spawn failed") },
    { compilerErrors: [{ message: "error" }] },
    { compilerErrors: null }, { outputTruncated: true },
    { scopeClean: false }, { sourceChanged: true },
  ];
  for (const refusal of refusals) {
    assert.equal(leanCheckSucceeded({ ...good, ...refusal }), false,
      JSON.stringify(Object.keys(refusal)));
  }
  assert.equal(leanCheckSucceeded({}), false);
});

test("a declaration points to its own local source, not an arbitrary argument", () => {
  assert.equal(sourcePathForModule("Obsmetrologia.Calculus.Order"), "Obsmetrologia/Calculus/Order.lean");
  assert.throws(() => sourcePathForModule("../foo"), /qualified Lean name/);
  assert.throws(() => sourcePathForModule("A;#eval"), /qualified Lean name/);
});

test("typed Lean declaration requests still construct only fixed Lake actions", () => {
  const plan = planLeanCheck({
    id: "kernel-stage-1", project: "/tmp/obsmetrologia",
    mode: "declaration", module: "Obsmetrologia.Primitive",
    declaration: "Obsmetrologia.mark",
  });
  assert.equal(plan.command, "lake");
  assert.equal(plan.module, "Obsmetrologia.Primitive");
  assert.ok(!plan.program.includes("/tmp/obsmetrologia"));
  assert.throws(() => planLeanCheck({
    id: "invalid", project: "/tmp/obsmetrologia", mode: "declaration",
    module: "Module;touch /tmp/bad", declaration: "Whatever",
  }), /qualified Lean name/);
});
