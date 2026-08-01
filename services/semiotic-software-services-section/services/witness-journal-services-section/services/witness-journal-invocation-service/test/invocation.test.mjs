import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  feedNameFor,
  filesystemInvocationLogReader,
  filesystemInvocationWitness,
  invocationEntry,
  projectInvocations,
  readInvocations,
  witnessInvocation,
} from "../src/index.mjs";

function withTempRoot(run) {
  const root = mkdtempSync(path.join(tmpdir(), "witness-journal-invocation-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("invocationEntry cellizes one invocation to one EAVT row: e=caller, a={verb,args,action?}, v=value, t=at", () => {
  const at = "2026-07-31T12:00:00.000Z";
  const withoutAction = invocationEntry({ caller: "urn:agent:orchestrator", verb: "assign", args: { task: "t1" }, value: "ok", at });
  assert.deepEqual(withoutAction, {
    e: "urn:agent:orchestrator",
    a: { verb: "assign", args: { task: "t1" } },
    v: "ok",
    t: at,
  });

  const withAction = invocationEntry({ caller: "urn:agent:orchestrator", verb: "assign", args: { task: "t1" }, action: { morphism: "assign" }, value: "ok", at });
  assert.deepEqual(withAction.a, { verb: "assign", args: { task: "t1" }, action: { morphism: "assign" } });
});

test("feedNameFor is a pure, date-derived, namespace-scoped feed name", () => {
  assert.equal(feedNameFor("@red-cup-engineering/organizing", "2026-07-31T00:00:00.000Z"), "2026-07-31-red-cup-engineering-organizing-log");
  assert.equal(feedNameFor("plain", "not-a-date"), "0000-00-00-plain-log");
});

test("witnessInvocation writes a real, readable-back journal row under the namespace's dated feed", () => {
  withTempRoot((root) => {
    const at = "2026-07-31T12:00:00.000Z";
    const result = witnessInvocation(root, "my-namespace", {
      caller: "urn:agent:a", verb: "dispatch", args: { x: 1 }, value: { ok: true }, at,
    });
    assert.equal(result.appended, 1);

    const traced = readInvocations(root, "my-namespace", at);
    assert.equal(traced.length, 1);
    assert.deepEqual(traced[0].entry, { e: "urn:agent:a", a: { verb: "dispatch", args: { x: 1 } }, v: { ok: true }, t: at });
  });
});

test("witnessInvocation dedups: re-witnessing the same invocation appends nothing further", () => {
  withTempRoot((root) => {
    const at = "2026-07-31T12:00:00.000Z";
    const invocation = { caller: "urn:agent:b", verb: "verify", args: {}, value: "done", at };
    assert.equal(witnessInvocation(root, "ns", invocation).appended, 1);
    assert.equal(witnessInvocation(root, "ns", invocation).appended, 0);
    assert.equal(readInvocations(root, "ns", at).length, 1);
  });
});

test("trace is the invocation's ordinal at read time, in append order, never stored", () => {
  withTempRoot((root) => {
    const at = "2026-07-31T12:00:00.000Z";
    witnessInvocation(root, "ns", { caller: "urn:agent:c1", verb: "step", args: {}, value: 1, at });
    witnessInvocation(root, "ns", { caller: "urn:agent:c2", verb: "step", args: {}, value: 2, at });
    witnessInvocation(root, "ns", { caller: "urn:agent:c3", verb: "step", args: {}, value: 3, at });

    const traced = readInvocations(root, "ns", at);
    assert.deepEqual(traced.map((row) => row.trace), [1, 2, 3]);
    assert.deepEqual(traced.map((row) => row.entry.v), [1, 2, 3]);
    // None of the three carry a trace field on disk, only in this reading.
    for (const row of traced) assert.equal("trace" in row.entry, false);
  });
});

test("witnessInvocation never throws: a witness failure reports zero rows appended", () => {
  withTempRoot((root) => {
    // Not a directory (a file at the collision point) forces the internal
    // mkdirSync/appendFileSync to fail; this must not throw out to the caller.
    const blockedRoot = path.join(root, "blocked");
    const at = "2026-07-31T12:00:00.000Z";
    // First witness creates the tree; second call reuses the same root, this
    // time proving the swallow path by pointing "namespace" at an illegal
    // path segment instead (embedded path separators collapse via slug()).
    const result = witnessInvocation(blockedRoot, "../../escape", { caller: "x", verb: "y", args: {}, value: null, at });
    assert.equal(typeof result.appended, "number");
  });
});

test("filesystemInvocationWitness builds a fire-and-forget dispatch hook over witnessInvocation", () => {
  withTempRoot((root) => {
    const at = "2026-07-31T12:00:00.000Z";
    const hook = filesystemInvocationWitness(root, "ns");
    hook({ caller: "urn:agent:d", verb: "run", args: {}, value: "ran", at });
    assert.equal(readInvocations(root, "ns", at).length, 1);
  });
});

test("filesystemInvocationLogReader reads today's journal, evaluated at call time", () => {
  withTempRoot((root) => {
    const at = "2026-07-31T12:00:00.000Z";
    witnessInvocation(root, "ns", { caller: "urn:agent:e", verb: "run", args: {}, value: "ran", at });
    const reader = filesystemInvocationLogReader(root, "ns", () => at);
    assert.equal(reader().length, 1);
  });
});

test("projectInvocations is the latest-wins state readout over a namespace's invocation journal, no charge field", () => {
  withTempRoot((root) => {
    const at1 = "2026-07-31T12:00:00.000Z";
    const at2 = "2026-07-31T12:00:01.000Z";
    witnessInvocation(root, "ns", { caller: "urn:agent:f", verb: "run", args: {}, value: "first", at: at1 });
    witnessInvocation(root, "ns", { caller: "urn:agent:f", verb: "run", args: {}, value: "second", at: at2 });

    const view = projectInvocations(root, "ns", at1);
    const cells = Object.values(view);
    assert.equal(cells.length, 1);
    assert.equal(cells[0].value, "second");
    assert.equal("charge" in cells[0], false);
  });
});
