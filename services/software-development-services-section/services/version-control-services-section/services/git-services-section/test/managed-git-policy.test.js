// Exercises the live scripts/git-services managed wrapper's policy: command admission,
// the repository-override refusal, its hermetic read face, and its
// serialized-write lane. Renamed from bound-git-induction-release.test.js —
// despite that name, its assertions were always about this wrapper, not
// about the (now-retired) bound-git-induction gate.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = resolve(root, "scripts/git-services");

test("launcher refuses missing commands and repository overrides", () => {
  const absent = spawnSync(launcher, [], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH } });
  assert.equal(absent.status, 126);
  assert.match(absent.stderr, /is in neither read_commands nor write_commands/u);
  const override = spawnSync(launcher, ["-C", "/tmp", "status"], { cwd: root, encoding: "utf8", env: process.env });
  assert.equal(override.status, 126);
  assert.match(override.stderr, /repository override/u);
});

test("launcher provides a hermetic read face", () => {
  const read = spawnSync(launcher, ["rev-parse", "--is-inside-work-tree"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_DIR: "/tmp/escape", GIT_INDEX_FILE: "/tmp/escape-index", GIT_CONFIG_GLOBAL: "/tmp/escape-config" },
  });
  assert.equal(read.status, 0, read.stderr);
  assert.equal(read.stdout.trim(), "true");
  const diff = spawnSync(launcher, ["diff", "--", "package.json"], { cwd: root, encoding: "utf8", env: { ...process.env, GIT_EXTERNAL_DIFF: "/tmp/escape-diff" } });
  assert.equal(diff.status, 0, diff.stderr);
});

test("launcher serializes local mutation inside a disposable repository", () => {
  const fixtures = resolve(root, "data/test-fixtures");
  mkdirSync(fixtures, { recursive: true });
  const scratch = mkdtempSync(resolve(fixtures, "release-"));
  try {
    const initialized = spawnSync("/usr/bin/git", ["init", "-q", scratch], { encoding: "utf8" });
    assert.equal(initialized.status, 0, initialized.stderr);
    writeFileSync(resolve(scratch, "witness.txt"), "pressure\n");
    const mutation = spawnSync(launcher, ["add", "witness.txt"], { cwd: scratch, encoding: "utf8", env: process.env });
    assert.equal(mutation.status, 0, mutation.stderr);
    const status = spawnSync(launcher, ["status", "--porcelain=v1"], { cwd: scratch, encoding: "utf8", env: process.env });
    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, "A  witness.txt\n");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
