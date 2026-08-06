import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const section = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const audit = join(section, "scripts/audit-git-custody.mjs");

test("audits a clean registered and remotely reachable submodule graph", () => {
  const fixture = graphFixture();
  try {
    const result = runAudit(fixture.root);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.repositoryCount, 2);
  } finally { rmSync(fixture.scratch, { recursive: true, force: true }); }
});

test("rejects replacement refs and unregistered nested repositories", () => {
  const fixture = graphFixture();
  try {
    const commits = lines(git(fixture.child, ["rev-list", "--max-count=2", "HEAD"]));
    git(fixture.child, ["replace", commits[0], commits[1]]);
    const replacement = JSON.parse(runAudit(fixture.root).stdout);
    assert.equal(replacement.errors.some(({ code }) => code === "replacement-refs"), true);
    git(fixture.child, ["replace", "-d", commits[0]]);

    const nested = join(fixture.root, "unregistered");
    init(nested); commitFile(nested, "payload.txt", "orphan\n", "orphan");
    const unregistered = JSON.parse(runAudit(fixture.root).stdout);
    assert.equal(unregistered.errors.some(({ code }) => code === "unregistered-worktree"), true);
  } finally { rmSync(fixture.scratch, { recursive: true, force: true }); }
});

test("pre-push rejects a broad deletion without a tracked relocation receipt", () => {
  const scratch = mkdtempSync(join(tmpdir(), "git-custody-deletion-"));
  const remote = join(scratch, "remote.git");
  const repository = join(scratch, "repository");
  try {
    git(scratch, ["init", "--bare", remote]); init(repository); git(repository, ["remote", "add", "origin", remote]);
    for (let index = 0; index < 40; index += 1) writeFileSync(join(repository, `file-${index}.txt`), `${index}\n`);
    git(repository, ["add", "--", "."]); git(repository, ["commit", "-m", "populate"]); git(repository, ["push", "-u", "origin", "main"]);
    const remoteOid = git(repository, ["rev-parse", "HEAD"]).trim();
    for (let index = 0; index < 25; index += 1) rmSync(join(repository, `file-${index}.txt`));
    git(repository, ["add", "-A", "--", "."]); git(repository, ["commit", "-m", "delete without proof"]);
    const localOid = git(repository, ["rev-parse", "HEAD"]).trim();
    const input = `refs/heads/main ${localOid} refs/heads/main ${remoteOid}\n`;
    const result = runAudit(repository, input);
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, 1);
    assert.equal(report.errors.some(({ code }) => code === "unproven-broad-deletion"), true);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

function graphFixture() {
  const scratch = mkdtempSync(join(tmpdir(), "git-custody-graph-"));
  const childRemote = join(scratch, "child.git"); const rootRemote = join(scratch, "root.git");
  const child = join(scratch, "child"); const root = join(scratch, "root");
  git(scratch, ["init", "--bare", childRemote]); git(scratch, ["init", "--bare", rootRemote]);
  init(child); git(child, ["remote", "add", "origin", childRemote]); commitFile(child, "one.txt", "one\n", "one"); commitFile(child, "two.txt", "two\n", "two"); git(child, ["push", "-u", "origin", "main"]);
  init(root); git(root, ["remote", "add", "origin", rootRemote]); commitFile(root, "README.md", "root\n", "root");
  git(root, ["-c", "protocol.file.allow=always", "submodule", "add", childRemote, "services/child"]); git(root, ["commit", "-m", "register child"]); git(root, ["push", "-u", "origin", "main"]);
  return { scratch, child: join(root, "services/child"), root };
}

function runAudit(repository, input = "") {
  return spawnSync(process.execPath, [audit, "--repository", repository, ...(input ? ["--pre-push"] : []), "--format", "json"], { input, encoding: "utf8", env: { ...process.env, GIT_DIR: join(repository, ".git"), GIT_PREFIX: "inherited-hook-prefix/" } });
}
function init(path) { mkdirSync(path, { recursive: true }); git(path, ["init", "-b", "main"]); git(path, ["config", "user.name", "Test"]); git(path, ["config", "user.email", "test@example.invalid"]); }
function commitFile(repository, path, content, message) { writeFileSync(join(repository, path), content); git(repository, ["add", "--", path]); git(repository, ["commit", "-m", message]); }
function git(cwd, argv) { return execFileSync("/usr/bin/git", ["-C", cwd, ...argv], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
function lines(value) { return value.trim().split("\n"); }
