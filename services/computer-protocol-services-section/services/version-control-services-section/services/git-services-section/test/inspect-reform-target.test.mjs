import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectReformTarget } from "../src/inspect-reform-target.mjs";

const git = (cwd, args) => execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8", env: { ...process.env, GIT_ALLOW_PROTOCOL: "file" } });
function commit(cwd, message) { git(cwd, ["add", "--all"]); git(cwd, ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", message]); }

test("classifies untracked, tracked, worktree, and registered-submodule sources from Git facts", () => {
  const root = mkdtempSync(join(tmpdir(), "inspect-reform-target-"));
  try {
    const parent = join(root, "parent"), child = join(root, "child");
    mkdirSync(parent); git(parent, ["init", "-q"]);
    mkdirSync(join(parent, "tracked")); writeFileSync(join(parent, "tracked", "file"), "tracked\n"); writeFileSync(join(parent, "root"), "root\n"); commit(parent, "initial");
    mkdirSync(join(parent, "untracked"));
    assert.equal(inspectReformTarget(join(parent, "untracked"), join(parent, "destination"), { gitExecutable: "/usr/bin/git" }).route, "untracked-directory");
    assert.equal(inspectReformTarget(join(parent, "tracked"), join(parent, "destination"), { gitExecutable: "/usr/bin/git" }).route, "tracked-directory");
    assert.equal(inspectReformTarget(parent, join(root, "destination"), { gitExecutable: "/usr/bin/git" }).route, "existing-worktree");
    mkdirSync(child); git(child, ["init", "-q"]); writeFileSync(join(child, "child"), "child\n"); commit(child, "child");
    git(parent, ["-c", "protocol.file.allow=always", "submodule", "add", "-q", child, "submodule"]); commit(parent, "submodule");
    const submodule = inspectReformTarget(join(parent, "submodule"), join(root, "destination"), { gitExecutable: "/usr/bin/git" });
    assert.equal(submodule.route, "registered-submodule"); assert.equal(submodule.gitlinks[0].path, "submodule");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("returns refusal data for a missing source without invoking Git", () => {
  const answer = inspectReformTarget(join(tmpdir(), "missing-reform-source"), join(tmpdir(), "destination"), { gitExecutable: "/not/run" });
  assert.deepEqual({ sourceState: answer.sourceState, route: answer.route }, { sourceState: "missing", route: "refuse" });
});
