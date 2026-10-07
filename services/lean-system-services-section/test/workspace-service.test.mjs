import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readLeanWorkspaceCore } from "../src/workspace/service.mjs";

function makeFixtureWorkspace() {
  const root = mkdtempSync(path.join(tmpdir(), "lean-workspace-"));
  writeFileSync(path.join(root, "lean-toolchain"), "leanprover/lean4:v4.31.0\n", "utf8");
  writeFileSync(
    path.join(root, "lakefile.toml"),
    [
      'name = "Example"',
      'defaultTargets = ["Example"]',
      "",
      "[[lean_lib]]",
      'name = "Example"',
      "",
    ].join("\n"),
    "utf8",
  );
  mkdirSync(path.join(root, "Example"), { recursive: true });
  writeFileSync(
    path.join(root, "Example", "Basic.lean"),
    [
      "theorem example_truth : True := by",
      "  trivial",
      "",
    ].join("\n"),
    "utf8",
  );
  return root;
}

test("readLeanWorkspaceCore reads a live Lean project directory into its admitted core", () => {
  const root = makeFixtureWorkspace();
  try {
    const workspace = readLeanWorkspaceCore(root);
    assert.equal(workspace.root, root);
    assert.equal(workspace.modules.length, 1);
    assert.equal(workspace.modules[0].id, "Example.Basic");
    assert.ok(workspace.theoremSpine.entries.some((entry) => entry.name === "example_truth"));
    assert.equal(workspace.importGraph.cycles.length, 0);
    assert.ok(workspace.toolchain);
    assert.equal(workspace.toolchain.toolchain, "leanprover/lean4:v4.31.0");
    assert.ok(workspace.lakefile);
    assert.equal(workspace.lakefile.name, "Example");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readLeanWorkspaceCore honors includeTexWorkspaceFibers: false", () => {
  const root = makeFixtureWorkspace();
  try {
    const workspace = readLeanWorkspaceCore(root, { includeTexWorkspaceFibers: false });
    assert.equal(workspace.texWorkspaceRead, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
