import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { writeAtRoot } from "@red-cup-engineering/metroplat/resources/read-write-verbs";
import { gitWorkspaceOperations, publishSettledTaskCut } from "@red-cup-engineering/computer-code-development-engine/git/operations";

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function fixture() {
  const parent = mkdtempSync(path.join(tmpdir(), "metroplat-git-publication-"));
  const repo = path.join(parent, "repo");
  const remote = path.join(parent, "remote.git");
  git(parent, "init", "--bare", "--initial-branch=main", remote);
  git(parent, "init", "--initial-branch=main", repo);
  git(repo, "config", "user.email", "metroplat@example.invalid");
  git(repo, "config", "user.name", "MetroPlat Test");
  writeFileSync(path.join(repo, "selected.txt"), "base\n");
  writeFileSync(path.join(repo, "unrelated.txt"), "base\n");
  git(repo, "add", "selected.txt", "unrelated.txt");
  git(repo, "commit", "-m", "base");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-u", "origin", "main");
  const binding = defaultFilesystemBinding(path.join(parent, "ledger"), { packageRoot: repo, rootName: "@test/git-publication" });
  return { parent, repo, remote, binding };
}

function settle(binding, cell, discharged = true) {
  const feed = "normalization-cycle";
  const date = "2026-07-14";
  const opened = writeAtRoot(binding, {
    token: feed,
    at: `${date}T10:00:00.000Z`,
    claim: { cell, reading: "unknown", boundary: { role: "obligation", text: "publish exact cut" } },
  });
  if (discharged) writeAtRoot(binding, {
    token: feed,
    at: `${date}T11:00:00.000Z`,
    causes: [opened.admission.statements[0].id],
    claim: { cell, reading: "held", boundary: { role: "discharge", text: "verified" } },
  });
  return { cell, feed, date };
}

test("task-cut-publish commits only its exact causally discharged cut and confirms origin/main", () => {
  const { parent, repo, binding } = fixture();
  try {
    const task = settle(binding, "task:publish-exact-cut");
    const expectedHead = git(repo, "rev-parse", "HEAD");
    writeFileSync(path.join(repo, "selected.txt"), "published\n");
    writeFileSync(path.join(repo, "unrelated.txt"), "user work\n");
    const result = publishSettledTaskCut(binding, { task, expectedHead, paths: ["selected.txt"], message: "test: publish exact cut" });
    assert.equal(result.ok, true);
    assert.equal(result.phase, "published");
    assert.equal(result.head, git(repo, "rev-parse", "refs/remotes/origin/main"));
    assert.match(git(repo, "show", "-s", "--format=%B", "HEAD"), /MetroPlat-Task: task:publish-exact-cut/u);
    assert.equal(git(repo, "status", "--porcelain"), "M unrelated.txt");
    const replay = publishSettledTaskCut(binding, { task, expectedHead, paths: ["selected.txt"], message: "test: publish exact cut" });
    assert.equal(replay.ok, true);
    assert.equal(replay.head, result.head);
    assert.deepEqual(gitWorkspaceOperations(binding).map((operation) => operation.verb), ["workspace-change-readout", "git-commit-paths", "task-cut-publish"]);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("task-cut-publish cannot stage work for an open Task", () => {
  const { parent, repo, binding } = fixture();
  try {
    const task = settle(binding, "task:still-open", false);
    const expectedHead = git(repo, "rev-parse", "HEAD");
    writeFileSync(path.join(repo, "selected.txt"), "not ready\n");
    const result = publishSettledTaskCut(binding, { task, expectedHead, paths: ["selected.txt"], message: "test: must not publish" });
    assert.equal(result.ok, false);
    assert.equal(result.phase, "precondition");
    assert.deepEqual(result.obstructions, ["task-not-causally-discharged-and-accounted"]);
    assert.equal(git(repo, "diff", "--cached", "--name-only"), "");
    assert.equal(git(repo, "rev-parse", "HEAD"), expectedHead);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
